package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationSource;
import com.reservio.repo.BusinessDataRepo;
import com.reservio.repo.ReservationRepo;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.controller.response.TimeSlotResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static com.reservio.enums.ReservationStatus.PENDING;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationCommandServiceTest {

    @Mock private BusinessDataRepo businessDataRepo;
    @Mock private ServiceItemRepo serviceItemRepo;
    @Mock private ReservationRepo reservationRepo;
    @Mock private ReservationNotificationService reservationNotificationService;
    @Mock private ReservationTimeService reservationTimeService;

    private ReservationCommandService service;
    private BusinessData business;
    private ServiceItem serviceItem;
    private UserData customer;

    @BeforeEach
    void setUp() {
        service = new ReservationCommandService(
                businessDataRepo,
                serviceItemRepo,
                reservationRepo,
                reservationNotificationService,
                reservationTimeService
        );
        business = BusinessData.builder().id(10L).name("Reservio Salon").build();
        serviceItem = ServiceItem.builder()
                .id(20L)
                .name("剪髮")
                .duration(60)
                .active(true)
                .business(business)
                .build();
        customer = UserData.builder().id(30L).username("customer").build();
    }

    @Test
    void createsReservationWithoutSecuritySession() {
        LocalDate date = LocalDate.now().plusDays(2);
        when(businessDataRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(business));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(serviceItem));
        when(reservationTimeService.getTimeSlotsForDate(date, 60, 10L))
                .thenReturn(List.of(new TimeSlotResponse("10:00", true)));
        when(reservationRepo.save(any(Reservation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Reservation result = service.createReservation(
                customer,
                business,
                serviceItem,
                date,
                LocalTime.of(10, 0),
                ReservationSource.LINE,
                "希望靠窗",
                "首次來店",
                "王小明",
                "0912-345-678"
        );

        ArgumentCaptor<Reservation> captor = ArgumentCaptor.forClass(Reservation.class);
        verify(reservationRepo).save(captor.capture());
        Reservation saved = captor.getValue();
        assertThat(saved.getUser()).isSameAs(customer);
        assertThat(saved.getBusiness()).isSameAs(business);
        assertThat(saved.getReservationDate()).isEqualTo(date);
        assertThat(saved.getStartTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(saved.getEndTime()).isEqualTo(LocalTime.of(11, 0));
        assertThat(saved.getStatus()).isEqualTo(PENDING);
        assertThat(saved.getTitle()).isEqualTo("剪髮");
        assertThat(saved.getDescription()).isEqualTo("希望靠窗");
        assertThat(saved.getRemark()).isEqualTo("首次來店");
        assertThat(saved.getCustomerName()).isEqualTo("王小明");
        assertThat(saved.getCustomerPhone()).isEqualTo("0912-345-678");
        assertThat(saved.getSource()).isEqualTo(ReservationSource.LINE);
        assertThat(saved.getCreatedBy()).isEqualTo("LINE");
        assertThat(result).isSameAs(saved);
        verify(reservationNotificationService).notifyNewReservation(saved);
    }

    @Test
    void rejectsOverlappingReservation() {
        LocalDate date = LocalDate.now().plusDays(2);
        LocalTime startTime = LocalTime.of(10, 0);
        when(businessDataRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(business));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(serviceItem));
        when(reservationTimeService.getTimeSlotsForDate(date, 60, 10L))
                .thenReturn(List.of(new TimeSlotResponse("10:00", false)));

        assertThatThrownBy(() -> service.createReservation(
                customer, business, serviceItem, date, startTime,
                ReservationSource.LINE, null, null, null, null
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("該時段已被預約");

        verify(reservationRepo, never()).save(any());
    }

    @Test
    void rejectsServiceOwnedByAnotherBusiness() {
        BusinessData anotherBusiness = BusinessData.builder().id(11L).build();
        LocalDate date = LocalDate.now().plusDays(2);
        LocalTime startTime = LocalTime.of(10, 0);
        serviceItem.setBusiness(anotherBusiness);
        when(businessDataRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(business));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(serviceItem));

        assertThatThrownBy(() -> service.createReservation(
                customer, business, serviceItem, date, startTime,
                ReservationSource.LINE, null, null, null, null
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("服務項目不屬於指定商家");

        verify(reservationRepo, never()).save(any());
    }

    @Test
    void rejectsInactiveService() {
        LocalDate date = LocalDate.now().plusDays(2);
        LocalTime startTime = LocalTime.of(10, 0);
        serviceItem.setActive(false);
        when(businessDataRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(business));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(serviceItem));

        assertThatThrownBy(() -> service.createReservation(
                customer, business, serviceItem, date, startTime,
                ReservationSource.LINE, null, null, null, null
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("服務項目目前未開放預約");

        verify(reservationRepo, never()).save(any());
    }

    @Test
    void rejectsPastDate() {
        LocalDate date = LocalDate.now().minusDays(1);
        LocalTime startTime = LocalTime.of(10, 0);
        assertThatThrownBy(() -> service.createReservation(
                customer, business, serviceItem, date, startTime,
                ReservationSource.LINE, null, null, null, null
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("預約日期不可早於今天");

        verify(businessDataRepo, never()).findByIdForUpdate(any());
        verify(reservationRepo, never()).save(any());
    }
}

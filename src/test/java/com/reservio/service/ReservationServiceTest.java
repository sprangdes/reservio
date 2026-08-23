package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationSource;
import com.reservio.enums.ReservationStatus;
import com.reservio.repo.ReservationRepo;
import com.reservio.repo.ServiceItemRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock private ReservationRepo reservationRepo;
    @Mock private UserDataService userDataService;
    @Mock private ReservationNotificationService reservationNotificationService;
    @Mock private ServiceItemRepo serviceItemRepo;
    @Mock private ReservationCommandService reservationCommandService;

    @Test
    void websiteReservationDelegatesToCommandServiceWithWebSource() {
        UserData customer = UserData.builder().id(1L).build();
        BusinessData business = BusinessData.builder().id(2L).build();
        ServiceItem serviceItem = ServiceItem.builder()
                .id(3L)
                .name("剪髮")
                .duration(60)
                .active(true)
                .business(business)
                .build();
        LocalDate date = LocalDate.now().plusDays(1);
        Reservation request = Reservation.builder()
                .business(business)
                .reservationDate(date)
                .startTime(LocalTime.of(10, 0))
                .title("剪髮")
                .description("description")
                .remark("remark")
                .build();
        Reservation saved = Reservation.builder().id(4L).build();
        when(userDataService.getCurrentUser()).thenReturn(customer);
        when(serviceItemRepo.findByBusinessIdAndName(2L, "剪髮")).thenReturn(Optional.of(serviceItem));
        when(reservationCommandService.createReservation(
                customer,
                business,
                serviceItem,
                date,
                LocalTime.of(10, 0),
                ReservationSource.WEB,
                "description",
                "remark",
                null,
                null
        )).thenReturn(saved);

        ReservationService service = service();

        Reservation result = service.saveReservation(request);

        assertThat(result).isSameAs(saved);
        verify(reservationCommandService).createReservation(
                customer,
                business,
                serviceItem,
                date,
                LocalTime.of(10, 0),
                ReservationSource.WEB,
                "description",
                "remark",
                null,
                null
        );
    }

    @Test
    void pendingCustomerCancellationCompletesImmediatelyForAnyChannel() {
        Reservation reservation = cancellableReservation(ReservationStatus.PENDING);

        service().customerCancel(reservation, null, "LINE");

        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
        assertThat(reservation.getCancelReason()).isNull();
        assertThat(reservation.getCancelledAt()).isNotNull();
        assertThat(reservation.getUpdatedAt()).isNotNull();
        assertThat(reservation.getUpdatedBy()).isEqualTo("LINE");
        verify(reservationRepo).save(reservation);
        verify(reservationNotificationService).notifyBusinessOfCustomerChange(reservation);
    }

    @Test
    void confirmedCustomerCancellationCreatesRequestWithTrimmedReason() {
        Reservation reservation = cancellableReservation(ReservationStatus.CONFIRMED);

        service().customerCancel(reservation, "  臨時有事  ", "LINE");

        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCEL_REQUESTED);
        assertThat(reservation.getCancelReason()).isEqualTo("臨時有事");
        assertThat(reservation.getCancelledAt()).isNull();
        assertThat(reservation.getUpdatedBy()).isEqualTo("LINE");
        verify(reservationRepo).save(reservation);
        verify(reservationNotificationService).notifyBusinessOfCustomerChange(reservation);
    }

    @Test
    void confirmedCustomerCancellationRejectsBlankReason() {
        Reservation reservation = cancellableReservation(ReservationStatus.CONFIRMED);
        ReservationService reservationService = service();

        assertThatThrownBy(() -> reservationService.customerCancel(reservation, "  ", "LINE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("已確認預約必須提供取消原因");

        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
        verify(reservationRepo, never()).save(reservation);
        verify(reservationNotificationService, never()).notifyBusinessOfCustomerChange(reservation);
    }

    private Reservation cancellableReservation(ReservationStatus status) {
        return Reservation.builder()
                .id(9L)
                .status(status)
                .reservationDate(LocalDate.now().plusYears(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .build();
    }

    private ReservationService service() {
        return new ReservationService(
                reservationRepo,
                userDataService,
                reservationNotificationService,
                serviceItemRepo,
                reservationCommandService
        );
    }
}

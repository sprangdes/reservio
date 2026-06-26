package com.reservio.line.service;

import com.reservio.controller.response.TimeSlotResponse;
import com.reservio.entity.BusinessData;
import com.reservio.entity.ServiceItem;
import com.reservio.line.controller.response.LineReservationDateSelectResponse;
import com.reservio.line.controller.response.LineReservationDateStatusResponse;
import com.reservio.line.entity.LineConversation;
import com.reservio.line.enums.LineConversationState;
import com.reservio.line.repo.LineConversationRepo;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.service.ReservationTimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineReservationDateSelectionServiceTest {

    @Mock private LineReservationDateTokenService tokenService;
    @Mock private LineConversationRepo conversationRepo;
    @Mock private ServiceItemRepo serviceItemRepo;
    @Mock private ReservationTimeService reservationTimeService;

    private LineReservationDateSelectionService service;
    private BusinessData business;
    private ServiceItem haircut;
    private LineConversation conversation;

    @BeforeEach
    void setUp() {
        service = new LineReservationDateSelectionService(
                tokenService,
                conversationRepo,
                serviceItemRepo,
                reservationTimeService,
                Clock.fixed(Instant.parse("2026-06-25T01:00:00Z"), ZoneId.of("Asia/Taipei"))
        );
        business = BusinessData.builder().id(8L).name("Reservio Salon").build();
        haircut = ServiceItem.builder()
                .id(20L)
                .business(business)
                .name("剪髮")
                .duration(60)
                .active(true)
                .build();
        conversation = LineConversation.builder()
                .business(business)
                .lineUserId("line-user")
                .serviceItemId(20L)
                .state(LineConversationState.ENTERING_DATE)
                .build();
    }

    @Test
    void statusReturnsNextThreeMonthsSelectableDates() {
        givenValidToken();
        when(reservationTimeService.isBusinessOpen(LocalDate.of(2026, 6, 25), 8L)).thenReturn(false);
        when(reservationTimeService.isBusinessOpen(LocalDate.of(2026, 6, 26), 8L)).thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(LocalDate.of(2026, 6, 26), 60, 8L))
                .thenReturn(List.of(new TimeSlotResponse("10:00", true)));

        LineReservationDateStatusResponse response = service.status("token");

        assertThat(response.businessName()).isEqualTo("Reservio Salon");
        assertThat(response.serviceName()).isEqualTo("剪髮");
        assertThat(response.minDate()).isEqualTo(LocalDate.of(2026, 6, 25));
        assertThat(response.maxDate()).isEqualTo(LocalDate.of(2026, 9, 25));
        assertThat(response.dates()).anySatisfy(date -> {
            assertThat(date.date()).isEqualTo(LocalDate.of(2026, 6, 25));
            assertThat(date.selectable()).isFalse();
        });
        assertThat(response.dates()).anySatisfy(date -> {
            assertThat(date.date()).isEqualTo(LocalDate.of(2026, 6, 26));
            assertThat(date.selectable()).isTrue();
        });
    }

    @Test
    void selectStoresDateAndReturnsAvailableTimes() {
        givenValidToken();
        LocalDate selected = LocalDate.of(2026, 6, 26);
        when(reservationTimeService.isBusinessOpen(selected, 8L)).thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(selected, 60, 8L))
                .thenReturn(List.of(
                        new TimeSlotResponse("10:00", true),
                        new TimeSlotResponse("11:00", false)
                ));

        LineReservationDateSelectResponse response = service.select("token", selected);

        assertThat(conversation.getReservationDate()).isEqualTo(selected);
        assertThat(conversation.getState()).isEqualTo(LineConversationState.SELECTING_TIME);
        assertThat(response.availableTimes()).containsExactly("10:00");
        verify(conversationRepo).save(conversation);
    }

    private void givenValidToken() {
        when(tokenService.verify("token"))
                .thenReturn(new LineReservationDateTokenPayload(8L, "line-user", 20L, 1782351000L));
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(conversation));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
    }
}

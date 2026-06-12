package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.NotificationEventType;
import com.reservio.repo.ReservationRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static com.reservio.enums.ReservationStatus.CONFIRMED;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationNotificationServiceTest {
    @Mock private NotificationService notificationService;
    @Mock private ReservationRepo reservationRepo;

    @Test
    void upcomingReminderNotifiesCustomerAndBusiness() {
        LocalDateTime start = LocalDateTime.now().plusHours(2).minusMinutes(1);
        UserData customer = UserData.builder().id(1L).build();
        UserData owner = UserData.builder().id(2L).build();
        Reservation reservation = Reservation.builder().id(9L).user(customer)
                .business(BusinessData.builder().user(owner).build())
                .reservationDate(start.toLocalDate()).startTime(start.toLocalTime()).title("服務").status(CONFIRMED).build();
        when(reservationRepo.findAllByStatusAndReservationDateBetween(eq(CONFIRMED), any(), any()))
                .thenReturn(List.of(reservation));

        new ReservationNotificationService(notificationService, reservationRepo).createUpcomingReminders();

        verify(notificationService, times(2)).create(any(), eq(reservation),
                eq(NotificationEventType.UPCOMING_REMINDER), anyString(), anyString(), anyString());
    }
}

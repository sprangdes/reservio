package com.reservio.service;

import com.reservio.entity.Notification;
import com.reservio.entity.NotificationDelivery;
import com.reservio.entity.NotificationPreference;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.NotificationEventType;
import com.reservio.repo.NotificationDeliveryRepo;
import com.reservio.repo.NotificationPreferenceRepo;
import com.reservio.repo.NotificationRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepo notificationRepo;
    @Mock private NotificationDeliveryRepo deliveryRepo;
    @Mock private NotificationPreferenceRepo preferenceRepo;

    private NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(notificationRepo, deliveryRepo, preferenceRepo);
    }

    @Test
    void createsWebsiteNotificationAndQueuesEnabledVerifiedEmail() {
        UserData recipient = UserData.builder().id(1L).email("user@example.com").emailVerified(true).build();
        Reservation reservation = Reservation.builder().id(9L).build();
        NotificationPreference preference = NotificationPreference.defaultsFor(recipient);
        when(notificationRepo.existsByDedupeKey("created:9:1")).thenReturn(false);
        when(preferenceRepo.findByUser(recipient)).thenReturn(Optional.of(preference));
        when(notificationRepo.save(any())).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setId(10L);
            return notification;
        });

        service.create(recipient, reservation, NotificationEventType.NEW_RESERVATION,
                "新預約", "您有一筆新預約", "created:9:1");

        verify(notificationRepo).save(any());
        ArgumentCaptor<NotificationDelivery> delivery = ArgumentCaptor.forClass(NotificationDelivery.class);
        verify(deliveryRepo).save(delivery.capture());
        assertThat(delivery.getValue().getRecipient()).isEqualTo("user@example.com");
    }

    @Test
    void createsWebsiteNotificationWithoutEmailForUnverifiedRecipient() {
        UserData recipient = UserData.builder().id(1L).email("user@example.com").emailVerified(false).build();
        when(notificationRepo.existsByDedupeKey("created:9:1")).thenReturn(false);
        when(notificationRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(recipient, Reservation.builder().id(9L).build(), NotificationEventType.NEW_RESERVATION,
                "新預約", "您有一筆新預約", "created:9:1");

        verify(notificationRepo).save(any());
        verify(deliveryRepo, never()).save(any());
    }

    @Test
    void ignoresDuplicateDedupeKey() {
        when(notificationRepo.existsByDedupeKey("reminder:9:1")).thenReturn(true);

        service.create(UserData.builder().id(1L).build(), Reservation.builder().id(9L).build(),
                NotificationEventType.UPCOMING_REMINDER, "提醒", "即將開始", "reminder:9:1");

        verify(notificationRepo, never()).save(any());
    }
}

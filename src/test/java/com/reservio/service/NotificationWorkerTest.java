package com.reservio.service;

import com.reservio.entity.Notification;
import com.reservio.entity.NotificationDelivery;
import com.reservio.enums.NotificationDeliveryStatus;
import com.reservio.repo.NotificationDeliveryRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationWorkerTest {
    @Mock private NotificationDeliveryRepo deliveryRepo;
    @Mock private NotificationService notificationService;
    @Mock private PasswordResetMailService mailService;

    @Test
    void failedEmailIsRetriedWithoutThrowing() {
        NotificationDelivery delivery = NotificationDelivery.builder()
                .notification(Notification.builder().title("標題").content("內容").build())
                .recipient("user@example.com").nextAttemptAt(LocalDateTime.now().minusMinutes(1)).build();
        when(deliveryRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(NotificationDeliveryStatus.class), any(LocalDateTime.class))).thenReturn(List.of(delivery));
        doThrow(new IllegalStateException("mail unavailable")).when(mailService)
                .sendNotification("user@example.com", "標題", "內容");

        new NotificationWorker(deliveryRepo, notificationService, mailService).deliverPendingEmail();

        assertThat(delivery.getStatus()).isEqualTo(NotificationDeliveryStatus.PENDING);
        assertThat(delivery.getAttemptCount()).isEqualTo(1);
        verify(deliveryRepo).save(delivery);
    }
}

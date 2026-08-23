package com.reservio.service;

import com.reservio.entity.NotificationDelivery;
import com.reservio.enums.NotificationDeliveryStatus;
import com.reservio.repo.NotificationDeliveryRepo;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
public class NotificationWorker {
    private static final int MAX_ATTEMPTS = 3;
    private final NotificationDeliveryRepo deliveryRepo;
    private final NotificationService notificationService;
    private final PasswordResetMailService mailService;

    public NotificationWorker(NotificationDeliveryRepo deliveryRepo, NotificationService notificationService,
                              PasswordResetMailService mailService) {
        this.deliveryRepo = deliveryRepo;
        this.notificationService = notificationService;
        this.mailService = mailService;
    }

    @Scheduled(cron = "30 * * * * *")
    @Transactional
    public void deliverPendingEmail() {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Taipei"));
        for (NotificationDelivery delivery : deliveryRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                NotificationDeliveryStatus.PENDING, now)) {
            try {
                mailService.sendNotification(delivery.getRecipient(), delivery.getNotification().getTitle(),
                        delivery.getNotification().getContent());
                delivery.setStatus(NotificationDeliveryStatus.SENT);
                delivery.setSentAt(now);
                delivery.setFailureReason(null);
            } catch (RuntimeException e) {
                delivery.setAttemptCount(delivery.getAttemptCount() + 1);
                delivery.setFailureReason(e.getMessage());
                if (delivery.getAttemptCount() >= MAX_ATTEMPTS) {
                    delivery.setStatus(NotificationDeliveryStatus.FAILED);
                } else {
                    delivery.setNextAttemptAt(now.plusMinutes(5L * delivery.getAttemptCount()));
                }
            }
            deliveryRepo.save(delivery);
        }
    }

    @Scheduled(cron = "0 15 3 * * *")
    public void deleteExpiredNotifications() {
        notificationService.deleteExpired();
    }
}

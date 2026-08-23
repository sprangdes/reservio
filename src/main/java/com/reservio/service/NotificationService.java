package com.reservio.service;

import com.reservio.entity.*;
import com.reservio.enums.NotificationEventType;
import com.reservio.controller.request.NotificationPreferenceRequest;
import com.reservio.controller.response.NotificationPreferenceResponse;
import com.reservio.controller.response.NotificationResponse;
import com.reservio.repo.NotificationDeliveryRepo;
import com.reservio.repo.NotificationPreferenceRepo;
import com.reservio.repo.NotificationRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
public class NotificationService {
    private static final ZoneId TAIPEI_ZONE_ID = ZoneId.of("Asia/Taipei");

    private final NotificationRepo notificationRepo;
    private final NotificationDeliveryRepo deliveryRepo;
    private final NotificationPreferenceRepo preferenceRepo;

    public NotificationService(NotificationRepo notificationRepo, NotificationDeliveryRepo deliveryRepo,
                               NotificationPreferenceRepo preferenceRepo) {
        this.notificationRepo = notificationRepo;
        this.deliveryRepo = deliveryRepo;
        this.preferenceRepo = preferenceRepo;
    }

    @Transactional
    public void create(UserData recipient, Reservation reservation, NotificationEventType eventType,
                       String title, String content, String dedupeKey) {
        if (recipient == null || notificationRepo.existsByDedupeKey(dedupeKey)) {
            return;
        }
        LocalDateTime now = LocalDateTime.now(TAIPEI_ZONE_ID);
        Notification notification = notificationRepo.save(Notification.builder()
                .recipient(recipient)
                .reservation(reservation)
                .eventType(eventType)
                .title(title)
                .content(content)
                .dedupeKey(dedupeKey)
                .createdAt(now)
                .expiresAt(now.plusDays(90))
                .build());

        if (Boolean.TRUE.equals(recipient.getEmailVerified()) && emailEnabled(recipient, eventType)) {
            deliveryRepo.save(NotificationDelivery.builder()
                    .notification(notification)
                    .recipient(recipient.getEmail())
                    .nextAttemptAt(now)
                    .build());
        }
    }

    public NotificationPreference getOrCreatePreference(UserData user) {
        return preferenceRepo.findByUser(user)
                .orElseGet(() -> preferenceRepo.save(NotificationPreference.defaultsFor(user)));
    }

    public Page<NotificationResponse> list(UserData user, int page, int size) {
        return notificationRepo.findAllByRecipient(user,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    public long unreadCount(UserData user) {
        return notificationRepo.countByRecipientAndReadAtIsNull(user);
    }

    @Transactional
    public void markRead(UserData user, Long notificationId) {
        Notification notification = notificationRepo.findByIdAndRecipient(notificationId, user)
                .orElseThrow(() -> new IllegalArgumentException("找不到通知"));
        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now(TAIPEI_ZONE_ID));
            notificationRepo.save(notification);
        }
    }

    @Transactional
    public void markAllRead(UserData user) {
        notificationRepo.markAllRead(user, LocalDateTime.now(TAIPEI_ZONE_ID));
    }

    public NotificationPreferenceResponse preferenceResponse(UserData user) {
        NotificationPreference preference = getOrCreatePreference(user);
        return NotificationPreferenceResponse.builder()
                .email(user.getEmail())
                .emailVerified(Boolean.TRUE.equals(user.getEmailVerified()))
                .emailNewReservation(preference.isEmailNewReservation())
                .emailStatusChanged(preference.isEmailStatusChanged())
                .emailUpcomingReminder(preference.isEmailUpcomingReminder())
                .build();
    }

    @Transactional
    public NotificationPreferenceResponse updatePreference(UserData user, NotificationPreferenceRequest request) {
        if (!Boolean.TRUE.equals(user.getEmailVerified())
                && (request.isEmailNewReservation() || request.isEmailStatusChanged()
                || request.isEmailUpcomingReminder())) {
            throw new IllegalStateException("請先驗證 Email");
        }
        NotificationPreference preference = getOrCreatePreference(user);
        preference.setEmailNewReservation(request.isEmailNewReservation());
        preference.setEmailStatusChanged(request.isEmailStatusChanged());
        preference.setEmailUpcomingReminder(request.isEmailUpcomingReminder());
        preferenceRepo.save(preference);
        return preferenceResponse(user);
    }

    @Transactional
    public void deleteExpired() {
        notificationRepo.deleteAllByExpiresAtBefore(LocalDateTime.now(TAIPEI_ZONE_ID));
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .reservationId(notification.getReservation() == null ? null : notification.getReservation().getId())
                .eventType(notification.getEventType())
                .title(notification.getTitle())
                .content(notification.getContent())
                .read(notification.getReadAt() != null)
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private boolean emailEnabled(UserData user, NotificationEventType eventType) {
        NotificationPreference preference = getOrCreatePreference(user);
        return switch (eventType) {
            case NEW_RESERVATION -> preference.isEmailNewReservation();
            case RESERVATION_STATUS_CHANGED -> preference.isEmailStatusChanged();
            case UPCOMING_REMINDER -> preference.isEmailUpcomingReminder();
        };
    }
}

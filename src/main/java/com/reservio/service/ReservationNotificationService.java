package com.reservio.service;

import com.reservio.entity.Reservation;
import com.reservio.enums.NotificationEventType;
import com.reservio.repo.ReservationRepo;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

import static com.reservio.enums.ReservationStatus.CONFIRMED;

@Service
public class ReservationNotificationService {
    private final NotificationService notificationService;
    private final ReservationRepo reservationRepo;

    public ReservationNotificationService(NotificationService notificationService, ReservationRepo reservationRepo) {
        this.notificationService = notificationService;
        this.reservationRepo = reservationRepo;
    }

    public void notifyNewReservation(Reservation reservation) {
        var recipient = reservation.getBusiness().getUser();
        notificationService.create(recipient, reservation, NotificationEventType.NEW_RESERVATION,
                "收到新預約", reservationSummary(reservation),
                "new-reservation:" + reservation.getId() + ":" + recipient.getId());
    }

    public void notifyBusinessOfCustomerChange(Reservation reservation) {
        var recipient = reservation.getBusiness().getUser();
        notificationService.create(recipient, reservation, NotificationEventType.RESERVATION_STATUS_CHANGED,
                "客戶更新預約狀態", statusSummary(reservation),
                statusDedupeKey("customer", reservation, recipient.getId()));
    }

    public void notifyCustomerOfBusinessChange(Reservation reservation) {
        var recipient = reservation.getUser();
        notificationService.create(recipient, reservation, NotificationEventType.RESERVATION_STATUS_CHANGED,
                "商家更新預約狀態", statusSummary(reservation),
                statusDedupeKey("business", reservation, recipient.getId()));
    }

    @Scheduled(cron = "0 */5 * * * *")
    public void createUpcomingReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowEnd = now.plusHours(2);
        LocalDateTime windowStart = windowEnd.minusMinutes(5);
        for (Reservation reservation : reservationRepo.findAllByStatusAndReservationDateBetween(
                CONFIRMED, now.toLocalDate(), windowEnd.toLocalDate())) {
            LocalDateTime startsAt = LocalDateTime.of(reservation.getReservationDate(), reservation.getStartTime());
            if (startsAt.isAfter(windowStart) && !startsAt.isAfter(windowEnd)) {
                createReminder(reservation, reservation.getUser());
                createReminder(reservation, reservation.getBusiness().getUser());
            }
        }
    }

    private void createReminder(Reservation reservation, com.reservio.entity.UserData recipient) {
        notificationService.create(recipient, reservation, NotificationEventType.UPCOMING_REMINDER,
                "預約即將開始", reservationSummary(reservation),
                "upcoming-2h:" + reservation.getId() + ":" + recipient.getId());
    }

    private String statusDedupeKey(String actor, Reservation reservation, Long recipientId) {
        return "status:" + actor + ":" + reservation.getId() + ":" + reservation.getStatus() + ":"
                + reservation.getUpdatedAt() + ":" + recipientId;
    }

    private String statusSummary(Reservation reservation) {
        return reservationSummary(reservation) + "，目前狀態：" + reservation.getStatus();
    }

    private String reservationSummary(Reservation reservation) {
        return "%s %s %s".formatted(reservation.getReservationDate(), reservation.getStartTime(), reservation.getTitle());
    }
}

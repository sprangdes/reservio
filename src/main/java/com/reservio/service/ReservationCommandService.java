package com.reservio.service;

import com.reservio.controller.response.TimeSlotResponse;
import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationSource;
import com.reservio.repo.BusinessDataRepo;
import com.reservio.repo.ReservationRepo;
import com.reservio.repo.ServiceItemRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import static com.reservio.enums.ReservationStatus.PENDING;

@Service
public class ReservationCommandService {

    private static final ZoneId TAIPEI_ZONE_ID = ZoneId.of("Asia/Taipei");

    private final BusinessDataRepo businessDataRepo;
    private final ServiceItemRepo serviceItemRepo;
    private final ReservationRepo reservationRepo;
    private final ReservationNotificationService reservationNotificationService;
    private final ReservationTimeService reservationTimeService;

    public ReservationCommandService(
            BusinessDataRepo businessDataRepo,
            ServiceItemRepo serviceItemRepo,
            ReservationRepo reservationRepo,
            ReservationNotificationService reservationNotificationService,
            ReservationTimeService reservationTimeService) {
        this.businessDataRepo = businessDataRepo;
        this.serviceItemRepo = serviceItemRepo;
        this.reservationRepo = reservationRepo;
        this.reservationNotificationService = reservationNotificationService;
        this.reservationTimeService = reservationTimeService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @SuppressWarnings("java:S107")
    public Reservation createReservation(
            UserData customer,
            BusinessData requestedBusiness,
            ServiceItem requestedService,
            LocalDate reservationDate,
            LocalTime startTime,
            ReservationSource source,
            String description,
            String remark,
            String customerName,
            String customerPhone) {
        validateRequiredInputs(customer, requestedBusiness, requestedService, reservationDate, startTime, source);

        BusinessData business = businessDataRepo.findByIdForUpdate(requestedBusiness.getId())
                .orElseThrow(() -> new IllegalArgumentException("找不到店家: " + requestedBusiness.getId()));
        ServiceItem service = serviceItemRepo.findById(requestedService.getId())
                .orElseThrow(() -> new IllegalArgumentException("找不到服務項目: " + requestedService.getId()));

        validateService(business, service);
        validateSlotAvailable(business, service, reservationDate, startTime);

        Reservation reservation = Reservation.builder()
                .user(customer)
                .business(business)
                .reservationDate(reservationDate)
                .startTime(startTime)
                .endTime(startTime.plusMinutes(service.getDuration()))
                .status(PENDING)
                .title(service.getName())
                .description(description)
                .remark(remark)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .source(source)
                .createdAt(LocalDateTime.now(TAIPEI_ZONE_ID))
                .createdBy(source.name())
                .deletedFlag(false)
                .build();

        Reservation saved = reservationRepo.save(reservation);
        reservationNotificationService.notifyNewReservation(saved);
        return saved;
    }

    private void validateRequiredInputs(
            UserData customer,
            BusinessData business,
            ServiceItem service,
            LocalDate reservationDate,
            LocalTime startTime,
            ReservationSource source) {
        if (customer == null || customer.getId() == null) {
            throw new IllegalArgumentException("預約客戶不可為空");
        }
        if (business == null || business.getId() == null) {
            throw new IllegalArgumentException("預約商家不可為空");
        }
        if (service == null || service.getId() == null) {
            throw new IllegalArgumentException("服務項目不可為空");
        }
        if (reservationDate == null) {
            throw new IllegalArgumentException("預約日期不可為空");
        }
        if (reservationDate.isBefore(LocalDate.now(TAIPEI_ZONE_ID))) {
            throw new IllegalArgumentException("預約日期不可早於今天");
        }
        if (startTime == null) {
            throw new IllegalArgumentException("預約時間不可為空");
        }
        if (reservationDate.equals(LocalDate.now(TAIPEI_ZONE_ID))
                && !startTime.isAfter(LocalTime.now(TAIPEI_ZONE_ID))) {
            throw new IllegalArgumentException("預約時間必須晚於目前時間");
        }
        if (source == null) {
            throw new IllegalArgumentException("預約來源不可為空");
        }
    }

    private void validateService(BusinessData business, ServiceItem service) {
        if (service.getBusiness() == null || !business.getId().equals(service.getBusiness().getId())) {
            throw new IllegalArgumentException("服務項目不屬於指定商家");
        }
        if (!Boolean.TRUE.equals(service.getActive())) {
            throw new IllegalStateException("服務項目目前未開放預約");
        }
        if (service.getDuration() == null || service.getDuration() <= 0) {
            throw new IllegalStateException("服務項目時長設定無效");
        }
    }

    private void validateSlotAvailable(
            BusinessData business,
            ServiceItem service,
            LocalDate reservationDate,
            LocalTime startTime) {
        boolean available = reservationTimeService
                .getTimeSlotsForDate(reservationDate, service.getDuration(), business.getId())
                .stream()
                .anyMatch(slot -> matchesAvailableSlot(slot, startTime));
        if (!available) {
            throw new IllegalStateException("該時段已被預約");
        }
    }

    private boolean matchesAvailableSlot(TimeSlotResponse slot, LocalTime startTime) {
        return slot.isAvailable() && LocalTime.parse(slot.getTime()).equals(startTime);
    }
}

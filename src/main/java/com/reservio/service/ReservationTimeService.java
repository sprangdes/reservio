package com.reservio.service;

import com.reservio.dto.TimeSlotDto;
import com.reservio.entity.DateAvailableHours;
import com.reservio.entity.DefaultAvailableHours;
import com.reservio.entity.Reservation;
import com.reservio.repo.DateAvailableHoursRepo;
import com.reservio.repo.DefaultAvailableHoursRepo;
import com.reservio.repo.ReservationRepo;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

import static com.reservio.enums.ReservationStatus.CANCELLED;

@Service
public class ReservationTimeService {

    private final DateAvailableHoursRepo dateAvailableHoursRepo;
    private final DefaultAvailableHoursRepo defaultAvailableHoursRepo;
    private final ReservationRepo reservationRepo;

    public ReservationTimeService(
            DateAvailableHoursRepo dateAvailableHoursRepo,
            DefaultAvailableHoursRepo defaultAvailableHoursRepo,
            ReservationRepo reservationRepo) {
        this.dateAvailableHoursRepo = dateAvailableHoursRepo;
        this.defaultAvailableHoursRepo = defaultAvailableHoursRepo;
        this.reservationRepo = reservationRepo;
    }

    private List<String> generateSlots(LocalTime start, LocalTime end, int interval) {
        List<String> slots = new ArrayList<>();
        LocalTime current = start;
        while (!current.isAfter(end)) {
            slots.add(current.toString());
            current = current.plusMinutes(interval);
        }
        return slots;
    }

    public List<TimeSlotDto> getTimeSlotsForDate(LocalDate date) {
        List<String> allSlots;

        // 1. 取得該日原始的所有時段
        Optional<DateAvailableHours> dateHoursOpt = dateAvailableHoursRepo.findByDate(date);
        if (dateHoursOpt.isPresent()) {
            DateAvailableHours dateHours = dateHoursOpt.get();
            if (dateHours.isClosed()) return Collections.emptyList();
            allSlots = generateSlots(dateHours.getStartTime(), dateHours.getEndTime(), dateHours.getSlotInterval());
        } else {
            DefaultAvailableHours defaultHours = defaultAvailableHoursRepo.findByShopId(1L).orElse(null);
            if (defaultHours == null) return Collections.emptyList();
            allSlots = generateSlots(defaultHours.getStartTime(), defaultHours.getEndTime(), defaultHours.getSlotInterval());
        }

        // 2. 獲取當天所有有效的預約
        List<Reservation> existingReservations = reservationRepo.findAllByReservationDateAndStatusNot(date, CANCELLED);

        // 3. 獲取現在時間（用於過濾今日已過去的時段）
        LocalTime now = LocalTime.now();
        boolean isToday = date.equals(LocalDate.now());

        // 4. 轉換為 DTO 並標記可用性
        return allSlots.stream()
                .map(slotTime -> {
                    LocalTime time = LocalTime.parse(slotTime);

                    // 檢查是否為過去時間
                    boolean isPast = isToday && !time.isAfter(now);
                    // 檢查是否被現有預約佔用
                    boolean isOccupied = existingReservations.stream().anyMatch(res -> {
                        LocalTime start = res.getStartTime();
                        LocalTime end = res.getEndTime();
                        return !time.isBefore(start) && time.isBefore(end);
                    });

                    return new TimeSlotDto(slotTime, !isPast && !isOccupied);
                })
                .collect(Collectors.toList());
    }

    public List<String> getDisabledDates() {
        LocalDate today = LocalDate.now();
        LocalDate threeMonthLater = today.plusMonths(3);

        List<DateAvailableHours> closeDates = dateAvailableHoursRepo
                .findAllByIsClosedTrueAndDateBetween(today, threeMonthLater);
        return closeDates.stream()
                .map(dateHour -> dateHour.getDate().toString())
                .toList();
    }
}

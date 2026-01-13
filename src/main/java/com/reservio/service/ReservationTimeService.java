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

    public List<TimeSlotDto> getTimeSlotsForDate(LocalDate date, int durationMinutes) {
        List<String> allSlots;

        int interval;

        // 1. 取得該日原始的所有時段
        Optional<DateAvailableHours> dateHoursOpt = dateAvailableHoursRepo.findByDate(date);
        if (dateHoursOpt.isPresent()) {
            DateAvailableHours dateHours = dateHoursOpt.get();
            if (dateHours.isClosed()) return Collections.emptyList();
            interval = dateHours.getSlotInterval();
            allSlots = generateSlots(dateHours.getStartTime(), dateHours.getEndTime(), interval);
        } else {
            DefaultAvailableHours defaultHours = defaultAvailableHoursRepo.findByShopId(1L).orElse(null);
            if (defaultHours == null) return Collections.emptyList();
            interval = defaultHours.getSlotInterval();
            allSlots = generateSlots(defaultHours.getStartTime(), defaultHours.getEndTime(), interval);
        }

        // 2. 獲取當天所有有效的預約
        List<Reservation> existingReservations = reservationRepo.findAllByReservationDateAndStatusNot(date, CANCELLED);
        LocalTime now = LocalTime.now();
        boolean isToday = date.equals(LocalDate.now());

        // 3. 檢查每個時段是否能容納該時長的服務
        return allSlots.stream()
                .map(slotTime -> {
                    LocalTime slotStartTime = LocalTime.parse(slotTime);
                    LocalTime slotEndTime = slotStartTime.plusMinutes(durationMinutes);

                    // A. 檢查是否為過去的時間
                    boolean isPast = isToday && !slotStartTime.isAfter(now);
                    // B. 檢查這段「連續區間」是否與任何現有預約重疊
                    boolean isConflict = existingReservations.stream().anyMatch(res -> {
                        // 兩個時間區間 [s1, e1) 與 [s2, e2) 重疊的條件是：s1 < e2 且 s2 < e1
                        return slotStartTime.isBefore(res.getEndTime()) && res.getStartTime().isBefore(slotEndTime);
                    });

                    // C. 檢查是否超出當天的營業結束時間（假設 allSlots 的最後一個是結束點
                    LocalTime lastPossibleTime = LocalTime.parse(allSlots.get(allSlots.size() -1));
                    boolean isOutOfBounds = slotEndTime.isAfter(lastPossibleTime);

                    return new TimeSlotDto(slotTime, !isPast && !isConflict && !isOutOfBounds);
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

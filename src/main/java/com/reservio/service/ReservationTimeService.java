package com.reservio.service;

import com.reservio.controller.response.TimeSlotResponse;
import com.reservio.entity.DateAvailableHours;
import com.reservio.entity.DefaultAvailableHour;
import com.reservio.entity.Reservation;
import com.reservio.entity.BusinessData;
import com.reservio.repo.BusinessDataRepo;
import com.reservio.repo.DateAvailableHoursRepo;
import com.reservio.repo.DefaultAvailableHoursRepo;
import com.reservio.repo.ReservationRepo;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static com.reservio.enums.ReservationStatus.CANCELLED;

@Service
public class ReservationTimeService {

    private final DateAvailableHoursRepo dateAvailableHoursRepo;
    private final DefaultAvailableHoursRepo defaultAvailableHoursRepo;
    private final ReservationRepo reservationRepo;
    private final BusinessDataRepo businessDataRepo;

    public ReservationTimeService(
            DateAvailableHoursRepo dateAvailableHoursRepo,
            DefaultAvailableHoursRepo defaultAvailableHoursRepo,
            ReservationRepo reservationRepo,
            BusinessDataRepo businessDataRepo) {
        this.dateAvailableHoursRepo = dateAvailableHoursRepo;
        this.defaultAvailableHoursRepo = defaultAvailableHoursRepo;
        this.reservationRepo = reservationRepo;
        this.businessDataRepo = businessDataRepo;
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

    public List<TimeSlotResponse> getTimeSlotsForDate(LocalDate date, int durationMinutes, Long businessId) {
        List<String> allSlots;

        Long resolvedBusinessId = businessId != null ? businessId : 1L;
        int interval = resolveSlotInterval(resolvedBusinessId);

        // 1. 取得該日原始的所有時段
        Optional<DateAvailableHours> dateHoursOpt = dateAvailableHoursRepo.findByBusinessIdAndDate(resolvedBusinessId, date);
        if (dateHoursOpt.isPresent()) {
            DateAvailableHours dateHours = dateHoursOpt.get();
            if (dateHours.isClosed()) return Collections.emptyList();
            allSlots = generateSlots(dateHours.getStartTime(), dateHours.getEndTime(), interval);
        } else {
            DefaultAvailableHour defaultHours = defaultAvailableHoursRepo
                    .findByBusinessIdAndDayOfWeek(resolvedBusinessId, date.getDayOfWeek()).get(0);
            if (defaultHours == null || !defaultHours.isOpen()) return Collections.emptyList();
            allSlots = generateSlots(defaultHours.getStartTime(), defaultHours.getEndTime(), interval);
        }

        // 2. 獲取當天所有有效的預約
        List<Reservation> existingReservations = reservationRepo
                .findAllByBusinessIdAndReservationDateAndStatusNot(resolvedBusinessId, date, CANCELLED);
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
                    boolean isConflict = existingReservations.stream().anyMatch(res ->
                        slotStartTime.isBefore(res.getEndTime()) && res.getStartTime().isBefore(slotEndTime)
                    );

                    return new TimeSlotResponse(slotTime, !isPast && !isConflict);
                })
                .toList();
    }

    public List<String> getDisabledDates(Long businessId) {
        Long resolvedBusinessId = businessId != null ? businessId : 1L;
        LocalDate today = LocalDate.now();
        LocalDate threeMonthLater = today.plusMonths(3);

        List<String> disableDates = new ArrayList<>(dateAvailableHoursRepo
                .findAllByBusinessIdAndIsClosedTrueAndDateBetween(resolvedBusinessId, today, threeMonthLater).stream()
                .map(dateHour -> dateHour.getDate().toString())
                .toList());

        List<DayOfWeek> disableDayOfWeek = defaultAvailableHoursRepo
                .findAllByBusinessIdAndIsOpenFalse(resolvedBusinessId).stream()
                .filter(defaultAvailableHour -> !defaultAvailableHour.isOpen())
                .map(DefaultAvailableHour::getDayOfWeek)
                .toList();

        for(LocalDate start = today; !start.isAfter(threeMonthLater); start = start.plusDays(1)) {
            if(disableDayOfWeek.contains(start.getDayOfWeek())) {
                disableDates.add(start.toString());
            }
        }

        return disableDates;
    }

    private int resolveSlotInterval(Long businessId) {
        return businessDataRepo.findById(businessId)
                .map(BusinessData::getSlotInterval)
                .filter(interval -> interval > 0)
                .orElse(30);
    }
}

package com.reservio.service;

import com.reservio.entity.DateAvailableHours;
import com.reservio.entity.DefaultAvailableHours;
import com.reservio.repo.DateAvailableHoursRepo;
import com.reservio.repo.DefaultAvailableHoursRepo;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class ReservationTimeService {

    private final DateAvailableHoursRepo dateAvailableHoursRepo;
    private final DefaultAvailableHoursRepo defaultAvailableHoursRepo;

    public ReservationTimeService(
            DateAvailableHoursRepo dateAvailableHoursRepo,
            DefaultAvailableHoursRepo defaultAvailableHoursRepo) {
        this.dateAvailableHoursRepo = dateAvailableHoursRepo;
        this.defaultAvailableHoursRepo = defaultAvailableHoursRepo;
    }

    public static List<String> getAllTimeSlots() {
        List<String> allTimeSlots = new ArrayList<>();
        LocalTime time = LocalTime.MIDNIGHT;
        for (int i = 0; i < 48; i++) {
            allTimeSlots.add(time.toString());
            time = time.plusMinutes(30);
        }
        return allTimeSlots;
    }

    public List<String> getTimeSlotsForDate(LocalDate date) {
        Optional<DefaultAvailableHours> defaultHoursOpt = defaultAvailableHoursRepo.findByShopId(1L);
        Optional<DateAvailableHours> dateHoursOpt = dateAvailableHoursRepo.findByDate(date);

        if (dateHoursOpt.isPresent()) {
            DateAvailableHours dateHours = dateHoursOpt.get();
            if (!dateHours.isClosed()) {
                return generateSlots(dateHours.getStartTime(), dateHours.getEndTime(), dateHours.getSlotInterval());
            }
            return Collections.emptyList();
        }

        if (defaultHoursOpt.isPresent()) {
            DefaultAvailableHours defaultHours = defaultHoursOpt.get();
            return generateSlots(defaultHours.getStartTime(), defaultHours.getEndTime(), defaultHours.getSlotInterval());
        }
        return getAllTimeSlots();
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

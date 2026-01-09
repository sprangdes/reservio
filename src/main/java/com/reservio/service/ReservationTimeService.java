package com.reservio.service;

import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class ReservationTimeService {

    public static List<String> getAllTimeSlots() {
        List<String> allTimeSlots = new ArrayList<>();
        LocalTime time = LocalTime.MIDNIGHT;
        for (int i = 0; i < 48; i++) {
            allTimeSlots.add(time.toString());
            time = time.plusMinutes(30);
        }
        return allTimeSlots;
    }

    public List<String> getDisabledDates() {
        return Arrays.asList("2026-01-20", "2026-01-27", "2026-01-28");
    }

    public List<String> getDisabledTimes() {
        List<String> disabledTimes = new ArrayList<>();
        // 00:00-07:00
        LocalTime startTime1 = LocalTime.of(0, 0);
        LocalTime endTime1 = LocalTime.of(7, 0);
        LocalTime currentTime = startTime1;
        do {
            disabledTimes.add(currentTime.toString());
            currentTime = currentTime.plusMinutes(30);
        } while (!currentTime.isBefore(startTime1) && !currentTime.isAfter(endTime1));
        // 16:00-23:30
        LocalTime startTime2 = LocalTime.of(16, 0);
        LocalTime endTime2 = LocalTime.of(23, 30);
        currentTime = startTime2;
        do {
            disabledTimes.add(currentTime.toString());
            currentTime = currentTime.plusMinutes(30);
        } while (!currentTime.isBefore(startTime2) && !currentTime.isAfter(endTime2));
        return disabledTimes;
    }

    public List<String> getTimeSlots() {
        List<String> timeSlots = new ArrayList<>(getAllTimeSlots());
        List<String> disabledTimes = getDisabledTimes();
        timeSlots.removeAll(disabledTimes);
        return timeSlots;
    }
}

package com.reservio.dto;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Data
@Builder
public class DefaultWeekSlot {
    @NotNull
    private DayOfWeek dayOfWeek;

    @Nullable
    private LocalTime startTime;

    @Nullable
    private LocalTime endTime;
}
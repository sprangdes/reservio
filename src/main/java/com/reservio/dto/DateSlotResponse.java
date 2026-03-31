package com.reservio.dto;

import jakarta.annotation.Nullable;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
public class DateSlotResponse {

    private LocalDate date;

    private boolean open;

    @Nullable
    private LocalTime startTime;

    @Nullable
    private LocalTime endTime;
}

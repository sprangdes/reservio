package com.reservio.controller.request;

import jakarta.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveDateSlotRequest {

    private LocalDate date;
    private boolean open;

    @Nullable
    private LocalTime startTime;

    @Nullable
    private LocalTime endTime;
}

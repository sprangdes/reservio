package com.reservio.dto;

import jakarta.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueryReservationCondition {
    @Nullable
    private LocalDate startDate;

    @Nullable
    private LocalDate endDate;

    @Nullable
    private String service;

    @Nullable
    private String keyword;
}

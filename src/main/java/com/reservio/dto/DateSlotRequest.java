package com.reservio.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class DateSlotRequest {

    private LocalDate date;
}

package com.reservio.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TimeSlotDTO {
    private String time;
    private boolean available;
}

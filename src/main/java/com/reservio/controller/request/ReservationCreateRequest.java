package com.reservio.controller.request;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ReservationCreateRequest {

    private Long businessId;
    private LocalDate reservationDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String title;
    private String description;
    private String remark;
}

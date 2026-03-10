package com.reservio.dto;

import lombok.Data;

@Data
public class ReservationCancelRequest {
    private String cancelReason;
}

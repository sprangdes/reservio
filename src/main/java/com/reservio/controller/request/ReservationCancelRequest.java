package com.reservio.controller.request;

import lombok.Data;

@Data
public class ReservationCancelRequest {

    private String cancelReason;
}

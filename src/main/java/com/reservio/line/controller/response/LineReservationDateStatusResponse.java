package com.reservio.line.controller.response;

import java.time.LocalDate;
import java.util.List;

public record LineReservationDateStatusResponse(
        String businessName,
        String serviceName,
        LocalDate minDate,
        LocalDate maxDate,
        List<LineReservationDateOptionResponse> dates) {
}

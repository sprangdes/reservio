package com.reservio.line.controller.response;

import java.time.LocalDate;

public record LineReservationDateOptionResponse(
        LocalDate date,
        boolean selectable) {
}

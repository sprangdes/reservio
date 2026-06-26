package com.reservio.line.controller.response;

import java.time.LocalDate;
import java.util.List;

public record LineReservationDateSelectResponse(
        LocalDate selectedDate,
        List<String> availableTimes) {
}

package com.reservio.controller.response;

import jakarta.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarResponse {

    private List<ReservationResponse> reservations;

    @Nullable
    private List<String> users;
}

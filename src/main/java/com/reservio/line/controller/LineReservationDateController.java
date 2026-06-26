package com.reservio.line.controller;

import com.reservio.controller.response.ApiResponse;
import com.reservio.line.controller.request.LineReservationDateSelectRequest;
import com.reservio.line.controller.response.LineReservationDateSelectResponse;
import com.reservio.line.controller.response.LineReservationDateStatusResponse;
import com.reservio.line.service.LineReservationDateSelectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/line/reservation-dates")
public class LineReservationDateController {

    private final LineReservationDateSelectionService service;

    public LineReservationDateController(LineReservationDateSelectionService service) {
        this.service = service;
    }

    @GetMapping("/{token}")
    public ResponseEntity<ApiResponse<LineReservationDateStatusResponse>> status(
            @PathVariable String token) {
        return ResponseEntity.ok(ApiResponse.<LineReservationDateStatusResponse>builder()
                .success(true)
                .message("OK")
                .data(service.status(token))
                .build());
    }

    @PostMapping("/{token}")
    public ResponseEntity<ApiResponse<LineReservationDateSelectResponse>> select(
            @PathVariable String token,
            @RequestBody LineReservationDateSelectRequest request) {
        return ResponseEntity.ok(ApiResponse.<LineReservationDateSelectResponse>builder()
                .success(true)
                .message("OK")
                .data(service.select(token, request.date()))
                .build());
    }
}

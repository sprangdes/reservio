package com.reservio.controller;

import com.reservio.controller.response.ApiResponse;
import com.reservio.controller.response.SessionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api")
public class SessionController {

    private final Duration sessionTimeout;
    private final int warningSeconds;

    public SessionController(
            @Value("${server.servlet.session.timeout}") Duration sessionTimeout,
            @Value("${app.session.warning-seconds:60}") int warningSeconds) {
        this.sessionTimeout = sessionTimeout;
        this.warningSeconds = warningSeconds;
    }

    @GetMapping("/session")
    public ResponseEntity<ApiResponse<SessionResponse>> session() {
        return ResponseEntity.ok(ApiResponse.<SessionResponse>builder()
                .success(true)
                .message("OK")
                .data(SessionResponse.builder()
                        .timeoutSeconds(sessionTimeout.toSeconds())
                        .warningSeconds(warningSeconds)
                        .build())
                .build());
    }
}

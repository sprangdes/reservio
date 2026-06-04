package com.reservio.controller;

import com.reservio.controller.response.ApiResponse;
import com.reservio.controller.response.SessionResponse;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class SessionControllerTest {

    @Test
    void sessionReturnsTimeoutAndWarningSeconds() {
        SessionController controller = new SessionController(Duration.ofMinutes(30), 60);

        ApiResponse<SessionResponse> body = controller.session().getBody();

        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isNotNull();
        assertThat(body.getData().getTimeoutSeconds()).isEqualTo(1800);
        assertThat(body.getData().getWarningSeconds()).isEqualTo(60);
    }
}

package com.reservio.exception;

import com.reservio.controller.response.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class ApiExceptionHandlerTest {

    @Test
    void nonBusinessAccountReturnsForbidden() {
        ResponseEntity<ApiResponse<Void>> response = new ApiExceptionHandler()
                .handleNotBusinessAccount(new NotBusinessAccountException("用戶為非商家帳號"));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("用戶為非商家帳號");
    }
}

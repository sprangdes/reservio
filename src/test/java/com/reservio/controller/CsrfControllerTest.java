package com.reservio.controller;

import com.reservio.controller.response.CsrfResponse;
import org.junit.jupiter.api.Test;
import org.springframework.security.web.csrf.CsrfToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CsrfControllerTest {

    @Test
    void csrfReturnsTokenAndHeaderName() {
        CsrfToken token = mock(CsrfToken.class);
        when(token.getHeaderName()).thenReturn("X-XSRF-TOKEN");
        when(token.getToken()).thenReturn("csrf-token");

        CsrfResponse response = new CsrfController().csrf(token);

        assertThat(response.getHeaderName()).isEqualTo("X-XSRF-TOKEN");
        assertThat(response.getToken()).isEqualTo("csrf-token");
    }
}

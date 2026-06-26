package com.reservio.line.service;

import com.reservio.line.config.LineMessagingProperties;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LineReservationDateTokenServiceTest {

    private final Clock clock = Clock.fixed(
            Instant.parse("2026-06-25T01:00:00Z"),
            ZoneId.of("Asia/Taipei")
    );
    private final LineReservationDateTokenService service = new LineReservationDateTokenService(
            new LineMessagingProperties(
                    Base64.getEncoder().encodeToString("01234567890123456789012345678901".getBytes()),
                    "https://www.reserv-io.com"
            ),
            clock
    );

    @Test
    void createsAndVerifiesSignedDateSelectionToken() {
        String token = service.create(8L, "line-user", 20L);

        LineReservationDateTokenPayload payload = service.verify(token);

        assertThat(payload.businessId()).isEqualTo(8L);
        assertThat(payload.lineUserId()).isEqualTo("line-user");
        assertThat(payload.serviceItemId()).isEqualTo(20L);
    }

    @Test
    void rejectsTamperedToken() {
        String token = service.create(8L, "line-user", 20L);

        assertThatThrownBy(() -> service.verify(token + "x"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("無效");
    }
}

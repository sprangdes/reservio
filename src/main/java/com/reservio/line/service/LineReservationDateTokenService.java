package com.reservio.line.service;

import com.reservio.line.config.LineMessagingProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;

@Component
public class LineReservationDateTokenService {

    private static final long TOKEN_TTL_SECONDS = 30 * 60L;
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final LineMessagingProperties properties;
    private final Clock clock;

    @Autowired
    public LineReservationDateTokenService(LineMessagingProperties properties) {
        this(properties, Clock.systemDefaultZone());
    }

    LineReservationDateTokenService(LineMessagingProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public String create(Long businessId, String lineUserId, Long serviceItemId) {
        long expiresAt = Instant.now(clock).plusSeconds(TOKEN_TTL_SECONDS).getEpochSecond();
        String payload = businessId + "|" + base64(lineUserId) + "|" + serviceItemId + "|" + expiresAt;
        return base64(payload) + "." + sign(payload);
    }

    public LineReservationDateTokenPayload verify(String token) {
        if (token == null || token.isBlank() || !token.contains(".")) {
            throw invalid();
        }
        String[] parts = token.split("\\.", 2);
        String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException exception) {
            throw invalid();
        }
        if (!constantTimeEquals(sign(payload), parts[1])) {
            throw invalid();
        }
        String[] fields = payload.split("\\|", 4);
        if (fields.length != 4) {
            throw invalid();
        }
        try {
            long expiresAt = Long.parseLong(fields[3]);
            if (expiresAt < Instant.now(clock).getEpochSecond()) {
                throw new IllegalArgumentException("日期選擇連結已過期，請回 LINE 重新操作。");
            }
            return new LineReservationDateTokenPayload(
                    Long.parseLong(fields[0]),
                    new String(Base64.getUrlDecoder().decode(fields[1]), StandardCharsets.UTF_8),
                    Long.parseLong(fields[2]),
                    expiresAt
            );
        } catch (IllegalArgumentException exception) {
            if (exception.getMessage() != null && exception.getMessage().contains("過期")) {
                throw exception;
            }
            throw invalid();
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret(), HMAC_ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("日期選擇連結簽章失敗", exception);
        }
    }

    private byte[] secret() {
        String key = properties.credentialEncryptionKey();
        try {
            return Base64.getDecoder().decode(key);
        } catch (IllegalArgumentException exception) {
            return key.getBytes(StandardCharsets.UTF_8);
        }
    }

    private String base64(String value) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private boolean constantTimeEquals(String left, String right) {
        return MessageDigestSupport.equals(
                left.getBytes(StandardCharsets.UTF_8),
                right.getBytes(StandardCharsets.UTF_8)
        );
    }

    private IllegalArgumentException invalid() {
        return new IllegalArgumentException("日期選擇連結無效，請回 LINE 重新操作。");
    }

    private static class MessageDigestSupport {
        private static boolean equals(byte[] left, byte[] right) {
            if (left.length != right.length) {
                return false;
            }
            int result = 0;
            for (int i = 0; i < left.length; i++) {
                result |= left[i] ^ right[i];
            }
            return result == 0;
        }
    }
}

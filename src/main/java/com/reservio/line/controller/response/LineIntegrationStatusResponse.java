package com.reservio.line.controller.response;

import java.time.LocalDateTime;

public record LineIntegrationStatusResponse(
        boolean configured,
        boolean enabled,
        boolean webhookReady,
        String webhookMessage,
        boolean tokenValid,
        String tokenMessage,
        boolean richMenuReady,
        String richMenuMessage,
        String richMenuId,
        LocalDateTime checkedAt
) {
}

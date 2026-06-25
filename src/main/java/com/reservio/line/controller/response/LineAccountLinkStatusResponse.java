package com.reservio.line.controller.response;

import java.time.LocalDateTime;

public record LineAccountLinkStatusResponse(
        String businessName,
        String status,
        LocalDateTime expiresAt) {
}

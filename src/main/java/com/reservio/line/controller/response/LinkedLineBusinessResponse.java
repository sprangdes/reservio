package com.reservio.line.controller.response;

import java.time.LocalDateTime;

public record LinkedLineBusinessResponse(
        Long lineCustomerId,
        Long businessId,
        String businessName,
        LocalDateTime linkedAt) {
}

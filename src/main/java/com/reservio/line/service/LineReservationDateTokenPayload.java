package com.reservio.line.service;

public record LineReservationDateTokenPayload(
        Long businessId,
        String lineUserId,
        Long serviceItemId,
        long expiresAtEpochSecond) {
}

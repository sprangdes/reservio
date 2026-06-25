package com.reservio.line.service;

public record LineDataRetentionResult(
        long deletedEvents,
        long deletedConversations
) {
}

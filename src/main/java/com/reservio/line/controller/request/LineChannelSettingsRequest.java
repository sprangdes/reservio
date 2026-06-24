package com.reservio.line.controller.request;

public record LineChannelSettingsRequest(
        String channelId,
        String channelSecret,
        String accessToken,
        boolean enabled
) {
}

package com.reservio.line.controller.response;

public record LineChannelSettingsResponse(
        boolean configured,
        boolean enabled,
        String channelId,
        String channelSecretMasked,
        String accessTokenMasked,
        String webhookUrl
) {
    public static LineChannelSettingsResponse unconfigured() {
        return new LineChannelSettingsResponse(false, false, null, null, null, null);
    }
}

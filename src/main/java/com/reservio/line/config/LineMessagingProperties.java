package com.reservio.line.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.line.messaging")
public record LineMessagingProperties(
        String credentialEncryptionKey,
        String webhookBaseUrl
) {
}

package com.reservio.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public record LineOAuth2Properties(
        String successRedirectPath,
        String failureRedirectPath
) {
}

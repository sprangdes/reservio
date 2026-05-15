package com.reservio.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "otp")
public class OtpProperties {
    private int expireMinute = 10;
    private int maxAttempts = 5;
}

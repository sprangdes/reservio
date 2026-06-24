package com.reservio.line.config;

import com.reservio.line.security.LineCredentialCipher;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(LineMessagingProperties.class)
public class LineMessagingConfig {

    @Bean
    public LineCredentialCipher lineCredentialCipher(LineMessagingProperties properties) {
        return new LineCredentialCipher(properties.credentialEncryptionKey());
    }
}

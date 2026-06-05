package com.reservio.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.mail")
public class AppMailProperties {

    private String from = "noreply@reserv-io.com";
    private String senderName = "Reservio";
    private String replyTo = "support@reserv-io.com";
    private String passwordResetSubject = "Reservio 密碼重設驗證碼";
}

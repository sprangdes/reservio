package com.reservio.service;

import com.reservio.config.AppMailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

@Service
public class PasswordResetMailService {

    private final JavaMailSender mailSender;
    private final AppMailProperties mailProperties;

    public PasswordResetMailService(JavaMailSender sender, AppMailProperties mailProperties) {
        this.mailSender = sender;
        this.mailProperties = mailProperties;
    }

    public void sendPasswordResetOtp(String recipientEmail, String otp, int expireMinutes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(new InternetAddress(
                    mailProperties.getFrom(),
                    mailProperties.getSenderName(),
                    StandardCharsets.UTF_8.name()
            ));
            helper.setTo(recipientEmail);
            if (mailProperties.getReplyTo() != null && !mailProperties.getReplyTo().isBlank()) {
                helper.setReplyTo(mailProperties.getReplyTo());
            }
            helper.setSubject(mailProperties.getPasswordResetSubject());
            helper.setText(buildPlainText(otp, expireMinutes), buildHtml(otp, expireMinutes));

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new IllegalStateException("密碼重設信件建立失敗", e);
        }
    }

    private String buildPlainText(String otp, int expireMinutes) {
        return """
                您好，

                您正在重設 Reservio 帳號密碼。

                您的驗證碼是：

                %s

                此驗證碼將於 %d 分鐘後失效。若您沒有要求重設密碼，請忽略此信，您的密碼不會被變更。

                Reservio
                """.formatted(otp, expireMinutes);
    }

    private String buildHtml(String otp, int expireMinutes) {
        return """
                <!doctype html>
                <html lang="zh-Hant">
                <body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
                  <main style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:28px;">
                    <h1 style="font-size:20px;line-height:1.4;margin:0 0 16px;">Reservio 密碼重設驗證碼</h1>
                    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">您好，您正在重設 Reservio 帳號密碼。</p>
                    <p style="font-size:15px;line-height:1.7;margin:0 0 8px;">您的驗證碼是：</p>
                    <div style="font-size:32px;font-weight:700;letter-spacing:6px;line-height:1.3;margin:0 0 18px;color:#111827;">%s</div>
                    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">此驗證碼將於 %d 分鐘後失效。</p>
                    <p style="font-size:13px;line-height:1.7;margin:0;color:#6b7280;">若您沒有要求重設密碼，請忽略此信，您的密碼不會被變更。</p>
                  </main>
                </body>
                </html>
                """.formatted(otp, expireMinutes);
    }
}

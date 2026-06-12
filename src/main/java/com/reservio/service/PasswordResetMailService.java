package com.reservio.service;

import com.reservio.config.AppMailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

@Service
public class PasswordResetMailService {
    private static final String BRAND_NAME = "Reservio";
    private static final String PREHEADER_STYLE = "display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:#f6f7fb;";
    private static final String BODY_STYLE = "margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC','PingFang TC','Microsoft JhengHei',Arial,sans-serif;color:#3f335c;";
    private static final String WRAPPER_STYLE = "width:100%;background:#f6f7fb;padding:32px 16px;";
    private static final String CONTAINER_STYLE = "max-width:600px;margin:0 auto;background:#ffffff;border:1px solid rgba(118,75,162,0.16);border-radius:8px;overflow:hidden;box-shadow:0 16px 36px rgba(45,34,76,0.14);";
    private static final String HEADER_STYLE = "padding:24px 28px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;";
    private static final String BRAND_STYLE = "margin:0;font-size:18px;line-height:1.4;font-weight:800;letter-spacing:0.03125em;";
    private static final String TITLE_STYLE = "margin:8px 0 0;font-size:22px;line-height:1.35;font-weight:800;";
    private static final String CONTENT_STYLE = "padding:28px;";
    private static final String PARAGRAPH_STYLE = "font-size:15px;line-height:1.8;margin:0 0 16px;color:#3f335c;";
    private static final String MUTED_STYLE = "font-size:13px;line-height:1.7;margin:0;color:#8b86a0;";
    private static final String OTP_STYLE = "margin:2px 0 20px;padding:18px 20px;border:1px solid rgba(118,75,162,0.14);border-radius:8px;background:rgba(102,126,234,0.08);color:#3f335c;font-size:34px;line-height:1.25;font-weight:800;letter-spacing:6px;text-align:center;";
    private static final String NOTICE_STYLE = "margin:0 0 18px;padding:12px 14px;border-left:4px solid #ffc107;border-radius:6px;background:rgba(255,193,7,0.14);color:#5f4300;font-size:14px;line-height:1.7;";
    private static final String FOOTER_STYLE = "padding:18px 28px;border-top:1px solid rgba(118,75,162,0.12);background:#ffffff;color:#8b86a0;font-size:12px;line-height:1.7;";

    private final JavaMailSender mailSender;
    private final AppMailProperties mailProperties;

    public PasswordResetMailService(JavaMailSender sender, AppMailProperties mailProperties) {
        this.mailSender = sender;
        this.mailProperties = mailProperties;
    }

    public void sendPasswordResetOtp(String recipientEmail, String otp, int expireMinutes) {
        send(recipientEmail, mailProperties.getPasswordResetSubject(),
                buildPlainText(otp, expireMinutes), buildHtml(otp, expireMinutes));
    }

    public void sendEmailVerificationOtp(String recipientEmail, String otp, int expireMinutes) {
        send(recipientEmail, "Reservio Email 驗證碼",
                "您的 Reservio Email 驗證碼是 %s，將於 %d 分鐘後失效。".formatted(otp, expireMinutes),
                buildOtpHtml("Email 驗證碼", "您好，請使用以下驗證碼完成 Reservio Email 驗證。", otp,
                        "此驗證碼將於 %d 分鐘後失效。".formatted(expireMinutes),
                        "若您沒有要求驗證 Email，請忽略此信。"));
    }

    public void sendNotification(String recipientEmail, String subject, String content) {
        send(recipientEmail, subject, content, buildNotificationHtml(subject, content));
    }

    private void send(String recipientEmail, String subject, String plainText, String html) {
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
            helper.setSubject(subject);
            helper.setText(plainText, html);

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
        return buildOtpHtml("密碼重設驗證碼", "您好，您正在重設 Reservio 帳號密碼。", otp,
                "此驗證碼將於 %d 分鐘後失效。".formatted(expireMinutes),
                "若您沒有要求重設密碼，請忽略此信，您的密碼不會被變更。");
    }

    private String buildOtpHtml(String title, String intro, String otp, String notice, String mutedText) {
        String content = """
                <p style="%s">%s</p>
                <p style="%s">您的驗證碼是：</p>
                <div style="%s">%s</div>
                <p style="%s">%s</p>
                <p style="%s">%s</p>
                """.formatted(PARAGRAPH_STYLE, HtmlUtils.htmlEscape(intro), PARAGRAPH_STYLE, OTP_STYLE,
                HtmlUtils.htmlEscape(otp), NOTICE_STYLE, HtmlUtils.htmlEscape(notice), MUTED_STYLE,
                HtmlUtils.htmlEscape(mutedText));
        return buildBrandedHtml(title, intro, content);
    }

    private String buildNotificationHtml(String subject, String content) {
        String escapedContent = HtmlUtils.htmlEscape(content)
                .replace("\r\n", "\n")
                .replace("\r", "\n")
                .replace("\n", "<br>");
        String body = """
                <p style="%s">%s</p>
                <p style="%s">您也可以登入 Reservio 查看最新預約與通知狀態。</p>
                """.formatted(PARAGRAPH_STYLE, escapedContent, MUTED_STYLE);
        return buildBrandedHtml(subject, content, body);
    }

    private String buildBrandedHtml(String title, String preheader, String contentHtml) {
        return """
                <!doctype html>
                <html lang="zh-Hant">
                <body style="%s">
                  <div style="%s">%s</div>
                  <div style="%s">
                    <main style="%s">
                      <header style="%s">
                        <p style="%s">%s</p>
                        <h1 style="%s">%s</h1>
                      </header>
                      <section style="%s">
                        %s
                      </section>
                      <footer style="%s">這封信由 Reservio 系統自動寄出，請勿直接回覆。</footer>
                    </main>
                  </div>
                </body>
                </html>
                """.formatted(BODY_STYLE, PREHEADER_STYLE, HtmlUtils.htmlEscape(preheader), WRAPPER_STYLE,
                CONTAINER_STYLE, HEADER_STYLE, BRAND_STYLE, BRAND_NAME, TITLE_STYLE, HtmlUtils.htmlEscape(title),
                CONTENT_STYLE, contentHtml, FOOTER_STYLE);
    }
}

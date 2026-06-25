package com.reservio.line.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.line.controller.response.LineIntegrationStatusResponse;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.service.UserDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class LineRichMenuService {

    private static final Logger log = LoggerFactory.getLogger(LineRichMenuService.class);
    public static final String BOOK_ACTION = "reservio.action=book";
    public static final String MY_RESERVATIONS_ACTION = "reservio.action=my_reservations";
    public static final String AVAILABILITY_ACTION = "reservio.action=availability";

    private static final int WIDTH = 2500;
    private static final int HEIGHT = 843;

    private final BusinessLineChannelRepo channelRepo;
    private final UserDataService userDataService;
    private final LineMessagingClient messagingClient;
    private final LineMessagingProperties properties;

    public LineRichMenuService(
            BusinessLineChannelRepo channelRepo,
            UserDataService userDataService,
            LineMessagingClient messagingClient,
            LineMessagingProperties properties) {
        this.channelRepo = channelRepo;
        this.userDataService = userDataService;
        this.messagingClient = messagingClient;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public LineIntegrationStatusResponse getStatus() {
        return toStatus(currentChannel(), null, null);
    }

    @Transactional
    public LineIntegrationStatusResponse testConnection() {
        BusinessLineChannel channel = currentChannel();
        try {
            String displayName = messagingClient.getBotDisplayName(channel);
            channel.setTokenValidatedAt(LocalDateTime.now());

            LineWebhookEndpoint webhook = messagingClient.getWebhookEndpoint(channel);
            String expectedWebhook = webhookUrl(channel);
            boolean webhookReady = webhook.active() && expectedWebhook.equals(webhook.endpoint());
            channel.setWebhookVerifiedAt(webhookReady ? LocalDateTime.now() : null);
            channelRepo.save(channel);

            String webhookMessage;
            if (!webhook.active()) {
                webhookMessage = "LINE Developers Console 尚未啟用 Webhook";
            } else if (!expectedWebhook.equals(webhook.endpoint())) {
                webhookMessage = "LINE Webhook URL 與 Reservio 顯示的網址不一致";
            } else {
                webhookMessage = "Webhook URL 已設定且啟用";
            }
            return toStatus(
                    channel,
                    "Token 有效，官方帳號：" + displayName,
                    webhookMessage
            );
        } catch (LineApiException exception) {
            throw translate(exception);
        }
    }

    @Transactional
    public LineIntegrationStatusResponse provisionRichMenu() {
        BusinessLineChannel channel = currentChannel();
        String oldRichMenuId = channel.getRichMenuId();
        try {
            String newRichMenuId = messagingClient.createRichMenu(channel, richMenuDefinition());
            messagingClient.uploadRichMenuImage(channel, newRichMenuId, renderRichMenuImage());
            messagingClient.setDefaultRichMenu(channel, newRichMenuId);
            if (oldRichMenuId != null && !oldRichMenuId.isBlank()
                    && !oldRichMenuId.equals(newRichMenuId)) {
                try {
                    messagingClient.deleteRichMenu(channel, oldRichMenuId);
                } catch (LineApiException exception) {
                    log.warn(
                            "line_rich_menu_cleanup_failed business_id={} error_type={}",
                            channel.getBusiness().getId(),
                            exception.getError()
                    );
                }
            }
            channel.setRichMenuId(newRichMenuId);
            channel.setRichMenuUpdatedAt(LocalDateTime.now());
            channelRepo.save(channel);
            return toStatus(channel, null, null);
        } catch (LineApiException exception) {
            throw translate(exception);
        }
    }

    public static Map<String, Object> richMenuDefinition() {
        int third = WIDTH / 3;
        return Map.of(
                "size", Map.of("width", WIDTH, "height", HEIGHT),
                "selected", true,
                "name", "Reservio 預約選單",
                "chatBarText", "預約服務",
                "areas", List.of(
                        area(0, third, "立即預約", BOOK_ACTION),
                        area(third, third, "我的預約", MY_RESERVATIONS_ACTION),
                        area(third * 2, WIDTH - third * 2, "查詢可預約時段", AVAILABILITY_ACTION)
                )
        );
    }

    private static Map<String, Object> area(
            int x,
            int width,
            String label,
            String data) {
        return Map.of(
                "bounds", Map.of("x", x, "y", 0, "width", width, "height", HEIGHT),
                "action", Map.of(
                        "type", "postback",
                        "label", label,
                        "data", data,
                        "displayText", label
                )
        );
    }

    private byte[] renderRichMenuImage() {
        System.setProperty("java.awt.headless", "true");
        BufferedImage image = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setRenderingHint(
                    RenderingHints.KEY_ANTIALIASING,
                    RenderingHints.VALUE_ANTIALIAS_ON
            );
            Color[] colors = {
                    new Color(34, 166, 91),
                    new Color(230, 236, 240),
                    new Color(230, 236, 240)
            };
            String[] labels = {"立即預約", "我的預約", "查詢可預約時段"};
            int third = WIDTH / 3;
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 72));
            FontMetrics metrics = graphics.getFontMetrics();
            for (int index = 0; index < 3; index++) {
                int x = index * third;
                int width = index == 2 ? WIDTH - x : third;
                graphics.setColor(colors[index]);
                graphics.fillRect(x, 0, width, HEIGHT);
                graphics.setColor(index == 0 ? Color.WHITE : new Color(80, 92, 101));
                String label = labels[index];
                int textX = x + (width - metrics.stringWidth(label)) / 2;
                int textY = (HEIGHT - metrics.getHeight()) / 2 + metrics.getAscent();
                graphics.drawString(label, textX, textY);
            }
        } finally {
            graphics.dispose();
        }
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Rich Menu 圖片產生失敗", exception);
        }
    }

    private LineIntegrationStatusResponse toStatus(
            BusinessLineChannel channel,
            String tokenMessage,
            String webhookMessage) {
        boolean tokenValid = channel.getTokenValidatedAt() != null;
        boolean webhookReady = channel.getWebhookVerifiedAt() != null;
        boolean richMenuReady = channel.getRichMenuId() != null
                && channel.getRichMenuUpdatedAt() != null;
        LocalDateTime checkedAt = latest(
                channel.getTokenValidatedAt(),
                channel.getWebhookVerifiedAt(),
                channel.getRichMenuUpdatedAt()
        );
        return new LineIntegrationStatusResponse(
                true,
                channel.isEnabled(),
                webhookReady,
                webhookMessage != null
                        ? webhookMessage
                        : webhookReady ? "Webhook URL 已驗證" : "尚未驗證 Webhook URL",
                tokenValid,
                tokenMessage != null
                        ? tokenMessage
                        : tokenValid ? "Channel Access Token 已驗證" : "尚未驗證 Token",
                richMenuReady,
                richMenuReady ? "Rich Menu 已建立" : "尚未建立 Rich Menu",
                channel.getRichMenuId(),
                checkedAt
        );
    }

    private LocalDateTime latest(LocalDateTime... values) {
        LocalDateTime latest = null;
        for (LocalDateTime value : values) {
            if (value != null && (latest == null || value.isAfter(latest))) {
                latest = value;
            }
        }
        return latest;
    }

    private RuntimeException translate(LineApiException exception) {
        return switch (exception.getError()) {
            case AUTHORIZATION -> new IllegalArgumentException(
                    "Channel Access Token 無效或沒有權限，請重新確認 LINE 設定");
            case RATE_LIMIT -> new IllegalStateException(
                    "LINE API 呼叫次數已達上限，請稍後再試");
            case TIMEOUT -> new IllegalStateException(
                    "LINE API 連線逾時，請稍後再試");
            case OTHER -> new IllegalStateException(
                    "LINE API 操作失敗，請稍後再試");
        };
    }

    private BusinessLineChannel currentChannel() {
        UserData user = userDataService.getCurrentUser();
        BusinessData business = user == null ? null : user.getBusinessData();
        if (business == null) {
            throw new NotBusinessAccountException("用戶為非商家帳號");
        }
        return channelRepo.findByBusinessId(business.getId())
                .orElseThrow(() -> new IllegalStateException("尚未設定 LINE Messaging API"));
    }

    private String webhookUrl(BusinessLineChannel channel) {
        return properties.webhookBaseUrl().replaceAll("/+$", "")
                + "/api/integrations/line/webhook/"
                + channel.getWebhookKey();
    }
}

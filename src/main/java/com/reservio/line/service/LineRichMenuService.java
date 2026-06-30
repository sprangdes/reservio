package com.reservio.line.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.line.controller.response.LineIntegrationStatusResponse;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.repo.LineCustomerRepo;
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
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LineRichMenuService {

    private static final Logger log = LoggerFactory.getLogger(LineRichMenuService.class);
    public static final String BOOK_ACTION = "reservio.action=book";
    public static final String MY_RESERVATIONS_ACTION = "reservio.action=my_reservations";
    public static final String AVAILABILITY_ACTION = "reservio.action=availability";
    public static final String LINK_ACCOUNT_ACTION = "reservio.action=link_account";

    private static final int WIDTH = 2500;
    private static final int HEIGHT = 843;
    private static final int FONT_SIZE = 100;
    private static final int ICON_SIZE = 170;
    private static final List<String> UNLINKED_DISPLAY_LABELS = List.of(
            "立即預約",
            "我的預約",
            "綁定 LINE 帳號"
    );
    private static final List<String> LINKED_DISPLAY_LABELS = List.of(
            "立即預約",
            "我的預約",
            "修改我的資料"
    );
    private static final List<String> PREFERRED_FONT_FAMILIES = List.of(
            "Noto Sans CJK TC",
            "Noto Sans TC",
            "PingFang TC",
            "Microsoft JhengHei"
    );

    private final BusinessLineChannelRepo channelRepo;
    private final LineCustomerRepo customerRepo;
    private final UserDataService userDataService;
    private final LineMessagingClient messagingClient;
    private final LineMessagingProperties properties;

    public LineRichMenuService(
            BusinessLineChannelRepo channelRepo,
            LineCustomerRepo customerRepo,
            UserDataService userDataService,
            LineMessagingClient messagingClient,
            LineMessagingProperties properties) {
        this.channelRepo = channelRepo;
        this.customerRepo = customerRepo;
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
        String oldUnlinkedRichMenuId = channel.getRichMenuId();
        String oldLinkedRichMenuId = channel.getLinkedRichMenuId();
        String newUnlinkedRichMenuId = null;
        String newLinkedRichMenuId = null;
        try {
            newUnlinkedRichMenuId = messagingClient.createRichMenu(
                    channel,
                    unlinkedRichMenuDefinition()
            );
            messagingClient.uploadRichMenuImage(
                    channel,
                    newUnlinkedRichMenuId,
                    renderRichMenuImage(UNLINKED_DISPLAY_LABELS)
            );
            newLinkedRichMenuId = messagingClient.createRichMenu(
                    channel,
                    linkedRichMenuDefinition(profileUrl())
            );
            messagingClient.uploadRichMenuImage(
                    channel,
                    newLinkedRichMenuId,
                    renderRichMenuImage(LINKED_DISPLAY_LABELS)
            );
            messagingClient.setDefaultRichMenu(channel, newUnlinkedRichMenuId);
            for (var customer : customerRepo.findAllByBusinessIdAndLinkedUserIsNotNull(
                    channel.getBusiness().getId())) {
                messagingClient.linkRichMenuToUser(
                        channel,
                        customer.getLineUserId(),
                        newLinkedRichMenuId
                );
            }
            channel.setRichMenuId(newUnlinkedRichMenuId);
            channel.setLinkedRichMenuId(newLinkedRichMenuId);
            channel.setRichMenuUpdatedAt(LocalDateTime.now());
            channelRepo.save(channel);
            cleanupOldMenu(channel, oldUnlinkedRichMenuId, newUnlinkedRichMenuId);
            cleanupOldMenu(channel, oldLinkedRichMenuId, newLinkedRichMenuId);
            return toStatus(channel, null, null);
        } catch (LineApiException exception) {
            cleanupNewMenu(channel, newUnlinkedRichMenuId);
            cleanupNewMenu(channel, newLinkedRichMenuId);
            throw translate(exception);
        }
    }

    public void assignLinkedMenu(BusinessLineChannel channel, String lineUserId) {
        if (channel.getLinkedRichMenuId() == null || channel.getLinkedRichMenuId().isBlank()) {
            throw new IllegalStateException("尚未建立已綁定 Rich Menu");
        }
        messagingClient.linkRichMenuToUser(
                channel,
                lineUserId,
                channel.getLinkedRichMenuId()
        );
    }

    public void removeLinkedMenu(BusinessLineChannel channel, String lineUserId) {
        messagingClient.unlinkRichMenuFromUser(channel, lineUserId);
    }

    public static Map<String, Object> richMenuDefinition() {
        return unlinkedRichMenuDefinition();
    }

    public static Map<String, Object> unlinkedRichMenuDefinition() {
        int third = WIDTH / 3;
        return Map.of(
                "size", Map.of("width", WIDTH, "height", HEIGHT),
                "selected", true,
                "name", "Reservio 預約選單（未綁定）",
                "chatBarText", "預約服務",
                "areas", List.of(
                        area(0, third, "立即預約", BOOK_ACTION),
                        area(third, third, "我的預約", MY_RESERVATIONS_ACTION),
                        area(third * 2, WIDTH - third * 2, "綁定 LINE 帳號", LINK_ACCOUNT_ACTION)
                )
        );
    }

    public static Map<String, Object> linkedRichMenuDefinition(String profileUrl) {
        int third = WIDTH / 3;
        return Map.of(
                "size", Map.of("width", WIDTH, "height", HEIGHT),
                "selected", true,
                "name", "Reservio 預約選單（已綁定）",
                "chatBarText", "預約服務",
                "areas", List.of(
                        area(0, third, "立即預約", BOOK_ACTION),
                        area(third, third, "我的預約", MY_RESERVATIONS_ACTION),
                        uriArea(
                                third * 2,
                                WIDTH - third * 2,
                                "修改我的資料",
                                profileUrl
                        )
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

    private static Map<String, Object> uriArea(
            int x,
            int width,
            String label,
            String uri) {
        return Map.of(
                "bounds", Map.of("x", x, "y", 0, "width", width, "height", HEIGHT),
                "action", Map.of(
                        "type", "uri",
                        "label", label,
                        "uri", uri
                )
        );
    }

    static String preferredFontFamily(Set<String> availableFamilies) {
        return PREFERRED_FONT_FAMILIES.stream()
                .filter(availableFamilies::contains)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Rich Menu 圖片產生失敗：執行環境缺少可用的中文字型"));
    }

    private byte[] renderRichMenuImage(List<String> displayLabels) {
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
            Color[] foregrounds = {
                    Color.WHITE,
                    new Color(80, 92, 101),
                    new Color(80, 92, 101)
            };
            int third = WIDTH / 3;
            Set<String> availableFamilies = Arrays.stream(
                            GraphicsEnvironment.getLocalGraphicsEnvironment()
                                    .getAvailableFontFamilyNames())
                    .collect(Collectors.toSet());
            Font font = new Font(
                    preferredFontFamily(availableFamilies),
                    Font.BOLD,
                    FONT_SIZE
            );
            displayLabels.forEach(label -> {
                if (font.canDisplayUpTo(label) != -1) {
                    throw new IllegalStateException(
                            "Rich Menu 圖片產生失敗：中文字型無法顯示選單文字");
                }
            });
            graphics.setFont(font);
            for (int index = 0; index < 3; index++) {
                int x = index * third;
                int width = index == 2 ? WIDTH - x : third;
                drawMenuItem(
                        graphics,
                        x,
                        width,
                        colors[index],
                        foregrounds[index],
                        displayLabels.get(index),
                        index
                );
                if (index > 0) {
                    graphics.setColor(new Color(210, 219, 226));
                    graphics.fillRect(x, 0, 4, HEIGHT);
                }
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

    private void drawMenuItem(
            Graphics2D graphics,
            int x,
            int width,
            Color background,
            Color foreground,
            String label,
            int iconIndex) {
        graphics.setColor(background);
        graphics.fillRect(x, 0, width, HEIGHT);
        graphics.setColor(foreground);
        graphics.setStroke(new BasicStroke(18, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        int centerX = x + width / 2;
        int iconTop = 185;
        switch (iconIndex) {
            case 0 -> drawCalendarPlusIcon(graphics, centerX, iconTop);
            case 1 -> drawListClockIcon(graphics, centerX, iconTop);
            case 2 -> drawSearchClockIcon(graphics, centerX, iconTop);
            default -> throw new IllegalArgumentException("Unknown rich menu icon index: " + iconIndex);
        }
        graphics.setFont(graphics.getFont().deriveFont(Font.BOLD, (float) FONT_SIZE));
        FontMetrics metrics = graphics.getFontMetrics();
        int textX = x + (width - metrics.stringWidth(label)) / 2;
        int textY = 570 + metrics.getAscent() / 2;
        graphics.drawString(label, textX, textY);
    }

    private void drawCalendarPlusIcon(Graphics2D graphics, int centerX, int top) {
        int left = centerX - ICON_SIZE / 2;
        int width = ICON_SIZE;
        int height = 150;
        graphics.drawRoundRect(left, top + 22, width, height, 24, 24);
        graphics.drawLine(left, top + 70, left + width, top + 70);
        graphics.drawLine(left + 45, top, left + 45, top + 42);
        graphics.drawLine(left + width - 45, top, left + width - 45, top + 42);
        graphics.drawLine(centerX - 35, top + 118, centerX + 35, top + 118);
        graphics.drawLine(centerX, top + 83, centerX, top + 153);
    }

    private void drawListClockIcon(Graphics2D graphics, int centerX, int top) {
        int left = centerX - ICON_SIZE / 2;
        graphics.drawRoundRect(left, top + 5, ICON_SIZE, 155, 24, 24);
        graphics.drawLine(left + 42, top + 48, left + 92, top + 48);
        graphics.drawLine(left + 42, top + 86, left + 92, top + 86);
        graphics.drawLine(left + 42, top + 124, left + 82, top + 124);
        int clockCenterX = centerX + 42;
        int clockCenterY = top + 105;
        graphics.drawOval(clockCenterX - 42, clockCenterY - 42, 84, 84);
        graphics.drawLine(clockCenterX, clockCenterY, clockCenterX, clockCenterY - 25);
        graphics.drawLine(clockCenterX, clockCenterY, clockCenterX + 23, clockCenterY + 12);
    }

    private void drawSearchClockIcon(Graphics2D graphics, int centerX, int top) {
        int glassCenterX = centerX - 22;
        int glassCenterY = top + 74;
        graphics.drawOval(glassCenterX - 54, glassCenterY - 54, 108, 108);
        graphics.drawLine(glassCenterX + 42, glassCenterY + 42, centerX + 82, top + 178);
        int clockCenterX = centerX + 35;
        int clockCenterY = top + 82;
        graphics.drawOval(clockCenterX - 42, clockCenterY - 42, 84, 84);
        graphics.drawLine(clockCenterX, clockCenterY, clockCenterX, clockCenterY - 24);
        graphics.drawLine(clockCenterX, clockCenterY, clockCenterX + 20, clockCenterY + 10);
    }

    private LineIntegrationStatusResponse toStatus(
            BusinessLineChannel channel,
            String tokenMessage,
            String webhookMessage) {
        boolean tokenValid = channel.getTokenValidatedAt() != null;
        boolean webhookReady = channel.getWebhookVerifiedAt() != null;
        boolean richMenuReady = channel.getRichMenuId() != null
                && channel.getLinkedRichMenuId() != null
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

    private String profileUrl() {
        return properties.webhookBaseUrl().replaceAll("/+$", "") + "/profile";
    }

    private void cleanupOldMenu(
            BusinessLineChannel channel,
            String oldRichMenuId,
            String newRichMenuId) {
        if (oldRichMenuId == null || oldRichMenuId.isBlank()
                || oldRichMenuId.equals(newRichMenuId)) {
            return;
        }
        cleanupNewMenu(channel, oldRichMenuId);
    }

    private void cleanupNewMenu(BusinessLineChannel channel, String richMenuId) {
        if (richMenuId == null || richMenuId.isBlank()) {
            return;
        }
        try {
            messagingClient.deleteRichMenu(channel, richMenuId);
        } catch (LineApiException exception) {
            log.warn(
                    "line_rich_menu_cleanup_failed business_id={} error_type={}",
                    channel.getBusiness().getId(),
                    exception.getError()
            );
        }
    }
}

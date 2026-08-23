package com.reservio.line.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.line.controller.response.LineIntegrationStatusResponse;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.entity.LineCustomer;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.repo.LineCustomerRepo;
import com.reservio.service.UserDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineRichMenuServiceTest {

    @Mock private BusinessLineChannelRepo channelRepo;
    @Mock private LineCustomerRepo customerRepo;
    @Mock private UserDataService userDataService;
    @Mock private LineMessagingClient messagingClient;

    private LineRichMenuService service;
    private BusinessLineChannel channel;

    @BeforeEach
    void setUp() {
        BusinessData business = BusinessData.builder().id(8L).name("Reservio Salon").build();
        UserData owner = UserData.builder()
                .id(7L)
                .role("ROLE_BUSINESS")
                .businessData(business)
                .build();
        business.setUser(owner);
        channel = BusinessLineChannel.builder()
                .id(4L)
                .business(business)
                .channelId("channel-id")
                .webhookKey("webhook-key")
                .enabled(true)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();
        service = new LineRichMenuService(
                channelRepo,
                customerRepo,
                userDataService,
                messagingClient,
                new LineMessagingProperties("ignored", "https://www.reserv-io.com")
        );
        lenient().when(userDataService.getCurrentUser()).thenReturn(owner);
        lenient().when(channelRepo.findByBusinessId(8L)).thenReturn(Optional.of(channel));
    }

    @Test
    void testConnectionStoresTokenAndMatchingActiveWebhookResults() {
        when(messagingClient.getBotDisplayName(channel)).thenReturn("Reservio OA");
        when(messagingClient.getWebhookEndpoint(channel)).thenReturn(new LineWebhookEndpoint(
                "https://www.reserv-io.com/api/integrations/line/webhook/webhook-key",
                true
        ));

        LineIntegrationStatusResponse status = service.testConnection();

        assertThat(status.tokenValid()).isTrue();
        assertThat(status.tokenMessage()).contains("Reservio OA");
        assertThat(status.webhookReady()).isTrue();
        assertThat(channel.getTokenValidatedAt()).isNotNull();
        assertThat(channel.getWebhookVerifiedAt()).isNotNull();
        verify(channelRepo).save(channel);
    }

    @Test
    void mismatchedWebhookIsReportedWithoutMarkingItVerified() {
        when(messagingClient.getBotDisplayName(channel)).thenReturn("Reservio OA");
        when(messagingClient.getWebhookEndpoint(channel)).thenReturn(new LineWebhookEndpoint(
                "https://wrong.example/webhook",
                true
        ));

        LineIntegrationStatusResponse status = service.testConnection();

        assertThat(status.tokenValid()).isTrue();
        assertThat(status.webhookReady()).isFalse();
        assertThat(status.webhookMessage()).contains("不一致");
        assertThat(channel.getWebhookVerifiedAt()).isNull();
    }

    @Test
    void provisionsThreeAreaRichMenuAndStoresNewMenuId() {
        stubDualMenuCreation("richmenu-new", "richmenu-linked");

        LineIntegrationStatusResponse status = service.provisionRichMenu();

        verify(messagingClient).uploadRichMenuImage(
                org.mockito.ArgumentMatchers.eq(channel),
                org.mockito.ArgumentMatchers.eq("richmenu-new"),
                any(byte[].class)
        );
        verify(messagingClient).setDefaultRichMenu(channel, "richmenu-new");
        verify(messagingClient, never()).deleteRichMenu(any(), any());
        assertThat(channel.getRichMenuId()).isEqualTo("richmenu-new");
        assertThat(channel.getLinkedRichMenuId()).isEqualTo("richmenu-linked");
        assertThat(channel.getRichMenuUpdatedAt()).isNotNull();
        assertThat(status.richMenuReady()).isTrue();
    }

    @Test
    void provisionsBothMenusBeforeSettingDefaultAndAssignsLinkedCustomers() {
        LineCustomer linkedCustomer = LineCustomer.builder()
                .id(12L)
                .business(channel.getBusiness())
                .lineUserId("U-linked")
                .linkedUser(UserData.builder().id(30L).build())
                .build();
        when(messagingClient.createRichMenu(
                channel,
                LineRichMenuService.unlinkedRichMenuDefinition()
        )).thenReturn("richmenu-unlinked");
        when(messagingClient.createRichMenu(
                channel,
                LineRichMenuService.linkedRichMenuDefinition(
                        "https://www.reserv-io.com/profile")
        )).thenReturn("richmenu-linked");
        when(customerRepo.findAllByBusinessIdAndLinkedUserIsNotNull(8L))
                .thenReturn(java.util.List.of(linkedCustomer));

        LineIntegrationStatusResponse status = service.provisionRichMenu();

        InOrder order = inOrder(messagingClient);
        order.verify(messagingClient).createRichMenu(
                channel,
                LineRichMenuService.unlinkedRichMenuDefinition()
        );
        order.verify(messagingClient).uploadRichMenuImage(
                org.mockito.ArgumentMatchers.eq(channel),
                org.mockito.ArgumentMatchers.eq("richmenu-unlinked"),
                any(byte[].class)
        );
        order.verify(messagingClient).createRichMenu(
                channel,
                LineRichMenuService.linkedRichMenuDefinition(
                        "https://www.reserv-io.com/profile")
        );
        order.verify(messagingClient).uploadRichMenuImage(
                org.mockito.ArgumentMatchers.eq(channel),
                org.mockito.ArgumentMatchers.eq("richmenu-linked"),
                any(byte[].class)
        );
        order.verify(messagingClient).setDefaultRichMenu(channel, "richmenu-unlinked");
        order.verify(messagingClient).linkRichMenuToUser(
                channel,
                "U-linked",
                "richmenu-linked"
        );
        assertThat(channel.getRichMenuId()).isEqualTo("richmenu-unlinked");
        assertThat(channel.getLinkedRichMenuId()).isEqualTo("richmenu-linked");
        assertThat(status.richMenuReady()).isTrue();
    }

    @Test
    void assignsAndRemovesLinkedMenuForIndividualUser() {
        channel.setLinkedRichMenuId("richmenu-linked");

        service.assignLinkedMenu(channel, "U123");
        service.removeLinkedMenu(channel, "U123");

        verify(messagingClient).linkRichMenuToUser(
                channel,
                "U123",
                "richmenu-linked"
        );
        verify(messagingClient).unlinkRichMenuFromUser(channel, "U123");
    }

    @Test
    void rejectsAssignmentWhenLinkedMenuIsNotProvisioned() {
        assertThatThrownBy(() -> service.assignLinkedMenu(channel, "U123"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("已綁定 Rich Menu");
        verify(messagingClient, never()).linkRichMenuToUser(any(), any(), any());
    }

    @Test
    void failedLinkedMenuCreationKeepsOldConfigurationAndCleansNewMenu() {
        LocalDateTime previousUpdate = LocalDateTime.now().minusDays(2);
        channel.setRichMenuId("richmenu-old-unlinked");
        channel.setLinkedRichMenuId("richmenu-old-linked");
        channel.setRichMenuUpdatedAt(previousUpdate);
        when(messagingClient.createRichMenu(
                channel,
                LineRichMenuService.unlinkedRichMenuDefinition()
        )).thenReturn("richmenu-new-unlinked");
        when(messagingClient.createRichMenu(
                channel,
                LineRichMenuService.linkedRichMenuDefinition(
                        "https://www.reserv-io.com/profile")
        )).thenThrow(new LineApiException(LineApiError.OTHER, "create failed"));

        assertThatThrownBy(service::provisionRichMenu)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("LINE API");

        assertThat(channel.getRichMenuId()).isEqualTo("richmenu-old-unlinked");
        assertThat(channel.getLinkedRichMenuId()).isEqualTo("richmenu-old-linked");
        assertThat(channel.getRichMenuUpdatedAt()).isEqualTo(previousUpdate);
        verify(messagingClient).deleteRichMenu(channel, "richmenu-new-unlinked");
        verify(channelRepo, never()).save(channel);
    }

    @Test
    void renderedRichMenuImageContainsLargeIconLabels() throws IOException {
        stubDualMenuCreation("richmenu-new", "richmenu-linked");
        ArgumentCaptor<byte[]> imageCaptor = ArgumentCaptor.forClass(byte[].class);

        service.provisionRichMenu();

        verify(messagingClient).uploadRichMenuImage(
                org.mockito.ArgumentMatchers.eq(channel),
                org.mockito.ArgumentMatchers.eq("richmenu-new"),
                imageCaptor.capture()
        );
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageCaptor.getValue()));
        assertThat(image.getWidth()).isEqualTo(2500);
        assertThat(image.getHeight()).isEqualTo(843);
        assertThat(countNearWhitePixels(image, 370, 190, 460, 340))
                .isGreaterThan(80);
        assertThat(countDarkPixels(image, 1200, 190, 1290, 340))
                .isGreaterThan(80);
        assertThat(countDarkPixels(image, 2035, 190, 2125, 340))
                .isGreaterThan(80);
    }

    @Test
    void replacingRichMenuDeletesPreviousMenuAfterNewDefaultIsReady() {
        channel.setRichMenuId("richmenu-old");
        stubDualMenuCreation("richmenu-new", "richmenu-linked");

        service.provisionRichMenu();

        verify(messagingClient).setDefaultRichMenu(channel, "richmenu-new");
        verify(messagingClient).deleteRichMenu(channel, "richmenu-old");
        assertThat(channel.getRichMenuId()).isEqualTo("richmenu-new");
    }

    @Test
    void oldRichMenuCleanupFailureDoesNotDiscardNewDefault() {
        channel.setRichMenuId("richmenu-old");
        stubDualMenuCreation("richmenu-new", "richmenu-linked");
        doThrow(new LineApiException(LineApiError.OTHER, "delete failed"))
                .when(messagingClient).deleteRichMenu(channel, "richmenu-old");

        LineIntegrationStatusResponse status = service.provisionRichMenu();

        assertThat(channel.getRichMenuId()).isEqualTo("richmenu-new");
        assertThat(status.richMenuReady()).isTrue();
        verify(channelRepo).save(channel);
    }

    @Test
    void richMenusUseStateSpecificThirdActions() {
        @SuppressWarnings("unchecked")
        java.util.List<java.util.Map<String, Object>> unlinkedAreas =
                (java.util.List<java.util.Map<String, Object>>)
                        LineRichMenuService.unlinkedRichMenuDefinition().get("areas");
        @SuppressWarnings("unchecked")
        java.util.List<java.util.Map<String, Object>> linkedAreas =
                (java.util.List<java.util.Map<String, Object>>)
                        LineRichMenuService.linkedRichMenuDefinition(
                                "https://www.reserv-io.com/profile").get("areas");

        assertThat(unlinkedAreas).hasSize(3);
        assertThat(unlinkedAreas.stream()
                .map(area -> String.valueOf(
                        ((java.util.Map<?, ?>) area.get("action")).get("data")))
                .toList())
                .containsExactly(
                        LineRichMenuService.BOOK_ACTION,
                        LineRichMenuService.MY_RESERVATIONS_ACTION,
                        LineRichMenuService.LINK_ACCOUNT_ACTION
                );
        assertThat(unlinkedAreas.get(2).get("action"))
                .asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsEntry("type", "postback")
                .containsEntry("label", "綁定 LINE 帳號");
        assertThat(linkedAreas.get(2).get("action"))
                .asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsEntry("type", "uri")
                .containsEntry("label", "修改我的資料")
                .containsEntry("uri", "https://www.reserv-io.com/profile");
    }

    @Test
    void prefersNotoTraditionalChineseFontWhenAvailable() {
        assertThat(LineRichMenuService.preferredFontFamily(
                Set.of("Dialog", "PingFang TC", "Noto Sans CJK TC")))
                .isEqualTo("Noto Sans CJK TC");
    }

    @Test
    void rejectsRuntimeWithoutSupportedChineseFont() {
        Set<String> availableFamilies = Set.of("Dialog");
        assertThatThrownBy(() -> LineRichMenuService.preferredFontFamily(availableFamilies))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("中文字型");
    }

    @Test
    void authorizationFailureReturnsActionableMessage() {
        when(messagingClient.getBotDisplayName(channel))
                .thenThrow(new LineApiException(LineApiError.AUTHORIZATION, "Unauthorized"));

        assertThatThrownBy(service::testConnection)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Channel Access Token");
    }

    @Test
    void rateLimitReturnsRetryableMessage() {
        when(messagingClient.getBotDisplayName(channel))
                .thenThrow(new LineApiException(LineApiError.RATE_LIMIT, "Too Many Requests"));

        assertThatThrownBy(service::testConnection)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("稍後");
    }

    @Test
    void timeoutReturnsRetryableMessage() {
        when(messagingClient.getBotDisplayName(channel))
                .thenThrow(new LineApiException(LineApiError.TIMEOUT, "timeout"));

        assertThatThrownBy(service::testConnection)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("逾時");
    }

    private int countNearWhitePixels(
            BufferedImage image,
            int minX,
            int minY,
            int maxX,
            int maxY) {
        int count = 0;
        for (int y = minY; y <= maxY; y++) {
            for (int x = minX; x <= maxX; x++) {
                ColorComponents color = colorAt(image, x, y);
                if (color.red() > 230 && color.green() > 230 && color.blue() > 230) {
                    count++;
                }
            }
        }
        return count;
    }

    private int countDarkPixels(
            BufferedImage image,
            int minX,
            int minY,
            int maxX,
            int maxY) {
        int count = 0;
        for (int y = minY; y <= maxY; y++) {
            for (int x = minX; x <= maxX; x++) {
                ColorComponents color = colorAt(image, x, y);
                if (color.red() < 120 && color.green() < 130 && color.blue() < 140) {
                    count++;
                }
            }
        }
        return count;
    }

    private ColorComponents colorAt(BufferedImage image, int x, int y) {
        int rgb = image.getRGB(x, y);
        return new ColorComponents(
                (rgb >> 16) & 0xFF,
                (rgb >> 8) & 0xFF,
                rgb & 0xFF
        );
    }

    private void stubDualMenuCreation(String unlinkedId, String linkedId) {
        when(messagingClient.createRichMenu(
                channel,
                LineRichMenuService.unlinkedRichMenuDefinition()
        )).thenReturn(unlinkedId);
        when(messagingClient.createRichMenu(
                channel,
                LineRichMenuService.linkedRichMenuDefinition(
                        "https://www.reserv-io.com/profile")
        )).thenReturn(linkedId);
    }

    private record ColorComponents(int red, int green, int blue) {
    }
}

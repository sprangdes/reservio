package com.reservio.line.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.line.controller.request.LineChannelSettingsRequest;
import com.reservio.line.controller.response.LineChannelSettingsResponse;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.security.LineCredentialCipher;
import com.reservio.service.UserDataService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;

@Service
public class LineChannelSettingsService {

    private static final int WEBHOOK_KEY_BYTES = 32;
    private static final ZoneId TAIPEI_ZONE_ID = ZoneId.of("Asia/Taipei");

    private final BusinessLineChannelRepo channelRepo;
    private final UserDataService userDataService;
    private final LineCredentialCipher cipher;
    private final LineMessagingProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public LineChannelSettingsService(
            BusinessLineChannelRepo channelRepo,
            UserDataService userDataService,
            LineCredentialCipher cipher,
            LineMessagingProperties properties) {
        this.channelRepo = channelRepo;
        this.userDataService = userDataService;
        this.cipher = cipher;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public LineChannelSettingsResponse getSettings() {
        BusinessData business = currentBusiness();
        return channelRepo.findByBusinessId(business.getId())
                .map(this::toResponse)
                .orElseGet(LineChannelSettingsResponse::unconfigured);
    }

    @Transactional
    public LineChannelSettingsResponse save(LineChannelSettingsRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("LINE 設定不可為空");
        }
        BusinessData business = currentBusiness();
        BusinessLineChannel channel = channelRepo.findByBusinessId(business.getId())
                .orElseGet(() -> newChannel(business));

        String channelId = required(request.channelId(), "Channel ID");
        boolean channelChanged = channel.getChannelId() != null
                && !channel.getChannelId().equals(channelId);
        boolean credentialsChanged = channelChanged
                || hasValue(request.channelSecret())
                || hasValue(request.accessToken());

        channel.setChannelId(channelId);
        channel.setChannelSecretCiphertext(updatedCredential(
                request.channelSecret(),
                channel.getChannelSecretCiphertext(),
                "Channel Secret"
        ));
        channel.setAccessTokenCiphertext(updatedCredential(
                request.accessToken(),
                channel.getAccessTokenCiphertext(),
                "Channel Access Token"
        ));
        channel.setEnabled(request.enabled());
        channel.setUpdatedAt(LocalDateTime.now(TAIPEI_ZONE_ID));
        if (credentialsChanged) {
            channel.setTokenValidatedAt(null);
            channel.setWebhookVerifiedAt(null);
        }
        if (channelChanged) {
            channel.setRichMenuId(null);
            channel.setRichMenuUpdatedAt(null);
        }

        return toResponse(channelRepo.save(channel));
    }

    @Transactional
    public LineChannelSettingsResponse disable() {
        BusinessLineChannel channel = currentChannel();
        channel.setEnabled(false);
        channel.setUpdatedAt(LocalDateTime.now(TAIPEI_ZONE_ID));
        return toResponse(channelRepo.save(channel));
    }

    @Transactional
    public LineChannelSettingsResponse rotateWebhookKey() {
        BusinessLineChannel channel = currentChannel();
        channel.setWebhookKey(newWebhookKey());
        channel.setWebhookVerifiedAt(null);
        channel.setUpdatedAt(LocalDateTime.now(TAIPEI_ZONE_ID));
        return toResponse(channelRepo.save(channel));
    }

    private BusinessLineChannel newChannel(BusinessData business) {
        return BusinessLineChannel.builder()
                .business(business)
                .webhookKey(newWebhookKey())
                .enabled(false)
                .createdAt(LocalDateTime.now(TAIPEI_ZONE_ID))
                .build();
    }

    private BusinessLineChannel currentChannel() {
        BusinessData business = currentBusiness();
        return channelRepo.findByBusinessId(business.getId())
                .orElseThrow(() -> new IllegalStateException("尚未設定 LINE Messaging API"));
    }

    private BusinessData currentBusiness() {
        UserData user = userDataService.getCurrentUser();
        if (user == null || user.getBusinessData() == null) {
            throw new NotBusinessAccountException("用戶為非商家帳號");
        }
        return user.getBusinessData();
    }

    private String updatedCredential(String plaintext, String existingCiphertext, String fieldName) {
        if (plaintext != null && !plaintext.isBlank()) {
            return cipher.encrypt(plaintext.trim());
        }
        if (existingCiphertext == null || existingCiphertext.isBlank()) {
            throw new IllegalArgumentException(fieldName + "為必填");
        }
        return existingCiphertext;
    }

    private String required(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + "為必填");
        }
        return value.trim();
    }

    private boolean hasValue(String value) {
        return value != null && !value.isBlank();
    }

    private String newWebhookKey() {
        byte[] key = new byte[WEBHOOK_KEY_BYTES];
        secureRandom.nextBytes(key);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(key);
    }

    private LineChannelSettingsResponse toResponse(BusinessLineChannel channel) {
        return new LineChannelSettingsResponse(
                true,
                channel.isEnabled(),
                channel.getChannelId(),
                mask(cipher.decrypt(channel.getChannelSecretCiphertext())),
                mask(cipher.decrypt(channel.getAccessTokenCiphertext())),
                webhookUrl(channel.getWebhookKey())
        );
    }

    private String mask(String value) {
        int suffixLength = Math.min(4, value.length());
        return "••••" + value.substring(value.length() - suffixLength);
    }

    private String webhookUrl(String webhookKey) {
        String baseUrl = required(properties.webhookBaseUrl(), "Webhook Base URL");
        return baseUrl.replaceAll("/+$", "")
                + "/api/integrations/line/webhook/"
                + webhookKey;
    }
}

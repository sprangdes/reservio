package com.reservio.line.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.entity.LineWebhookEvent;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.repo.LineWebhookEventRepo;
import com.reservio.line.security.LineCredentialCipher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
public class LineWebhookIngestionService {

    private final BusinessLineChannelRepo channelRepo;
    private final LineWebhookEventRepo eventRepo;
    private final LineSignatureVerifier signatureVerifier;
    private final LineCredentialCipher cipher;
    private final ObjectMapper objectMapper;

    public LineWebhookIngestionService(
            BusinessLineChannelRepo channelRepo,
            LineWebhookEventRepo eventRepo,
            LineSignatureVerifier signatureVerifier,
            LineCredentialCipher cipher,
            ObjectMapper objectMapper) {
        this.channelRepo = channelRepo;
        this.eventRepo = eventRepo;
        this.signatureVerifier = signatureVerifier;
        this.cipher = cipher;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void ingest(String webhookKey, String signature, String body) {
        BusinessLineChannel channel = channelRepo.findByWebhookKeyAndEnabledTrue(webhookKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "LINE webhook 不存在"));
        String channelSecret = cipher.decrypt(channel.getChannelSecretCiphertext());
        if (!signatureVerifier.isValid(body, signature, channelSecret)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "LINE signature 驗證失敗");
        }

        JsonNode root = parse(body);
        JsonNode events = root.path("events");
        if (!events.isArray()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "LINE webhook events 格式錯誤");
        }
        for (JsonNode eventNode : events) {
            storeIfNew(channel, eventNode);
        }
    }

    private void storeIfNew(BusinessLineChannel channel, JsonNode eventNode) {
        String webhookEventId = eventNode.path("webhookEventId").asText(null);
        if (webhookEventId == null || webhookEventId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "LINE webhook event ID 缺失");
        }
        if (eventRepo.existsByWebhookEventId(webhookEventId)) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        eventRepo.save(LineWebhookEvent.builder()
                .channel(channel)
                .webhookEventId(webhookEventId)
                .replyToken(eventNode.path("replyToken").asText(null))
                .payload(eventNode.toString())
                .nextAttemptAt(now)
                .receivedAt(now)
                .build());
    }

    private JsonNode parse(String body) {
        try {
            return objectMapper.readTree(body);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "LINE webhook JSON 格式錯誤");
        }
    }
}

package com.reservio.line.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.LineWebhookEvent;
import com.reservio.line.enums.LineWebhookEventStatus;
import com.reservio.line.conversation.LineReservationConversation;
import com.reservio.line.message.LineReplyMessage;
import com.reservio.line.repo.LineWebhookEventRepo;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class LineWebhookWorker {

    private static final int MAX_ATTEMPTS = 3;
    private final LineWebhookEventRepo eventRepo;
    private final LineMessagingClient messagingClient;
    private final LineReservationConversation reservationConversation;
    private final ObjectMapper objectMapper;

    public LineWebhookWorker(
            LineWebhookEventRepo eventRepo,
            LineMessagingClient messagingClient,
            LineReservationConversation reservationConversation,
            ObjectMapper objectMapper) {
        this.eventRepo = eventRepo;
        this.messagingClient = messagingClient;
        this.reservationConversation = reservationConversation;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${app.line.messaging.worker-delay-ms:1000}")
    @Transactional
    public void processPendingEvents() {
        LocalDateTime now = LocalDateTime.now();
        for (LineWebhookEvent event : eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                LineWebhookEventStatus.PENDING, now)) {
            processOne(event, now);
            eventRepo.save(event);
        }
    }

    private void processOne(LineWebhookEvent event, LocalDateTime now) {
        try {
            JsonNode payload = objectMapper.readTree(event.getPayload());
            if (isTextMessage(payload)) {
                String lineUserId = payload.path("source").path("userId").asText(null);
                String text = payload.path("message").path("text").asText();
                if (lineUserId != null && event.getReplyToken() != null) {
                    LineReplyMessage reply = reservationConversation.handle(
                            event.getChannel(), lineUserId, text);
                    messagingClient.reply(event.getChannel(), event.getReplyToken(), reply);
                }
            } else if (isPostback(payload)) {
                processPostback(event, payload);
            }
            event.setStatus(LineWebhookEventStatus.PROCESSED);
            event.setProcessedAt(now);
            event.setFailureReason(null);
        } catch (RuntimeException | JsonProcessingException exception) {
            int attempts = event.getAttemptCount() + 1;
            event.setAttemptCount(attempts);
            event.setFailureReason(failureMessage(exception));
            if (attempts >= MAX_ATTEMPTS) {
                event.setStatus(LineWebhookEventStatus.FAILED);
            } else {
                event.setNextAttemptAt(now.plusMinutes(5L * attempts));
            }
        }
    }

    private boolean isTextMessage(JsonNode payload) {
        return "message".equals(payload.path("type").asText())
                && "text".equals(payload.path("message").path("type").asText());
    }

    private boolean isPostback(JsonNode payload) {
        return "postback".equals(payload.path("type").asText());
    }

    private void processPostback(LineWebhookEvent event, JsonNode payload) {
        String lineUserId = payload.path("source").path("userId").asText(null);
        String data = payload.path("postback").path("data").asText();
        if (lineUserId == null || event.getReplyToken() == null) {
            return;
        }
        if (LineRichMenuService.BOOK_ACTION.equals(data)) {
            LineReplyMessage reply = reservationConversation.handle(
                    event.getChannel(), lineUserId, "立即預約");
            messagingClient.reply(event.getChannel(), event.getReplyToken(), reply);
        } else if (LineRichMenuService.MY_RESERVATIONS_ACTION.equals(data)
                || LineRichMenuService.AVAILABILITY_ACTION.equals(data)) {
            messagingClient.replyText(event.getChannel(), event.getReplyToken(), "功能準備中");
        }
    }

    private String failureMessage(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return exception.getClass().getSimpleName();
        }
        return message.length() > 1000 ? message.substring(0, 1000) : message;
    }
}

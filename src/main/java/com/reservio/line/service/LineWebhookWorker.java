package com.reservio.line.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.LineWebhookEvent;
import com.reservio.line.enums.LineWebhookEventStatus;
import com.reservio.line.repo.LineWebhookEventRepo;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class LineWebhookWorker {

    private static final int MAX_ATTEMPTS = 3;
    private static final String IMMEDIATE_RESERVATION = "立即預約";
    private static final String IMMEDIATE_RESERVATION_REPLY = "請選擇想預約的服務項目。";

    private final LineWebhookEventRepo eventRepo;
    private final LineMessagingClient messagingClient;
    private final ObjectMapper objectMapper;

    public LineWebhookWorker(
            LineWebhookEventRepo eventRepo,
            LineMessagingClient messagingClient,
            ObjectMapper objectMapper) {
        this.eventRepo = eventRepo;
        this.messagingClient = messagingClient;
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
            if (isImmediateReservationMessage(payload)) {
                messagingClient.replyText(
                        event.getChannel(),
                        event.getReplyToken(),
                        IMMEDIATE_RESERVATION_REPLY
                );
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

    private boolean isImmediateReservationMessage(JsonNode payload) {
        return "message".equals(payload.path("type").asText())
                && "text".equals(payload.path("message").path("type").asText())
                && IMMEDIATE_RESERVATION.equals(payload.path("message").path("text").asText());
    }

    private String failureMessage(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return exception.getClass().getSimpleName();
        }
        return message.length() > 1000 ? message.substring(0, 1000) : message;
    }
}

package com.reservio.line.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.LineWebhookEvent;
import com.reservio.line.enums.LineWebhookEventStatus;
import com.reservio.line.conversation.LineReservationConversation;
import com.reservio.line.message.LineReplyMessage;
import com.reservio.line.repo.LineWebhookEventRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class LineWebhookWorker {

    private static final Logger log = LoggerFactory.getLogger(LineWebhookWorker.class);
    private static final int MAX_ATTEMPTS = 3;
    private final LineWebhookEventRepo eventRepo;
    private final LineMessagingClient messagingClient;
    private final LineReservationConversation reservationConversation;
    private final LineMessageRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;

    public LineWebhookWorker(
            LineWebhookEventRepo eventRepo,
            LineMessagingClient messagingClient,
            LineReservationConversation reservationConversation,
            LineMessageRateLimiter rateLimiter,
            ObjectMapper objectMapper) {
        this.eventRepo = eventRepo;
        this.messagingClient = messagingClient;
        this.reservationConversation = reservationConversation;
        this.rateLimiter = rateLimiter;
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
        Long businessId = event.getChannel().getBusiness().getId();
        try (MDC.MDCCloseable ignoredBusiness =
                     MDC.putCloseable("business_id", String.valueOf(businessId));
             MDC.MDCCloseable ignoredEvent =
                     MDC.putCloseable("event_id", event.getWebhookEventId())) {
            log.info(
                    "line_event_processing business_id={} event_id={}",
                    businessId,
                    event.getWebhookEventId()
            );
            JsonNode payload = objectMapper.readTree(event.getPayload());
            if (isInteractiveEvent(payload) && !acquireRateLimit(event, payload)) {
                event.setStatus(LineWebhookEventStatus.PROCESSED);
                event.setProcessedAt(now);
                event.setFailureReason(null);
                return;
            }
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
            log.info(
                    "line_event_processed business_id={} event_id={}",
                    businessId,
                    event.getWebhookEventId()
            );
        } catch (RuntimeException | JsonProcessingException exception) {
            int attempts = event.getAttemptCount() + 1;
            event.setAttemptCount(attempts);
            event.setFailureReason(failureMessage(exception));
            if (attempts >= MAX_ATTEMPTS) {
                event.setStatus(LineWebhookEventStatus.FAILED);
            } else {
                event.setNextAttemptAt(now.plusMinutes(5L * attempts));
            }
            log.warn(
                    "line_event_failed business_id={} event_id={} error_type={}",
                    businessId,
                    event.getWebhookEventId(),
                    exception.getClass().getSimpleName()
            );
        }
    }

    private boolean isTextMessage(JsonNode payload) {
        return "message".equals(payload.path("type").asText())
                && "text".equals(payload.path("message").path("type").asText());
    }

    private boolean isPostback(JsonNode payload) {
        return "postback".equals(payload.path("type").asText());
    }

    private boolean isInteractiveEvent(JsonNode payload) {
        return isTextMessage(payload) || isPostback(payload);
    }

    private boolean acquireRateLimit(LineWebhookEvent event, JsonNode payload) {
        String lineUserId = payload.path("source").path("userId").asText(null);
        Long businessId = event.getChannel().getBusiness().getId();
        if (rateLimiter.tryAcquire(businessId, lineUserId)) {
            return true;
        }
        log.warn(
                "line_event_rate_limited business_id={} event_id={}",
                businessId,
                event.getWebhookEventId()
        );
        if (lineUserId != null && event.getReplyToken() != null) {
            messagingClient.replyText(
                    event.getChannel(),
                    event.getReplyToken(),
                    "操作太頻繁，請稍後再試。"
            );
        }
        return false;
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

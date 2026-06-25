package com.reservio.line.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.entity.LineWebhookEvent;
import com.reservio.line.enums.LineWebhookEventStatus;
import com.reservio.line.repo.LineWebhookEventRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class LineWebhookWorkerTest {

    @Mock private LineWebhookEventRepo eventRepo;
    @Mock private LineMessagingClient messagingClient;

    private LineWebhookWorker worker;
    private BusinessLineChannel channel;

    @BeforeEach
    void setUp() {
        worker = new LineWebhookWorker(eventRepo, messagingClient, new ObjectMapper());
        channel = BusinessLineChannel.builder().id(4L).build();
    }

    @Test
    void repliesToImmediateReservationMessageAndMarksProcessed() {
        LineWebhookEvent event = pendingEvent(0, immediateReservationPayload());
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));

        worker.processPendingEvents();

        verify(messagingClient).replyText(channel, "reply-token", "請選擇想預約的服務項目。");
        assertThat(event.getStatus()).isEqualTo(LineWebhookEventStatus.PROCESSED);
        assertThat(event.getProcessedAt()).isNotNull();
        assertThat(event.getFailureReason()).isNull();
        verify(eventRepo).save(event);
    }

    @Test
    void ignoresUnsupportedEventsAndMarksProcessed() {
        LineWebhookEvent event = pendingEvent(0, """
                {"type":"follow","webhookEventId":"event-1"}
                """);
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));

        worker.processPendingEvents();

        verify(messagingClient, never()).replyText(any(), any(), any());
        assertThat(event.getStatus()).isEqualTo(LineWebhookEventStatus.PROCESSED);
    }

    @Test
    void schedulesRetryWhenLineApiTemporarilyFails() {
        LineWebhookEvent event = pendingEvent(0, immediateReservationPayload());
        LocalDateTime originalAttempt = event.getNextAttemptAt();
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));
        doThrow(new IllegalStateException("LINE API 503"))
                .when(messagingClient).replyText(channel, "reply-token", "請選擇想預約的服務項目。");

        worker.processPendingEvents();

        assertThat(event.getStatus()).isEqualTo(LineWebhookEventStatus.PENDING);
        assertThat(event.getAttemptCount()).isEqualTo(1);
        assertThat(event.getNextAttemptAt()).isAfter(originalAttempt);
        assertThat(event.getFailureReason()).isEqualTo("LINE API 503");
    }

    @Test
    void marksFailedAfterThirdAttempt() {
        LineWebhookEvent event = pendingEvent(2, immediateReservationPayload());
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));
        doThrow(new IllegalStateException("LINE API 503"))
                .when(messagingClient).replyText(channel, "reply-token", "請選擇想預約的服務項目。");

        worker.processPendingEvents();

        assertThat(event.getStatus()).isEqualTo(LineWebhookEventStatus.FAILED);
        assertThat(event.getAttemptCount()).isEqualTo(3);
        assertThat(event.getProcessedAt()).isNull();
    }

    private LineWebhookEvent pendingEvent(int attempts, String payload) {
        return LineWebhookEvent.builder()
                .id(1L)
                .channel(channel)
                .webhookEventId("event-1")
                .replyToken("reply-token")
                .payload(payload)
                .attemptCount(attempts)
                .nextAttemptAt(LocalDateTime.now().minusSeconds(1))
                .receivedAt(LocalDateTime.now().minusMinutes(1))
                .build();
    }

    private String immediateReservationPayload() {
        return """
                {
                  "type": "message",
                  "webhookEventId": "event-1",
                  "replyToken": "reply-token",
                  "message": {"type": "text", "text": "立即預約"}
                }
                """;
    }
}

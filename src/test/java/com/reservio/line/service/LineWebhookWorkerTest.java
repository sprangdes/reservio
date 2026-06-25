package com.reservio.line.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.entity.LineWebhookEvent;
import com.reservio.line.enums.LineWebhookEventStatus;
import com.reservio.line.conversation.LineReservationConversation;
import com.reservio.line.message.LineReplyMessage;
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
    @Mock private LineReservationConversation reservationConversation;

    private LineWebhookWorker worker;
    private BusinessLineChannel channel;

    @BeforeEach
    void setUp() {
        worker = new LineWebhookWorker(
                eventRepo, messagingClient, reservationConversation, new ObjectMapper()
        );
        channel = BusinessLineChannel.builder().id(4L).build();
    }

    @Test
    void repliesToImmediateReservationMessageAndMarksProcessed() {
        LineWebhookEvent event = pendingEvent(0, immediateReservationPayload());
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));
        LineReplyMessage reply = new LineReplyMessage(
                "想預約什麼項目？", List.of("剪髮", "取消")
        );
        when(reservationConversation.handle(channel, "line-user", "立即預約")).thenReturn(reply);

        worker.processPendingEvents();

        verify(messagingClient).reply(channel, "reply-token", reply);
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

        verify(messagingClient, never()).reply(any(), any(), any());
        assertThat(event.getStatus()).isEqualTo(LineWebhookEventStatus.PROCESSED);
    }

    @Test
    void schedulesRetryWhenLineApiTemporarilyFails() {
        LineWebhookEvent event = pendingEvent(0, immediateReservationPayload());
        LocalDateTime originalAttempt = event.getNextAttemptAt();
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));
        LineReplyMessage reply = new LineReplyMessage("回覆", List.of());
        when(reservationConversation.handle(channel, "line-user", "立即預約")).thenReturn(reply);
        doThrow(new IllegalStateException("LINE API 503"))
                .when(messagingClient).reply(channel, "reply-token", reply);

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
        LineReplyMessage reply = new LineReplyMessage("回覆", List.of());
        when(reservationConversation.handle(channel, "line-user", "立即預約")).thenReturn(reply);
        doThrow(new IllegalStateException("LINE API 503"))
                .when(messagingClient).reply(channel, "reply-token", reply);

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
                  "source": {"type":"user","userId":"line-user"},
                  "message": {"type": "text", "text": "立即預約"}
                }
                """;
    }
}

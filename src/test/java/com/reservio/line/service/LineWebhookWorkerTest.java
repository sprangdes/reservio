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
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class LineWebhookWorkerTest {

    @Mock private LineWebhookEventRepo eventRepo;
    @Mock private LineMessagingClient messagingClient;
    @Mock private LineReservationConversation reservationConversation;
    @Mock private LineMessageRateLimiter rateLimiter;
    @Mock private LineAccountLinkService accountLinkService;

    private LineWebhookWorker worker;
    private BusinessLineChannel channel;

    @BeforeEach
    void setUp() {
        worker = new LineWebhookWorker(
                eventRepo,
                messagingClient,
                reservationConversation,
                rateLimiter,
                accountLinkService,
                new ObjectMapper()
        );
        channel = BusinessLineChannel.builder().id(4L).build();
        channel.setBusiness(com.reservio.entity.BusinessData.builder().id(8L).build());
        lenient().when(rateLimiter.tryAcquire(8L, "line-user")).thenReturn(true);
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
    void startsReservationFromFixedPostbackData() {
        LineWebhookEvent event = pendingEvent(0, """
                {
                  "type":"postback",
                  "webhookEventId":"event-1",
                  "replyToken":"reply-token",
                  "source":{"type":"user","userId":"line-user"},
                  "postback":{"data":"reservio.action=book"}
                }
                """);
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));
        LineReplyMessage reply = new LineReplyMessage("想預約什麼項目？", List.of("剪髮"));
        when(reservationConversation.handlePostback(channel, "line-user", "reservio.action=book"))
                .thenReturn(reply);

        worker.processPendingEvents();

        verify(reservationConversation).handlePostback(channel, "line-user", "reservio.action=book");
        verify(messagingClient).reply(channel, "reply-token", reply);
        assertThat(event.getStatus()).isEqualTo(LineWebhookEventStatus.PROCESSED);
    }

    @Test
    void forwardsReservationPostbackActionsToConversation() {
        LineWebhookEvent event = pendingEvent(0, """
                {
                  "type":"postback",
                  "webhookEventId":"event-1",
                  "replyToken":"reply-token",
                  "source":{"type":"user","userId":"line-user"},
                  "postback":{"data":"reservio.action=select_service&serviceItemId=20"}
                }
                """);
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));
        LineReplyMessage reply = new LineReplyMessage("想預約哪一天？", List.of());
        when(reservationConversation.handlePostback(
                channel,
                "line-user",
                "reservio.action=select_service&serviceItemId=20"
        )).thenReturn(reply);

        worker.processPendingEvents();

        verify(reservationConversation).handlePostback(
                channel,
                "line-user",
                "reservio.action=select_service&serviceItemId=20"
        );
        verify(messagingClient).reply(channel, "reply-token", reply);
        assertThat(event.getStatus()).isEqualTo(LineWebhookEventStatus.PROCESSED);
    }

    @Test
    void forwardsMyReservationsPostbackToConversation() {
        LineWebhookEvent event = pendingEvent(0, """
                {
                  "type":"postback",
                  "webhookEventId":"event-1",
                  "replyToken":"reply-token",
                  "source":{"type":"user","userId":"line-user"},
                  "postback":{"data":"reservio.action=my_reservations"}
                }
                """);
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));

        LineReplyMessage reply = new LineReplyMessage("我的預約", List.of());
        when(reservationConversation.handlePostback(
                channel,
                "line-user",
                "reservio.action=my_reservations"
        )).thenReturn(reply);

        worker.processPendingEvents();

        verify(reservationConversation).handlePostback(
                channel,
                "line-user",
                "reservio.action=my_reservations"
        );
        verify(messagingClient).reply(channel, "reply-token", reply);
        assertThat(event.getStatus()).isEqualTo(LineWebhookEventStatus.PROCESSED);
    }

    @Test
    void rateLimitedUserGetsSafeReplyWithoutAdvancingConversation() {
        LineWebhookEvent event = pendingEvent(0, immediateReservationPayload());
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));
        when(rateLimiter.tryAcquire(8L, "line-user")).thenReturn(false);

        worker.processPendingEvents();

        verify(messagingClient).replyText(
                channel,
                "reply-token",
                "操作太頻繁，請稍後再試。"
        );
        verify(reservationConversation, never()).handle(any(), any(), any());
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

    @Test
    void completesAccountLinkWebhookWithoutRateLimiting() {
        LineWebhookEvent event = pendingEvent(0, """
                {
                  "type":"accountLink",
                  "webhookEventId":"event-link",
                  "replyToken":"reply-token",
                  "source":{"type":"user","userId":"line-user"},
                  "link":{"result":"ok","nonce":"nonce-value"}
                }
                """);
        when(eventRepo.findTop50ByStatusAndNextAttemptAtBeforeOrderById(
                any(LineWebhookEventStatus.class), any(LocalDateTime.class)
        )).thenReturn(List.of(event));
        when(accountLinkService.complete(channel, "line-user", "ok", "nonce-value"))
                .thenReturn(2);

        worker.processPendingEvents();

        verify(accountLinkService).complete(channel, "line-user", "ok", "nonce-value");
        verify(messagingClient).replyText(
                channel,
                "reply-token",
                "Reservio 帳號綁定成功，既有 LINE 預約已同步。"
        );
        verify(rateLimiter, never()).tryAcquire(any(), any());
        assertThat(event.getStatus()).isEqualTo(LineWebhookEventStatus.PROCESSED);
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

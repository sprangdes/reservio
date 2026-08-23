package com.reservio.line.service;

import com.reservio.line.enums.LineWebhookEventStatus;
import com.reservio.line.repo.LineConversationRepo;
import com.reservio.line.repo.LineWebhookEventRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineDataRetentionServiceTest {

    @Mock private LineWebhookEventRepo eventRepo;
    @Mock private LineConversationRepo conversationRepo;

    @Test
    void removesOnlyTerminalEventsAndStaleConversationsUsingConfiguredRetention() {
        Clock clock = Clock.fixed(Instant.parse("2026-06-25T01:00:00Z"), ZoneOffset.UTC);
        LineDataRetentionService service = new LineDataRetentionService(
                eventRepo,
                conversationRepo,
                30,
                14,
                clock
        );
        LocalDateTime eventCutoff = LocalDateTime.of(2026, Month.MAY, 26, 1, 0);
        LocalDateTime conversationCutoff = LocalDateTime.of(2026, Month.JUNE, 11, 1, 0);
        when(eventRepo.deleteByStatusInAndReceivedAtBefore(
                List.of(LineWebhookEventStatus.PROCESSED, LineWebhookEventStatus.FAILED),
                eventCutoff
        )).thenReturn(12L);
        when(conversationRepo.deleteByUpdatedAtBefore(conversationCutoff)).thenReturn(4L);

        LineDataRetentionResult result = service.cleanup();

        assertThat(result.deletedEvents()).isEqualTo(12);
        assertThat(result.deletedConversations()).isEqualTo(4);
        verify(eventRepo).deleteByStatusInAndReceivedAtBefore(
                List.of(LineWebhookEventStatus.PROCESSED, LineWebhookEventStatus.FAILED),
                eventCutoff
        );
        verify(conversationRepo).deleteByUpdatedAtBefore(conversationCutoff);
    }
}

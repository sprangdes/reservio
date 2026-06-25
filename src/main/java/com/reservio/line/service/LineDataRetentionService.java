package com.reservio.line.service;

import com.reservio.line.enums.LineWebhookEventStatus;
import com.reservio.line.repo.LineConversationRepo;
import com.reservio.line.repo.LineWebhookEventRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LineDataRetentionService {

    private static final Logger log = LoggerFactory.getLogger(LineDataRetentionService.class);
    private static final List<LineWebhookEventStatus> TERMINAL_EVENT_STATUSES =
            List.of(LineWebhookEventStatus.PROCESSED, LineWebhookEventStatus.FAILED);

    private final LineWebhookEventRepo eventRepo;
    private final LineConversationRepo conversationRepo;
    private final int eventRetentionDays;
    private final int conversationRetentionDays;
    private final Clock clock;

    @Autowired
    public LineDataRetentionService(
            LineWebhookEventRepo eventRepo,
            LineConversationRepo conversationRepo,
            @Value("${app.line.messaging.event-retention-days:30}") int eventRetentionDays,
            @Value("${app.line.messaging.conversation-retention-days:14}")
            int conversationRetentionDays) {
        this(
                eventRepo,
                conversationRepo,
                eventRetentionDays,
                conversationRetentionDays,
                Clock.systemUTC()
        );
    }

    LineDataRetentionService(
            LineWebhookEventRepo eventRepo,
            LineConversationRepo conversationRepo,
            int eventRetentionDays,
            int conversationRetentionDays,
            Clock clock) {
        this.eventRepo = eventRepo;
        this.conversationRepo = conversationRepo;
        this.eventRetentionDays = eventRetentionDays;
        this.conversationRetentionDays = conversationRetentionDays;
        this.clock = clock;
    }

    @Scheduled(cron = "${app.line.messaging.cleanup-cron:0 30 3 * * *}")
    @Transactional
    public LineDataRetentionResult cleanup() {
        LocalDateTime now = LocalDateTime.now(clock);
        long events = eventRepo.deleteByStatusInAndReceivedAtBefore(
                TERMINAL_EVENT_STATUSES,
                now.minusDays(eventRetentionDays)
        );
        long conversations = conversationRepo.deleteByUpdatedAtBefore(
                now.minusDays(conversationRetentionDays)
        );
        log.info(
                "line_cleanup deleted_events={} deleted_conversations={}",
                events,
                conversations
        );
        return new LineDataRetentionResult(events, conversations);
    }
}

package com.reservio.line.repo;

import com.reservio.line.entity.LineWebhookEvent;
import com.reservio.line.enums.LineWebhookEventStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface LineWebhookEventRepo extends JpaRepository<LineWebhookEvent, Long> {
    boolean existsByWebhookEventId(String webhookEventId);

    List<LineWebhookEvent> findTop50ByStatusAndNextAttemptAtBeforeOrderById(
            LineWebhookEventStatus status,
            LocalDateTime nextAttemptAt
    );
}

package com.reservio.line.entity;

import com.reservio.line.enums.LineWebhookEventStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "line_webhook_event", indexes = {
        @Index(name = "idx_line_webhook_event_status_next", columnList = "status,next_attempt_at")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_line_webhook_event_id", columnNames = "webhook_event_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineWebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "channel_id", nullable = false)
    private BusinessLineChannel channel;

    @Column(name = "webhook_event_id", nullable = false, unique = true, length = 100)
    private String webhookEventId;

    @Column(name = "reply_token", length = 255)
    private String replyToken;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private LineWebhookEventStatus status = LineWebhookEventStatus.PENDING;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "next_attempt_at", nullable = false)
    private LocalDateTime nextAttemptAt;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "failure_reason", length = 1000)
    private String failureReason;
}

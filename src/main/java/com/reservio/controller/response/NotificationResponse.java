package com.reservio.controller.response;

import com.reservio.enums.NotificationEventType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private Long reservationId;
    private NotificationEventType eventType;
    private String title;
    private String content;
    private boolean read;
    private LocalDateTime createdAt;
}

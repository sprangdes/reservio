package com.reservio.line.entity;

import com.reservio.entity.BusinessData;
import com.reservio.line.enums.LineConversationState;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "line_conversation", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_line_conversation_business_user",
                columnNames = {"business_id", "line_user_id"}
        )
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private BusinessData business;

    @Column(name = "line_user_id", nullable = false, length = 100)
    private String lineUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private LineConversationState state = LineConversationState.IDLE;

    @Column(name = "service_item_id")
    private Long serviceItemId;

    @Column(name = "reservation_date")
    private LocalDate reservationDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    @Column(length = 50)
    private String phone;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}

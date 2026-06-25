package com.reservio.line.entity;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "line_account_link", indexes = {
        @Index(name = "idx_line_account_link_request", columnList = "request_token_hash", unique = true),
        @Index(name = "idx_line_account_link_nonce", columnList = "nonce_hash", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineAccountLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private BusinessData business;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "line_customer_id", nullable = false)
    private LineCustomer lineCustomer;

    @Column(name = "request_token_hash", nullable = false, length = 64, unique = true)
    private String requestTokenHash;

    @Column(name = "line_link_token_ciphertext", nullable = false, length = 1000)
    private String lineLinkTokenCiphertext;

    @Column(name = "nonce_hash", length = 64, unique = true)
    private String nonceHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id")
    private UserData targetUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LineAccountLinkStatus status;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}

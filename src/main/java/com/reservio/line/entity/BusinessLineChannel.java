package com.reservio.line.entity;

import com.reservio.entity.BusinessData;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "business_line_channel", indexes = {
        @Index(name = "idx_business_line_channel_webhook_key", columnList = "webhook_key", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessLineChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false, unique = true)
    private BusinessData business;

    @Column(name = "channel_id", nullable = false, length = 100)
    private String channelId;

    @Column(name = "channel_secret_ciphertext", nullable = false, length = 1000)
    private String channelSecretCiphertext;

    @Column(name = "access_token_ciphertext", nullable = false, length = 2000)
    private String accessTokenCiphertext;

    @Column(name = "webhook_key", nullable = false, unique = true, length = 100)
    private String webhookKey;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "token_validated_at")
    private LocalDateTime tokenValidatedAt;

    @Column(name = "webhook_verified_at")
    private LocalDateTime webhookVerifiedAt;

    @Column(name = "rich_menu_id", length = 100)
    private String richMenuId;

    @Column(name = "rich_menu_updated_at")
    private LocalDateTime richMenuUpdatedAt;
}

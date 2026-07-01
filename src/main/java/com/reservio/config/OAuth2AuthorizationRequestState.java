package com.reservio.config;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "oauth2_authorization_request_state")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OAuth2AuthorizationRequestState {

    @Id
    @Column(nullable = false, length = 200)
    private String state;

    @Column(nullable = false, columnDefinition = "text")
    private String payload;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}

package com.reservio.config;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.time.Instant;
import java.util.Optional;

public interface OAuth2AuthorizationRequestStateRepo
        extends JpaRepository<OAuth2AuthorizationRequestState, String> {

    Optional<OAuth2AuthorizationRequestState> findByStateAndExpiresAtAfter(
            String state,
            Instant now
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select requestState
            from OAuth2AuthorizationRequestState requestState
            where requestState.state = :state
              and requestState.expiresAt > :now
            """)
    Optional<OAuth2AuthorizationRequestState> findValidForUpdate(
            @Param("state") String state,
            @Param("now") Instant now
    );

    long deleteByExpiresAtBefore(Instant now);
}

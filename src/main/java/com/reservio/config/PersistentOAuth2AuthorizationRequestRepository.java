package com.reservio.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;

@Component
public class PersistentOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    private final OAuth2AuthorizationRequestStateRepo stateRepo;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final Duration ttl;

    @Autowired
    public PersistentOAuth2AuthorizationRequestRepository(
            OAuth2AuthorizationRequestStateRepo stateRepo,
            ObjectMapper objectMapper,
            @Value("${app.auth.authorization-request-ttl:10m}") Duration ttl) {
        this(stateRepo, objectMapper, Clock.systemUTC(), ttl);
    }

    PersistentOAuth2AuthorizationRequestRepository(
            OAuth2AuthorizationRequestStateRepo stateRepo,
            ObjectMapper objectMapper,
            Clock clock,
            Duration ttl) {
        this.stateRepo = stateRepo;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.ttl = ttl;
    }

    @Override
    @Transactional(readOnly = true)
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        String state = request.getParameter("state");
        if (state == null || state.isBlank()) {
            return null;
        }
        return stateRepo.findByStateAndExpiresAtAfter(state, clock.instant())
                .map(this::deserialize)
                .orElse(null);
    }

    @Override
    @Transactional
    public void saveAuthorizationRequest(
            OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        if (authorizationRequest == null) {
            removeAuthorizationRequestInternal(request);
            return;
        }
        String state = authorizationRequest.getState();
        if (state == null || state.isBlank()) {
            throw new IllegalArgumentException("OAuth2 authorization request requires state");
        }
        Instant now = clock.instant();
        stateRepo.deleteByExpiresAtBefore(now);
        stateRepo.save(OAuth2AuthorizationRequestState.builder()
                .state(state)
                .payload(serialize(authorizationRequest))
                .expiresAt(now.plus(ttl))
                .build());
    }

    @Override
    @Transactional
    public OAuth2AuthorizationRequest removeAuthorizationRequest(
            HttpServletRequest request,
            HttpServletResponse response) {
        return removeAuthorizationRequestInternal(request);
    }

    private OAuth2AuthorizationRequest removeAuthorizationRequestInternal(HttpServletRequest request) {
        String state = request.getParameter("state");
        if (state == null || state.isBlank()) {
            return null;
        }
        return stateRepo.findValidForUpdate(state, clock.instant())
                .map(saved -> {
                    OAuth2AuthorizationRequest authorizationRequest = deserialize(saved);
                    stateRepo.delete(saved);
                    return authorizationRequest;
                })
                .orElse(null);
    }

    private String serialize(OAuth2AuthorizationRequest request) {
        try {
            return objectMapper.writeValueAsString(new StoredRequest(
                    request.getAuthorizationUri(),
                    request.getClientId(),
                    request.getRedirectUri(),
                    request.getScopes(),
                    request.getState(),
                    request.getAdditionalParameters(),
                    request.getAttributes(),
                    request.getAuthorizationRequestUri()
            ));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to store OAuth2 authorization request", exception);
        }
    }

    private OAuth2AuthorizationRequest deserialize(OAuth2AuthorizationRequestState saved) {
        try {
            StoredRequest stored = objectMapper.readValue(saved.getPayload(), StoredRequest.class);
            return OAuth2AuthorizationRequest.authorizationCode()
                    .authorizationUri(stored.authorizationUri())
                    .clientId(stored.clientId())
                    .redirectUri(stored.redirectUri())
                    .scopes(stored.scopes())
                    .state(stored.state())
                    .additionalParameters(stored.additionalParameters())
                    .attributes(stored.attributes())
                    .authorizationRequestUri(stored.authorizationRequestUri())
                    .build();
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to load OAuth2 authorization request", exception);
        }
    }

    private record StoredRequest(
            String authorizationUri,
            String clientId,
            String redirectUri,
            Set<String> scopes,
            String state,
            Map<String, Object> additionalParameters,
            Map<String, Object> attributes,
            String authorizationRequestUri) {
    }
}

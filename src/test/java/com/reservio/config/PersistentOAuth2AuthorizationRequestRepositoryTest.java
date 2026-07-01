package com.reservio.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PersistentOAuth2AuthorizationRequestRepositoryTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-07-01T12:10:00Z"), ZoneOffset.UTC);

    @Mock private OAuth2AuthorizationRequestStateRepo stateRepo;

    private PersistentOAuth2AuthorizationRequestRepository repository;

    @BeforeEach
    void setUp() {
        repository = new PersistentOAuth2AuthorizationRequestRepository(
                stateRepo,
                new ObjectMapper(),
                CLOCK,
                Duration.ofMinutes(10)
        );
    }

    @Test
    void callbackWithoutOriginalHttpSessionLoadsAndConsumesRequestByState() {
        OAuth2AuthorizationRequest request = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://access.line.me/oauth2/v2.1/authorize")
                .clientId("line-channel-id")
                .redirectUri("https://www.reserv-io.com/login/oauth2/code/line-user")
                .scopes(Set.of("profile"))
                .state("state-123")
                .additionalParameters(Map.of("prompt", "consent"))
                .attributes(Map.of("registration_id", "line-user"))
                .authorizationRequestUri("https://access.line.me/oauth2/v2.1/authorize?state=state-123")
                .build();
        repository.saveAuthorizationRequest(
                request,
                new MockHttpServletRequest(),
                new MockHttpServletResponse()
        );

        ArgumentCaptor<OAuth2AuthorizationRequestState> captor =
                ArgumentCaptor.forClass(OAuth2AuthorizationRequestState.class);
        verify(stateRepo).save(captor.capture());
        OAuth2AuthorizationRequestState saved = captor.getValue();
        when(stateRepo.findValidForUpdate(
                "state-123", Instant.parse("2026-07-01T12:10:00Z")))
                .thenReturn(Optional.of(saved));

        MockHttpServletRequest callback = new MockHttpServletRequest();
        callback.setParameter("state", "state-123");

        OAuth2AuthorizationRequest loaded = repository.removeAuthorizationRequest(
                callback,
                new MockHttpServletResponse()
        );

        assertThat(callback.getSession(false)).isNull();
        assertThat(loaded.getState()).isEqualTo("state-123");
        assertThat(loaded.getClientId()).isEqualTo("line-channel-id");
        assertThat(loaded.getRedirectUri())
                .isEqualTo("https://www.reserv-io.com/login/oauth2/code/line-user");
        assertThat(loaded.getAttributes()).containsEntry("registration_id", "line-user");
        verify(stateRepo).delete(saved);
    }
}

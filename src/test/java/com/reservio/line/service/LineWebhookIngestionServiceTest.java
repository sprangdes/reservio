package com.reservio.line.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.entity.BusinessData;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.entity.LineWebhookEvent;
import com.reservio.line.enums.LineWebhookEventStatus;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.repo.LineWebhookEventRepo;
import com.reservio.line.security.LineCredentialCipher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineWebhookIngestionServiceTest {

    @Mock private BusinessLineChannelRepo channelRepo;
    @Mock private LineWebhookEventRepo eventRepo;

    private LineCredentialCipher cipher;
    private LineWebhookIngestionService service;
    private BusinessLineChannel channel;

    @BeforeEach
    void setUp() {
        cipher = new LineCredentialCipher(Base64.getEncoder().encodeToString(new byte[32]));
        service = new LineWebhookIngestionService(
                channelRepo,
                eventRepo,
                new LineSignatureVerifier(),
                cipher,
                new ObjectMapper()
        );
        channel = BusinessLineChannel.builder()
                .id(4L)
                .business(BusinessData.builder().id(8L).build())
                .channelSecretCiphertext(cipher.encrypt("channel-secret"))
                .enabled(true)
                .build();
    }

    @Test
    void verifiesSignatureAndStoresEachNewEvent() throws Exception {
        String body = webhookBody();
        when(channelRepo.findByWebhookKeyAndEnabledTrue("webhook-key")).thenReturn(Optional.of(channel));
        when(eventRepo.existsByWebhookEventId("event-1")).thenReturn(false);

        service.ingest("webhook-key", signature(body), body);

        ArgumentCaptor<LineWebhookEvent> captor = ArgumentCaptor.forClass(LineWebhookEvent.class);
        verify(eventRepo).save(captor.capture());
        LineWebhookEvent saved = captor.getValue();
        assertThat(saved.getChannel()).isSameAs(channel);
        assertThat(saved.getWebhookEventId()).isEqualTo("event-1");
        assertThat(saved.getReplyToken()).isEqualTo("reply-token");
        assertThat(saved.getPayload()).contains("\"text\":\"立即預約\"");
        assertThat(saved.getStatus()).isEqualTo(LineWebhookEventStatus.PENDING);
        assertThat(saved.getAttemptCount()).isZero();
        assertThat(saved.getNextAttemptAt()).isNotNull();
    }

    @Test
    void duplicateEventIsAcknowledgedWithoutSavingAgain() throws Exception {
        String body = webhookBody();
        when(channelRepo.findByWebhookKeyAndEnabledTrue("webhook-key")).thenReturn(Optional.of(channel));
        when(eventRepo.existsByWebhookEventId("event-1")).thenReturn(true);

        service.ingest("webhook-key", signature(body), body);

        verify(eventRepo, never()).save(any());
    }

    @Test
    void rejectsUnknownOrDisabledWebhookKey() {
        when(channelRepo.findByWebhookKeyAndEnabledTrue("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.ingest("unknown", "signature", "{\"events\":[]}"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> assertThat(((ResponseStatusException) exception).getStatusCode().value())
                        .isEqualTo(404));
    }

    @Test
    void rejectsInvalidSignature() {
        when(channelRepo.findByWebhookKeyAndEnabledTrue("webhook-key")).thenReturn(Optional.of(channel));
        String body = webhookBody();

        assertThatThrownBy(() -> service.ingest("webhook-key", "invalid", body))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> assertThat(((ResponseStatusException) exception).getStatusCode().value())
                        .isEqualTo(401));

        verify(eventRepo, never()).save(any());
    }

    private String webhookBody() {
        return """
                {
                  "events": [
                    {
                      "type": "message",
                      "webhookEventId": "event-1",
                      "replyToken": "reply-token",
                      "source": {"type": "user", "userId": "line-user"},
                      "message": {"type": "text", "id": "message-1", "text": "立即預約"}
                    }
                  ]
                }
                """;
    }

    private String signature(String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("channel-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getEncoder().encodeToString(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }
}

package com.reservio.line.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.line.controller.request.LineChannelSettingsRequest;
import com.reservio.line.controller.response.LineChannelSettingsResponse;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.security.LineCredentialCipher;
import com.reservio.service.UserDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineChannelSettingsServiceTest {

    @Mock private BusinessLineChannelRepo channelRepo;
    @Mock private UserDataService userDataService;

    private LineCredentialCipher cipher;
    private LineChannelSettingsService service;
    private BusinessData business;

    @BeforeEach
    void setUp() {
        cipher = new LineCredentialCipher(Base64.getEncoder().encodeToString(new byte[32]));
        service = new LineChannelSettingsService(
                channelRepo,
                userDataService,
                cipher,
                new LineMessagingProperties("ignored-in-test", "https://www.reserv-io.com")
        );
        business = BusinessData.builder().id(8L).name("Reservio Salon").build();
        UserData owner = UserData.builder()
                .id(7L)
                .role("ROLE_BUSINESS")
                .businessData(business)
                .build();
        business.setUser(owner);
        when(userDataService.getCurrentUser()).thenReturn(owner);
    }

    @Test
    void createsEncryptedSettingsAndReturnsOnlyMaskedCredentials() {
        when(channelRepo.findByBusinessId(8L)).thenReturn(Optional.empty());
        when(channelRepo.save(any(BusinessLineChannel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        LineChannelSettingsResponse response = service.save(new LineChannelSettingsRequest(
                "1234567890",
                "channel-secret-value",
                "long-channel-access-token",
                true
        ));

        ArgumentCaptor<BusinessLineChannel> captor = ArgumentCaptor.forClass(BusinessLineChannel.class);
        verify(channelRepo).save(captor.capture());
        BusinessLineChannel saved = captor.getValue();
        assertThat(saved.getBusiness()).isSameAs(business);
        assertThat(saved.getChannelSecretCiphertext()).doesNotContain("channel-secret-value");
        assertThat(saved.getAccessTokenCiphertext()).doesNotContain("long-channel-access-token");
        assertThat(cipher.decrypt(saved.getChannelSecretCiphertext())).isEqualTo("channel-secret-value");
        assertThat(cipher.decrypt(saved.getAccessTokenCiphertext())).isEqualTo("long-channel-access-token");
        assertThat(saved.getWebhookKey()).matches("[A-Za-z0-9_-]{43}");
        assertThat(saved.isEnabled()).isTrue();
        assertThat(response.channelSecretMasked()).isEqualTo("••••alue");
        assertThat(response.accessTokenMasked()).isEqualTo("••••oken");
        assertThat(response.webhookUrl())
                .isEqualTo("https://www.reserv-io.com/api/integrations/line/webhook/" + saved.getWebhookKey());
    }

    @Test
    void blankSecretAndTokenPreserveExistingEncryptedValues() {
        BusinessLineChannel existing = existingChannel();
        when(channelRepo.findByBusinessId(8L)).thenReturn(Optional.of(existing));
        when(channelRepo.save(existing)).thenReturn(existing);

        service.save(new LineChannelSettingsRequest("new-channel-id", " ", "", true));

        assertThat(existing.getChannelId()).isEqualTo("new-channel-id");
        assertThat(cipher.decrypt(existing.getChannelSecretCiphertext())).isEqualTo("old-secret");
        assertThat(cipher.decrypt(existing.getAccessTokenCiphertext())).isEqualTo("old-token");
    }

    @Test
    void rejectsCustomerAccount() {
        UserData customer = UserData.builder().id(99L).role("ROLE_USER").build();
        when(userDataService.getCurrentUser()).thenReturn(customer);

        assertThatThrownBy(service::getSettings)
                .isInstanceOf(NotBusinessAccountException.class)
                .hasMessage("用戶為非商家帳號");

        verify(channelRepo, never()).findByBusinessId(any());
    }

    @Test
    void disableOnlyChangesCurrentBusinessChannel() {
        BusinessLineChannel existing = existingChannel();
        when(channelRepo.findByBusinessId(8L)).thenReturn(Optional.of(existing));
        when(channelRepo.save(existing)).thenReturn(existing);

        LineChannelSettingsResponse response = service.disable();

        assertThat(existing.isEnabled()).isFalse();
        assertThat(response.enabled()).isFalse();
        verify(channelRepo).findByBusinessId(8L);
    }

    @Test
    void rotateWebhookKeyChangesUrlWithoutChangingCredentials() {
        BusinessLineChannel existing = existingChannel();
        String originalKey = existing.getWebhookKey();
        String originalSecret = existing.getChannelSecretCiphertext();
        String originalToken = existing.getAccessTokenCiphertext();
        when(channelRepo.findByBusinessId(8L)).thenReturn(Optional.of(existing));
        when(channelRepo.save(existing)).thenReturn(existing);

        LineChannelSettingsResponse response = service.rotateWebhookKey();

        assertThat(existing.getWebhookKey()).isNotEqualTo(originalKey);
        assertThat(existing.getChannelSecretCiphertext()).isEqualTo(originalSecret);
        assertThat(existing.getAccessTokenCiphertext()).isEqualTo(originalToken);
        assertThat(response.webhookUrl()).endsWith(existing.getWebhookKey());
    }

    private BusinessLineChannel existingChannel() {
        return BusinessLineChannel.builder()
                .id(5L)
                .business(business)
                .channelId("old-channel-id")
                .channelSecretCiphertext(cipher.encrypt("old-secret"))
                .accessTokenCiphertext(cipher.encrypt("old-token"))
                .webhookKey("old-webhook-key")
                .enabled(true)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();
    }
}

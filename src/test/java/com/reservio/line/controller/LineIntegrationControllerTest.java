package com.reservio.line.controller;

import com.reservio.controller.response.ApiResponse;
import com.reservio.line.controller.request.LineChannelSettingsRequest;
import com.reservio.line.controller.response.LineChannelSettingsResponse;
import com.reservio.line.service.LineChannelSettingsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineIntegrationControllerTest {

    @Mock private LineChannelSettingsService settingsService;

    @Test
    void getsCurrentBusinessSettings() {
        LineChannelSettingsResponse settings = settings();
        when(settingsService.getSettings()).thenReturn(settings);
        LineIntegrationController controller = new LineIntegrationController(settingsService);

        ResponseEntity<ApiResponse<LineChannelSettingsResponse>> response = controller.getSettings();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData()).isSameAs(settings);
    }

    @Test
    void savesSettingsWithoutReturningPlaintextCredentials() {
        LineChannelSettingsRequest request = new LineChannelSettingsRequest(
                "1234567890",
                "plain-secret",
                "plain-token",
                true
        );
        LineChannelSettingsResponse settings = settings();
        when(settingsService.save(request)).thenReturn(settings);
        LineIntegrationController controller = new LineIntegrationController(settingsService);

        ApiResponse<LineChannelSettingsResponse> body = controller.saveSettings(request).getBody();

        assertThat(body).isNotNull();
        assertThat(body.getData().channelSecretMasked()).isEqualTo("••••cret");
        assertThat(body.getData().accessTokenMasked()).isEqualTo("••••oken");
        assertThat(body.toString()).doesNotContain("plain-secret", "plain-token");
        verify(settingsService).save(request);
    }

    @Test
    void disablesAndRotatesWebhookKey() {
        LineChannelSettingsResponse settings = settings();
        when(settingsService.disable()).thenReturn(settings);
        when(settingsService.rotateWebhookKey()).thenReturn(settings);
        LineIntegrationController controller = new LineIntegrationController(settingsService);

        assertThat(controller.disable().getBody().getData()).isSameAs(settings);
        assertThat(controller.rotateWebhookKey().getBody().getData()).isSameAs(settings);
        verify(settingsService).disable();
        verify(settingsService).rotateWebhookKey();
    }

    private LineChannelSettingsResponse settings() {
        return new LineChannelSettingsResponse(
                true,
                true,
                "1234567890",
                "••••cret",
                "••••oken",
                "https://www.reserv-io.com/api/integrations/line/webhook/key"
        );
    }
}

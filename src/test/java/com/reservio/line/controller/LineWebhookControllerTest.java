package com.reservio.line.controller;

import com.reservio.line.service.LineWebhookIngestionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LineWebhookControllerTest {

    @Mock private LineWebhookIngestionService ingestionService;

    @Test
    void acknowledgesWebhookAfterIngestion() {
        LineWebhookController controller = new LineWebhookController(ingestionService);

        var response = controller.receive("webhook-key", "signature", "{\"events\":[]}");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(ingestionService).ingest("webhook-key", "signature", "{\"events\":[]}");
    }
}

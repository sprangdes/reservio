package com.reservio.line.controller;

import com.reservio.line.service.LineWebhookIngestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/integrations/line/webhook")
public class LineWebhookController {

    private final LineWebhookIngestionService ingestionService;

    public LineWebhookController(LineWebhookIngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping("/{webhookKey}")
    public ResponseEntity<Void> receive(
            @PathVariable String webhookKey,
            @RequestHeader(value = "X-Line-Signature", required = false) String signature,
            @RequestBody String body) {
        ingestionService.ingest(webhookKey, signature, body);
        return ResponseEntity.ok().build();
    }
}

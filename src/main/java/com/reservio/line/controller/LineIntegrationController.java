package com.reservio.line.controller;

import com.reservio.controller.response.ApiResponse;
import com.reservio.line.controller.request.LineChannelSettingsRequest;
import com.reservio.line.controller.response.LineChannelSettingsResponse;
import com.reservio.line.service.LineChannelSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/integrations/line")
public class LineIntegrationController {

    private final LineChannelSettingsService settingsService;

    public LineIntegrationController(LineChannelSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<LineChannelSettingsResponse>> getSettings() {
        return ok("OK", settingsService.getSettings());
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<LineChannelSettingsResponse>> saveSettings(
            @RequestBody LineChannelSettingsRequest request) {
        return ok("LINE Messaging API 設定已儲存", settingsService.save(request));
    }

    @PostMapping("/settings/disable")
    public ResponseEntity<ApiResponse<LineChannelSettingsResponse>> disable() {
        return ok("LINE Messaging API 串接已停用", settingsService.disable());
    }

    @PostMapping("/settings/rotate-webhook-key")
    public ResponseEntity<ApiResponse<LineChannelSettingsResponse>> rotateWebhookKey() {
        return ok("Webhook URL 已更新", settingsService.rotateWebhookKey());
    }

    private ResponseEntity<ApiResponse<LineChannelSettingsResponse>> ok(
            String message,
            LineChannelSettingsResponse data) {
        return ResponseEntity.ok(ApiResponse.<LineChannelSettingsResponse>builder()
                .success(true)
                .message(message)
                .data(data)
                .build());
    }
}

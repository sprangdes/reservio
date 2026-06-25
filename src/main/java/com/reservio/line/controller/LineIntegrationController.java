package com.reservio.line.controller;

import com.reservio.controller.response.ApiResponse;
import com.reservio.line.controller.request.LineChannelSettingsRequest;
import com.reservio.line.controller.response.LineChannelSettingsResponse;
import com.reservio.line.controller.response.LineIntegrationStatusResponse;
import com.reservio.line.service.LineChannelSettingsService;
import com.reservio.line.service.LineRichMenuService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/integrations/line")
public class LineIntegrationController {

    private final LineChannelSettingsService settingsService;
    private final LineRichMenuService richMenuService;

    public LineIntegrationController(
            LineChannelSettingsService settingsService,
            LineRichMenuService richMenuService) {
        this.settingsService = settingsService;
        this.richMenuService = richMenuService;
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

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<LineIntegrationStatusResponse>> getStatus() {
        return ok("OK", richMenuService.getStatus());
    }

    @PostMapping("/test-connection")
    public ResponseEntity<ApiResponse<LineIntegrationStatusResponse>> testConnection() {
        return ok("LINE 連線與 Webhook 檢查完成", richMenuService.testConnection());
    }

    @PostMapping("/rich-menu")
    public ResponseEntity<ApiResponse<LineIntegrationStatusResponse>> provisionRichMenu() {
        return ok("LINE Rich Menu 已建立或更新", richMenuService.provisionRichMenu());
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(
            String message,
            T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build());
    }
}

package com.reservio.line.controller;

import com.reservio.controller.response.ApiResponse;
import com.reservio.entity.UserData;
import com.reservio.line.controller.response.LineAccountLinkConfirmResponse;
import com.reservio.line.controller.response.LineAccountLinkStatusResponse;
import com.reservio.line.controller.response.LinkedLineBusinessResponse;
import com.reservio.line.service.LineAccountLinkService;
import com.reservio.service.UserDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.reservio.config.LineOAuth2AuthenticationSuccessHandler.isLineLogin;

@RestController
@RequestMapping("/api/line/account-links")
public class LineAccountLinkController {

    private final LineAccountLinkService service;
    private final UserDataService userDataService;

    public LineAccountLinkController(
            LineAccountLinkService service,
            UserDataService userDataService) {
        this.service = service;
        this.userDataService = userDataService;
    }

    @GetMapping("/{requestToken}")
    public ResponseEntity<ApiResponse<LineAccountLinkStatusResponse>> status(
            @PathVariable String requestToken) {
        return ResponseEntity.ok(success(
                "LINE 帳號綁定請求",
                service.status(requestToken)
        ));
    }

    @PostMapping("/{requestToken}/confirm")
    public ResponseEntity<ApiResponse<LineAccountLinkConfirmResponse>> confirm(
            @PathVariable String requestToken,
            Authentication authentication) {
        if (!isLineLogin(authentication)) {
            throw new IllegalArgumentException("必須使用 LINE 登入進行綁定");
        }
        UserData currentUser = userDataService.getCurrentUser();
        return ResponseEntity.ok(success(
                "請至 LINE 完成帳號綁定",
                new LineAccountLinkConfirmResponse(service.confirm(requestToken, currentUser))
        ));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LinkedLineBusinessResponse>>> list() {
        return ResponseEntity.ok(success(
                "已綁定的 LINE 商家",
                service.linkedBusinesses(userDataService.getCurrentUser())
        ));
    }

    @DeleteMapping("/{lineCustomerId}")
    public ResponseEntity<Void> unlink(@PathVariable Long lineCustomerId) {
        service.unlink(lineCustomerId, userDataService.getCurrentUser());
        return ResponseEntity.noContent().build();
    }

    private <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }
}

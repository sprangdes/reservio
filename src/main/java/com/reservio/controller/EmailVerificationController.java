package com.reservio.controller;

import com.reservio.controller.request.EmailVerificationRequest;
import com.reservio.controller.response.ApiResponse;
import com.reservio.service.EmailVerificationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/email-verification")
public class EmailVerificationController {
    private final EmailVerificationService service;

    public EmailVerificationController(EmailVerificationService service) {
        this.service = service;
    }

    @PostMapping("/request")
    public ApiResponse<Void> request(@RequestBody EmailVerificationRequest request) {
        service.request(request);
        return ApiResponse.<Void>builder().success(true).message("驗證碼已寄出").build();
    }

    @PostMapping("/verify")
    public ApiResponse<Void> verify(@RequestBody EmailVerificationRequest request) {
        service.verify(request);
        return ApiResponse.<Void>builder().success(true).message("Email 驗證成功").build();
    }
}

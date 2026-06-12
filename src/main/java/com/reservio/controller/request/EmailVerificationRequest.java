package com.reservio.controller.request;

import lombok.Data;

@Data
public class EmailVerificationRequest {
    private String email;
    private String otp;
}

package com.reservio.dto;

import lombok.Data;

@Data
public class VerifyOtpRequest {
    private String emailOrUsername;
    private String otp;
}

package com.reservio.controller.request;

import lombok.Data;

@Data
public class VerifyOtpRequest {

    private String emailOrUsername;
    private String otp;
}

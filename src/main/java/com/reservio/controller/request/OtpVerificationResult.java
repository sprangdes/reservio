package com.reservio.controller.request;

import com.reservio.entity.UserData;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class OtpVerificationResult {

    private UserData user;
    private boolean mustChangePassword;
}

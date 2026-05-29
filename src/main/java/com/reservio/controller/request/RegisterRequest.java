package com.reservio.controller.request;

import lombok.Data;

@Data
public class RegisterRequest {

    private String username;
    private String email;
    private String password;
}

package com.reservio.controller.request;

import lombok.Data;

@Data
public class RegisterBusinessRequest {

    private String username;
    private String email;
    private String password;
    private String businessName;
    private String category;
    private String phone;
    private String address;
}

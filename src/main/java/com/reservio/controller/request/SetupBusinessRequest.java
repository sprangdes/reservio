package com.reservio.controller.request;

import lombok.Data;

@Data
public class SetupBusinessRequest {

    private String businessName;
    private String category;
    private String phone;
    private String address;
}

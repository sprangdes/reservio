package com.reservio.dto;

import lombok.Data;

@Data
public class ServiceItemCreateRequest {
    private String name;
    private Integer duration;
}

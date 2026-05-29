package com.reservio.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceItemResponse {
    private Long id;
    private String name;
    private Integer duration;
    private Boolean active;
}

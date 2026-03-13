package com.reservio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceItemDTO {
    private Long id;
    private String name;
    private Integer duration;
    private Boolean active;
}

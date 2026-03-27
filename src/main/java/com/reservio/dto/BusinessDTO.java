package com.reservio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessDTO {
    private Long id;
    private String name;
    private String category;
    private String phone;
    private String address;
    private Integer slotInterval;
}

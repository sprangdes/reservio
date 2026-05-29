package com.reservio.controller.request;

import jakarta.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateBusinessInfoRequest {

    @Nullable
    private String name;

    @Nullable
    private String category;

    @Nullable
    private String phone;

    @Nullable
    private String address;

    @Nullable
    private Integer slotInterval;
}

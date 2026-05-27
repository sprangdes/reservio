package com.reservio.dto;

import lombok.Data;

import java.util.List;

@Data
public class SetPreferredBusinessesRequest {
    private List<Long> preferredBusinesses;
}

package com.reservio.controller.request;

import lombok.Data;

import java.util.List;

@Data
public class SetPreferredBusinessesRequest {

    private List<Long> preferredBusinesses;
}

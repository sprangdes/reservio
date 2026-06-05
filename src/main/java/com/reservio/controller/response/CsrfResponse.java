package com.reservio.controller.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CsrfResponse {

    private String headerName;
    private String token;
}

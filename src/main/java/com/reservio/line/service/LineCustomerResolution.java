package com.reservio.line.service;

import com.reservio.entity.UserData;
import com.reservio.line.entity.LineCustomer;

public record LineCustomerResolution(
        LineCustomer customer,
        UserData reservationUser,
        boolean linked) {
}

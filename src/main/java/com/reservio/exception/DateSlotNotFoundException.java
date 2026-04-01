package com.reservio.exception;

public class DateSlotNotFoundException extends RuntimeException {
    public DateSlotNotFoundException(String message) {
        super(message);
    }
}

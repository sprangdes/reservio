package com.reservio.exception;

public class NotBusinessAccountException extends RuntimeException {
    public NotBusinessAccountException(String message) {
        super(message);
    }
}

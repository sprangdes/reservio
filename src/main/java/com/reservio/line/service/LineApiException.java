package com.reservio.line.service;

public class LineApiException extends RuntimeException {

    private final LineApiError error;

    public LineApiException(LineApiError error, String message) {
        super(message);
        this.error = error;
    }

    public LineApiException(LineApiError error, String message, Throwable cause) {
        super(message, cause);
        this.error = error;
    }

    public LineApiError getError() {
        return error;
    }
}

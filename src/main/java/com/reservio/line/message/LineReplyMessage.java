package com.reservio.line.message;

import java.time.LocalDate;
import java.util.List;

public record LineReplyMessage(
        String text,
        List<String> options,
        String actionLabel,
        String actionUri,
        String datePickerLabel,
        String datePickerData,
        LocalDate datePickerMin,
        LocalDate datePickerMax) {

    public LineReplyMessage(String text, List<String> options) {
        this(text, options, null, null, null, null, null, null);
    }

    public LineReplyMessage(
            String text,
            List<String> options,
            String actionLabel,
            String actionUri) {
        this(text, options, actionLabel, actionUri, null, null, null, null);
    }
}

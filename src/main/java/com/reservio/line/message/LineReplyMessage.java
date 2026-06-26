package com.reservio.line.message;

import java.util.List;

public record LineReplyMessage(
        String text,
        List<String> options,
        String actionLabel,
        String actionUri) {

    public LineReplyMessage(String text, List<String> options) {
        this(text, options, null, null);
    }
}

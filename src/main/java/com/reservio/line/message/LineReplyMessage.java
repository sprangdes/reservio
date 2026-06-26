package com.reservio.line.message;

import java.util.List;
import java.util.Map;

public record LineReplyMessage(
        String text,
        List<String> options,
        String actionLabel,
        String actionUri,
        Map<String, Object> flexContents) {

    public LineReplyMessage(String text, List<String> options) {
        this(text, options, null, null, null);
    }

    public LineReplyMessage(String text, List<String> options, String actionLabel, String actionUri) {
        this(text, options, actionLabel, actionUri, null);
    }

    public static LineReplyMessage flex(String altText, Map<String, Object> flexContents) {
        return new LineReplyMessage(altText, List.of(), null, null, flexContents);
    }
}

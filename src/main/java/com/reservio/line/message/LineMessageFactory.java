package com.reservio.line.message;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class LineMessageFactory {

    private static final int MAX_QUICK_REPLIES = 13;

    public LineReplyMessage text(String text) {
        return new LineReplyMessage(text, List.of());
    }

    public LineReplyMessage quickReply(String text, List<String> options) {
        List<String> safeOptions = options == null
                ? List.of()
                : options.stream().filter(option -> option != null && !option.isBlank())
                        .limit(MAX_QUICK_REPLIES)
                        .toList();
        return new LineReplyMessage(text, safeOptions);
    }

    public LineReplyMessage uriButton(String text, String actionLabel, String actionUri) {
        return new LineReplyMessage(text, List.of(), actionLabel, actionUri);
    }
}

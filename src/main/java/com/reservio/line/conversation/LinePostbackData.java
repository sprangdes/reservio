package com.reservio.line.conversation;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

public record LinePostbackData(Map<String, String> values) {

    public static LinePostbackData parse(String data) {
        if (data == null || data.isBlank()) {
            return new LinePostbackData(Map.of());
        }
        Map<String, String> values = Arrays.stream(data.split("&"))
                .map(part -> part.split("=", 2))
                .filter(parts -> parts.length == 2)
                .collect(Collectors.toMap(
                        parts -> decode(parts[0]),
                        parts -> decode(parts[1]),
                        (left, right) -> right
                ));
        return new LinePostbackData(values);
    }

    public String action() {
        return values.getOrDefault("reservio.action", "");
    }

    public String value(String key) {
        return values.get(key);
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}

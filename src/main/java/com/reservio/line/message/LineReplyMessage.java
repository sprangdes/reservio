package com.reservio.line.message;

import java.util.List;

public record LineReplyMessage(String text, List<String> options) {
}

package com.reservio.line.conversation;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;

@Component
public class LineDateParser {

    private final Clock clock;

    public LineDateParser() {
        this(Clock.systemDefaultZone());
    }

    LineDateParser(Clock clock) {
        this.clock = clock;
    }

    public LocalDate parse(String input) {
        if (input == null || input.isBlank()) {
            throw formatError();
        }
        String normalized = input.trim();
        try {
            LocalDate candidate = LocalDate.parse(normalized);
            if (candidate.isBefore(LocalDate.now(clock))) {
                throw new IllegalArgumentException("日期不可早於今天");
            }
            return candidate;
        } catch (DateTimeException exception) {
            // Continue with legacy slash-based parsing.
        }
        String[] parts = normalized.split("/");
        try {
            if (parts.length == 2) {
                int month = Integer.parseInt(parts[0]);
                int day = Integer.parseInt(parts[1]);
                LocalDate today = LocalDate.now(clock);
                LocalDate candidate = LocalDate.of(today.getYear(), month, day);
                return candidate.isBefore(today) ? candidate.plusYears(1) : candidate;
            }
            if (parts.length == 3) {
                LocalDate candidate = LocalDate.of(
                        Integer.parseInt(parts[0]),
                        Integer.parseInt(parts[1]),
                        Integer.parseInt(parts[2])
                );
                if (candidate.isBefore(LocalDate.now(clock))) {
                    throw new IllegalArgumentException("日期不可早於今天");
                }
                return candidate;
            }
        } catch (NumberFormatException | DateTimeException exception) {
            throw formatError();
        }
        throw formatError();
    }

    private IllegalArgumentException formatError() {
        return new IllegalArgumentException("日期格式錯誤，請輸入例如 6/29");
    }
}

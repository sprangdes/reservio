package com.reservio.line.conversation;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LineDateParserTest {

    private final Clock clock = Clock.fixed(
            Instant.parse("2026-06-25T00:00:00Z"),
            ZoneId.of("Asia/Taipei")
    );
    private final LineDateParser parser = new LineDateParser(clock);

    @Test
    void parsesMonthAndDayInCurrentYearWhenNotPast() {
        assertThat(parser.parse("6/29")).isEqualTo(LocalDate.of(2026, 6, 29));
        assertThat(parser.parse("06/29")).isEqualTo(LocalDate.of(2026, 6, 29));
    }

    @Test
    void rollsMonthAndDayToNextYearWhenAlreadyPast() {
        assertThat(parser.parse("6/20")).isEqualTo(LocalDate.of(2027, 6, 20));
    }

    @Test
    void parsesExplicitYearAndRejectsPastDate() {
        assertThat(parser.parse("2026/6/29")).isEqualTo(LocalDate.of(2026, 6, 29));

        assertThatThrownBy(() -> parser.parse("2026/6/20"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("日期不可早於今天");
    }

    @Test
    void rejectsInvalidDateFormat() {
        assertThatThrownBy(() -> parser.parse("六月二十九日"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("日期格式錯誤，請輸入例如 6/29");
    }
}

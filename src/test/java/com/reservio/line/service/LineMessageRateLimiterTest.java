package com.reservio.line.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class LineMessageRateLimiterTest {

    @Test
    void limitsEachBusinessAndLineUserIndependently() {
        MutableClock clock = new MutableClock(Instant.parse("2026-06-25T01:00:00Z"));
        LineMessageRateLimiter limiter = new LineMessageRateLimiter(2, Duration.ofMinutes(1), clock);

        assertThat(limiter.tryAcquire(8L, "line-user")).isTrue();
        assertThat(limiter.tryAcquire(8L, "line-user")).isTrue();
        assertThat(limiter.tryAcquire(8L, "line-user")).isFalse();
        assertThat(limiter.tryAcquire(9L, "line-user")).isTrue();
        assertThat(limiter.tryAcquire(8L, "another-user")).isTrue();
    }

    @Test
    void resetsAfterWindowExpires() {
        MutableClock clock = new MutableClock(Instant.parse("2026-06-25T01:00:00Z"));
        LineMessageRateLimiter limiter = new LineMessageRateLimiter(1, Duration.ofSeconds(30), clock);

        assertThat(limiter.tryAcquire(8L, "line-user")).isTrue();
        assertThat(limiter.tryAcquire(8L, "line-user")).isFalse();

        clock.advance(Duration.ofSeconds(30));

        assertThat(limiter.tryAcquire(8L, "line-user")).isTrue();
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }

        private void advance(Duration duration) {
            instant = instant.plus(duration);
        }
    }
}

package com.reservio.line.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LineMessageRateLimiter {

    private final int limit;
    private final long windowMillis;
    private final Clock clock;
    private final ConcurrentHashMap<String, WindowCounter> counters = new ConcurrentHashMap<>();

    @Autowired
    public LineMessageRateLimiter(
            @Value("${app.line.messaging.rate-limit-per-minute:20}") int limit,
            @Value("${app.line.messaging.rate-limit-window-seconds:60}") long windowSeconds) {
        this(limit, Duration.ofSeconds(windowSeconds), Clock.systemUTC());
    }

    LineMessageRateLimiter(int limit, Duration window, Clock clock) {
        if (limit <= 0) {
            throw new IllegalArgumentException("LINE message rate limit 必須大於 0");
        }
        this.limit = limit;
        this.windowMillis = window.toMillis();
        this.clock = clock;
    }

    public boolean tryAcquire(Long businessId, String lineUserId) {
        if (businessId == null || lineUserId == null || lineUserId.isBlank()) {
            return false;
        }
        long now = clock.millis();
        String key = businessId + ":" + lineUserId;
        WindowCounter counter = counters.compute(key, (ignored, existing) -> {
            if (existing == null || now - existing.windowStart >= windowMillis) {
                return new WindowCounter(now, 1);
            }
            existing.count++;
            return existing;
        });
        return counter.count <= limit;
    }

    private static final class WindowCounter {
        private final long windowStart;
        private int count;

        private WindowCounter(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}

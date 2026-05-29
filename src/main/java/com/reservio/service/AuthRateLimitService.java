package com.reservio.service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthRateLimitService {

    private final ConcurrentHashMap<String, WindowCounter> counters = new ConcurrentHashMap<>();

    public void checkLogin(String ip, String account) {
        check("login:ip:" + normalize(ip), 20, Duration.ofMinutes(1), "登入嘗試過於頻繁，請稍後再試");
        check("login:account:" + normalize(account), 10, Duration.ofMinutes(1), "登入嘗試過於頻繁，請稍後再試");
    }

    public void checkOtpRequest(String ip, String account) {
        check("otp-request:ip:" + normalize(ip), 5, Duration.ofMinutes(10), "OTP 請求過於頻繁，請稍後再試");
        check("otp-request:account:" + normalize(account), 3, Duration.ofMinutes(10), "OTP 請求過於頻繁，請稍後再試");
    }

    public void checkOtpVerify(String ip, String account) {
        check("otp-verify:ip:" + normalize(ip), 15, Duration.ofMinutes(10), "OTP 驗證嘗試過於頻繁，請稍後再試");
        check("otp-verify:account:" + normalize(account), 8, Duration.ofMinutes(10), "OTP 驗證嘗試過於頻繁，請稍後再試");
    }

    private void check(String key, int limit, Duration window, String message) {
        long now = System.currentTimeMillis();
        long windowMs = window.toMillis();
        WindowCounter counter = counters.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart >= windowMs) {
                return new WindowCounter(now, 1);
            }
            existing.count++;
            return existing;
        });
        if (counter.count > limit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, message);
        }
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.trim().toLowerCase();
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

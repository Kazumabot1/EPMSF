package com.epms.service.auth;

import com.epms.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthRateLimitService {
    private static final int MAX_ATTEMPTS = 8;
    private static final long WINDOW_MS = 5 * 60 * 1000L;
    private final Map<String, Attempt> loginAttempts = new ConcurrentHashMap<>();

    public void check(String key) {
        Attempt a = loginAttempts.computeIfAbsent(key, k -> new Attempt());
        long now = System.currentTimeMillis();
        if (now - a.windowStart > WINDOW_MS) {
            a.windowStart = now;
            a.count = 0;
        }
        if (a.count >= MAX_ATTEMPTS) {
            throw new BadRequestException("Too many attempts. Please try again in a few minutes.");
        }
    }

    public void success(String key) {
        loginAttempts.remove(key);
    }

    public void fail(String key) {
        Attempt a = loginAttempts.computeIfAbsent(key, k -> new Attempt());
        long now = System.currentTimeMillis();
        if (now - a.windowStart > WINDOW_MS) {
            a.windowStart = now;
            a.count = 0;
        }
        a.count++;
    }

    private static class Attempt {
        int count = 0;
        long windowStart = System.currentTimeMillis();
    }
}

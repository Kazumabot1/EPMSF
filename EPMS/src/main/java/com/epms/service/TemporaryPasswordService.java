package com.epms.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class TemporaryPasswordService {
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    private static final int LENGTH = 14;
    private final SecureRandom secureRandom = new SecureRandom();

    public String generate() {
        StringBuilder password = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            int idx = secureRandom.nextInt(CHARS.length());
            password.append(CHARS.charAt(idx));
        }
        return password.toString();
    }
}

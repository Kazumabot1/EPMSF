package com.epms.util;

import org.springframework.util.StringUtils;

/**
 * Produces a short, safe string for API/logs (no passwords, no AUTH tokens from SMTP).
 */
public final class SmtpErrorSanitizer {

    private SmtpErrorSanitizer() {
    }

    public static String summarize(Throwable ex) {
        StringBuilder out = new StringBuilder();
        Throwable current = ex;
        int depth = 0;
        while (current != null && depth < 5) {
            String msg = current.getMessage();
            if (StringUtils.hasText(msg)) {
                if (out.length() > 0) {
                    out.append(" | ");
                }
                out.append(sanitizeLine(msg));
            }
            current = current.getCause();
            depth++;
        }
        if (out.length() == 0) {
            return ex.getClass().getSimpleName() + " (no message)";
        }
        return truncate(out.toString(), 500);
    }

    private static String sanitizeLine(String message) {
        if (message == null) {
            return "";
        }
        String s = message
                .replaceAll("(?i)password=\\S+", "password=***")
                .replaceAll("(?i)AUTH [A-Za-z0-9+/_=\\-]+", "AUTH ***");
        return s.replace('\n', ' ').replace('\r', ' ').trim();
    }

    private static String truncate(String s, int max) {
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, max) + "…";
    }
}

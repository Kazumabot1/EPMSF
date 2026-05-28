package com.epms.config;

import io.github.cdimascio.dotenv.Dotenv;
import lombok.extern.slf4j.Slf4j;

import java.nio.file.Path;

/**
 * Loads a local {@code .env} file (not committed) into system properties if the OS
 * has not set the same key. This lets {@code application.properties} expand {@code ${SMTP_HOST}} etc.
 * when you keep secrets in a project-root .env (Spring does not read .env by default).
 * <p>
 * Re-run the app after changing .env; DevTools will restart on class changes, not .env.
 */
@Slf4j
public final class DotEnvLoader {

    private DotEnvLoader() {
    }

    public static void load() {
        try {
            int applied = 0;
            for (Path root : new Path[] {Path.of("").toAbsolutePath(), Path.of("..").toAbsolutePath()}) {
                Dotenv dotenv = Dotenv.configure()
                        .directory(root.toString())
                        .ignoreIfMalformed()
                        .ignoreIfMissing()
                        .load();
                for (var e : dotenv.entries()) {
                    if (e.getValue() == null) {
                        continue;
                    }
                    if (System.getenv(e.getKey()) == null && System.getProperty(e.getKey()) == null) {
                        System.setProperty(e.getKey(), e.getValue());
                        applied++;
                    }
                }
            }
            if (applied > 0) {
                log.info("Loaded {} .env value(s) into system properties (skipped keys present in the OS environment).", applied);
            }
        } catch (Exception e) {
            log.debug("Could not load .env: {}", e.getMessage());
        }
    }
}

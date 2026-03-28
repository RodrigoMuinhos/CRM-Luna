package br.lunavita.totemapi.util;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class WebhookLogger {
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    // Log file inside TotemAPI folder
    private static final Path LOG_PATH = Path.of("backend-dev-log.txt");

    public void log(String message) {
        String line = String.format("[%s] %s%n", LocalDateTime.now().format(TS), message);
        try {
            Files.write(LOG_PATH, line.getBytes(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException e) {
            // As a fallback, try user-level temp dir
            try {
                Path fallback = Path.of(System.getProperty("java.io.tmpdir"), "backend-dev-log.txt");
                Files.write(fallback, line.getBytes(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            } catch (IOException ignored) {
            }
        }
    }
}

package br.lunavita.totemapi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);

    private final Path baseDir;

    public FileStorageService(@Value("${uploads.dir:uploads}") String baseDir) {
        this.baseDir = Paths.get(baseDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.baseDir);
        } catch (IOException e) {
            logger.warn("Could not create upload directory at {}: {}", this.baseDir, e.toString());
        }
    }

    private static final DateTimeFormatter AUDIT_TIMESTAMP =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmmssSSS").withZone(ZoneId.systemDefault());

    public record PhotoSaveResult(String url, String filename, String timestamp) {}

    public PhotoSaveResult saveAppointmentPhoto(String appointmentId, MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String ext = getExtensionSafe(original);
        if (ext.isBlank()) {
            // Attempt from content type
            String ct = file.getContentType();
            if (ct != null && ct.toLowerCase(Locale.ROOT).contains("png"))
                ext = ".png";
            else if (ct != null && ct.toLowerCase(Locale.ROOT).contains("jpeg"))
                ext = ".jpg";
            else if (ct != null && ct.toLowerCase(Locale.ROOT).contains("jpg"))
                ext = ".jpg";
            else
                ext = ".jpg";
        }

        String timestamp = AUDIT_TIMESTAMP.format(Instant.now());
        String filename = "photo-" + timestamp + ext;
        Path dir = baseDir.resolve(Paths.get("appointments", appointmentId));
        Files.createDirectories(dir);
        Path dest = dir.resolve(filename);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        // Return URL that FileController will serve
        String url = "/files/appointments/" + appointmentId + "/" + filename;
        return new PhotoSaveResult(url, filename, timestamp);
    }

    public void saveAppointmentAudit(String appointmentId, String filename, String json) throws IOException {
        Path dir = baseDir.resolve(Paths.get("appointments", appointmentId));
        Files.createDirectories(dir);
        Path dest = dir.resolve(filename);
        Files.writeString(dest, json, StandardCharsets.UTF_8);
    }

    public Path resolveFromUrl(String url) {
        // Expecting format: /files/appointments/{id}/{filename}
        String cleaned = url.startsWith("/") ? url.substring(1) : url;
        if (!cleaned.startsWith("files/")) {
            // Not our mapping, return under base dir anyway to avoid path traversal
            return baseDir.resolve(cleaned).normalize();
        }
        String relative = cleaned.replaceFirst("files/", "");
        return baseDir.resolve(relative).normalize();
    }

    private String getExtensionSafe(String name) {
        if (name == null)
            return "";
        int idx = name.lastIndexOf('.');
        if (idx < 0)
            return "";
        String ext = name.substring(idx).toLowerCase(Locale.ROOT);
        // Keep only simple extensions
        if (ext.matches("\\.[a-z0-9]{1,5}"))
            return ext;
        return "";
    }
}

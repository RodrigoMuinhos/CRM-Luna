package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.service.FileStorageService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/files")
@CrossOrigin(origins = "*")
public class FileController {

    private final FileStorageService storage;

    public FileController(FileStorageService storage) {
        this.storage = storage;
    }

    @GetMapping("/appointments/{id}/{filename}")
    public ResponseEntity<Resource> getAppointmentFile(@PathVariable String id, @PathVariable String filename)
            throws IOException {
        String url = "/files/appointments/" + id + "/" + filename;
        Path path = storage.resolveFromUrl(url);
        if (!Files.exists(path) || !path.normalize().toFile().isFile()) {
            return ResponseEntity.notFound().build();
        }
        byte[] bytes = Files.readAllBytes(path);
        String contentType = Files.probeContentType(path);
        if (contentType == null)
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(new ByteArrayResource(bytes));
    }
}

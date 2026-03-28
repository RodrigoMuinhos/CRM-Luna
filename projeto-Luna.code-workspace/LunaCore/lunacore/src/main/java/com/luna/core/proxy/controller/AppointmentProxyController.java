package com.luna.core.proxy.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.luna.core.proxy.client.TotemApiClient;

import java.util.List;
import java.util.Map;

/**
 * Proxy Controller - Encaminha requisições de agendamentos para o TotemAPI
 */
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentProxyController {

    private final TotemApiClient totemApiClient;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/appointments",
                HttpMethod.GET,
                null,
                authHeader,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {
                });
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<Map<String, Object>>> upcoming(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/appointments/upcoming",
                HttpMethod.GET,
                null,
                authHeader,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {
                });
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/appointments/" + id,
                HttpMethod.GET,
                null,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> appointment,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/appointments",
                HttpMethod.POST,
                appointment,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @PostMapping("/{id}/notify")
    public ResponseEntity<Void> notify(@PathVariable String id,
            @RequestBody(required = false) Map<String, Object> payload,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchangeVoid(
                "/api/appointments/" + id + "/notify",
                HttpMethod.POST,
                payload,
                authHeader);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, Object> appointment,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/appointments/" + id,
                HttpMethod.PUT,
                appointment,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable String id, @RequestBody Map<String, Object> statusUpdate,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/appointments/" + id + "/status",
                HttpMethod.PUT,
                statusUpdate,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchangeVoid(
                "/api/appointments/" + id,
                HttpMethod.DELETE,
                null,
                authHeader);
    }

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadPhoto(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return totemApiClient.exchangeMultipart(
                "/api/appointments/" + id + "/photo",
                file,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }
}

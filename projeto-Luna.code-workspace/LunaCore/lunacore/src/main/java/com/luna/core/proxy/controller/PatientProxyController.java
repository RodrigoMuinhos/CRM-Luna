package com.luna.core.proxy.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import com.luna.core.proxy.client.TotemApiClient;

import java.util.List;
import java.util.Map;

/**
 * Proxy Controller - Encaminha requisições de pacientes para o TotemAPI
 */
@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientProxyController {

    private final TotemApiClient totemApiClient;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/patients",
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
                "/api/patients/" + id,
                HttpMethod.GET,
                null,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> patient,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/patients",
                HttpMethod.POST,
                patient,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, Object> patient,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/patients/" + id,
                HttpMethod.PUT,
                patient,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchangeVoid(
                "/api/patients/" + id,
                HttpMethod.DELETE,
                null,
                authHeader);
    }
}

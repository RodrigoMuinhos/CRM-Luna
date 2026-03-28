package com.luna.core.proxy.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import com.luna.core.proxy.client.TotemApiClient;

import java.util.List;
import java.util.Map;

/**
 * Proxy Controller - Encaminha requisições de médicos para o TotemAPI
 */
@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorProxyController {

    private final TotemApiClient totemApiClient;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/doctors",
                HttpMethod.GET,
                null,
                authHeader,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {
                });
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> doctor,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/doctors",
                HttpMethod.POST,
                doctor,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, Object> doctor,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/doctors/" + id,
                HttpMethod.PUT,
                doctor,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchangeVoid(
                "/api/doctors/" + id,
                HttpMethod.DELETE,
                null,
                authHeader);
    }
}

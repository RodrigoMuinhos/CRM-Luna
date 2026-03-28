package com.luna.core.proxy.controller;

import com.luna.core.proxy.client.TotemApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentProxyController {

    private final TotemApiClient totemApiClient;

    @PostMapping
    public ResponseEntity<Map<String, Object>> process(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/payments",
                HttpMethod.POST,
                payload,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/payments",
                HttpMethod.GET,
                null,
                authHeader,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {
                });
    }

    @PostMapping("/pix")
    public ResponseEntity<Map<String, Object>> createPix(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/payments/pix",
                HttpMethod.POST,
                payload,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @GetMapping("/status/{paymentId}")
    public ResponseEntity<Map<String, Object>> getStatus(
            @PathVariable String paymentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/payments/status/" + paymentId,
                HttpMethod.GET,
                null,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }
}

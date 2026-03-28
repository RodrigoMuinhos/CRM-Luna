package com.luna.core.proxy.controller;

import com.luna.core.proxy.client.TotemApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardProxyController {

    private final TotemApiClient totemApiClient;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/dashboard/summary",
                HttpMethod.GET,
                null,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }

    @GetMapping("/summary/full")
    public ResponseEntity<Map<String, Object>> summaryFull(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return totemApiClient.exchange(
                "/api/dashboard/summary/full",
                HttpMethod.GET,
                null,
                authHeader,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
    }
}

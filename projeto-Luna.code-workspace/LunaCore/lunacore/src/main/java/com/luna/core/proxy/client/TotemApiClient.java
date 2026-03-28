package com.luna.core.proxy.client;

import java.net.SocketTimeoutException;
import java.time.Instant;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import com.luna.core.common.web.CorrelationIdFilter;
import com.luna.core.proxy.config.TotemApiProperties;

@Component
public class TotemApiClient {

    private final TotemApiProperties properties;
    private final RestTemplate restTemplate;

    public TotemApiClient(TotemApiProperties properties, RestTemplate restTemplate) {
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    public <T> ResponseEntity<T> exchange(
            String path,
            HttpMethod method,
            Object requestBody,
            String authHeader,
            ParameterizedTypeReference<T> responseType) {

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        if (requestBody != null) {
            headers.setContentType(MediaType.APPLICATION_JSON);
        }
        if (authHeader != null && !authHeader.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, authHeader);
        }

        String correlationId = resolveCorrelationId();
        if (correlationId != null && !correlationId.isBlank()) {
            headers.set(CorrelationIdFilter.HEADER_NAME, correlationId);
        }

        HttpEntity<?> entity = new HttpEntity<>(requestBody, headers);

        try {
            return restTemplate.exchange(
                    normalizeBaseUrl(properties.getBaseUrl()) + path,
                    method,
                    entity,
                    responseType);
        } catch (HttpStatusCodeException e) {
            // Preserve existing behavior for upstream 4xx/5xx (status only).
            return ResponseEntity.status(e.getStatusCode()).build();
        } catch (ResourceAccessException e) {
            HttpStatus status = isTimeout(e) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY;
            String message = "TotemAPI unavailable (" + status.value() + ")";
            if (correlationId != null && !correlationId.isBlank()) {
                message += " [correlationId=" + correlationId + "]";
            }
            message += " @ " + Instant.now();
            throw new TotemApiGatewayException(status, message, correlationId, e);
        }
    }

    public ResponseEntity<Void> exchangeVoid(
            String path,
            HttpMethod method,
            Object requestBody,
            String authHeader) {

        return exchange(path, method, requestBody, authHeader, new ParameterizedTypeReference<Void>() {
        });
    }

    public <T> ResponseEntity<T> exchangeMultipart(
            String path,
            MultipartFile file,
            String authHeader,
            ParameterizedTypeReference<T> responseType) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        if (authHeader != null && !authHeader.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, authHeader);
        }

        String correlationId = resolveCorrelationId();
        if (correlationId != null && !correlationId.isBlank()) {
            headers.set(CorrelationIdFilter.HEADER_NAME, correlationId);
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        if (file != null) {
            try {
                ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        String name = file.getOriginalFilename();
                        return name != null ? name : "upload.bin";
                    }
                };
                body.add("file", resource);
            } catch (Exception e) {
                throw new TotemApiGatewayException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Failed to read upload file", correlationId, e);
            }
        }

        HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            return restTemplate.exchange(
                    normalizeBaseUrl(properties.getBaseUrl()) + path,
                    HttpMethod.POST,
                    entity,
                    responseType);
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode()).build();
        } catch (ResourceAccessException e) {
            HttpStatus status = isTimeout(e) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY;
            String message = "TotemAPI unavailable (" + status.value() + ")";
            if (correlationId != null && !correlationId.isBlank()) {
                message += " [correlationId=" + correlationId + "]";
            }
            message += " @ " + Instant.now();
            throw new TotemApiGatewayException(status, message, correlationId, e);
        }
    }

    private static String normalizeBaseUrl(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "http://localhost:8081";
        }
        if (baseUrl.endsWith("/")) {
            return baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl;
    }

    private static boolean isTimeout(ResourceAccessException e) {
        Throwable cause = e.getCause();
        if (cause instanceof SocketTimeoutException) {
            return true;
        }
        return e.getMessage() != null && e.getMessage().toLowerCase().contains("timed out");
    }

    private static String resolveCorrelationId() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        Object value = attrs.getAttribute(CorrelationIdFilter.HEADER_NAME, RequestAttributes.SCOPE_REQUEST);
        return value != null ? value.toString() : null;
    }
}

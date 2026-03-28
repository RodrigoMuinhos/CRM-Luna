package com.luna.core.proxy.client;

import org.springframework.http.HttpStatus;

public class TotemApiGatewayException extends RuntimeException {

    private final HttpStatus status;
    private final String correlationId;

    public TotemApiGatewayException(HttpStatus status, String message, String correlationId, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.correlationId = correlationId;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCorrelationId() {
        return correlationId;
    }
}

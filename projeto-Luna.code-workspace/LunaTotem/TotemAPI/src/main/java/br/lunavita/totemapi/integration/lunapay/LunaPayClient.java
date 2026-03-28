package br.lunavita.totemapi.integration.lunapay;

import br.lunavita.totemapi.integration.lunapay.dto.LunaPayCreatePaymentRequest;
import br.lunavita.totemapi.integration.lunapay.dto.LunaPayPaymentResponse;
import br.lunavita.totemapi.integration.lunapay.dto.LunaPayPaymentStatusResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class LunaPayClient {

    private final RestClient restClient;
    private final String baseUrl;

    public LunaPayClient(RestClient.Builder builder, @Value("${lunapay.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = builder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public LunaPayPaymentResponse createPayment(LunaPayCreatePaymentRequest request, String authorizationHeader) {
        return restClient
                .post()
                .uri("/payments")
                .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                .body(request)
                .retrieve()
                .body(LunaPayPaymentResponse.class);
    }

    public LunaPayPaymentStatusResponse getPaymentStatus(String paymentId, String authorizationHeader) {
        return getPaymentStatus(paymentId, authorizationHeader, false);
    }

    public LunaPayPaymentStatusResponse getPaymentStatus(String paymentId, String authorizationHeader, boolean refresh) {
        return restClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/payments/{id}/status")
                        .queryParam("refresh", refresh)
                        .build(paymentId))
                .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                .retrieve()
                .body(LunaPayPaymentStatusResponse.class);
    }

    public LunaPayPaymentResponse getPayment(String paymentId, String authorizationHeader) {
        return restClient
                .get()
                .uri("/payments/{id}", paymentId)
                .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                .retrieve()
                .body(LunaPayPaymentResponse.class);
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}

package br.lunavita.totemapi.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * BFF de pagamentos: o cliente (TotemUI/LunaKiosk) chama o TotemAPI,
 * e o TotemAPI chama o LunaPay por trás, reutilizando o JWT do LunaCore.
 */
@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class AsaasPaymentController {
    @PostMapping("/asaas/webhook")
    public ResponseEntity<String> handleAsaasWebhook() {
        return ResponseEntity.status(HttpStatus.GONE)
                .body("Webhook Asaas desativado no TotemAPI; pagamentos são processados pelo LunaPay.");
    }
}

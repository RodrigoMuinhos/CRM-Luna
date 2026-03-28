package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.service.SeedService;
import br.lunavita.totemapi.security.UserContext;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final SeedService seedService;

    public AdminController(SeedService seedService) {
        this.seedService = seedService;
    }

    @PostMapping("/seed-test-data")
    public ResponseEntity<?> seed(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "40") int perDay,
            @RequestParam(required = false) String tenantId,
            @AuthenticationPrincipal UserContext userContext) {

        String effectiveTenantId = tenantId;
        if ((effectiveTenantId == null || effectiveTenantId.isBlank()) && userContext != null) {
            effectiveTenantId = userContext.getTenantId();
        }
        if (effectiveTenantId == null || effectiveTenantId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Missing tenantId. Provide ?tenantId=... or call with an Authorization Bearer token.");
        }

        LocalDate d = from;
        while (!d.isAfter(to)) {
            seedService.seedPaymentsForDate(d, perDay, effectiveTenantId);
            d = d.plusDays(1);
        }
        return ResponseEntity.ok().build();
    }
}

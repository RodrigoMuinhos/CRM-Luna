package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.model.WebhookAudit;
import br.lunavita.totemapi.repository.WebhookAuditRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/webhooks/audit")
public class WebhookAuditController {

    private final WebhookAuditRepository repository;

    public WebhookAuditController(WebhookAuditRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<Page<WebhookAudit>> list(
            @RequestParam(value = "paymentId", required = false) String paymentId,
            @RequestParam(value = "appointmentId", required = false) String appointmentId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);

        // Simple in-memory filter using repository.findAll() for now
        List<WebhookAudit> all = repository.findAll();
        List<WebhookAudit> filtered = all.stream()
                .filter(a -> paymentId == null || (a.getPaymentId() != null && a.getPaymentId().equals(paymentId)))
                .filter(a -> appointmentId == null
                        || (a.getAppointmentId() != null && a.getAppointmentId().equals(appointmentId)))
                .collect(Collectors.toList());

        int start = Math.min((int) pageable.getOffset(), filtered.size());
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        List<WebhookAudit> content = filtered.subList(start, end);

        Page<WebhookAudit> pageResult = new PageImpl<>(content, pageable, filtered.size());
        return ResponseEntity.ok(pageResult);
    }
}

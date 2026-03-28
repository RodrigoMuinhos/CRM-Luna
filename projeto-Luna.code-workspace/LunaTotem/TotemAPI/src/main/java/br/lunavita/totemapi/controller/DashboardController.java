package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.model.DashboardSummary;
import br.lunavita.totemapi.security.UserContext;
import br.lunavita.totemapi.service.DataStoreService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DataStoreService store;

    public DashboardController(DataStoreService store) {
        this.store = store;
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummary> summaryBasic(Authentication authentication,
            @AuthenticationPrincipal UserContext userContext) {
        String tenantId = userContext != null ? userContext.getTenantId() : null;
        DashboardSummary s = store.getDashboardSummary(tenantId);
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRACAO")
                        || a.getAuthority().equals("ROLE_OWNER")
                        || a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_FINANCE"));
        if (!isAdmin) {
            // Oculta recebíveis para usuários de recepção
            s.setReceivables(null);
        }
        return ResponseEntity.ok(s);
    }

    @GetMapping("/summary/full")
    @PreAuthorize("hasAnyRole('ADMINISTRACAO','OWNER','ADMIN','FINANCE')")
    public ResponseEntity<DashboardSummary> summaryFull(@AuthenticationPrincipal UserContext userContext) {
        String tenantId = userContext != null ? userContext.getTenantId() : null;
        return ResponseEntity.ok(store.getDashboardSummary(tenantId));
    }
}

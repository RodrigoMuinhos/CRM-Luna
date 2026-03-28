package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.model.Doctor;
import br.lunavita.totemapi.security.UserContext;
import br.lunavita.totemapi.service.DataStoreService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DataStoreService store;

    public DoctorController(DataStoreService store) {
        this.store = store;
    }

    @GetMapping
    public List<Doctor> list(@AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null) {
            return store.listDoctors(userContext.getTenantId());
        }
        return store.listDoctors();
    }

    @PostMapping
    public ResponseEntity<Doctor> create(@RequestBody Doctor doctor,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext == null || userContext.getTenantId() == null || userContext.getTenantId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Tenant information missing: authenticate or include tenantId in request");
        }
        Doctor created = store.createDoctor(doctor, userContext.getTenantId());
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Doctor> update(@PathVariable String id, @RequestBody Doctor doctor,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null && !userContext.getTenantId().isBlank()) {
            return store.updateDoctor(id, doctor, userContext.getTenantId())
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return store.updateDoctor(id, doctor)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
            @AuthenticationPrincipal UserContext userContext) {
        boolean deleted;
        if (userContext != null && userContext.getTenantId() != null && !userContext.getTenantId().isBlank()) {
            deleted = store.deleteDoctor(id, userContext.getTenantId());
        } else {
            deleted = store.deleteDoctor(id);
        }
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}

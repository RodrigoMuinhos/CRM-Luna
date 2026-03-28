package br.lunavita.totemapi.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.lunavita.totemapi.dto.PatientByCpfResponse;
import br.lunavita.totemapi.model.Patient;
import br.lunavita.totemapi.repository.PatientRepository;
import br.lunavita.totemapi.security.UserContext;
import br.lunavita.totemapi.service.DataAccessAuditService;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Controller de Pacientes com auditoria LGPD
 */
@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientRepository patientRepository;
    private final DataAccessAuditService auditService;

    public PatientController(PatientRepository patientRepository,
            DataAccessAuditService auditService) {
        this.patientRepository = patientRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public List<Patient> list(@AuthenticationPrincipal UserContext userContext, HttpServletRequest request) {
        logAudit("LIST", "PATIENT", "all", request);
        if (userContext != null && userContext.getTenantId() != null) {
            return patientRepository.findAllByTenantId(userContext.getTenantId());
        }
        return patientRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Patient> get(@PathVariable String id, @AuthenticationPrincipal UserContext userContext,
            HttpServletRequest request) {
        if (userContext != null && userContext.getTenantId() != null) {
            return patientRepository.findByTenantIdAndId(userContext.getTenantId(), id)
                    .map(patient -> {
                        auditService.logPatientRead(id, getUserEmail(), getUserRole(),
                                getIpAddress(request), getUserAgent(request));
                        return ResponseEntity.ok(patient);
                    })
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return patientRepository.findById(id)
                .map(patient -> {
                    auditService.logPatientRead(id, getUserEmail(), getUserRole(),
                            getIpAddress(request), getUserAgent(request));
                    return ResponseEntity.ok(patient);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/cpf/{cpf}")
    public ResponseEntity<Patient> getByCpf(@PathVariable String cpf, @AuthenticationPrincipal UserContext userContext,
            HttpServletRequest request) {
        if (userContext != null && userContext.getTenantId() != null) {
            return patientRepository.findByTenantIdAndCpf(userContext.getTenantId(), cpf)
                    .map(patient -> {
                        auditService.logPatientRead(patient.getId(), getUserEmail(), getUserRole(),
                                getIpAddress(request), getUserAgent(request));
                        return ResponseEntity.ok(patient);
                    })
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return patientRepository.findByCpf(cpf)
                .map(patient -> {
                    auditService.logPatientRead(patient.getId(), getUserEmail(), getUserRole(),
                            getIpAddress(request), getUserAgent(request));
                    return ResponseEntity.ok(patient);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Endpoint simplificado: GET /api/patients/by-cpf?cpf=XXXXXXXXXXX
     * Retorna apenas id, name, email, cpf (para auto-preenchimento no frontend)
     */
    @GetMapping("/by-cpf")
    public ResponseEntity<?> getSimpleByCpf(@RequestParam String cpf, 
            @AuthenticationPrincipal UserContext userContext,
            HttpServletRequest request) {
        if (userContext != null && userContext.getTenantId() != null) {
            var patientOpt = patientRepository.findByTenantIdAndCpf(userContext.getTenantId(), cpf);
            if (patientOpt.isPresent()) {
                Patient patient = patientOpt.get();
                auditService.logPatientRead(patient.getId(), getUserEmail(), getUserRole(),
                        getIpAddress(request), getUserAgent(request));
                PatientByCpfResponse response = new PatientByCpfResponse(
                    patient.getId(),
                    patient.getName(),
                    patient.getEmail(),
                    patient.getCpf(),
                    patient.getPhone()
                );
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(404)
                        .body(Map.of("error", "Paciente não encontrado para o CPF informado"));
            }
        }
        // Fallback sem tenant
        var patientOpt = patientRepository.findByCpf(cpf);
        if (patientOpt.isPresent()) {
            Patient patient = patientOpt.get();
            auditService.logPatientRead(patient.getId(), getUserEmail(), getUserRole(),
                    getIpAddress(request), getUserAgent(request));
            PatientByCpfResponse response = new PatientByCpfResponse(
                patient.getId(),
                patient.getName(),
                patient.getEmail(),
                patient.getCpf(),
                patient.getPhone()
            );
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Paciente não encontrado para o CPF informado"));
        }
    }

    @PostMapping
    public ResponseEntity<Patient> create(@RequestBody Patient patient, @AuthenticationPrincipal UserContext userContext,
            HttpServletRequest request) {
        if (patient.getId() == null || patient.getId().isEmpty()) {
            patient.setId(UUID.randomUUID().toString());
        }
        // Ensure tenantId is set (required NOT NULL in DB)
        if (userContext != null && userContext.getTenantId() != null) {
            patient.setTenantId(userContext.getTenantId());
        }

        // Validate required fields and tenant presence before saving to return clear 4xx errors
        if (patient.getTenantId() == null || patient.getTenantId().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Tenant information missing: authenticate or include tenantId in request");
        }
        if (patient.getName() == null || patient.getName().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required field: name");
        }
        if (patient.getCpf() == null || patient.getCpf().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required field: cpf");
        }
        if (patient.getPhone() == null || patient.getPhone().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required field: phone");
        }

        Patient saved = patientRepository.save(patient);
        logAudit("CREATE", "PATIENT", saved.getId(), request);
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{id}")
        public ResponseEntity<Patient> update(@PathVariable String id, @RequestBody Patient patient,
            @AuthenticationPrincipal UserContext userContext, HttpServletRequest request) {
        if (userContext != null && userContext.getTenantId() != null) {
            return patientRepository.findByTenantIdAndId(userContext.getTenantId(), id)
                .map(existing -> {
                patient.setId(id);
                patient.setTenantId(userContext.getTenantId());
                Patient updated = patientRepository.save(patient);
                auditService.logPatientUpdate(id, getUserEmail(), getUserRole(),
                    getIpAddress(request), getUserAgent(request),
                    "[\"name\",\"email\",\"phone\",\"address\"]");
                return ResponseEntity.ok(updated);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return patientRepository.findById(id)
            .map(existing -> {
                patient.setId(id);
                Patient updated = patientRepository.save(patient);
                auditService.logPatientUpdate(id, getUserEmail(), getUserRole(),
                    getIpAddress(request), getUserAgent(request),
                    "[\"name\",\"email\",\"phone\",\"address\"]");
                return ResponseEntity.ok(updated);
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
        }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @AuthenticationPrincipal UserContext userContext,
            HttpServletRequest request) {
        boolean exists;
        if (userContext != null && userContext.getTenantId() != null) {
            exists = patientRepository.findByTenantIdAndId(userContext.getTenantId(), id).isPresent();
        } else {
            exists = patientRepository.existsById(id);
        }
        if (!exists) {
            return ResponseEntity.notFound().build();
        }
        auditService.logPatientDelete(id, getUserEmail(), getUserRole(),
                getIpAddress(request), getUserAgent(request));
        patientRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Métodos auxiliares para auditoria
    private void logAudit(String action, String resourceType, String resourceId, HttpServletRequest request) {
        auditService.logAccess(null, getUserEmail(), getUserRole(), action, resourceType, resourceId,
                getIpAddress(request), getUserAgent(request), null);
    }

    private String getUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "anonymous";
    }

    private String getUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null && !auth.getAuthorities().isEmpty()) {
            return auth.getAuthorities().iterator().next().getAuthority();
        }
        return "UNKNOWN";
    }

    private String getIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    private String getUserAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}

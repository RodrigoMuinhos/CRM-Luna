package br.lunavita.totemapi.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import br.lunavita.totemapi.dto.AppointmentNotificationRequest;
import br.lunavita.totemapi.model.Appointment;
import br.lunavita.totemapi.model.AppointmentPaidUpdate;
import br.lunavita.totemapi.model.AppointmentRequest;
import br.lunavita.totemapi.model.AppointmentStatusUpdate;
import br.lunavita.totemapi.security.UserContext;
import br.lunavita.totemapi.service.DataStoreService;
import br.lunavita.totemapi.service.ReportService;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private static final Logger logger = LoggerFactory.getLogger(AppointmentController.class);

    private final DataStoreService store;
    private final ReportService reportService;

    public AppointmentController(DataStoreService store, ReportService reportService) {
        this.store = store;
        this.reportService = reportService;
    }

    @GetMapping
    public List<Appointment> list(@AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null) {
            return store.listAppointments(userContext.getTenantId());
        }
        return store.listAppointments();
    }

    @GetMapping("/upcoming")
    public List<Appointment> upcoming(@AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null) {
            return store.listUpcomingAppointments(userContext.getTenantId());
        }
        return store.listUpcomingAppointments();
    }

    @GetMapping("/search")
    public List<Appointment> search(@RequestParam("q") String q,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null) {
            return store.searchUpcomingAppointments(userContext.getTenantId(), q);
        }
        return store.searchUpcomingAppointments(q);
    }

    @GetMapping("/unpaid/search")
    public List<Appointment> searchUnpaid(@RequestParam("q") String q,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null) {
            return store.searchUnpaidAppointments(userContext.getTenantId(), q);
        }
        return store.searchUnpaidAppointments(q);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> get(@PathVariable String id,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null) {
            return store.findAppointment(userContext.getTenantId(), id)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return store.findAppointment(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Appointment> create(@RequestBody AppointmentRequest request,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext == null || userContext.getTenantId() == null || userContext.getTenantId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Tenant information missing: authenticate or include tenantId in request");
        }
        Appointment appointment = store.createAppointment(request, userContext.getTenantId());
        return ResponseEntity.status(201).body(appointment);
    }

    /**
     * Endpoint para criar consulta por CPF (busca paciente automaticamente)
     * POST /api/appointments/by-cpf
     * 
     * Body: {
     *   "cpf": "04411750317",
     *   "date": "2026-01-17",
     *   "time": "13:35",
     *   "type": "Retorno",
     *   "amount": 8.00,
     *   "paid": false,
     *   "status": "aguardando",
     *   "doctorId": "opcional"
     * }
     */
    @PostMapping("/by-cpf")
    public ResponseEntity<?> createByCpf(
            @RequestBody br.lunavita.totemapi.dto.CreateAppointmentByCpfRequest request,
            @AuthenticationPrincipal UserContext userContext) {
        
        if (userContext == null || userContext.getTenantId() == null || userContext.getTenantId().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "Tenant information missing"));
        }

        try {
            Appointment apt = store.createAppointmentByCpf(
                request.getCpf(),
                request.getDate(),
                request.getTime(),
                request.getType(),
                request.getAmount(),
                request.getPaid(),
                request.getStatus(),
                request.getDoctorId(),
                userContext.getTenantId()
            );

            // Construir response DTO
            br.lunavita.totemapi.dto.AppointmentResponse response = 
                new br.lunavita.totemapi.dto.AppointmentResponse(
                    apt.getId(),
                    apt.getTenantId(),
                    apt.getPatientId(),
                    apt.getPatient(),
                    apt.getPatientEmail(),
                    apt.getDate(),
                    apt.getTime(),
                    apt.getType(),
                    apt.getStatus(),
                    apt.isPaid(),
                    apt.getAmount(),
                    apt.getCpf(),
                    apt.getDoctorId(),
                    apt.getDoctor(),
                    apt.getSpecialty()
                );

            logger.info("[CREATE BY CPF] Consulta criada: id={}, paciente={}, data={}", 
                    apt.getId(), apt.getPatient(), apt.getDate());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IllegalArgumentException e) {
            logger.warn("[CREATE BY CPF] Erro de validação: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(java.util.Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("[CREATE BY CPF] Erro inesperado: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("error", "Erro ao criar consulta"));
        }
    }

    @PostMapping("/{id}/notify")
    public ResponseEntity<Void> notify(@PathVariable String id, @RequestBody AppointmentNotificationRequest request) {
        logger.info("[CONTROLLER] POST /api/appointments/{}/notify - patientEmail={}, doctorEmail={}",
                id, request.patientEmail(), request.doctorEmail());
        try {
            boolean notified = store.sendAppointmentNotifications(id, request.patientEmail(), request.doctorEmail());
            if (!notified) {
                logger.warn("[CONTROLLER] Consulta não encontrada: {}", id);
                return ResponseEntity.notFound().build();
            }
            logger.info("[CONTROLLER] Notificação enviada com sucesso para consulta: {}", id);
            return ResponseEntity.accepted().build();
        } catch (Exception e) {
            logger.error("[CONTROLLER] Erro ao enviar notificação: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Appointment> updateStatus(@PathVariable String id,
            @RequestBody AppointmentStatusUpdate update,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null && !userContext.getTenantId().isBlank()) {
            return store.updateStatus(id, update.getStatus(), userContext.getTenantId())
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return store.updateStatus(id, update.getStatus())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/paid")
    public ResponseEntity<Appointment> updatePaid(
            @PathVariable String id,
            @RequestBody AppointmentPaidUpdate update,
            @AuthenticationPrincipal UserContext userContext) {

        if (update == null || update.getPaid() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field 'paid' is required");
        }

        boolean paid = update.getPaid();

        if (userContext != null && userContext.getTenantId() != null && !userContext.getTenantId().isBlank()) {
            return store.updatePaid(id, paid, userContext.getTenantId())
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }

        return store.updatePaid(id, paid)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Appointment> update(@PathVariable String id, @RequestBody AppointmentRequest request,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null && !userContext.getTenantId().isBlank()) {
            return store.updateAppointment(id, request, userContext.getTenantId())
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return store.updateAppointment(id, request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id,
            @AuthenticationPrincipal UserContext userContext) {
        boolean deleted;
        if (userContext != null && userContext.getTenantId() != null && !userContext.getTenantId().isBlank()) {
            deleted = store.deleteAppointment(id, userContext.getTenantId());
        } else {
            deleted = store.deleteAppointment(id);
        }
        if (deleted) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Appointment> uploadPhoto(@PathVariable String id, @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null && !userContext.getTenantId().isBlank()) {
            return store.findAppointment(userContext.getTenantId(), id)
                    .flatMap(apt -> store.uploadAppointmentPhoto(apt.getId(), file))
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return store.uploadAppointmentPhoto(id, file)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping(value = "/{id}/report", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> getReport(@PathVariable String id,
            @AuthenticationPrincipal UserContext userContext) {
        if (userContext != null && userContext.getTenantId() != null && !userContext.getTenantId().isBlank()) {
            return store.findAppointment(userContext.getTenantId(), id)
                    .map(apt -> ResponseEntity.ok()
                            .header("Content-Disposition", "inline; filename=\"relatorio-" + id + ".pdf\"")
                            .contentType(MediaType.APPLICATION_PDF)
                            .body(reportService.generateAppointmentReport(apt)))
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return store.findAppointment(id)
                .map(apt -> ResponseEntity.ok()
                        .header("Content-Disposition", "inline; filename=\"relatorio-" + id + ".pdf\"")
                        .contentType(MediaType.APPLICATION_PDF)
                        .body(reportService.generateAppointmentReport(apt)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.dto.CreatePrintJobRequest;
import br.lunavita.totemapi.model.Appointment;
import br.lunavita.totemapi.security.UserContext;
import br.lunavita.totemapi.service.DataStoreService;
import br.lunavita.totemapi.service.PrintQueueService;
import br.lunavita.totemapi.service.ReceiptGeneratorService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Endpoint legado de pagamento do Totem.
 * 
 * - Para PIX real: use POST /api/payments/pix (proxy do LunaPay)
 * - Este endpoint é usado pelo fluxo atual do TotemUI (simulado) para marcar a consulta como paga.
 * - Ao confirmar pagamento, enfileira automaticamente um recibo para impressão
 */
@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
@Slf4j
public class PaymentController {

    private final DataStoreService store;
    private final PrintQueueService printQueueService;
    private final ReceiptGeneratorService receiptGenerator;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public PaymentController(
            DataStoreService store,
            PrintQueueService printQueueService,
            ReceiptGeneratorService receiptGenerator) {
        this.store = store;
        this.printQueueService = printQueueService;
        this.receiptGenerator = receiptGenerator;
    }

    @PostMapping
    public ResponseEntity<?> capture(
            @RequestBody PaymentProcessRequest request,
            @AuthenticationPrincipal UserContext userContext) {

        if (request == null || request.appointmentId == null || request.appointmentId.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "appointmentId é obrigatório"));
        }

        // Busca o agendamento para gerar o recibo
        var appointmentOpt = store.findAppointment(request.appointmentId);
        
        if (appointmentOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(java.util.Map.of("error", "Consulta não encontrada"));
        }

        Appointment appointment = appointmentOpt.get();

        // Valida tenant
        if (userContext != null && userContext.getTenantId() != null) {
            if (!userContext.getTenantId().equals(appointment.getTenantId())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(java.util.Map.of("error", "Consulta não encontrada"));
            }
        }

        // Atualiza status para confirmado
        var updatedOpt = store.updateStatus(request.appointmentId, "confirmado");
        
        if (updatedOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("error", "Erro ao confirmar pagamento"));
        }

        // ✅ ENFILEIRA RECIBO PARA IMPRESSÃO (ASSÍNCRONO)
        try {
            enqueuePaymentReceipt(appointment, request);
            log.info("Recibo de pagamento enfileirado para impressão: appointmentId={}", request.appointmentId);
        } catch (Exception e) {
            // Log do erro, mas NÃO bloqueia o fluxo do usuário
            log.error("Erro ao enfileirar recibo de impressão (não crítico): {}", e.getMessage(), e);
        }

        return ResponseEntity.ok(updatedOpt.get());
    }

    /**
     * Enfileira um recibo de pagamento para impressão
     * IMPORTANTE: Este método NÃO bloqueia o fluxo, apenas adiciona à fila
     */
    private void enqueuePaymentReceipt(Appointment appointment, PaymentProcessRequest request) {
        try {
            // Gera o conteúdo ESC/POS do recibo
            String escPosPayload = receiptGenerator.generatePaymentReceipt(
                    "Luna Vita", // Nome da clínica (pode vir de config)
                    appointment.getPatient(),
                    appointment.getCpf(),
                    request.amount != null ? request.amount : appointment.getAmount(),
                    request.method != null ? request.method : "PIX",
                    DATE_FORMATTER.format(appointment.getDate()),
                    appointment.getTime(),
                    appointment.getDoctor(),
                    appointment.getSpecialty()
            );

            // Cria o job de impressão
            CreatePrintJobRequest printJob = CreatePrintJobRequest.builder()
                    .terminalId(getTerminalId(appointment.getTenantId())) // Identifica o totem
                    .tenantId(appointment.getTenantId())
                    .receiptType("PAYMENT")
                    .payload(escPosPayload)
                    .appointmentId(appointment.getId())
                    .priority(0) // Alta prioridade para recibos de pagamento
                    .maxAttempts(5)
                    .build();

            // Enfileira (persistido no banco, NÃO perde se houver falha)
            printQueueService.enqueue(printJob);

        } catch (Exception e) {
            log.error("Falha ao gerar/enfileirar recibo: {}", e.getMessage(), e);
            // Não propaga exceção - impressão é best-effort
        }
    }

    /**
     * Determina qual terminal deve imprimir (pode ser configurável)
     * Por enquanto usa um padrão simples: "TOTEM-" + tenantId
     */
    private String getTerminalId(String tenantId) {
        // TODO: Implementar lógica mais sofisticada se houver múltiplos totems
        return "TOTEM-" + (tenantId != null ? tenantId : "DEFAULT");
    }

    @GetMapping
    public ResponseEntity<List<Appointment>> list(@AuthenticationPrincipal UserContext userContext) {
        // Mantido por compatibilidade com UI (não expõe dados de pagamento do LunaPay).
        // Retorna consultas do tenant (se existir tenantId no token), senão lista geral (dev).
        List<Appointment> all = store.listAppointments();
        if (userContext == null || userContext.getTenantId() == null) {
            return ResponseEntity.ok(all);
        }
        return ResponseEntity.ok(all.stream()
                .filter(a -> userContext.getTenantId().equals(a.getTenantId()))
                .toList());
    }

    public static class PaymentProcessRequest {
        public String appointmentId;
        public java.math.BigDecimal amount;
        public String method;
    }
}

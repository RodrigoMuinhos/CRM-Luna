package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.dto.CreatePrintJobRequest;
import br.lunavita.totemapi.dto.PrintJobResponse;
import br.lunavita.totemapi.dto.PrintResultRequest;
import br.lunavita.totemapi.security.UserContext;
import br.lunavita.totemapi.service.PrintQueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Controller REST para gerenciar a fila de impressão.
 * Endpoints usados pelo Print Agent (rodando localmente no totem).
 */
@RestController
@RequestMapping("/api/print-queue")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class PrintQueueController {

    private final PrintQueueService printQueueService;

    /**
     * Endpoint interno: Adiciona um novo job à fila
     * Usado pelo backend quando um recibo precisa ser impresso
     */
    @PostMapping("/enqueue")
    public ResponseEntity<?> enqueue(
            @RequestBody CreatePrintJobRequest request,
            @AuthenticationPrincipal UserContext userContext) {

        // Validações
        if (request.getTerminalId() == null || request.getTerminalId().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "terminalId é obrigatório"));
        }

        if (request.getPayload() == null || request.getPayload().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "payload é obrigatório"));
        }

        // Se não tiver tenantId no request, usa do contexto de autenticação
        if ((request.getTenantId() == null || request.getTenantId().isBlank()) && userContext != null) {
            request.setTenantId(userContext.getTenantId());
        }

        if (request.getTenantId() == null || request.getTenantId().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "tenantId é obrigatório (ou autenticação com tenant válida)"));
        }

        try {
            PrintJobResponse response = printQueueService.enqueue(request);
            log.info("Job de impressão enfileirado: {}", response.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Erro ao enfileirar job de impressão", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erro ao criar job: " + e.getMessage()));
        }
    }

    /**
     * Endpoint para o Print Agent: busca o próximo job pendente
     * O Agent chama este endpoint periodicamente para buscar trabalhos
     */
    @GetMapping("/claim-next")
    public ResponseEntity<?> claimNext(@RequestParam String terminalId) {

        if (terminalId == null || terminalId.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "terminalId é obrigatório"));
        }

        Optional<PrintJobResponse> jobOpt = printQueueService.claimNext(terminalId);

        if (jobOpt.isEmpty()) {
            // Nenhum job pendente (resposta normal, não é erro)
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        }

        return ResponseEntity.ok(jobOpt.get());
    }

    /**
     * Endpoint para o Print Agent: reporta resultado da impressão
     */
    @PostMapping("/report")
    public ResponseEntity<?> report(@RequestBody PrintResultRequest request) {

        if (request.getJobId() == null || request.getJobId().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "jobId é obrigatório"));
        }

        boolean success;

        if (request.isSuccess()) {
            success = printQueueService.markPrinted(request.getJobId());
            if (success) {
                log.info("Job {} marcado como PRINTED", request.getJobId());
                return ResponseEntity.ok(Map.of("status", "PRINTED"));
            }
        } else {
            String errorMsg = request.getErrorMessage() != null 
                    ? request.getErrorMessage() 
                    : "Erro desconhecido";
            success = printQueueService.markFailed(request.getJobId(), errorMsg);
            if (success) {
                log.warn("Job {} marcado como FAILED: {}", request.getJobId(), errorMsg);
                return ResponseEntity.ok(Map.of("status", "FAILED"));
            }
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Job não encontrado"));
    }

    /**
     * Lista jobs pendentes de um terminal
     */
    @GetMapping("/pending")
    public ResponseEntity<List<PrintJobResponse>> listPending(@RequestParam String terminalId) {
        List<PrintJobResponse> jobs = printQueueService.listPending(terminalId);
        return ResponseEntity.ok(jobs);
    }

    /**
     * Conta jobs pendentes de um terminal
     */
    @GetMapping("/count-pending")
    public ResponseEntity<?> countPending(@RequestParam String terminalId) {
        long count = printQueueService.countPending(terminalId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * Lista jobs falhados de um terminal
     */
    @GetMapping("/failed")
    public ResponseEntity<List<PrintJobResponse>> listFailed(@RequestParam String terminalId) {
        List<PrintJobResponse> jobs = printQueueService.listFailed(terminalId);
        return ResponseEntity.ok(jobs);
    }

    /**
     * Busca comprovantes (print_jobs) por saleId.
     * Útil para recuperar comprovante real salvo no banco quando o arquivo local não existe.
     */
    @GetMapping("/by-sale-id")
    public ResponseEntity<?> listBySaleId(
            @RequestParam String saleId,
            @RequestParam(required = false) String terminalId,
            @RequestParam(defaultValue = "20") int limit) {

        if (saleId == null || saleId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "saleId é obrigatório"));
        }

        List<PrintJobResponse> jobs = printQueueService.listBySaleId(saleId, terminalId, limit);
        return ResponseEntity.ok(Map.of(
                "ok", true,
                "saleId", saleId,
                "terminalId", terminalId,
                "count", jobs.size(),
                "jobs", jobs
        ));
    }

    /**
     * Verifica em lote quais saleIds têm comprovante salvo em print_jobs.
     */
    @PostMapping("/has-receipts")
    public ResponseEntity<?> hasReceipts(@RequestBody Map<String, Object> body) {
        Object rawSaleIds = body.get("saleIds");
        if (!(rawSaleIds instanceof List<?> saleIdsList) || saleIdsList.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "saleIds é obrigatório"));
        }

        String terminalId = body.get("terminalId") != null ? String.valueOf(body.get("terminalId")) : null;
        List<String> saleIds = saleIdsList.stream().map(String::valueOf).toList();
        Set<String> matchedSaleIds = printQueueService.findSaleIdsWithReceipts(saleIds, terminalId);

        return ResponseEntity.ok(Map.of(
                "ok", true,
                "count", matchedSaleIds.size(),
                "matchedSaleIds", matchedSaleIds
        ));
    }

    /**
     * Busca um job específico por ID
     */
    @GetMapping("/{jobId}")
    public ResponseEntity<?> getJob(@PathVariable String jobId) {
        Optional<PrintJobResponse> jobOpt = printQueueService.findById(jobId);
        
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job não encontrado"));
        }

        return ResponseEntity.ok(jobOpt.get());
    }

    /**
     * Cancela um job
     */
    @PostMapping("/{jobId}/cancel")
    public ResponseEntity<?> cancelJob(@PathVariable String jobId) {
        boolean success = printQueueService.cancel(jobId);
        
        if (!success) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job não encontrado"));
        }

        return ResponseEntity.ok(Map.of("status", "CANCELED"));
    }

    /**
     * Lista todos os jobs de um tenant (admin)
     */
    @GetMapping("/tenant")
    public ResponseEntity<List<PrintJobResponse>> listByTenant(
            @AuthenticationPrincipal UserContext userContext) {

        if (userContext == null || userContext.getTenantId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<PrintJobResponse> jobs = printQueueService.listByTenant(userContext.getTenantId());
        return ResponseEntity.ok(jobs);
    }

    /**
     * Endpoint de manutenção: libera jobs travados
     * Jobs que ficaram em PRINTING por mais de X minutos
     */
    @PostMapping("/maintenance/release-stale")
    public ResponseEntity<?> releaseStaleJobs(
            @RequestParam(defaultValue = "10") int minutesThreshold) {

        int released = printQueueService.releaseStaleJobs(minutesThreshold);
        
        return ResponseEntity.ok(Map.of(
                "released", released,
                "message", released + " jobs foram liberados"
        ));
    }
}

package br.lunavita.totemapi.service;

import br.lunavita.totemapi.dto.CreatePrintJobRequest;
import br.lunavita.totemapi.dto.PrintJobResponse;
import br.lunavita.totemapi.model.PrintJob;
import br.lunavita.totemapi.model.PrintJob.PrintJobStatus;
import br.lunavita.totemapi.repository.PrintJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Serviço de gerenciamento da fila de impressão.
 * Responsável por enfileirar, processar e gerenciar o ciclo de vida dos jobs de impressão.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PrintQueueService {

    private static final Pattern UUID_PATTERN = Pattern.compile(
            "(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    );
    private final PrintJobRepository printJobRepository;

    /**
     * Adiciona um novo job à fila de impressão
     */
    @Transactional
    public PrintJobResponse enqueue(CreatePrintJobRequest request) {
        log.info("Enfileirando job de impressão - terminal: {}, tipo: {}", 
                 request.getTerminalId(), request.getReceiptType());

        PrintJob job = PrintJob.builder()
                .terminalId(request.getTerminalId())
                .tenantId(request.getTenantId())
                .receiptType(request.getReceiptType())
                .status(PrintJobStatus.PENDING)
                .payload(request.getPayload())
                .attempts(0)
                .maxAttempts(request.getMaxAttempts() != null ? request.getMaxAttempts() : 5)
                .priority(request.getPriority() != null ? request.getPriority() : 0)
                .appointmentId(request.getAppointmentId())
                .paymentId(request.getPaymentId())
                .metadata(request.getMetadata())
                .build();

        PrintJob saved = printJobRepository.save(job);
        
        log.info("Job de impressão criado: {} (status: PENDING)", saved.getId());
        
        return mapToResponse(saved);
    }

    /**
     * Busca o próximo job pendente para um terminal (claim/lock)
     */
    @Transactional
    public Optional<PrintJobResponse> claimNext(String terminalId) {
        // Avoid repository methods that expect a single row when there may be many pending jobs.
        // We explicitly fetch the ordered list and pick the first item.
        Optional<PrintJob> jobOpt = printJobRepository.findPendingByTerminal(terminalId)
                .stream()
                .findFirst();

        if (jobOpt.isEmpty()) {
            return Optional.empty();
        }

        PrintJob job = jobOpt.get();
        
        // Lock: muda status para PRINTING
        job.setStatus(PrintJobStatus.PRINTING);
        job.incrementAttempts();
        
        PrintJob updated = printJobRepository.save(job);
        
        log.info("Job {} reservado para impressão no terminal {} (tentativa {}/{})",
                 job.getId(), terminalId, job.getAttempts(), job.getMaxAttempts());

        return Optional.of(mapToResponse(updated));
    }

    /**
     * Marca um job como impresso com sucesso
     */
    @Transactional
    public boolean markPrinted(String jobId) {
        Optional<PrintJob> jobOpt = printJobRepository.findById(jobId);

        if (jobOpt.isEmpty()) {
            log.warn("Job {} não encontrado para marcar como impresso", jobId);
            return false;
        }

        PrintJob job = jobOpt.get();
        job.markPrinted();
        printJobRepository.save(job);

        log.info("Job {} marcado como PRINTED", jobId);
        return true;
    }

    /**
     * Marca um job como falhado
     */
    @Transactional
    public boolean markFailed(String jobId, String errorMessage) {
        Optional<PrintJob> jobOpt = printJobRepository.findById(jobId);

        if (jobOpt.isEmpty()) {
            log.warn("Job {} não encontrado para marcar como falhado", jobId);
            return false;
        }

        PrintJob job = jobOpt.get();
        job.markFailed(errorMessage);
        printJobRepository.save(job);

        if (job.getStatus() == PrintJobStatus.FAILED) {
            log.error("Job {} FALHOU permanentemente após {} tentativas: {}", 
                      jobId, job.getAttempts(), errorMessage);
        } else {
            log.warn("Job {} falhou (tentativa {}/{}), será reprocessado: {}", 
                     jobId, job.getAttempts(), job.getMaxAttempts(), errorMessage);
        }

        return true;
    }

    /**
     * Lista jobs pendentes de um terminal
     */
    @Transactional(readOnly = true)
    public List<PrintJobResponse> listPending(String terminalId) {
        return printJobRepository.findPendingByTerminal(terminalId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Lista todos os jobs de um tenant
     */
    @Transactional(readOnly = true)
    public List<PrintJobResponse> listByTenant(String tenantId) {
        return printJobRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Busca um job específico
     */
    @Transactional(readOnly = true)
    public Optional<PrintJobResponse> findById(String jobId) {
        return printJobRepository.findById(jobId)
                .map(this::mapToResponse);
    }

    /**
     * Cancela um job
     */
    @Transactional
    public boolean cancel(String jobId) {
        Optional<PrintJob> jobOpt = printJobRepository.findById(jobId);

        if (jobOpt.isEmpty()) {
            return false;
        }

        PrintJob job = jobOpt.get();
        job.setStatus(PrintJobStatus.CANCELED);
        printJobRepository.save(job);

        log.info("Job {} cancelado", jobId);
        return true;
    }

    /**
     * Libera jobs travados (que estão em PRINTING há muito tempo)
     * Útil para casos onde o Print Agent morreu durante impressão
     */
    @Transactional
    public int releaseStaleJobs(int minutesThreshold) {
        Instant threshold = Instant.now().minus(minutesThreshold, ChronoUnit.MINUTES);
        List<PrintJob> stalledJobs = printJobRepository.findStalledJobs(threshold);

        for (PrintJob job : stalledJobs) {
            log.warn("Liberando job travado: {} (última tentativa: {})", 
                     job.getId(), job.getLastAttemptAt());
            job.setStatus(PrintJobStatus.PENDING);
            printJobRepository.save(job);
        }

        return stalledJobs.size();
    }

    /**
     * Mapeia entidade para DTO de resposta
     */
    private PrintJobResponse mapToResponse(PrintJob job) {
        return PrintJobResponse.builder()
                .id(job.getId())
                .terminalId(job.getTerminalId())
                .tenantId(job.getTenantId())
                .receiptType(job.getReceiptType())
                .status(job.getStatus().name())
                .payload(job.getPayload())
                .attempts(job.getAttempts())
                .maxAttempts(job.getMaxAttempts())
                .error(job.getError())
                .appointmentId(job.getAppointmentId())
                .paymentId(job.getPaymentId())
                .priority(job.getPriority())
                .metadata(job.getMetadata())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .printedAt(job.getPrintedAt())
                .lastAttemptAt(job.getLastAttemptAt())
                .build();
    }

    /**
     * Conta jobs pendentes de um terminal
     */
    @Transactional(readOnly = true)
    public long countPending(String terminalId) {
        return printJobRepository.countByTerminalIdAndStatus(terminalId, PrintJobStatus.PENDING);
    }

    /**
     * Lista jobs falhados de um terminal
     */
    @Transactional(readOnly = true)
    public List<PrintJobResponse> listFailed(String terminalId) {
        return printJobRepository.findByTerminalIdAndStatusOrderByUpdatedAtDesc(terminalId, PrintJobStatus.FAILED)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Busca jobs que carregam comprovante para um saleId específico.
     * Aceita saleId em metadata JSON, paymentId ou appointmentId.
     */
    @Transactional(readOnly = true)
    public List<PrintJobResponse> listBySaleId(String saleId, String terminalId, int limit) {
        String wantedSaleId = saleId == null ? "" : saleId.trim();
        if (wantedSaleId.isBlank()) return List.of();
        Set<String> aliases = expandSaleIdAliases(wantedSaleId);

        int safeLimit = Math.max(1, Math.min(100, limit));
        String wantedTerminal = terminalId == null ? "" : terminalId.trim();
        List<PrintJobRepository.PrintJobSaleCandidate> candidates =
                findRecentPaymentSaleCandidatesWithFallback(wantedTerminal, 1000);

        List<String> jobIds = candidates.stream()
                .filter(candidate -> matchesSaleId(candidate, aliases))
                .map(PrintJobRepository.PrintJobSaleCandidate::getId)
                .filter(id -> id != null && !id.isBlank())
                .limit(safeLimit)
                .toList();
        if (jobIds.isEmpty()) return List.of();

        return loadJobsByIdsOrdered(jobIds).stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Retorna quais saleIds possuem ao menos um comprovante salvo em print_jobs.
     */
    @Transactional(readOnly = true)
    public Set<String> findSaleIdsWithReceipts(List<String> saleIds, String terminalId) {
        if (saleIds == null || saleIds.isEmpty()) return Set.of();

        Set<String> wanted = saleIds.stream()
                .map(id -> id == null ? "" : id.trim())
                .filter(id -> !id.isBlank())
                .distinct()
                .collect(Collectors.toSet());
        if (wanted.isEmpty()) return Set.of();
        Map<String, Set<String>> aliasToOriginal = buildAliasLookup(wanted);
        if (aliasToOriginal.isEmpty()) return Set.of();

        String wantedTerminal = terminalId == null ? "" : terminalId.trim();
        List<PrintJobRepository.PrintJobSaleCandidate> recent =
                findRecentPaymentSaleCandidatesWithFallback(wantedTerminal, 1200);
        Set<String> found = new HashSet<>();
        for (PrintJobRepository.PrintJobSaleCandidate job : recent) {
            for (String candidate : extractCandidateSaleIds(job)) {
                Set<String> originals = aliasToOriginal.get(candidate);
                if (originals == null || originals.isEmpty()) continue;
                found.addAll(originals);
            }
        }

        return found;
    }

    private List<PrintJobRepository.PrintJobSaleCandidate> findRecentPaymentSaleCandidatesWithFallback(String terminalId, int maxRows) {
        int safeRows = Math.max(1, Math.min(5000, maxRows));
        PageRequest page = PageRequest.of(0, safeRows);

        List<PrintJobRepository.PrintJobSaleCandidate> filtered =
                printJobRepository.findRecentPaymentSaleCandidates(terminalId, page);
        if (!filtered.isEmpty() || terminalId == null || terminalId.isBlank()) {
            return filtered;
        }
        // Em homologação/local, pode haver histórico salvo com terminal diferente.
        return printJobRepository.findRecentPaymentSaleCandidates("", page);
    }

    private List<PrintJob> loadJobsByIdsOrdered(List<String> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) return List.of();

        List<String> uniqueIds = new ArrayList<>(new LinkedHashSet<>(orderedIds));
        Map<String, PrintJob> byId = printJobRepository.findAllById(uniqueIds).stream()
                .collect(Collectors.toMap(PrintJob::getId, job -> job));

        List<PrintJob> ordered = new ArrayList<>();
        for (String id : uniqueIds) {
            PrintJob job = byId.get(id);
            if (job != null) ordered.add(job);
        }
        return ordered;
    }

    private boolean matchesSaleId(PrintJobRepository.PrintJobSaleCandidate job, Set<String> saleIdAliases) {
        if (saleIdAliases == null || saleIdAliases.isEmpty()) return false;
        if (saleIdAliases.contains(String.valueOf(job.getPaymentId()).trim())) return true;
        return saleIdAliases.contains(String.valueOf(job.getAppointmentId()).trim());
    }

    private Set<String> extractCandidateSaleIds(PrintJobRepository.PrintJobSaleCandidate job) {
        String paymentId = String.valueOf(job.getPaymentId()).trim();
        String appointmentId = String.valueOf(job.getAppointmentId()).trim();
        return java.util.stream.Stream.of(paymentId, appointmentId)
                .filter(v -> !v.isBlank())
                .filter(v -> !"null".equalsIgnoreCase(v))
                .collect(Collectors.toSet());
    }

    private Map<String, Set<String>> buildAliasLookup(Set<String> originals) {
        Map<String, Set<String>> lookup = new HashMap<>();
        for (String original : originals) {
            for (String alias : expandSaleIdAliases(original)) {
                lookup.computeIfAbsent(alias, ignored -> new HashSet<>()).add(original);
            }
        }
        return lookup;
    }

    private Set<String> expandSaleIdAliases(String saleIdRaw) {
        String raw = String.valueOf(saleIdRaw).trim();
        if (raw.isBlank() || "null".equalsIgnoreCase(raw)) return Set.of();

        Set<String> aliases = new LinkedHashSet<>();
        aliases.add(raw);

        String lower = raw.toLowerCase();
        if (lower.endsWith("-tef") && raw.length() > 4) {
            aliases.add(raw.substring(0, raw.length() - 4));
        }

        Matcher m = UUID_PATTERN.matcher(raw);
        while (m.find()) {
            aliases.add(m.group());
        }
        return aliases;
    }
}

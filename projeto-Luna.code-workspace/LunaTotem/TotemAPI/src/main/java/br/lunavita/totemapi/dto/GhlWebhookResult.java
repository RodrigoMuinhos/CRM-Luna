package br.lunavita.totemapi.dto;

public class GhlWebhookResult {
    private final String patientId;
    private final boolean deduplicated;

    public GhlWebhookResult(String patientId, boolean deduplicated) {
        this.patientId = patientId;
        this.deduplicated = deduplicated;
    }

    public String getPatientId() {
        return patientId;
    }

    public boolean isDeduplicated() {
        return deduplicated;
    }
}

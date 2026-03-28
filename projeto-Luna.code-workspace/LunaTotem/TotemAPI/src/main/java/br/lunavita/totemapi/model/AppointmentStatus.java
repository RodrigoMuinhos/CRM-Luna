package br.lunavita.totemapi.model;

public enum AppointmentStatus {
    AGUARDANDO_CHEGADA("Aguardando chegada"),
    CONFIRMADA("Confirmada"),
    EM_ATENDIMENTO("Em atendimento"),
    FINALIZADA("Finalizada"),
    CANCELADA("Cancelada");

    private final String description;

    AppointmentStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    @Override
    public String toString() {
        return this.name();
    }
}

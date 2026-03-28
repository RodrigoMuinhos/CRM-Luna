package br.lunavita.totemapi.model;

import java.math.BigDecimal;
import java.util.List;

public class DashboardSummary {
    private long scheduledCount;
    private long activePatients;
    private long freeSlots;
    private BigDecimal receivables;
    private List<Appointment> recentAppointments;

    public long getScheduledCount() {
        return scheduledCount;
    }

    public void setScheduledCount(long scheduledCount) {
        this.scheduledCount = scheduledCount;
    }

    public long getActivePatients() {
        return activePatients;
    }

    public void setActivePatients(long activePatients) {
        this.activePatients = activePatients;
    }

    public long getFreeSlots() {
        return freeSlots;
    }

    public void setFreeSlots(long freeSlots) {
        this.freeSlots = freeSlots;
    }

    public BigDecimal getReceivables() {
        return receivables;
    }

    public void setReceivables(BigDecimal receivables) {
        this.receivables = receivables;
    }

    public List<Appointment> getRecentAppointments() {
        return recentAppointments;
    }

    public void setRecentAppointments(List<Appointment> recentAppointments) {
        this.recentAppointments = recentAppointments;
    }
}

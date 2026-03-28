package br.lunavita.totemapi.config;

import br.lunavita.totemapi.model.AppointmentRequest;
import br.lunavita.totemapi.model.Doctor;
import br.lunavita.totemapi.service.DataStoreService;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.stereotype.Component;

/**
 * DataInitializer - Seed data component for development/testing
 * DISABLED: Use real database data instead of fake seed data
 */
// @Component
public class DataInitializer {

    private final DataStoreService store;

    public DataInitializer(DataStoreService store) {
        this.store = store;
    }

    // @PostConstruct
    public void seed() {
        // Use a fixed tenantId for local testing (matches LunaCore dev seed)
        final String TEST_TENANT_ID = "951356b9-bd52-40d0-b3a4-ea676dfa6aa7";
        
        if (store.listDoctors().isEmpty()) {
            Doctor doc1 = new Doctor();
            doc1.setTenantId(TEST_TENANT_ID);
            doc1.setName("Dra. Ana Costa");
            doc1.setSpecialty("Ginecologia e Obstetrícia");
            doc1.setEmail("ana.costa@lunavita.com");
            doc1.setPhone("(11) 98765-0001");
            doc1.setAvailability("Seg, Ter, Qua, Sex");
            doc1.setCrm("CRM/SP 123456");
            store.createDoctor(doc1);

            Doctor doc2 = new Doctor();
            doc2.setTenantId(TEST_TENANT_ID);
            doc2.setName("Dr. Paulo Lima");
            doc2.setSpecialty("Clínico Geral");
            doc2.setEmail("paulo.lima@lunavita.com");
            doc2.setPhone("(11) 98765-0002");
            doc2.setAvailability("Seg, Qua, Qui, Sex");
            doc2.setCrm("CRM/SP 234567");
            store.createDoctor(doc2);
        }

        if (store.listAppointments().isEmpty()) {
            AppointmentRequest request1 = new AppointmentRequest();
            request1.setPatient("Ana Carolina Silva");
            request1.setPatientId("p-1");
            request1.setDoctor("Dra. Ana Costa");
            request1.setSpecialty("Ginecologia");
            request1.setDate(LocalDate.of(2025, 12, 20));
            request1.setTime("14:00");
            request1.setAmount(new BigDecimal("350"));
            request1.setCpf("123.456.789-00");
            request1.setType("CONSULTA");
            request1.setPatientEmail("ana.silva@example.com");
            request1.setTenantId(TEST_TENANT_ID);
            store.createAppointment(request1);

            AppointmentRequest request2 = new AppointmentRequest();
            request2.setPatient("Amanda Santos");
            request2.setPatientId("p-2");
            request2.setDoctor("Dr. Paulo Lima");
            request2.setSpecialty("Clínica Geral");
            request2.setDate(LocalDate.of(2025, 12, 21));
            request2.setTime("14:30");
            request2.setAmount(new BigDecimal("420"));
            request2.setCpf("234.567.890-11");
            request2.setType("CONSULTA");
            request2.setPatientEmail("amanda.santos@example.com");
            request2.setTenantId(TEST_TENANT_ID);
            store.createAppointment(request2);

            AppointmentRequest request3 = new AppointmentRequest();
            request3.setPatient("Carlos Rodrigues");
            request3.setPatientId("p-3");
            request3.setDoctor("Dra. Ana Costa");
            request3.setSpecialty("Obstetrícia");
            request3.setDate(LocalDate.of(2025, 12, 22));
            request3.setTime("10:00");
            request3.setAmount(new BigDecimal("380"));
            request3.setCpf("345.678.901-22");
            request3.setType("EXAME");
            request3.setPatientEmail("carlos.rodrigues@example.com");
            request3.setTenantId(TEST_TENANT_ID);
            store.createAppointment(request3);
        }
    }
}

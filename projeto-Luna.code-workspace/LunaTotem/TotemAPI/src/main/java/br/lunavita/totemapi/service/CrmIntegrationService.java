package br.lunavita.totemapi.service;

import br.lunavita.totemapi.dto.CrmWebhookPayload;
import br.lunavita.totemapi.model.Appointment;
import br.lunavita.totemapi.model.Patient;
import br.lunavita.totemapi.repository.PatientRepository;
import br.lunavita.totemapi.repository.AppointmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.UUID;

@Service
public class CrmIntegrationService {

    private static final Logger logger = LoggerFactory.getLogger(CrmIntegrationService.class);
    private static final DateTimeFormatter BR_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    /**
     * Processa webhook do CRM e cria/atualiza paciente
     */
    @Transactional
    public String processWebhook(CrmWebhookPayload payload) {
        logger.info("Processando webhook do CRM");

        CrmWebhookPayload.CrmContactBody contact = payload.getBody();
        if (contact == null) {
            throw new IllegalArgumentException("Body do webhook está vazio");
        }

        // Extrair CPF (limpar formatação)
        String cpf = cleanCpf(contact.getCpf());
        if (cpf == null || cpf.isEmpty()) {
            throw new IllegalArgumentException("CPF é obrigatório");
        }

        // Verificar se paciente já existe
        Optional<Patient> existingPatient = patientRepository.findByCpf(cpf);
        Patient patient;

        if (existingPatient.isPresent()) {
            logger.info("Paciente já existe com CPF: {}", maskCpf(cpf));
            patient = existingPatient.get();
            updatePatientFromCrm(patient, contact);
        } else {
            logger.info("Criando novo paciente com CPF: {}", maskCpf(cpf));
            patient = createPatientFromCrm(contact, cpf);
        }

        // Salvar paciente
        patient = patientRepository.save(patient);
        logger.info("Paciente salvo: {} (ID: {})", patient.getName(), patient.getId());

        // Verificar se deve criar agendamento
        if (shouldCreateAppointment(contact)) {
            try {
                createAppointmentFromCrm(patient, contact);
            } catch (Exception e) {
                logger.error("Erro ao criar agendamento para paciente {}: {}", patient.getId(), e.getMessage());
                // Não falhar o webhook se o paciente foi criado com sucesso
            }
        }

        return patient.getId();
    }

    /**
     * Cria novo paciente a partir dos dados do CRM
     */
    private Patient createPatientFromCrm(CrmWebhookPayload.CrmContactBody contact, String cpf) {
        Patient patient = new Patient();
        patient.setId(UUID.randomUUID().toString());
        patient.setCpf(cpf);

        updatePatientFromCrm(patient, contact);

        return patient;
    }

    /**
     * Atualiza dados do paciente a partir do CRM
     */
    private void updatePatientFromCrm(Patient patient, CrmWebhookPayload.CrmContactBody contact) {
        // Nome - priorizar "Nome Completo", caso contrário usar full_name ou firstName
        // + lastName
        String name = contact.getNomeCompleto();
        if (name == null || name.trim().isEmpty()) {
            name = contact.getFullName();
        }
        if (name == null || name.trim().isEmpty()) {
            name = (contact.getFirstName() != null ? contact.getFirstName() : "")
                    + " "
                    + (contact.getLastName() != null ? contact.getLastName() : "");
        }
        patient.setName(name.trim());

        // Email - priorizar "E-mail" secundário, caso contrário email principal
        String email = contact.getEmailSecundario();
        if (email == null || email.trim().isEmpty()) {
            email = contact.getEmail();
        }
        patient.setEmail(email);

        // Telefone
        String phone = contact.getPhone();
        if (phone != null) {
            patient.setPhone(phone);
        }

        // Data de nascimento (converter de DD/MM/YYYY para o formato usado)
        String birthDate = contact.getDataNascimento();
        if (birthDate != null && !birthDate.trim().isEmpty()) {
            patient.setBirthDate(birthDate);
        }

        // Endereço - montar endereço completo
        String address = buildAddress(contact);
        if (!address.isEmpty()) {
            patient.setAddress(address);
        }

        // Convênio
        if (contact.getConvenio() != null && !contact.getConvenio().trim().isEmpty()) {
            patient.setHealthPlan(contact.getConvenio());
        }

        // Observações
        if (contact.getObservacao() != null && !contact.getObservacao().trim().isEmpty()) {
            patient.setNotes(contact.getObservacao());
        }
    }

    /**
     * Monta endereço completo a partir dos campos do CRM
     */
    private String buildAddress(CrmWebhookPayload.CrmContactBody contact) {
        StringBuilder address = new StringBuilder();

        // Logradouro
        if (contact.getLogradouro() != null && !contact.getLogradouro().trim().isEmpty()) {
            address.append(contact.getLogradouro());
        }

        // Número
        if (contact.getNumero() != null && !contact.getNumero().trim().isEmpty()) {
            if (address.length() > 0)
                address.append(", ");
            address.append(contact.getNumero());
        }

        // Complemento
        if (contact.getComplemento() != null && !contact.getComplemento().trim().isEmpty()) {
            if (address.length() > 0)
                address.append(" - ");
            address.append(contact.getComplemento());
        }

        // Bairro
        if (contact.getBairro() != null && !contact.getBairro().trim().isEmpty()) {
            if (address.length() > 0)
                address.append(" - ");
            address.append(contact.getBairro());
        }

        // CEP
        if (contact.getCep() != null && !contact.getCep().trim().isEmpty()) {
            if (address.length() > 0)
                address.append(" - CEP: ");
            address.append(contact.getCep());
        }

        return address.toString();
    }

    /**
     * Verifica se deve criar agendamento
     */
    private boolean shouldCreateAppointment(CrmWebhookPayload.CrmContactBody contact) {
        // Criar agendamento se houver interesse definido
        return contact.getInteresse() != null && !contact.getInteresse().trim().isEmpty();
    }

    /**
     * Cria agendamento a partir dos dados do CRM
     */
    private void createAppointmentFromCrm(Patient patient, CrmWebhookPayload.CrmContactBody contact) {
        logger.info("Criando agendamento para paciente: {}", patient.getName());

        Appointment appointment = new Appointment();
        appointment.setId(UUID.randomUUID().toString());
        appointment.setPatientId(patient.getId());
        appointment.setPatient(patient.getName());
        appointment.setCpf(patient.getCpf());
        appointment.setPatientEmail(patient.getEmail());

        // Tipo de atendimento (Interesse)
        appointment.setType(contact.getInteresse());
        appointment.setSpecialty(contact.getInteresse());

        // Médico - será definido depois
        appointment.setDoctor("A definir");

        // Data - tentar extrair de customData.start_date, caso contrário usar data
        // futura
        LocalDate appointmentDate = extractAppointmentDate(contact);
        appointment.setDate(appointmentDate);

        // Horário - será definido depois
        appointment.setTime("A definir");

        // Status inicial - aguardando confirmação
        appointment.setStatus("aguardando");

        // Valor
        BigDecimal amount = BigDecimal.ZERO;
        if (contact.getValor() != null) {
            amount = BigDecimal.valueOf(contact.getValor());
        }
        appointment.setAmount(amount);

        // Pagamento
        boolean paid = "Sim".equalsIgnoreCase(contact.getPago());
        appointment.setPaid(paid);

        // Salvar usando AppointmentRepository
        try {
            appointmentRepository.save(appointment);
            logger.info("Agendamento criado: {} para {}", appointment.getId(), appointmentDate);
        } catch (Exception e) {
            logger.error("Erro ao salvar agendamento: {}", e.getMessage());
            throw new RuntimeException("Erro ao criar agendamento: " + e.getMessage());
        }
    }

    /**
     * Extrai data do agendamento de customData ou define data futura
     */
    private LocalDate extractAppointmentDate(CrmWebhookPayload.CrmContactBody contact) {
        try {
            // Tentar extrair de customData.start_date
            if (contact.getCustomData() != null) {
                Object startDate = contact.getCustomData().get("start_date");
                if (startDate != null) {
                    String dateStr = startDate.toString();

                    // Tentar parsear diferentes formatos
                    try {
                        // Formato DD/MM/YYYY
                        return LocalDate.parse(dateStr, BR_DATE_FORMATTER);
                    } catch (DateTimeParseException e1) {
                        try {
                            // Formato ISO (YYYY-MM-DD)
                            return LocalDate.parse(dateStr);
                        } catch (DateTimeParseException e2) {
                            logger.warn("Formato de data não reconhecido: {}", dateStr);
                        }
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("Erro ao extrair data do agendamento: {}", e.getMessage());
        }

        // Data padrão: 7 dias no futuro
        return LocalDate.now().plusDays(7);
    }

    /**
     * Remove formatação do CPF (mantém apenas números)
     */
    private String cleanCpf(String cpf) {
        if (cpf == null)
            return null;
        return cpf.replaceAll("[^0-9]", "");
    }

    /**
     * Mascara CPF para logs (XXX.XXX.XXX-XX)
     */
    private String maskCpf(String cpf) {
        if (cpf == null || cpf.length() != 11)
            return cpf;
        return cpf.substring(0, 3) + "." + cpf.substring(3, 6) + "." + cpf.substring(6, 9) + "-"
                + cpf.substring(9, 11);
    }
}

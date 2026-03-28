package br.lunavita.totemapi.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Component;

import br.lunavita.totemapi.dto.GhlPatientNormalized;
import br.lunavita.totemapi.dto.GhlPatientWebhookDto;

@Component
public class GhlPatientNormalizer {

    private static final DateTimeFormatter OUTPUT_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final List<DateTimeFormatter> INPUT_DATES = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.BASIC_ISO_DATE
    );

    public GhlPatientNormalized normalize(GhlPatientWebhookDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Payload do webhook está vazio");
        }

        GhlPatientNormalized normalized = new GhlPatientNormalized();
        normalized.setGhlContactId(clean(dto.getContactId()));
        normalized.setName(clean(dto.getFullName()));
        normalized.setPhone(cleanDigits(dto.getPhone()));
        normalized.setCpf(cleanDigits(dto.getCpf()));
        normalized.setEmail(cleanEmail(dto.getEmail()));
        normalized.setBirthDate(normalizeDate(dto.getBirthDate()));
        normalized.setNotes(clean(dto.getNotes()));
        normalized.setTenantId(clean(dto.getTenantId()));
        normalized.setEventType(normalizeEventType(dto.getEventType()));
        return normalized;
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String cleanDigits(String value) {
        String cleaned = clean(value);
        if (cleaned == null) {
            return null;
        }
        String digits = cleaned.replaceAll("[^0-9]", "");
        return digits.isEmpty() ? null : digits;
    }

    private String cleanEmail(String value) {
        String cleaned = clean(value);
        if (cleaned == null) {
            return null;
        }
        return cleaned.toLowerCase(Locale.ROOT);
    }

    private String normalizeDate(String value) {
        String cleaned = clean(value);
        if (cleaned == null) {
            return null;
        }

        for (DateTimeFormatter formatter : INPUT_DATES) {
            try {
                LocalDate date = LocalDate.parse(cleaned, formatter);
                return OUTPUT_DATE.format(date);
            } catch (DateTimeParseException ignored) {
            }
        }
        return cleaned; // fallback to original cleaned value
    }

    private String normalizeEventType(String value) {
        String cleaned = clean(value);
        if (cleaned == null) {
            return "unknown";
        }
        return cleaned.toLowerCase(Locale.ROOT);
    }
}

package br.lunavita.totemapi.repository;

import br.lunavita.totemapi.model.DataConsent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface DataConsentRepository extends JpaRepository<DataConsent, Long> {

    List<DataConsent> findByPatientId(String patientId);

    @Query("SELECT dc FROM DataConsent dc WHERE dc.patientId = :patientId " +
            "AND dc.consentType = :consentType " +
            "AND dc.granted = true " +
            "AND (dc.revokedAt IS NULL OR dc.revokedAt > :now) " +
            "AND (dc.expiresAt IS NULL OR dc.expiresAt > :now) " +
            "ORDER BY dc.grantedAt DESC")
    Optional<DataConsent> findActiveConsent(
            @Param("patientId") String patientId,
            @Param("consentType") String consentType,
            @Param("now") LocalDateTime now);

    @Query("SELECT dc FROM DataConsent dc WHERE dc.patientId = :patientId " +
            "AND dc.consentType = :consentType " +
            "ORDER BY dc.grantedAt DESC")
    List<DataConsent> findByPatientIdAndConsentType(
            @Param("patientId") String patientId,
            @Param("consentType") String consentType);
}

package br.lunavita.totemapi.repository;

import br.lunavita.totemapi.model.DataAccessLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface DataAccessLogRepository extends JpaRepository<DataAccessLog, Long> {

    List<DataAccessLog> findByPatientId(String patientId);

    Page<DataAccessLog> findByPatientId(String patientId, Pageable pageable);

    @Query("SELECT dal FROM DataAccessLog dal WHERE dal.patientId = :patientId " +
            "AND dal.accessedAt BETWEEN :startDate AND :endDate " +
            "ORDER BY dal.accessedAt DESC")
    List<DataAccessLog> findByPatientIdAndDateRange(
            @Param("patientId") String patientId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT dal FROM DataAccessLog dal WHERE dal.userEmail = :userEmail " +
            "AND dal.accessedAt BETWEEN :startDate AND :endDate " +
            "ORDER BY dal.accessedAt DESC")
    List<DataAccessLog> findByUserEmailAndDateRange(
            @Param("userEmail") String userEmail,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
}

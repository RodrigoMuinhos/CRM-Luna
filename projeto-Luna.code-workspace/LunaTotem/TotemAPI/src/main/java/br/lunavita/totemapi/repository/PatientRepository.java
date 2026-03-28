package br.lunavita.totemapi.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import br.lunavita.totemapi.model.Patient;

@Repository
public interface PatientRepository extends JpaRepository<Patient, String> {

    // ===== MÉTODOS MULTI-TENANT (SEMPRE FILTRAR POR TENANT_ID) =====

    /**
     * Busca paciente por CPF dentro do tenant
     */
    Optional<Patient> findByTenantIdAndCpf(String tenantId, String cpf);

    /**
     * Busca paciente por ID dentro do tenant
     */
    Optional<Patient> findByTenantIdAndId(String tenantId, String id);

    /**
     * Lista todos os pacientes do tenant
     */
    List<Patient> findAllByTenantId(String tenantId);

    /**
     * Conta pacientes por tenant (útil para seed/test)
     */
    long countByTenantId(String tenantId);

    /**
     * Busca pacientes por nome (case-insensitive) dentro do tenant
     */
    List<Patient> findByTenantIdAndNameContainingIgnoreCase(String tenantId, String namePart);

    /**
     * Busca paciente por identificador do GoHighLevel no tenant
     */
    Optional<Patient> findByTenantIdAndGhlContactId(String tenantId, String ghlContactId);

    /**
     * Busca paciente por identificador do GoHighLevel (sem filtro de tenant)
     */
    Optional<Patient> findByGhlContactId(String ghlContactId);

    // ===== MÉTODOS DEPRECADOS (NÃO USAR - SEM FILTRO DE TENANT) =====

    /**
     * @deprecated Use findByTenantIdAndCpf() para garantir isolamento multi-tenant
     */
    @Deprecated
    Optional<Patient> findByCpf(String cpf);
}

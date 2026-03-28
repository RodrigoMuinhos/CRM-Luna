package br.lunavita.totemapi.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import br.lunavita.totemapi.model.Doctor;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, String> {

    // ===== MÉTODOS MULTI-TENANT (SEMPRE FILTRAR POR TENANT_ID) =====

    /**
     * Busca médico por ID dentro do tenant
     */
    Optional<Doctor> findByTenantIdAndId(String tenantId, String id);

    /**
     * Lista todos os médicos do tenant
     */
    List<Doctor> findAllByTenantId(String tenantId);

    /**
     * Conta médicos por tenant (útil para seed/test)
     */
    long countByTenantId(String tenantId);

    /**
     * Busca médico por nome dentro do tenant
     */
    Optional<Doctor> findByTenantIdAndNameIgnoreCase(String tenantId, String name);

    /**
     * Busca médicos por especialidade dentro do tenant
     */
    List<Doctor> findByTenantIdAndSpecialtyIgnoreCase(String tenantId, String specialty);

    /**
     * Busca médicos por CRM dentro do tenant
     */
    Optional<Doctor> findByTenantIdAndCrm(String tenantId, String crm);

    // ===== MÉTODOS DEPRECADOS (NÃO USAR - SEM FILTRO DE TENANT) =====

    /**
     * @deprecated Use findByTenantIdAndNameIgnoreCase() para garantir isolamento
     *             multi-tenant
     */
    @Deprecated
    Optional<Doctor> findFirstByNameIgnoreCase(String name);
}

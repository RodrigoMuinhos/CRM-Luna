package com.luna.core.tenant.repository;

import com.luna.core.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, String> {
    Optional<Tenant> findByCnpj(String cnpj);

    Optional<Tenant> findByOwnerEmail(String ownerEmail);

    boolean existsByCnpj(String cnpj);
}

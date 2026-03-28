package com.luna.core.license.repository;

import com.luna.core.license.entity.License;
import com.luna.core.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LicenseRepository extends JpaRepository<License, String> {
    Optional<License> findByProductKey(String productKey);

    List<License> findByTenant(Tenant tenant);

    List<License> findByTenant_Id(String tenantId);

    Optional<License> findFirstByTenantOrderByValidUntilDesc(Tenant tenant);

    boolean existsByProductKey(String productKey);
}

package com.luna.core.license.repository;

import com.luna.core.license.entity.License;
import com.luna.core.license.entity.LicenseModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LicenseModuleRepository extends JpaRepository<LicenseModule, String> {
    List<LicenseModule> findByLicense(License license);

    List<LicenseModule> findByLicenseAndEnabledTrue(License license);
}

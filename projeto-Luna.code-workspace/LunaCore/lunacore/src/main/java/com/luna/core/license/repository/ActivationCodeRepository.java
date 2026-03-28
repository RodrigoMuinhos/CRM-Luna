package com.luna.core.license.repository;

import com.luna.core.license.entity.ActivationCode;
import com.luna.core.license.entity.License;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ActivationCodeRepository extends JpaRepository<ActivationCode, String> {
    Optional<ActivationCode> findByLicenseAndCodeAndUsedAtIsNull(License license, String code);

    Optional<ActivationCode> findByCode(String code);
}

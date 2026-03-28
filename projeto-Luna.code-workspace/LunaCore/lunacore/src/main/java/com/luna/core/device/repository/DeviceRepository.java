package com.luna.core.device.repository;

import com.luna.core.common.enums.DeviceStatus;
import com.luna.core.device.entity.Device;
import com.luna.core.license.entity.License;
import com.luna.core.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, String> {
    long countByLicenseAndStatus(License license, DeviceStatus status);

    List<Device> findByTenant(Tenant tenant);

    Optional<Device> findByDeviceId(String deviceId);

    Optional<Device> findByLicenseAndDeviceId(License license, String deviceId);

    boolean existsByDeviceId(String deviceId);
}

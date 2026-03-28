package com.luna.core.license.service;

import com.luna.core.common.enums.DeviceStatus;
import com.luna.core.common.enums.LicenseStatus;
import com.luna.core.common.enums.UserRole;
import com.luna.core.device.entity.Device;
import com.luna.core.device.repository.DeviceRepository;
import com.luna.core.license.dto.ActivateLicenseRequest;
import com.luna.core.license.dto.ActivationResponse;
import com.luna.core.license.dto.LicenseStatusResponse;
import com.luna.core.license.entity.ActivationCode;
import com.luna.core.license.entity.License;
import com.luna.core.license.repository.ActivationCodeRepository;
import com.luna.core.license.repository.LicenseModuleRepository;
import com.luna.core.license.repository.LicenseRepository;
import com.luna.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LicenseService {

    private final LicenseRepository licenseRepository;
    private final ActivationCodeRepository activationCodeRepository;
    private final DeviceRepository deviceRepository;
    private final LicenseModuleRepository licenseModuleRepository;
    private final UserRepository userRepository;

    // ------------- /license/status -------------
    @Transactional(readOnly = true)
    public LicenseStatusResponse getStatus(String productKey, String deviceId) {
        License license = licenseRepository.findByProductKey(productKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Licença não encontrada"));

        // regra simples de validade
        if (license.getStatus() == LicenseStatus.EXPIRED ||
            (license.getValidUntil() != null && license.getValidUntil().isBefore(Instant.now()))) {
            return new LicenseStatusResponse(LicenseStatus.EXPIRED, false, null, List.of());
        }

        if (license.getStatus() == LicenseStatus.BLOCKED) {
            return new LicenseStatusResponse(LicenseStatus.BLOCKED, false, null, List.of());
        }

        boolean hasDevice = deviceRepository
                .findByLicenseAndDeviceId(license, deviceId)
                .isPresent();

        boolean activated = hasDevice && license.getStatus() == LicenseStatus.ACTIVE;

        List<String> modules = licenseModuleRepository
                .findByLicenseAndEnabledTrue(license)
                .stream()
                .map(lm -> lm.getModuleCode().name())
                .toList();

        String tenantId = license.getTenant() != null ? license.getTenant().getId() : null;

        return new LicenseStatusResponse(
                license.getStatus(),
                activated,
                tenantId,
                modules
        );
    }

    // ------------- /license/activate -------------
    @Transactional
    public ActivationResponse activate(ActivateLicenseRequest request) {
        License license = licenseRepository.findByProductKey(request.productKey())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Licença não encontrada"));

        // status tem que permitir ativação
        if (license.getStatus() == LicenseStatus.BLOCKED || license.getStatus() == LicenseStatus.EXPIRED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Licença não permite ativação");
        }

        // verifica activation code
        ActivationCode code = activationCodeRepository
                .findByLicenseAndCodeAndUsedAtIsNull(license, request.activationCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Código de ativação inválido"));

        if (code.getExpiresAt() != null && code.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Código de ativação expirado");
        }

        // checa limite de devices
        long devicesAtivos = deviceRepository.countByLicenseAndStatus(license, DeviceStatus.ACTIVE);
        if (license.getMaxDevices() != null && devicesAtivos >= license.getMaxDevices()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limite de dispositivos atingido");
        }

        // registra / atualiza device
        Device device = deviceRepository.findByLicenseAndDeviceId(license, request.deviceId())
                .orElse(Device.builder()
                        .license(license)
                        .tenant(license.getTenant())
                        .deviceId(request.deviceId())
                        .firstSeenAt(Instant.now())
                        .status(DeviceStatus.ACTIVE)
                        .build()
                );

        device.setName(request.deviceName());
        device.setLastSeenAt(Instant.now());
        deviceRepository.save(device);

        // marca código como usado
        code.setUsedAt(Instant.now());
        activationCodeRepository.save(code);

        // se estava pendente, ativa
        if (license.getStatus() == LicenseStatus.PENDING_ACTIVATION) {
            license.setStatus(LicenseStatus.ACTIVE);
            licenseRepository.save(license);
        }

        // verificar se já existe admin para esse tenant
        boolean hasAdmin = userRepository.existsByTenantAndRole(license.getTenant(), UserRole.OWNER);

        List<String> modules = licenseModuleRepository
                .findByLicenseAndEnabledTrue(license)
                .stream()
                .map(lm -> lm.getModuleCode().name())
                .toList();

        return new ActivationResponse(
                license.getTenant().getId(),
                license.getId(),
                !hasAdmin,  // se não tem admin, front deve pedir first-admin
                modules
        );
    }
}

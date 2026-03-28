package com.luna.core.debug;

import com.luna.core.tenant.repository.TenantRepository;
import com.luna.core.user.repository.UserRepository;
import com.luna.core.license.repository.LicenseRepository;
import com.luna.core.tenant.entity.Tenant;
import com.luna.core.user.entity.User;
import com.luna.core.license.entity.License;
import com.luna.core.common.enums.TenantStatus;
import com.luna.core.common.enums.UserRole;
import com.luna.core.common.enums.UserStatus;
import com.luna.core.common.enums.LicenseStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/debug")
@RequiredArgsConstructor
public class DebugController {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final LicenseRepository licenseRepository;

    private final PasswordEncoder passwordEncoder;
    private final com.luna.core.license.repository.LicenseModuleRepository licenseModuleRepository;
    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        Map<String, Object> status = new HashMap<>();
        
        long tenantCount = tenantRepository.count();
        long userCount = userRepository.count();
        long licenseCount = licenseRepository.count();
        
        status.put("tenants", tenantCount);
        status.put("users", userCount);
        status.put("licenses", licenseCount);
        status.put("database", "connected");
        
        if (tenantCount == 0) {
            status.put("message", "Banco vazio - use POST /debug/seed para criar dados iniciais");
        } else if (userCount == 0) {
            status.put("message", "Tenant existe mas sem usuários");
        } else if (licenseCount == 0) {
            status.put("message", "Dados existem mas sem licença ativa");
        } else {
            status.put("message", "Sistema pronto");
        }
        
        return status;
    }
    
    @PostMapping("/seed")
    @Transactional
    public Map<String, Object> seedDatabase() {
        Map<String, Object> result = new HashMap<>();
        
        // Criar Tenant
        Tenant tenant = Tenant.builder()
                .name("LunaVita Clínica")
                .cnpj("12345678000190")
                .ownerEmail("adm@lunavita.com")
                .phone("85988175221")
                .status(TenantStatus.ACTIVE)
                .build();
        tenant = tenantRepository.save(tenant);
        
        // Criar Usuário Admin
        User user = User.builder()
                .tenant(tenant)
                .name("Administrador")
                .email("adm@lunavita.com")
                .passwordHash(passwordEncoder.encode("123456"))
                .role(UserRole.OWNER)
                .status(UserStatus.ACTIVE)
                .build();
        user = userRepository.save(user);
        
        // Criar Licença
        License license = License.builder()
                .tenant(tenant)
                .productKey("LUNA-TRIAL-2024")
                .plan(com.luna.core.common.enums.LicensePlan.ENTERPRISE)
                .status(LicenseStatus.ACTIVE)
                .validFrom(java.time.Instant.now())
                .validUntil(java.time.Instant.now().plus(365, java.time.temporal.ChronoUnit.DAYS))
                .maxDevices(10)
                .build();
        license = licenseRepository.save(license);
        
        
        // Criar License Modules
        com.luna.core.license.entity.LicenseModule totemModule = com.luna.core.license.entity.LicenseModule.builder()
            .license(license)
            .moduleCode(com.luna.core.common.enums.ModuleCode.TOTEM)
            .enabled(true)
            .build();
        licenseModuleRepository.save(totemModule);
        
        com.luna.core.license.entity.LicenseModule lunaPayModule = com.luna.core.license.entity.LicenseModule.builder()
            .license(license)
            .moduleCode(com.luna.core.common.enums.ModuleCode.LUNAPAY)
            .enabled(true)
            .build();
        licenseModuleRepository.save(lunaPayModule);
        
        result.put("success", true);
        result.put("tenant_id", tenant.getId());
        result.put("user_id", user.getId());
        result.put("user_email", user.getEmail());
        result.put("license_id", license.getId());
        result.put("modules", new String[]{"TOTEM", "LUNAPAY"});
        result.put("message", "Dados criados! Use email: adm@lunavita.com, senha: 123456");
        return result;
    }
}

package com.luna.core.config;

import com.luna.core.common.enums.LicensePlan;
import com.luna.core.common.enums.LicenseStatus;
import com.luna.core.common.enums.ModuleCode;
import com.luna.core.common.enums.TenantStatus;
import com.luna.core.common.enums.UserRole;
import com.luna.core.common.enums.UserStatus;
import com.luna.core.license.entity.License;
import com.luna.core.license.entity.LicenseModule;
import com.luna.core.license.repository.LicenseModuleRepository;
import com.luna.core.license.repository.LicenseRepository;
import com.luna.core.tenant.entity.Tenant;
import com.luna.core.tenant.repository.TenantRepository;
import com.luna.core.user.entity.User;
import com.luna.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Seeder simples para ambiente local/dev (H2). Cria tenant, licença e usuário admin.
 * PERMANENTLY DISABLED: Using real Neon database with existing data
 */
// @Component
@RequiredArgsConstructor
public class DevDataSeeder implements CommandLineRunner {

    private final TenantRepository tenantRepository;
    private final LicenseRepository licenseRepository;
    private final LicenseModuleRepository licenseModuleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        System.out.println("🔄 DevDataSeeder: Iniciando verificação...");
        
        // Verifica se já foi criado (usa admin como referência)
        if (userRepository.findByEmail("adm@lunavita.com").isPresent()) {
            System.out.println("✅ DevDataSeeder: Usuário admin já existe, pulando seed.");
            return; // já existe, não recria
        }

        System.out.println("🌱 DevDataSeeder: Criando dados iniciais no Neon...");

        // Cria tenant único
        Tenant tenant = tenantRepository.save(Tenant.builder()
                .name("Luna Vita Clinic")
                .cnpj("00000000000000")
                .ownerEmail("adm@lunavita.com")
                .status(TenantStatus.ACTIVE)
                .build());
        
        System.out.println("✅ DevDataSeeder: Tenant criado com ID: " + tenant.getId());

        // Cria licença com todos os módulos
        License license = licenseRepository.save(License.builder()
                .tenant(tenant)
                .productKey("DEV-KEY-001")
                .plan(LicensePlan.TOTEM_PAY)
                .status(LicenseStatus.ACTIVE)
                .validFrom(Instant.now().minus(1, ChronoUnit.DAYS))
                .validUntil(Instant.now().plus(365, ChronoUnit.DAYS))
                .maxDevices(10)
                .build());

        licenseModuleRepository.save(LicenseModule.builder()
                .license(license)
                .moduleCode(ModuleCode.TOTEM)
                .enabled(true)
                .build());

        licenseModuleRepository.save(LicenseModule.builder()
                .license(license)
                .moduleCode(ModuleCode.LUNAPAY)
                .enabled(true)
                .build());

        // Cria 3 usuários com roles diferentes
        String passwordHash = passwordEncoder.encode("123456");

        // 1. ADMINISTRACAO (ADMIN role)
        userRepository.save(User.builder()
                .tenant(tenant)
                .email("adm@lunavita.com")
                .name("Admin Luna")
                .passwordHash(passwordHash)
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .build());

        // 2. RECEPCAO (RECEPTION role)
        userRepository.save(User.builder()
                .tenant(tenant)
                .email("recepcao@lunavita.com")
                .name("Recepção Luna")
                .passwordHash(passwordHash)
                .role(UserRole.RECEPTION)
                .status(UserStatus.ACTIVE)
                .build());

        // 3. MEDICO (DOCTOR role)
        userRepository.save(User.builder()
                .tenant(tenant)
                .email("medico@lunavita.com")
                .name("Médico Luna")
                .passwordHash(passwordHash)
                .role(UserRole.DOCTOR)
                .status(UserStatus.ACTIVE)
                .build());
        
        System.out.println("✅ DevDataSeeder: 3 usuários criados com sucesso no Neon!");
        System.out.println("   - adm@lunavita.com (ADMIN)");
        System.out.println("   - recepcao@lunavita.com (RECEPTION)");
        System.out.println("   - medico@lunavita.com (DOCTOR)");
        System.out.println("   - Senha para todos: 123456");
    }
}

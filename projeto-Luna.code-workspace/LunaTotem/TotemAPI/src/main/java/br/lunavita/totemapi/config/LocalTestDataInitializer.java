package br.lunavita.totemapi.config;

import br.lunavita.totemapi.model.User;
import br.lunavita.totemapi.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Seeds a single admin user for quick local validation runs. The component is only active when
 * {@code totem.local-test.enabled} is true, so it can be enabled via an untracked properties file or env var.
 */
@Component
@ConditionalOnProperty(name = "totem.local-test.enabled", havingValue = "true")
public class LocalTestDataInitializer {

    private static final Logger LOGGER = LoggerFactory.getLogger(LocalTestDataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private final String adminEmail;
    private final String adminPassword;

    public LocalTestDataInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${totem.local-test.admin-email:adm@lunavita.com}") String adminEmail,
            @Value("${totem.local-test.admin-password:adm123}") String adminPassword
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @PostConstruct
    public void seedAdminUser() {
        if (userRepository.existsByEmail(adminEmail)) {
            LOGGER.info("Local test admin already exists, skipping seed.");
            return;
        }

        User admin = new User();
        admin.setEmail(adminEmail);
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setRole(User.UserRole.ADMINISTRACAO);
        admin.setCpf("00000000000");
        admin.setRefreshToken(UUID.randomUUID().toString());
        admin.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));

        userRepository.save(admin);
        LOGGER.info("Local test admin '{}' created (password kept out of repo).", adminEmail);
    }
}

package com.luna.core.user.service;

import com.luna.core.common.enums.TenantStatus;
import com.luna.core.common.enums.UserRole;
import com.luna.core.common.enums.UserStatus;
import com.luna.core.common.exception.BusinessException;
import com.luna.core.tenant.entity.Tenant;
import com.luna.core.tenant.repository.TenantRepository;
import com.luna.core.user.entity.User;
import com.luna.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public User createFirstAdmin(String tenantName, String cnpj, String email,
            String name, String password, String phone) {
        log.info("Creating first admin user for email: {}", email);

        // Verificar se já existe um usuário com esse e-mail
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException("User with this email already exists");
        }

        // Criar ou buscar tenant
        Tenant tenant = tenantRepository.findByOwnerEmail(email)
                .orElseGet(() -> {
                    Tenant newTenant = Tenant.builder()
                            .name(tenantName)
                            .cnpj(cnpj)
                            .ownerEmail(email)
                            .phone(phone)
                            .status(TenantStatus.TRIAL)
                            .build();
                    return tenantRepository.save(newTenant);
                });

        // Verificar se já existe um admin para este tenant
        if (userRepository.existsByTenantAndRole(tenant, UserRole.OWNER)) {
            throw new BusinessException("This tenant already has an owner/admin");
        }

        // Criar usuário admin
        User admin = User.builder()
                .tenant(tenant)
                .email(email)
                .name(name)
                .passwordHash(passwordEncoder.encode(password))
                .role(UserRole.OWNER)
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(admin);
        log.info("First admin created successfully with id: {}", savedUser.getId());

        return savedUser;
    }

    @Transactional(readOnly = true)
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElse(null);
    }
}

package com.luna.core.user.repository;

import com.luna.core.common.enums.UserRole;
import com.luna.core.tenant.entity.Tenant;
import com.luna.core.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);

    List<User> findByTenant(Tenant tenant);

    boolean existsByTenantAndRole(Tenant tenant, UserRole role);

    boolean existsByEmail(String email);

    boolean existsByTenantAndCpf(Tenant tenant, String cpf);
}

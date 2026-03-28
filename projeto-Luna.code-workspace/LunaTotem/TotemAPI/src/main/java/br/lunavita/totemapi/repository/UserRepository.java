package br.lunavita.totemapi.repository;

import br.lunavita.totemapi.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByResetToken(String resetToken);

    boolean existsByEmail(String email);

    long countByRole(User.UserRole role);

    Optional<User> findByCpf(String cpf);

    boolean existsByCpf(String cpf);
}

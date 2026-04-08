package br.lunavita.totemapi.service;

import br.lunavita.totemapi.model.User;
import br.lunavita.totemapi.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public User register(String email, String cpf, String password, User.UserRole role) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email já cadastrado");
        }
        if (cpf != null && !cpf.isBlank() && userRepository.existsByCpf(cpf)) {
            throw new RuntimeException("CPF já cadastrado");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);
        if (cpf != null && !cpf.isBlank()) {
            user.setCpf(cpf);
        }

        // Generate initial refresh token
        user.setRefreshToken(generateRefreshToken());
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));

        User savedUser = userRepository.save(user);

        // Enviar email de boas-vindas
        emailService.sendWelcomeEmail(email, role.toString());

        return savedUser;
    }

    public User login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email ou senha inválidos"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            logger.debug("Login failed for {}", email);
            throw new RuntimeException("Email ou senha inválidos");
        }

        // Rotate refresh token on login
        user.setRefreshToken(generateRefreshToken());
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        return userRepository.save(user);
    }

    public void requestPasswordReset(String email, String frontendUrl) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email não encontrado"));

        String resetToken = UUID.randomUUID().toString();
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));

        userRepository.save(user);

        // Enviar email com link de recuperação
        emailService.sendPasswordResetEmail(email, resetToken, frontendUrl);
    }

    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new RuntimeException("Token inválido ou expirado"));

        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Token expirado");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);

        // Rotate refresh token after password reset
        user.setRefreshToken(generateRefreshToken());
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        userRepository.save(user);
    }

    public User validateAndRefresh(String refreshToken) {
        User user = userRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new RuntimeException("Refresh token inválido"));
        if (user.getRefreshTokenExpiry() == null || user.getRefreshTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Refresh token expirado");
        }
        user.setRefreshToken(generateRefreshToken());
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        return userRepository.save(user);
    }

    public List<User> listUsers() {
        return userRepository.findAll();
    }

    public User updateUser(Long id, String email, String cpf, User.UserRole role, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usu?rio n?o encontrado"));

        userRepository.findByEmail(email)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new RuntimeException("Email j? cadastrado");
                });

        userRepository.findByCpf(cpf)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new RuntimeException("CPF j? cadastrado");
                });

        if (user.getRole() == User.UserRole.ADMINISTRACAO && role == User.UserRole.RECEPCAO) {
            long adminCount = userRepository.countByRole(User.UserRole.ADMINISTRACAO);
            if (adminCount <= 1) {
                throw new RuntimeException("Mantenha ao menos um administrador ativo.");
            }
        }

        user.setEmail(email);
        user.setRole(role);
        user.setCpf(cpf);

        if (newPassword != null && !newPassword.isBlank()) {
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setRefreshToken(generateRefreshToken());
            user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        }

        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (user.getRole() == User.UserRole.ADMINISTRACAO) {
            long adminCount = userRepository.countByRole(User.UserRole.ADMINISTRACAO);
            if (adminCount <= 1) {
                throw new RuntimeException("Não é possível remover o único administrador.");
            }
        }

        userRepository.delete(user);
    }

    private String generateRefreshToken() {
        return UUID.randomUUID().toString();
    }
}

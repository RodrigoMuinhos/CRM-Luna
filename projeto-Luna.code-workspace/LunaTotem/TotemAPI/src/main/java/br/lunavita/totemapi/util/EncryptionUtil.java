package br.lunavita.totemapi.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Utilitário para criptografia de dados sensíveis
 * Usa AES-256-GCM para criptografia de ponta a ponta
 */
@Component
public class EncryptionUtil {

    private static final Logger logger = LoggerFactory.getLogger(EncryptionUtil.class);

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 16;

    @Value("${totem.encryption.key:}")
    private String encryptionKeyBase64;

    private SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Inicializa a chave de criptografia
     */
    private SecretKey getSecretKey() {
        if (secretKey == null) {
            if (encryptionKeyBase64 == null || encryptionKeyBase64.isBlank()) {
                logger.warn("[ENCRYPTION] No encryption key configured. Data will be stored in plain text.");
                return null;
            }
            try {
                byte[] decodedKey = Base64.getDecoder().decode(encryptionKeyBase64);
                secretKey = new SecretKeySpec(decodedKey, "AES");
            } catch (Exception e) {
                logger.error("[ENCRYPTION] Failed to load encryption key: {}", e.getMessage());
                return null;
            }
        }
        return secretKey;
    }

    /**
     * Criptografa texto usando AES-256-GCM
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) {
            return plainText;
        }

        SecretKey key = getSecretKey();
        if (key == null) {
            return plainText; // Fallback para texto plano se não houver chave configurada
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, parameterSpec);

            byte[] encryptedData = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // Combina IV + dados criptografados
            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + encryptedData.length);
            byteBuffer.put(iv);
            byteBuffer.put(encryptedData);

            return Base64.getEncoder().encodeToString(byteBuffer.array());
        } catch (Exception e) {
            logger.error("[ENCRYPTION] Failed to encrypt data: {}", e.getMessage(), e);
            return plainText; // Fallback em caso de erro
        }
    }

    /**
     * Descriptografa texto usando AES-256-GCM
     */
    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) {
            return encryptedText;
        }

        SecretKey key = getSecretKey();
        if (key == null) {
            return encryptedText; // Fallback para retornar o texto como está
        }

        try {
            byte[] decodedData = Base64.getDecoder().decode(encryptedText);

            ByteBuffer byteBuffer = ByteBuffer.wrap(decodedData);

            byte[] iv = new byte[GCM_IV_LENGTH];
            byteBuffer.get(iv);

            byte[] encryptedBytes = new byte[byteBuffer.remaining()];
            byteBuffer.get(encryptedBytes);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, parameterSpec);

            byte[] decryptedData = cipher.doFinal(encryptedBytes);

            return new String(decryptedData, StandardCharsets.UTF_8);
        } catch (Exception e) {
            logger.error("[ENCRYPTION] Failed to decrypt data: {}", e.getMessage());
            return encryptedText; // Fallback em caso de erro
        }
    }

    /**
     * Mascara CPF para exibição (mantém apenas primeiros e últimos dígitos)
     */
    public static String maskCpf(String cpf) {
        if (cpf == null || cpf.length() < 11) {
            return cpf;
        }
        String cleanCpf = cpf.replaceAll("[^0-9]", "");
        if (cleanCpf.length() != 11) {
            return cpf;
        }
        return cleanCpf.substring(0, 3) + ".***.***-" + cleanCpf.substring(9);
    }

    /**
     * Mascara email para exibição
     */
    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        String[] parts = email.split("@");
        String localPart = parts[0];
        String domain = parts[1];

        if (localPart.length() <= 2) {
            return localPart.charAt(0) + "***@" + domain;
        }
        return localPart.substring(0, 2) + "***@" + domain;
    }

    /**
     * Mascara telefone para exibição
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 8) {
            return phone;
        }
        String cleanPhone = phone.replaceAll("[^0-9]", "");
        if (cleanPhone.length() < 8) {
            return phone;
        }
        int visibleDigits = 4;
        int hiddenLength = cleanPhone.length() - visibleDigits;
        return "*".repeat(hiddenLength) + cleanPhone.substring(hiddenLength);
    }
}

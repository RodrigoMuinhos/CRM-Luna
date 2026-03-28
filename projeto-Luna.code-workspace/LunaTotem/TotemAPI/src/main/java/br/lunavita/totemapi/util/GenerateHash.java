package br.lunavita.totemapi.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenerateHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "leomarques";
        String hash = encoder.encode(password);
        System.out.println("=".repeat(60));
        System.out.println("BCrypt hash for password: " + password);
        System.out.println("=".repeat(60));
        System.out.println(hash);
        System.out.println("=".repeat(60));
        System.out.println("\nSQL to update database:");
        System.out.println("UPDATE users SET password = '" + hash + "' WHERE email = 'adm@lunavita.com';");
    }
}

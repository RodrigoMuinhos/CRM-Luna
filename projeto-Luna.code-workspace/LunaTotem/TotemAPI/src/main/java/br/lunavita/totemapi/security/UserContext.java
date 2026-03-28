package br.lunavita.totemapi.security;

import java.util.List;

/**
 * Context object to hold authenticated user information extracted from JWT
 * token.
 * This is placed in Spring SecurityContext after successful token validation.
 */
public class UserContext {

    private final String userId;
    private final String tenantId;
    private final String role;
    private final List<String> modules;

    public UserContext(String userId, String tenantId, String role, List<String> modules) {
        this.userId = userId;
        this.tenantId = tenantId;
        this.role = role;
        this.modules = modules != null ? modules : List.of();
    }

    public String getUserId() {
        return userId;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getRole() {
        return role;
    }

    public List<String> getModules() {
        return modules;
    }

    public boolean hasModule(String module) {
        return modules.contains(module);
    }

    @Override
    public String toString() {
        return "UserContext{" +
                "userId='" + userId + '\'' +
                ", tenantId='" + tenantId + '\'' +
                ", role='" + role + '\'' +
                ", modules=" + modules +
                '}';
    }
}

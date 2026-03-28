package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.security.UserContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Example controller demonstrating how to use UserContext from JWT tokens.
 * All endpoints in LunaTotem API can now access tenant and user information.
 */
@RestController
@RequestMapping("/api/totem")
public class TotemContextController {

    /**
     * Example endpoint showing how to access UserContext
     * via @AuthenticationPrincipal.
     * This is the recommended approach.
     * 
     * @param userContext automatically injected from SecurityContext
     * @return user and tenant information
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(
            @AuthenticationPrincipal UserContext userContext) {

        Map<String, Object> response = new HashMap<>();
        response.put("userId", userContext.getUserId());
        response.put("tenantId", userContext.getTenantId());
        response.put("role", userContext.getRole());
        response.put("modules", userContext.getModules());
        response.put("hasTotemModule", userContext.hasModule("TOTEM"));

        return ResponseEntity.ok(response);
    }

    /**
     * Example endpoint showing tenant-scoped data access.
     * In real controllers, you would pass tenantId to your service layer.
     * 
     * @param userContext automatically injected from SecurityContext
     * @return example tenant-scoped response
     */
    @GetMapping("/tenant-info")
    public ResponseEntity<Map<String, Object>> getTenantInfo(
            @AuthenticationPrincipal UserContext userContext) {

        String tenantId = userContext.getTenantId();

        // In real code, you would do something like:
        // List<Appointment> appointments = appointmentService.findByTenantId(tenantId);
        // return ResponseEntity.ok(appointments);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "This endpoint has access to tenantId: " + tenantId);
        response.put("tenantId", tenantId);
        response.put("note", "All data queries should be filtered by this tenantId");

        return ResponseEntity.ok(response);
    }
}

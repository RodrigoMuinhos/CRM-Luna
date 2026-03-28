package br.lunavita.totemapi.controller;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.lunavita.totemapi.dto.VideoPlaylistConfigDto;
import br.lunavita.totemapi.dto.VideoPlaylistItemDto;
import br.lunavita.totemapi.security.UserContext;
import br.lunavita.totemapi.service.VideoPlaylistConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/video-playlist")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class VideoPlaylistConfigController {

    private final VideoPlaylistConfigService videoPlaylistConfigService;

    @GetMapping("/public")
    public ResponseEntity<?> getPublicPlaylist(@RequestParam(defaultValue = "default") String tenantId) {
        VideoPlaylistConfigDto config = videoPlaylistConfigService.getPlaylist(tenantId);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("tenantId", config.getTenantId());
        response.put("videos", config.getVideos());
        response.put("count", config.getVideos().size());
        response.put("updatedAt", config.getUpdatedAt());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> getAdminPlaylist(@AuthenticationPrincipal UserContext userContext) {
        String tenantId = requireTenant(userContext);
        VideoPlaylistConfigDto config = videoPlaylistConfigService.getPlaylist(tenantId);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("tenantId", config.getTenantId());
        response.put("videos", config.getVideos());
        response.put("count", config.getVideos().size());
        response.put("updatedAt", config.getUpdatedAt());
        response.put("updatedBy", config.getUpdatedBy());
        return ResponseEntity.ok(response);
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> savePlaylist(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserContext userContext,
            @RequestHeader(value = "X-User-Email", required = false, defaultValue = "system") String userEmail) {
        try {
            String tenantId = requireTenant(userContext);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rawVideos = (List<Map<String, Object>>) payload.get("videos");

            List<VideoPlaylistItemDto> videos = rawVideos == null
                    ? List.of()
                    : rawVideos.stream()
                            .map(item -> new VideoPlaylistItemDto(
                                    item.get("id") != null ? String.valueOf(item.get("id")) : null,
                                    item.get("title") != null ? String.valueOf(item.get("title")) : null,
                                    item.get("url") != null ? String.valueOf(item.get("url")) : null,
                                    item.get("sizeBytes") instanceof Number ? ((Number) item.get("sizeBytes")).longValue() : null,
                                    item.get("displayOrder") instanceof Number ? ((Number) item.get("displayOrder")).intValue() : null))
                            .toList();

            VideoPlaylistConfigDto saved = videoPlaylistConfigService.savePlaylist(tenantId, videos, userEmail);
            log.info("Video playlist updated for tenant {}", tenantId);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("message", "Playlist salva com sucesso");
            response.put("tenantId", saved.getTenantId());
            response.put("videos", saved.getVideos());
            response.put("count", saved.getVideos().size());
            response.put("updatedAt", saved.getUpdatedAt());
            response.put("updatedBy", saved.getUpdatedBy());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", error.getMessage()));
        } catch (Exception error) {
            log.error("Erro ao salvar playlist de videos", error);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erro ao salvar playlist de videos"));
        }
    }

    private String requireTenant(UserContext userContext) {
        if (userContext == null || userContext.getTenantId() == null || userContext.getTenantId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Tenant information missing: authenticate or include tenantId in request");
        }
        return userContext.getTenantId();
    }
}

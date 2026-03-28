package br.lunavita.totemapi.controller;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import br.lunavita.totemapi.model.Video;
import br.lunavita.totemapi.security.UserContext;
import br.lunavita.totemapi.service.VideoService;

/**
 * Video management controller for admin operations
 */
@RestController
@RequestMapping("/api/videos")
@CrossOrigin(origins = "*")
public class VideoController {

    private static final Logger logger = LoggerFactory.getLogger(VideoController.class);
    private final VideoService videoService;

    public VideoController(VideoService videoService) {
        this.videoService = videoService;
    }

    /**
     * Upload a new video (admin only)
     */
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> uploadVideo(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @AuthenticationPrincipal UserContext userContext) {

        try {
            logger.info("[VIDEO-CTRL] POST /upload - Recebendo vídeo: {}", file.getOriginalFilename());

            String tenantId = requireTenant(userContext);
            Video video = videoService.uploadVideo(file, title, description, tenantId);

            logger.info("[VIDEO-CTRL] ✅ Vídeo enviado com sucesso: {}", video.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Vídeo enviado com sucesso",
                    "video", video));
        } catch (IllegalArgumentException e) {
            logger.warn("[VIDEO-CTRL] ❌ Validação falhou: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        } catch (IllegalStateException e) {
            logger.warn("[VIDEO-CTRL] ❌ Limite atingido: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        } catch (IOException e) {
            logger.error("[VIDEO-CTRL] ❌ Erro ao salvar arquivo", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erro ao salvar arquivo"));
        }
    }

    /**
     * Get all videos (admin)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> getAllVideos(@AuthenticationPrincipal UserContext userContext) {
        logger.info("[VIDEO-CTRL] GET / - Listando todos os vídeos");
        String tenantId = requireTenant(userContext);
        List<Video> videos = videoService.getAllVideos(tenantId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "count", videos.size(),
                "videos", videos));
    }

    /**
     * Get active videos for carousel (public)
     */
    @GetMapping("/active")
    public ResponseEntity<?> getActiveVideos(@AuthenticationPrincipal UserContext userContext) {
        logger.info("[VIDEO-CTRL] GET /active - Listando vídeos ativos");
        String tenantId = userContext != null ? userContext.getTenantId() : null;
        List<Video> videos = videoService.getActiveVideos(tenantId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "count", videos.size(),
                "videos", videos));
    }

    /**
     * Get video by ID (admin)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> getVideoById(@PathVariable UUID id,
            @AuthenticationPrincipal UserContext userContext) {
        logger.info("[VIDEO-CTRL] GET /{} - Obtendo vídeo", id);

        String tenantId = requireTenant(userContext);
        Optional<Video> video = videoService.getVideoById(tenantId, id);
        if (video.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "video", video.get()));
    }

    /**
     * Update video metadata (admin)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> updateVideo(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserContext userContext) {

        try {
            logger.info("[VIDEO-CTRL] PUT /{} - Atualizando vídeo", id);

            String title = (String) payload.get("title");
            String description = (String) payload.get("description");
            Integer displayOrder = payload.get("displayOrder") != null
                    ? ((Number) payload.get("displayOrder")).intValue()
                    : null;
            Boolean isActive = (Boolean) payload.get("isActive");

            String tenantId = requireTenant(userContext);
            Video updated = videoService.updateVideo(tenantId, id, title, description, displayOrder, isActive);

            logger.info("[VIDEO-CTRL] ✅ Vídeo atualizado: {}", id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Vídeo atualizado com sucesso",
                    "video", updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        } catch (IOException e) {
            logger.error("[VIDEO-CTRL] ❌ Erro ao atualizar vídeo", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erro ao atualizar vídeo"));
        }
    }

    /**
     * Delete video (admin)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> deleteVideo(@PathVariable UUID id,
            @AuthenticationPrincipal UserContext userContext) {
        try {
            logger.info("[VIDEO-CTRL] DELETE /{} - Deletando vídeo", id);

            String tenantId = requireTenant(userContext);
            videoService.deleteVideo(tenantId, id);

            logger.info("[VIDEO-CTRL] ✅ Vídeo deletado: {}", id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Vídeo deletado com sucesso"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        } catch (IOException e) {
            logger.error("[VIDEO-CTRL] ❌ Erro ao deletar vídeo", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erro ao deletar arquivo"));
        }
    }

    /**
     * Reorder videos (admin)
     */
    @PostMapping("/reorder")
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> reorderVideos(@RequestBody List<UUID> videoIds,
            @AuthenticationPrincipal UserContext userContext) {
        try {
            logger.info("[VIDEO-CTRL] POST /reorder - Reordenando {} vídeos", videoIds.size());

            String tenantId = requireTenant(userContext);
            videoService.reorderVideos(tenantId, videoIds);

            logger.info("[VIDEO-CTRL] ✅ Vídeos reordenados");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Vídeos reordenados com sucesso"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
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

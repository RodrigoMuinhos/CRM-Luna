package br.lunavita.totemapi.service;

import br.lunavita.totemapi.model.Video;
import br.lunavita.totemapi.repository.VideoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class VideoService {

    private static final Logger logger = LoggerFactory.getLogger(VideoService.class);
    private static final long MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB
    private static final int MAX_VIDEOS = 7;
    private static final String[] ALLOWED_MIME_TYPES = {
            "video/mp4", "video/quicktime", "video/x-msvideo",
            "video/x-matroska", "video/webm", "video/mpeg"
    };

    @Value("${file.upload.dir:uploads/videos}")
    private String uploadDir;

    private final VideoRepository videoRepository;

    public VideoService(VideoRepository videoRepository) {
        this.videoRepository = videoRepository;
    }

    /**
     * Upload a new video file
     */
    public Video uploadVideo(MultipartFile file, String title, String description) throws IOException {
        // Validar arquivo
        validateVideoFile(file);

        // Verificar limite de vídeos
        long activeCount = videoRepository.countActiveVideos();
        if (activeCount >= MAX_VIDEOS) {
            throw new IllegalStateException("Limite máximo de " + MAX_VIDEOS + " vídeos atingido");
        }

        // Criar diretório se não existir
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            logger.info("[VIDEO] Diretório de upload criado: {}", uploadPath);
        }

        // Salvar arquivo
        String originalFilename = file.getOriginalFilename();
        String savedFilename = UUID.randomUUID() + "_" + originalFilename;
        Path filePath = uploadPath.resolve(savedFilename);

        Files.write(filePath, file.getBytes());
        logger.info("[VIDEO] ✅ Arquivo salvo: {}", filePath);

        // Criar entity de vídeo
        Video video = new Video(
                originalFilename,
                filePath.toString(),
                file.getSize(),
                file.getContentType());
        video.setTitle(title != null ? title : originalFilename);
        video.setDescription(description);
        video.setStatus(Video.VideoStatus.ACTIVE);
        video.setIsActive(true);
        video.setDisplayOrder(getNextDisplayOrder());

        // Salvar no banco
        Video savedVideo = videoRepository.save(video);
        logger.info("[VIDEO] ✅ Vídeo salvo no banco: {}", savedVideo.getId());

        return savedVideo;
    }

    public Video uploadVideo(MultipartFile file, String title, String description, String tenantId) throws IOException {
        validateVideoFile(file);

        long activeCount = (tenantId != null && !tenantId.isBlank())
                ? videoRepository.countActiveVideosByTenantId(tenantId)
                : videoRepository.countActiveVideos();
        if (activeCount >= MAX_VIDEOS) {
            throw new IllegalStateException("Limite maximo de " + MAX_VIDEOS + " videos atingido");
        }

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            logger.info("[VIDEO] Diretorio de upload criado: {}", uploadPath);
        }

        String originalFilename = file.getOriginalFilename();
        String savedFilename = UUID.randomUUID() + "_" + originalFilename;
        Path filePath = uploadPath.resolve(savedFilename);

        Files.write(filePath, file.getBytes());
        logger.info("[VIDEO] Arquivo salvo: {}", filePath);

        Video video = new Video(
                originalFilename,
                filePath.toString(),
                file.getSize(),
                file.getContentType());
        if (tenantId != null && !tenantId.isBlank()) {
            video.setTenantId(tenantId);
        }
        video.setTitle(title != null ? title : originalFilename);
        video.setDescription(description);
        video.setStatus(Video.VideoStatus.ACTIVE);
        video.setIsActive(true);
        video.setDisplayOrder(getNextDisplayOrderForTenant(tenantId));

        Video savedVideo = videoRepository.save(video);
        logger.info("[VIDEO] Video salvo no banco: {}", savedVideo.getId());

        return savedVideo;
    }

    /**
     * Get all videos
     */
    public List<Video> getAllVideos() {
        return videoRepository.findAllOrderByDisplayOrder();
    }

    public List<Video> getAllVideos(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return getAllVideos();
        }
        return videoRepository.findAllByTenantIdOrderByDisplayOrder(tenantId);
    }

    /**
     * Get all active videos (for carousel)
     */
    public List<Video> getActiveVideos() {
        return videoRepository.findAllActive();
    }

    public List<Video> getActiveVideos(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return getActiveVideos();
        }
        return videoRepository.findAllActiveByTenantId(tenantId);
    }

    /**
     * Get active videos with limit (for carousel)
     */
    public List<Video> getActiveVideosWithLimit(int limit) {
        if (limit > MAX_VIDEOS)
            limit = MAX_VIDEOS;
        return videoRepository.findActiveVideosWithLimit(limit);
    }

    public List<Video> getActiveVideosWithLimit(String tenantId, int limit) {
        if (limit > MAX_VIDEOS)
            limit = MAX_VIDEOS;
        if (tenantId == null || tenantId.isBlank()) {
            return getActiveVideosWithLimit(limit);
        }
        return videoRepository.findActiveVideosByTenantWithLimit(tenantId, limit);
    }

    /**
     * Get video by ID
     */
    public Optional<Video> getVideoById(UUID id) {
        return videoRepository.findById(id);
    }

    public Optional<Video> getVideoById(String tenantId, UUID id) {
        if (tenantId == null || tenantId.isBlank()) {
            return getVideoById(id);
        }
        return videoRepository.findByTenantIdAndId(tenantId, id);
    }

    /**
     * Update video metadata
     */
    public Video updateVideo(UUID id, String title, String description, Integer displayOrder, Boolean isActive)
            throws IOException {
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Vídeo não encontrado"));

        if (title != null)
            video.setTitle(title);
        if (description != null)
            video.setDescription(description);
        if (displayOrder != null)
            video.setDisplayOrder(displayOrder);
        if (isActive != null)
            video.setIsActive(isActive);

        return videoRepository.save(video);
    }

    public Video updateVideo(String tenantId, UUID id, String title, String description, Integer displayOrder,
            Boolean isActive) throws IOException {
        if (tenantId == null || tenantId.isBlank()) {
            return updateVideo(id, title, description, displayOrder, isActive);
        }
        Video video = videoRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Video nao encontrado"));

        if (title != null)
            video.setTitle(title);
        if (description != null)
            video.setDescription(description);
        if (displayOrder != null)
            video.setDisplayOrder(displayOrder);
        if (isActive != null)
            video.setIsActive(isActive);

        return videoRepository.save(video);
    }

    /**
     * Delete video
     */
    public void deleteVideo(UUID id) throws IOException {
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Vídeo não encontrado"));

        // Deletar arquivo
        Path filePath = Paths.get(video.getFilePath());
        if (Files.exists(filePath)) {
            Files.delete(filePath);
            logger.info("[VIDEO] ✅ Arquivo deletado: {}", filePath);
        }

        // Deletar do banco
        videoRepository.deleteById(id);
        logger.info("[VIDEO] ✅ Vídeo deletado do banco: {}", id);
    }

    public void deleteVideo(String tenantId, UUID id) throws IOException {
        if (tenantId == null || tenantId.isBlank()) {
            deleteVideo(id);
            return;
        }
        Video video = videoRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Video nao encontrado"));

        Path filePath = Paths.get(video.getFilePath());
        if (Files.exists(filePath)) {
            Files.delete(filePath);
            logger.info("[VIDEO] Arquivo deletado: {}", filePath);
        }

        videoRepository.deleteById(id);
        logger.info("[VIDEO] Video deletado do banco: {}", id);
    }

    /**
     * Reorder videos
     */
    public void reorderVideos(List<UUID> videoIds) {
        for (int i = 0; i < videoIds.size(); i++) {
            UUID id = videoIds.get(i);
            Video video = videoRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Vídeo não encontrado: " + id));
            video.setDisplayOrder(i);
            videoRepository.save(video);
        }
        logger.info("[VIDEO] ✅ Vídeos reordenados");
    }

    public void reorderVideos(String tenantId, List<UUID> videoIds) {
        if (tenantId == null || tenantId.isBlank()) {
            reorderVideos(videoIds);
            return;
        }
        for (int i = 0; i < videoIds.size(); i++) {
            UUID id = videoIds.get(i);
            Video video = videoRepository.findByTenantIdAndId(tenantId, id)
                    .orElseThrow(() -> new IllegalArgumentException("Video nao encontrado: " + id));
            video.setDisplayOrder(i);
            videoRepository.save(video);
        }
        logger.info("[VIDEO] Videos reordenados");
    }

    private Integer getNextDisplayOrderForTenant(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return getNextDisplayOrder();
        }
        List<Video> videos = videoRepository.findAllByTenantIdOrderByDisplayOrder(tenantId);
        if (videos.isEmpty())
            return 0;
        return videos.get(videos.size() - 1).getDisplayOrder() + 1;
    }

    /**
     * Get next display order
     */
    private Integer getNextDisplayOrder() {
        List<Video> videos = videoRepository.findAllOrderByDisplayOrder();
        if (videos.isEmpty())
            return 0;
        return videos.get(videos.size() - 1).getDisplayOrder() + 1;
    }

    /**
     * Validate video file
     */
    private void validateVideoFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio");
        }

        // Validar tamanho
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Arquivo maior que 250MB");
        }

        // Validar tipo MIME
        String mimeType = file.getContentType();
        boolean isValidMimeType = false;
        for (String allowed : ALLOWED_MIME_TYPES) {
            if (allowed.equalsIgnoreCase(mimeType)) {
                isValidMimeType = true;
                break;
            }
        }

        if (!isValidMimeType) {
            throw new IllegalArgumentException("Tipo de arquivo não suportado: " + mimeType);
        }

        logger.info("[VIDEO] ✅ Arquivo validado: {} ({} bytes, {})",
                file.getOriginalFilename(), file.getSize(), mimeType);
    }
}

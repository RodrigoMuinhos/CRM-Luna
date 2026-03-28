package br.lunavita.totemapi.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity for managing video files in the system
 * Supports up to 7 videos for advertising carousel
 */
@Entity
@Table(name = "videos", indexes = {
        @Index(name = "idx_video_order", columnList = "display_order"),
        @Index(name = "idx_video_active", columnList = "is_active")
})
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false, length = 2048)
    private String filePath;

    @Column(nullable = false)
    private Long fileSize; // in bytes

    @Column(nullable = false)
    private String mimeType;

    @Column(nullable = true, length = 255)
    private String title;

    @Column(nullable = true, length = 1024)
    private String description;

    @Column(name = "display_order", nullable = false, columnDefinition = "INTEGER DEFAULT 0")
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false, columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean isActive = true;

    @Column(name = "upload_duration_seconds")
    private Long durationSeconds;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private VideoStatus status = VideoStatus.PENDING;

    // Constructors
    public Video() {
    }

    public Video(String filename, String filePath, Long fileSize, String mimeType) {
        this.filename = filename;
        this.filePath = filePath;
        this.fileSize = fileSize;
        this.mimeType = mimeType;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Long getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Long durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public VideoStatus getStatus() {
        return status;
    }

    public void setStatus(VideoStatus status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return "Video{" +
                "id=" + id +
                ", filename='" + filename + '\'' +
                ", title='" + title + '\'' +
                ", isActive=" + isActive +
                ", status=" + status +
                ", createdAt=" + createdAt +
                '}';
    }

    /**
     * Status enum for video processing
     */
    public enum VideoStatus {
        PENDING, // Upload recebido, aguardando processamento
        PROCESSING, // Sendo processado/validado
        ACTIVE, // Pronto para exibição
        ARCHIVED, // Arquivado
        ERROR // Erro no upload/processamento
    }
}

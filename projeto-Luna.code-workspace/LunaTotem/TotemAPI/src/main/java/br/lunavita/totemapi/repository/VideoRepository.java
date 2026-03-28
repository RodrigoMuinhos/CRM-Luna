package br.lunavita.totemapi.repository;

import br.lunavita.totemapi.model.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VideoRepository extends JpaRepository<Video, UUID> {

    // ===== MÉTODOS MULTI-TENANT (SEMPRE FILTRAR POR TENANT_ID) =====

    /**
     * Find video by ID and tenant
     */
    Optional<Video> findByTenantIdAndId(String tenantId, UUID id);

    /**
     * Find all active videos of tenant ordered by display order
     */
    @Query("SELECT v FROM Video v WHERE v.tenantId = :tenantId AND v.isActive = true ORDER BY v.displayOrder ASC, v.createdAt DESC")
    List<Video> findAllActiveByTenantId(@Param("tenantId") String tenantId);

    /**
     * Find all videos of tenant (including inactive) ordered by display order
     */
    @Query("SELECT v FROM Video v WHERE v.tenantId = :tenantId ORDER BY v.displayOrder ASC, v.createdAt DESC")
    List<Video> findAllByTenantIdOrderByDisplayOrder(@Param("tenantId") String tenantId);

    /**
     * Find videos by status and tenant
     */
    List<Video> findByTenantIdAndStatus(String tenantId, Video.VideoStatus status);

    /**
     * Find active videos with limit for carousel
     */
    @Query(value = "SELECT * FROM videos WHERE tenant_id = :tenantId AND is_active = true ORDER BY display_order ASC LIMIT :limit", nativeQuery = true)
    List<Video> findActiveVideosByTenantWithLimit(@Param("tenantId") String tenantId, @Param("limit") int limit);

    /**
     * Count active videos of tenant (max 7 for carousel)
     */
    @Query("SELECT COUNT(v) FROM Video v WHERE v.tenantId = :tenantId AND v.isActive = true")
    long countActiveVideosByTenantId(@Param("tenantId") String tenantId);

    /**
     * Find by filename and tenant
     */
    Optional<Video> findByTenantIdAndFilename(String tenantId, String filename);

    // ===== MÉTODOS DEPRECADOS (NÃO USAR - SEM FILTRO DE TENANT) =====

    /**
     * @deprecated Use findAllActiveByTenantId() para garantir isolamento
     *             multi-tenant
     */
    @Deprecated
    @Query("SELECT v FROM Video v WHERE v.isActive = true ORDER BY v.displayOrder ASC, v.createdAt DESC")
    List<Video> findAllActive();

    /**
     * Find all videos (including inactive) ordered by display order
     */
    @Query("SELECT v FROM Video v ORDER BY v.displayOrder ASC, v.createdAt DESC")
    List<Video> findAllOrderByDisplayOrder();

    /**
     * Find videos by status
     */
    List<Video> findByStatus(Video.VideoStatus status);

    /**
     * Find all videos with limit (for carousel)
     */
    @Query(value = "SELECT * FROM videos WHERE is_active = true ORDER BY display_order ASC LIMIT :limit", nativeQuery = true)
    List<Video> findActiveVideosWithLimit(@Param("limit") int limit);

    /**
     * Check if max videos (7) limit reached
     */
    @Query("SELECT COUNT(v) FROM Video v WHERE v.isActive = true")
    long countActiveVideos();

    /**
     * Find by filename
     */
    Optional<Video> findByFilename(String filename);
}

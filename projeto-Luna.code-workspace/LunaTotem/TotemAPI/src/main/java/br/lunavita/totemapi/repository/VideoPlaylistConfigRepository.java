package br.lunavita.totemapi.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import br.lunavita.totemapi.model.VideoPlaylistConfig;

@Repository
public interface VideoPlaylistConfigRepository extends JpaRepository<VideoPlaylistConfig, Long> {
    Optional<VideoPlaylistConfig> findByTenantId(String tenantId);
}

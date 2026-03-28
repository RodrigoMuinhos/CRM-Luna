package br.lunavita.totemapi.service;

import java.net.URI;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.lunavita.totemapi.dto.VideoPlaylistConfigDto;
import br.lunavita.totemapi.dto.VideoPlaylistItemDto;
import br.lunavita.totemapi.model.VideoPlaylistConfig;
import br.lunavita.totemapi.repository.VideoPlaylistConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoPlaylistConfigService {

    private static final int MAX_VIDEOS = 15;
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final VideoPlaylistConfigRepository repository;
    private final ObjectMapper objectMapper;

    public VideoPlaylistConfigDto getPlaylist(String tenantId) {
        String normalizedTenantId = normalizeTenantId(tenantId);
        return repository.findByTenantId(normalizedTenantId)
                .map(this::toDto)
                .orElseGet(() -> emptyConfig(normalizedTenantId));
    }

    public VideoPlaylistConfigDto savePlaylist(String tenantId, List<VideoPlaylistItemDto> rawVideos, String updatedBy) {
        String normalizedTenantId = normalizeTenantId(tenantId);
        List<VideoPlaylistItemDto> videos = sanitizeVideos(rawVideos);

        VideoPlaylistConfig config = repository.findByTenantId(normalizedTenantId)
                .orElseGet(VideoPlaylistConfig::new);

        config.setTenantId(normalizedTenantId);
        config.setPlaylistJson(writeVideosJson(videos));
        config.setUpdatedBy(normalizeUpdatedBy(updatedBy));

        VideoPlaylistConfig saved = repository.save(config);
        log.info("Video playlist saved for tenant {} with {} item(s)", normalizedTenantId, videos.size());
        return toDto(saved);
    }

    private VideoPlaylistConfigDto toDto(VideoPlaylistConfig config) {
        VideoPlaylistConfigDto dto = new VideoPlaylistConfigDto();
        dto.setTenantId(config.getTenantId());
        dto.setVideos(readVideosJson(config.getPlaylistJson()));
        dto.setUpdatedBy(config.getUpdatedBy());
        dto.setUpdatedAt(config.getUpdatedAt() != null ? config.getUpdatedAt().format(TIMESTAMP_FORMAT) : null);
        return dto;
    }

    private VideoPlaylistConfigDto emptyConfig(String tenantId) {
        VideoPlaylistConfigDto dto = new VideoPlaylistConfigDto();
        dto.setTenantId(tenantId);
        dto.setVideos(new ArrayList<>());
        return dto;
    }

    private List<VideoPlaylistItemDto> sanitizeVideos(List<VideoPlaylistItemDto> rawVideos) {
        if (rawVideos == null) {
            return new ArrayList<>();
        }

        List<VideoPlaylistItemDto> sanitized = new ArrayList<>();
        for (VideoPlaylistItemDto video : rawVideos) {
            if (video == null) {
                continue;
            }

            String title = normalizeText(video.getTitle());
            String url = normalizeText(video.getUrl());
            if (title == null || url == null) {
                continue;
            }
            if (!isHttpUrl(url)) {
                throw new IllegalArgumentException("URL de video invalida: " + url);
            }

            VideoPlaylistItemDto item = new VideoPlaylistItemDto();
            item.setId(normalizeText(video.getId()));
            item.setTitle(title);
            item.setUrl(url);
            item.setSizeBytes(video.getSizeBytes() != null && video.getSizeBytes() >= 0 ? video.getSizeBytes() : null);
            item.setDisplayOrder(video.getDisplayOrder());
            sanitized.add(item);
        }

        if (sanitized.size() > MAX_VIDEOS) {
            throw new IllegalArgumentException("Limite maximo de " + MAX_VIDEOS + " videos na playlist");
        }

        for (int i = 0; i < sanitized.size(); i++) {
            VideoPlaylistItemDto item = sanitized.get(i);
            if (item.getId() == null) {
                item.setId("video-" + (i + 1));
            }
            item.setDisplayOrder(i + 1);
        }

        return sanitized;
    }

    private List<VideoPlaylistItemDto> readVideosJson(String playlistJson) {
        String raw = playlistJson != null && !playlistJson.isBlank() ? playlistJson : "[]";
        try {
            List<VideoPlaylistItemDto> parsed = objectMapper.readValue(raw, new TypeReference<List<VideoPlaylistItemDto>>() {
            });
            return sanitizeVideos(parsed);
        } catch (Exception error) {
            log.warn("Failed to parse persisted video playlist. Returning empty list.", error);
            return new ArrayList<>();
        }
    }

    private String writeVideosJson(List<VideoPlaylistItemDto> videos) {
        try {
            return objectMapper.writeValueAsString(videos);
        } catch (Exception error) {
            throw new IllegalStateException("Falha ao serializar playlist de videos", error);
        }
    }

    private String normalizeTenantId(String tenantId) {
        String normalized = normalizeText(tenantId);
        return normalized != null ? normalized : "default";
    }

    private String normalizeUpdatedBy(String updatedBy) {
        String normalized = normalizeText(updatedBy);
        return normalized != null ? normalized : "system";
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private boolean isHttpUrl(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
        } catch (Exception error) {
            return false;
        }
    }
}

package br.lunavita.totemapi.dto;

import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoPlaylistConfigDto {
    private String tenantId;
    private List<VideoPlaylistItemDto> videos = new ArrayList<>();
    private String updatedAt;
    private String updatedBy;
}

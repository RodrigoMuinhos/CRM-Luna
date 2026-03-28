package br.lunavita.totemapi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoPlaylistItemDto {
    private String id;
    private String title;
    private String url;
    private Long sizeBytes;
    private Integer displayOrder;
}

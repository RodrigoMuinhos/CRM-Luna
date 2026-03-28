package br.lunavita.totemapi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request para reportar o resultado de uma impressão
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrintResultRequest {

    /**
     * ID do job que foi processado
     */
    private String jobId;

    /**
     * Se a impressão foi bem-sucedida
     */
    private boolean success;

    /**
     * Mensagem de erro (se houver)
     */
    private String errorMessage;
}

package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FeedbackCompetencyUpsertRequest {

    /**
     * Internal, stable identifier. UI does not need to send this for normal create/update.
     * If omitted on create, the backend generates it from the competency name.
     * If omitted on update, the existing code is preserved.
     */
    private String code;

    @NotBlank(message = "Competency name is required")
    private String name;

    private String description;

}

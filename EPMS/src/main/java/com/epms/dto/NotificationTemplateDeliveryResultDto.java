package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplateDeliveryResultDto {

    private String channel;
    private int attemptedCount;
    private int sentCount;
    private int skippedCount;
    private String firstFailure;
    private List<String> failures;
    private List<RecipientResult> recipients;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecipientResult {
        private Integer userId;
        private String displayName;
        private String role;
        private String email;
        private String status;
        private String failure;
    }
}

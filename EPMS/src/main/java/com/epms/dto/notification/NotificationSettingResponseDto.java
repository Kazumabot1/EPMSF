package com.epms.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingResponseDto {
    private String category;
    private String label;
    private String description;
    private Boolean enabled;
    private Boolean locked;
    private Boolean defaultEnabled;
    private String lockReason;
    private Integer displayOrder;
}

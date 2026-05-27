package com.epms.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingDefinition {
    private String category;
    private String label;
    private String description;
    private boolean locked;
    private boolean defaultEnabled;
    private int displayOrder;
}

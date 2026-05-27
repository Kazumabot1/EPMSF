package com.epms.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDeliveryPolicy {
    private String eventKey;
    private String category;
    private boolean mandatory;
    private boolean defaultInAppEnabled;
    private boolean defaultEmailEnabled;

    public static NotificationDeliveryPolicy required(String eventKey, String category) {
        return NotificationDeliveryPolicy.builder()
                .eventKey(eventKey)
                .category(category)
                .mandatory(true)
                .defaultInAppEnabled(true)
                .defaultEmailEnabled(true)
                .build();
    }

    public static NotificationDeliveryPolicy optional(String eventKey, String category) {
        return NotificationDeliveryPolicy.builder()
                .eventKey(eventKey)
                .category(category)
                .mandatory(false)
                .defaultInAppEnabled(true)
                .defaultEmailEnabled(true)
                .build();
    }
}

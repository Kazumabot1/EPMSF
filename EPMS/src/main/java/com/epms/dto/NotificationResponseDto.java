package com.epms.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
public class NotificationResponseDto {
    private Integer id;
    private String title;
    private String message;
    private String type;
    private Boolean isRead;
    private Date createdAt;
    /** Optional deep-link target (e.g. KPI template id when type is KPI_*). */
    private Integer referenceId;
    private String category;
    private String eventKey;
    private Boolean mandatory;

    public NotificationResponseDto(
            Integer id,
            String title,
            String message,
            String type,
            Boolean isRead,
            Date createdAt,
            Integer referenceId
    ) {
        this(id, title, message, type, isRead, createdAt, referenceId, null, null, false);
    }

    public NotificationResponseDto(
            Integer id,
            String title,
            String message,
            String type,
            Boolean isRead,
            Date createdAt,
            Integer referenceId,
            String category,
            String eventKey,
            Boolean mandatory
    ) {
        this.id = id;
        this.title = title;
        this.message = message;
        this.type = type;
        this.isRead = isRead;
        this.createdAt = createdAt;
        this.referenceId = referenceId;
        this.category = category;
        this.eventKey = eventKey;
        this.mandatory = mandatory;
    }
}

/*
package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class AuditLogResponse {
    private Integer id;
    private Integer userId;
    private String action;
    private String entityType;
    private Integer entityId;
    private String oldValue;
    private String newValue;
    private String reason;
    private Date timestamp;
}
*/







/*
KHN:
*/
        package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class AuditLogResponse {
    private Integer id;
    private Integer userId;
    private String changedByName;
    private String action;
    private String entityType;
    private Integer entityId;
    private String changedColumn;
    private String oldValue;
    private String newValue;
    private String reason;
    private Date timestamp;
}
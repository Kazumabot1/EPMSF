package com.epms.exception;

import lombok.Getter;

@Getter
public class KpiTemplatePositionConflictException extends RuntimeException {

    private final Integer existingTemplateId;

    public KpiTemplatePositionConflictException(Integer existingTemplateId, String message) {
        super(message);
        this.existingTemplateId = existingTemplateId;
    }
}

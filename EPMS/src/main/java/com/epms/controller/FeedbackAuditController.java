/*
package com.epms.controller;

import com.epms.dto.AuditLogResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.AuditLog;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/feedback/audit-logs")
@RequiredArgsConstructor
public class FeedbackAuditController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Integer entityId) {
        ensureHrOrAdmin();
        List<AuditLogResponse> logs = auditLogService.getRecent(entityType, entityId).stream()
                .map(this::map)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Audit logs retrieved successfully", logs));
    }

    private AuditLogResponse map(AuditLog auditLog) {
        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .userId(auditLog.getUserId())
                .action(auditLog.getAction())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .oldValue(auditLog.getOldValue())
                .newValue(auditLog.getNewValue())
                .reason(auditLog.getReason())
                .timestamp(auditLog.getTimestamp())
                .build();
    }

    private void ensureHrOrAdmin() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("HR") || role.equals("HRADMIN") || role.equals("ROLE_HR") || role.equals("ROLE_ADMIN"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR or HR Admin can access audit logs.");
        }
    }
}
*/








package com.epms.controller;

import com.epms.dto.AuditLogResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.AuditLog;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/feedback/audit-logs")
@RequiredArgsConstructor
public class FeedbackAuditController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Integer entityId) {
        ensureHrOrAdmin();
        List<AuditLogResponse> logs = auditLogService.getRecent(entityType, entityId).stream()
                .map(this::map)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Audit logs retrieved successfully", logs));
    }

    private AuditLogResponse map(AuditLog auditLog) {
        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .userId(auditLog.getUserId())
                .changedByName(auditLog.getUserId() == null ? "System" : "User #" + auditLog.getUserId())
                .action(auditLog.getAction())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .changedColumn(auditLog.getChangedColumn())
                .oldValue(auditLog.getOldValue())
                .newValue(auditLog.getNewValue())
                .reason(auditLog.getReason())
                .timestamp(auditLog.getTimestamp())
                .build();
    }

    private void ensureHrOrAdmin() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("HR") || role.equals("HRADMIN") || role.equals("ROLE_HR") || role.equals("ROLE_ADMIN"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR or HR Admin can access audit logs.");
        }
    }
}

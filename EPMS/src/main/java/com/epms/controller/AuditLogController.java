package com.epms.controller;

import com.epms.dto.AuditLogEditorResponse;
import com.epms.dto.AuditLogResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.AuditLog;
import com.epms.entity.User;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private static final Set<String> HR_ENTITY_TYPES = Set.of(
            "DEPARTMENT",
            "POSITION_LEVEL",
            "POSITION",
            "APPRAISAL_TEMPLATE",
            "APPRAISAL_CYCLE"
    );

    private static final Set<String> SHARED_HR_ENTITY_TYPES = Set.of(
            "APPRAISAL_TEMPLATE",
            "APPRAISAL_CYCLE"
    );

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Integer entityId,
            @RequestParam(required = false) Integer userId
    ) {
        boolean auditAdmin = isAuditAdmin();
        boolean hr = isHr();

        if (!auditAdmin && !hr) {
            throw new UnauthorizedActionException("Only HR Admin or HR can access audit logs.");
        }

        String normalizedEntityType = normalizeEntityType(entityType);
        Integer effectiveUserId = resolveEffectiveUserId(auditAdmin, userId, normalizedEntityType);

        List<AuditLog> logs;
        if (auditAdmin) {
            logs = auditLogService.getRecent(normalizedEntityType, entityId, effectiveUserId);
        } else {
            if (normalizedEntityType != null && !HR_ENTITY_TYPES.contains(normalizedEntityType)) {
                throw new UnauthorizedActionException("You are not allowed to view this audit log type.");
            }

            if (normalizedEntityType != null) {
                logs = auditLogService.getRecent(normalizedEntityType, entityId, effectiveUserId);
            } else {
                logs = auditLogService.getRecentForEntityTypes(HR_ENTITY_TYPES, effectiveUserId);
            }
        }

        Map<Integer, String> names = userRepository.findAllById(
                        logs.stream()
                                .map(AuditLog::getUserId)
                                .filter(id -> id != null)
                                .distinct()
                                .toList()
                )
                .stream()
                .collect(Collectors.toMap(User::getId, this::displayName));

        List<AuditLogResponse> response = logs.stream()
                .map(log -> map(log, names))
                .toList();

        return ResponseEntity.ok(GenericApiResponse.success("Audit logs retrieved successfully", response));
    }

    @GetMapping("/editors")
    public ResponseEntity<GenericApiResponse<List<AuditLogEditorResponse>>> getAuditLogEditors() {
        if (!isAuditAdmin()) {
            throw new UnauthorizedActionException("Only HR Admin can view audit log editor list.");
        }

        List<AuditLog> recentLogs = auditLogService.getRecent(null, null, null);
        List<Integer> editorIds = recentLogs.stream()
                .map(AuditLog::getUserId)
                .filter(id -> id != null)
                .distinct()
                .toList();

        if (editorIds.isEmpty()) {
            return ResponseEntity.ok(GenericApiResponse.success("Audit log editors retrieved successfully", List.of()));
        }

        Map<Integer, UserRepository.AuditLogEditorProjection> existingEditors = userRepository
                .findAuditLogEditorOptionsByUserIds(editorIds)
                .stream()
                .collect(Collectors.toMap(
                        UserRepository.AuditLogEditorProjection::getUserId,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        List<AuditLogEditorResponse> response = new ArrayList<>();
        for (Integer editorId : editorIds) {
            UserRepository.AuditLogEditorProjection editor = existingEditors.get(editorId);

            if (editor == null) {
                response.add(AuditLogEditorResponse.builder()
                        .userId(editorId)
                        .displayName("User #" + editorId)
                        .roleName("Deleted user")
                        .label("User #" + editorId + " (Deleted user)")
                        .build());
                continue;
            }

            String displayName = defaultText(editor.getDisplayName(), "User #" + editorId);
            String roleName = defaultText(editor.getRoleName(), "User");
            response.add(AuditLogEditorResponse.builder()
                    .userId(editorId)
                    .displayName(displayName)
                    .roleName(roleName)
                    .label(displayName + " (" + roleName + ")")
                    .build());
        }

        response.sort(Comparator.comparing(AuditLogEditorResponse::getLabel, String.CASE_INSENSITIVE_ORDER));

        return ResponseEntity.ok(GenericApiResponse.success("Audit log editors retrieved successfully", response));
    }

    private Integer resolveEffectiveUserId(boolean auditAdmin, Integer requestedUserId, String normalizedEntityType) {
        if (auditAdmin) {
            return requestedUserId;
        }

        if (normalizedEntityType != null && SHARED_HR_ENTITY_TYPES.contains(normalizedEntityType)) {
            return requestedUserId;
        }

        Integer currentUserId = SecurityUtils.currentUserId();
        if (requestedUserId != null && !requestedUserId.equals(currentUserId)) {
            throw new UnauthorizedActionException("HR can only view their own audit logs.");
        }

        return currentUserId;
    }

    private AuditLogResponse map(AuditLog auditLog, Map<Integer, String> names) {
        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .userId(auditLog.getUserId())
                .changedByName(names.getOrDefault(
                        auditLog.getUserId(),
                        auditLog.getUserId() == null ? "System" : "User #" + auditLog.getUserId()
                ))
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

    private String displayName(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }
        return "User #" + user.getId();
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalizeEntityType(String entityType) {
        if (entityType == null || entityType.isBlank()) {
            return null;
        }
        return entityType.trim().replace('-', '_').replace(' ', '_').toUpperCase(Locale.ROOT);
    }

    private boolean isAuditAdmin() {
        return SecurityUtils.currentUser().getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("ADMIN")
                        || role.equals("HRADMIN")
                        || role.equals("HR_ADMIN"));
    }

    private boolean isHr() {
        return SecurityUtils.currentUser().getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("HR")
                        || role.equals("HUMAN_RESOURCE")
                        || role.equals("HUMAN_RESOURCES")
                        || role.equals("HR_MANAGER"));
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }
        return role.replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }
}

/*
package com.epms.controller;

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

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private static final Set<String> ADMIN_ENTITY_TYPES = Set.of("DEPARTMENT", "POSITION_LEVEL", "ROLE");
    private static final Set<String> HR_ENTITY_TYPES = Set.of("DEPARTMENT", "POSITION_LEVEL");

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Integer entityId
    ) {
        boolean admin = isAdmin();
        boolean hr = isHr();

        if (!admin && !hr) {
            throw new UnauthorizedActionException("Only HR/Admin can access audit logs.");
        }

        Set<String> allowedTypes = admin ? ADMIN_ENTITY_TYPES : HR_ENTITY_TYPES;
        String normalizedEntityType = normalizeEntityType(entityType);

        List<AuditLog> logs;
        if (normalizedEntityType != null) {
            if (!allowedTypes.contains(normalizedEntityType)) {
                throw new UnauthorizedActionException("You are not allowed to view this audit log type.");
            }
            logs = auditLogService.getRecent(normalizedEntityType, entityId);
        } else {
            logs = auditLogService.getRecentForEntityTypes(allowedTypes);
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

    private AuditLogResponse map(AuditLog auditLog, Map<Integer, String> names) {
        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .userId(auditLog.getUserId())
                .changedByName(names.getOrDefault(auditLog.getUserId(), auditLog.getUserId() == null ? "System" : "User #" + auditLog.getUserId()))
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

    private String normalizeEntityType(String entityType) {
        if (entityType == null || entityType.isBlank()) {
            return null;
        }
        return entityType.trim().replace('-', '_').replace(' ', '_').toUpperCase(Locale.ROOT);
    }

    private boolean isAdmin() {
        return SecurityUtils.currentUser().getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("ADMIN"));
    }

    private boolean isHr() {
        return SecurityUtils.currentUser().getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("HR") || role.equals("HUMAN_RESOURCE") || role.equals("HUMAN_RESOURCES") || role.equals("HR_MANAGER") || role.equals("HR_ADMIN"));
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
}*/





/*
package com.epms.controller;

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

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private static final Set<String> ADMIN_ENTITY_TYPES = Set.of(
            "TEAM",
            "DEPARTMENT",
            "EMPLOYEE",
            "ASSESSMENT_FORM",
            "APPRAISAL_TEMPLATE",
            "APPRAISAL_CYCLE",
            "ONE_ON_ONE_MEETING",
            "POSITION_LEVEL",
            "POSITION",
            "ROLE",
            "KPI_TEMPLATE_FORM",
            "KPI_TEMPLATE_CYCLE",
            "KPI_UNIT",
            "KPI_CATEGORY",
            "KPI_ITEM",
            "DEPARTMENT_KPI_TEMPLATE",
            "DEPARTMENT_KPI_CYCLE",
            "DEPARTMENT_KPI_SCORE"
    );
    private static final Set<String> HR_ENTITY_TYPES = Set.of("DEPARTMENT", "POSITION_LEVEL", "POSITION", "APPRAISAL_TEMPLATE", "APPRAISAL_CYCLE");
    private static final Set<String> SHARED_HR_ENTITY_TYPES = Set.of("APPRAISAL_TEMPLATE", "APPRAISAL_CYCLE");

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Integer entityId
    ) {
        boolean admin = isAdmin();
        boolean hr = isHr();

        if (!admin && !hr) {
            throw new UnauthorizedActionException("Only HR/Admin can access audit logs.");
        }

        Set<String> allowedTypes = admin ? ADMIN_ENTITY_TYPES : HR_ENTITY_TYPES;
        String normalizedEntityType = normalizeEntityType(entityType);

        List<AuditLog> logs;
        if (normalizedEntityType != null) {
            if (!allowedTypes.contains(normalizedEntityType)) {
                throw new UnauthorizedActionException("You are not allowed to view this audit log type.");
            }
            logs = auditLogService.getRecent(normalizedEntityType, entityId);
        } else {
            logs = auditLogService.getRecentForEntityTypes(allowedTypes);
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

    private AuditLogResponse map(AuditLog auditLog, Map<Integer, String> names) {
        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .userId(auditLog.getUserId())
                .changedByName(names.getOrDefault(auditLog.getUserId(), auditLog.getUserId() == null ? "System" : "User #" + auditLog.getUserId()))
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

    private String normalizeEntityType(String entityType) {
        if (entityType == null || entityType.isBlank()) {
            return null;
        }
        return entityType.trim().replace('-', '_').replace(' ', '_').toUpperCase(Locale.ROOT);
    }

    private boolean isAdmin() {
        return SecurityUtils.currentUser().getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("ADMIN"));
    }

    private boolean isHr() {
        return SecurityUtils.currentUser().getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("HR") || role.equals("HUMAN_RESOURCE") || role.equals("HUMAN_RESOURCES") || role.equals("HR_MANAGER") || role.equals("HR_ADMIN"));
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
}*/








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

    private static final Set<String> ADMIN_ENTITY_TYPES = Set.of(
            "TEAM",
            "DEPARTMENT",
            "EMPLOYEE",
            "ASSESSMENT_FORM",
            "APPRAISAL_TEMPLATE",
            "APPRAISAL_CYCLE",
            "ONE_ON_ONE_MEETING",
            "POSITION_LEVEL",
            "POSITION",
            "ROLE",
            "KPI_TEMPLATE_FORM",
            "KPI_TEMPLATE_CYCLE",
            "KPI_UNIT",
            "KPI_CATEGORY",
            "KPI_ITEM",
            "DEPARTMENT_KPI_TEMPLATE",
            "DEPARTMENT_KPI_CYCLE",
            "DEPARTMENT_KPI_SCORE"
    );
    private static final Set<String> HR_ENTITY_TYPES = Set.of("DEPARTMENT", "POSITION_LEVEL", "POSITION", "APPRAISAL_TEMPLATE", "APPRAISAL_CYCLE");
    private static final Set<String> SHARED_HR_ENTITY_TYPES = Set.of("APPRAISAL_TEMPLATE", "APPRAISAL_CYCLE");

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Integer entityId,
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String search
    ) {
        boolean admin = isAdmin();
        boolean hr = isHr();

        if (!admin && !hr) {
            throw new UnauthorizedActionException("Only HR/Admin can access audit logs.");
        }

        Set<String> allowedTypes = admin ? ADMIN_ENTITY_TYPES : HR_ENTITY_TYPES;
        String normalizedEntityType = normalizeEntityType(entityType);
        Integer effectiveUserId = resolveEffectiveUserId(admin, userId, normalizedEntityType);

        List<AuditLog> logs;
        if (normalizedEntityType != null) {
            if (!admin && !allowedTypes.contains(normalizedEntityType)) {
                throw new UnauthorizedActionException("You are not allowed to view this audit log type.");
            }

            logs = auditLogService.getRecent(normalizedEntityType, entityId, effectiveUserId);
        } else if (admin) {
            logs = auditLogService.getRecent(null, null, effectiveUserId);
        } else {
            logs = auditLogService.getRecentForEntityTypes(allowedTypes, effectiveUserId);
        }

        List<Integer> actorIds = logs.stream()
                .map(AuditLog::getUserId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        Map<Integer, UserRepository.AuditLogEditorProjection> actors = actorIds.isEmpty()
                ? Map.of()
                : userRepository
                        .findAuditLogEditorOptionsByUserIds(actorIds)
                        .stream()
                        .collect(Collectors.toMap(
                                UserRepository.AuditLogEditorProjection::getUserId,
                                Function.identity(),
                                (left, ignored) -> left,
                                LinkedHashMap::new
                        ));

        String normalizedAction = normalizeToken(action);
        String normalizedActorRole = normalizeRole(actorRole);
        String normalizedSearch = search == null || search.isBlank() ? null : search.trim().toLowerCase(Locale.ROOT);

        List<AuditLogResponse> response = logs.stream()
                .map(log -> map(log, actors))
                .filter(row -> admin || !isAdminOrSystemRole(row.getDashboardRole()))
                .filter(row -> normalizedAction == null || normalizeToken(row.getAction()).equals(normalizedAction))
                .filter(row -> normalizedActorRole == null || normalizeRole(row.getDashboardRole()).equals(normalizedActorRole))
                .filter(row -> normalizedSearch == null || searchableText(row).contains(normalizedSearch))
                .toList();

        return ResponseEntity.ok(GenericApiResponse.success("Audit logs retrieved successfully", response));
    }

    @GetMapping("/editors")
    public ResponseEntity<GenericApiResponse<List<AuditLogEditorResponse>>> getAuditLogEditors() {
        if (!isAdmin()) {
            throw new UnauthorizedActionException("Only Admin can view audit log editor list.");
        }

        List<Integer> editorIds = auditLogService.getEditorUserIdsForEntityTypes(ADMIN_ENTITY_TYPES);
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

    private Integer resolveEffectiveUserId(boolean admin, Integer requestedUserId, String normalizedEntityType) {
        if (admin) {
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

    private AuditLogResponse map(
            AuditLog auditLog,
            Map<Integer, UserRepository.AuditLogEditorProjection> actors
    ) {
        UserRepository.AuditLogEditorProjection actor = actors.get(auditLog.getUserId());
        String changedByName = actor == null
                ? (auditLog.getUserId() == null ? "System" : "User #" + auditLog.getUserId())
                : defaultText(actor.getDisplayName(), "User #" + auditLog.getUserId());
        String roleName = actor == null ? "System" : defaultText(actor.getRoleName(), "User");
        String titleName = resolveTitleName(auditLog);
        String summary = buildSummary(auditLog, titleName);

        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .userId(auditLog.getUserId())
                .changedByName(changedByName)
                .dashboardRole(roleName)
                .action(auditLog.getAction())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .titleName(titleName)
                .changedColumn(auditLog.getChangedColumn())
                .oldValue(auditLog.getOldValue())
                .newValue(auditLog.getNewValue())
                .reason(auditLog.getReason())
                .summary(summary)
                .targetEmployeeName(extractLabeledValue(auditLog.getNewValue(), "targetEmployee"))
                .timestamp(auditLog.getTimestamp())
                .build();
    }

    private String buildSummary(AuditLog auditLog, String titleName) {
        String action = prettyAction(auditLog.getAction());
        String entity = prettyEntity(auditLog.getEntityType());
        String column = auditLog.getChangedColumn();

        if (column != null && !column.isBlank()) {
            return action + " " + entity + " \"" + titleName + "\" (" + column + ")";
        }

        return action + " " + entity + " \"" + titleName + "\"";
    }

    private String resolveTitleName(AuditLog auditLog) {
        String explicitTitle = firstPresent(
                extractLabeledValue(auditLog.getNewValue(), "title"),
                extractLabeledValue(auditLog.getNewValue(), "name"),
                extractLabeledValue(auditLog.getNewValue(), "template"),
                extractLabeledValue(auditLog.getNewValue(), "cycle"),
                extractLabeledValue(auditLog.getOldValue(), "title"),
                extractLabeledValue(auditLog.getOldValue(), "name")
        );

        if (explicitTitle != null) {
            return explicitTitle;
        }

        String directValue = firstPresent(auditLog.getNewValue(), auditLog.getOldValue());
        if (directValue != null && directValue.length() <= 80 && !directValue.contains("|") && !directValue.contains(":")) {
            return directValue;
        }

        return prettyEntity(auditLog.getEntityType()) + " #" + auditLog.getEntityId();
    }

    private String extractLabeledValue(String value, String label) {
        if (value == null || label == null) {
            return null;
        }

        String[] parts = value.split("\\|");
        for (String part : parts) {
            int separator = part.indexOf(':');
            if (separator < 0) {
                separator = part.indexOf('=');
            }

            if (separator < 0) {
                continue;
            }

            String key = normalizeToken(part.substring(0, separator));
            if (key != null && key.equals(normalizeToken(label))) {
                String found = part.substring(separator + 1).trim();
                return found.isBlank() ? null : found;
            }
        }

        return null;
    }

    private String searchableText(AuditLogResponse row) {
        return String.join(" ",
                defaultText(row.getChangedByName(), ""),
                defaultText(row.getDashboardRole(), ""),
                defaultText(row.getAction(), ""),
                defaultText(row.getEntityType(), ""),
                defaultText(row.getTitleName(), ""),
                defaultText(row.getSummary(), ""),
                defaultText(row.getReason(), ""),
                defaultText(row.getChangedColumn(), ""),
                defaultText(row.getOldValue(), ""),
                defaultText(row.getNewValue(), "")
        ).toLowerCase(Locale.ROOT);
    }

    private boolean isTrackedHumanActor(String roleName) {
        String role = normalizeRole(roleName);
        return role.equals("HR")
                || role.equals("HUMAN_RESOURCE")
                || role.equals("HUMAN_RESOURCES")
                || role.equals("HR_MANAGER")
                || role.equals("HR_ADMIN")
                || role.equals("MANAGER")
                || role.equals("PROJECT_MANAGER")
                || role.equals("TEAM_MANAGER")
                || role.equals("DEPARTMENT_HEAD")
                || role.equals("DEPARTMENTHEAD")
                || role.equals("DEPT_HEAD")
                || role.equals("HEAD_OF_DEPARTMENT");
    }

    private boolean isAdminOrSystemRole(String roleName) {
        String role = normalizeRole(roleName);
        return role.equals("ADMIN") || role.equals("SYSTEM");
    }

    private String prettyEntity(String value) {
        if (value == null || value.isBlank()) {
            return "Entity";
        }

        String lower = value.toLowerCase(Locale.ROOT).replace('_', ' ');
        String[] words = lower.split("\\s+");
        List<String> pretty = new ArrayList<>();
        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }
            if (word.equals("kpi")) {
                pretty.add("KPI");
            } else {
                pretty.add(word.substring(0, 1).toUpperCase(Locale.ROOT) + word.substring(1));
            }
        }
        return String.join(" ", pretty);
    }

    private String prettyAction(String value) {
        if (value == null || value.isBlank()) {
            return "Updated";
        }

        String normalized = normalizeToken(value);
        if (normalized == null) {
            return value;
        }

        return switch (normalized) {
            case "UPDATE", "EDIT" -> "Edited";
            case "CREATE" -> "Created";
            case "DEACTIVATE" -> "Deactivated";
            case "ACTIVATE", "ACTIVE" -> "Activated";
            case "CLOSE" -> "Closed";
            case "CANCEL" -> "Cancelled";
            case "SUBMIT" -> "Submitted";
            case "SCORE", "GRADE" -> "Scored";
            default -> normalized.substring(0, 1) + normalized.substring(1).toLowerCase(Locale.ROOT);
        };
    }

    private String firstPresent(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String normalizeToken(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().replace('-', '_').replace(' ', '_').toUpperCase(Locale.ROOT);
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

    private boolean isAdmin() {
        boolean hasAdminRole = SecurityUtils.currentUser().getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("ADMIN"));
        String dashboard = normalizeRole(SecurityUtils.currentUser().getDashboard());
        return hasAdminRole || dashboard.equals("ADMIN_DASHBOARD");
    }

    private boolean isHr() {
        return SecurityUtils.currentUser().getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("HR")
                        || role.equals("HUMAN_RESOURCE")
                        || role.equals("HUMAN_RESOURCES")
                        || role.equals("HR_MANAGER")
                        || role.equals("HR_ADMIN"));
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

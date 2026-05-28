/*
package com.epms.service.impl;

import com.epms.entity.AuditLog;
import com.epms.repository.AuditLogRepository;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public void log(Integer userId, String action, String entityType, Integer entityId, String oldValue, String newValue, String reason) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUserId(userId);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setOldValue(oldValue);
        auditLog.setNewValue(newValue);
        auditLog.setReason(reason);
        auditLogRepository.save(auditLog);
    }

    private String limit(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, Math.max(0, maxLength - 3)) + "...";
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getRecent(String entityType, Integer entityId) {
        if (entityType != null && entityId != null) {
            return auditLogRepository.findTop200ByEntityTypeAndEntityIdOrderByTimestampDesc(entityType, entityId);
        }
        if (entityType != null) {
            return auditLogRepository.findTop200ByEntityTypeOrderByTimestampDesc(entityType);
        }
        return auditLogRepository.findTop200ByOrderByTimestampDesc();
    }
}
*/



/*

package com.epms.service.impl;

import com.epms.entity.AuditLog;
import com.epms.repository.AuditLogRepository;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
            Integer userId,
            String action,
            String entityType,
            Integer entityId,
            String oldValue,
            String newValue,
            String reason
    ) {
        log(userId, action, entityType, entityId, null, oldValue, newValue, reason);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
            Integer userId,
            String action,
            String entityType,
            Integer entityId,
            String changedColumn,
            String oldValue,
            String newValue,
            String reason
    ) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUserId(userId);
        auditLog.setAction(limit(action, 50));
        auditLog.setEntityType(limit(entityType, 80));
        auditLog.setEntityId(entityId);
        auditLog.setChangedColumn(limit(changedColumn, 240));
        // Keep enough detail for row-level appraisal edit records while still protecting older databases.
        auditLog.setOldValue(limit(oldValue, 1000));
        auditLog.setNewValue(limit(newValue, 1000));
        auditLog.setReason(limit(reason, 500));

        auditLogRepository.save(auditLog);
    }

    private String limit(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, Math.max(0, maxLength - 3)) + "...";
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getRecent(String entityType, Integer entityId) {
        if (entityType != null && entityId != null) {
            return auditLogRepository.findTop200ByEntityTypeAndEntityIdOrderByTimestampDesc(entityType, entityId);
        }

        if (entityType != null) {
            return auditLogRepository.findTop200ByEntityTypeOrderByTimestampDesc(entityType);
        }

        return auditLogRepository.findTop200ByOrderByTimestampDesc();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getRecentForEntityTypes(Collection<String> entityTypes) {
        if (entityTypes == null || entityTypes.isEmpty()) {
            return auditLogRepository.findTop200ByOrderByTimestampDesc();
        }

        return auditLogRepository.findTop200ByEntityTypeInOrderByTimestampDesc(entityTypes);
    }
}*/








package com.epms.service.impl;

import com.epms.entity.AuditLog;
import com.epms.repository.AuditLogRepository;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
            Integer userId,
            String action,
            String entityType,
            Integer entityId,
            String oldValue,
            String newValue,
            String reason
    ) {
        log(userId, action, entityType, entityId, null, oldValue, newValue, reason);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
            Integer userId,
            String action,
            String entityType,
            Integer entityId,
            String changedColumn,
            String oldValue,
            String newValue,
            String reason
    ) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUserId(userId);
        auditLog.setAction(limit(action, 50));
        auditLog.setEntityType(limit(entityType, 80));
        auditLog.setEntityId(entityId);
        auditLog.setChangedColumn(limit(changedColumn, 240));
        // Keep enough detail for row-level appraisal edit records while still protecting older databases.
        auditLog.setOldValue(limit(oldValue, 1000));
        auditLog.setNewValue(limit(newValue, 1000));
        auditLog.setReason(limit(reason, 500));

        auditLogRepository.save(auditLog);
    }

    private String limit(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, Math.max(0, maxLength - 3)) + "...";
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getRecent(String entityType, Integer entityId) {
        return getRecent(entityType, entityId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getRecent(String entityType, Integer entityId, Integer userId) {
        if (entityType != null && entityId != null && userId != null) {
            return auditLogRepository.findTop200ByEntityTypeAndEntityIdAndUserIdOrderByTimestampDesc(
                    entityType,
                    entityId,
                    userId
            );
        }

        if (entityType != null && entityId != null) {
            return auditLogRepository.findTop200ByEntityTypeAndEntityIdOrderByTimestampDesc(entityType, entityId);
        }

        if (entityType != null && userId != null) {
            return auditLogRepository.findTop200ByEntityTypeAndUserIdOrderByTimestampDesc(entityType, userId);
        }

        if (entityType != null) {
            return auditLogRepository.findTop200ByEntityTypeOrderByTimestampDesc(entityType);
        }

        if (userId != null) {
            return auditLogRepository.findTop200ByUserIdOrderByTimestampDesc(userId);
        }

        return auditLogRepository.findTop200ByOrderByTimestampDesc();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getRecentForEntityTypes(Collection<String> entityTypes) {
        return getRecentForEntityTypes(entityTypes, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getRecentForEntityTypes(Collection<String> entityTypes, Integer userId) {
        if (entityTypes == null || entityTypes.isEmpty()) {
            return getRecent(null, null, userId);
        }

        if (userId != null) {
            return auditLogRepository.findTop200ByEntityTypeInAndUserIdOrderByTimestampDesc(entityTypes, userId);
        }

        return auditLogRepository.findTop200ByEntityTypeInOrderByTimestampDesc(entityTypes);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Integer> getEditorUserIdsForEntityTypes(Collection<String> entityTypes) {
        if (entityTypes == null || entityTypes.isEmpty()) {
            return List.of();
        }

        return auditLogRepository.findDistinctUserIdsByEntityTypeIn(entityTypes);
    }
}
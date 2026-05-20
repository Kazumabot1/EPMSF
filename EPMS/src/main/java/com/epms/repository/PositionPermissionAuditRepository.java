package com.epms.repository;

import com.epms.entity.PositionPermissionAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PositionPermissionAuditRepository extends JpaRepository<PositionPermissionAudit, Integer> {

    /** All audit rows for a position, newest first. */
    List<PositionPermissionAudit> findByPositionIdOrderByEditedAtDesc(Integer positionId);
}

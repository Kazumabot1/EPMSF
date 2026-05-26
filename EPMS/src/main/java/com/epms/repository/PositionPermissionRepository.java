package com.epms.repository;

import com.epms.entity.PositionPermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PositionPermissionRepository extends JpaRepository<PositionPermission, Long> {
    Optional<PositionPermission> findByPositionId(Integer positionId);
    boolean existsByPositionId(Integer positionId);
}
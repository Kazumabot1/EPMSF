
package com.epms.repository;

import com.epms.entity.PositionPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PositionPermissionRepository extends JpaRepository<PositionPermission, Integer> {

    Optional<PositionPermission> findByPositionId(Integer positionId);

    boolean existsByPositionId(Integer positionId);

    /** Users in a given department whose position allows being selected as Team Leader. */
    @Query("""
            SELECT pp FROM PositionPermission pp
            WHERE pp.teamAssignAsLeader = true
              AND pp.position.id IN (
                  SELECT u.position.id FROM User u
                  WHERE u.position IS NOT NULL
                    AND u.departmentId = :deptId
                    AND (u.active IS NULL OR u.active = true)
              )
            """)
    List<PositionPermission> findLeaderPermissionsByDept(@Param("deptId") Integer deptId);

    /** Users in a given department whose position allows being selected as Project Manager. */
    @Query("""
            SELECT pp FROM PositionPermission pp
            WHERE pp.teamAssignAsPm = true
              AND pp.position.id IN (
                  SELECT u.position.id FROM User u
                  WHERE u.position IS NOT NULL
                    AND u.departmentId = :deptId
                    AND (u.active IS NULL OR u.active = true)
              )
            """)
    List<PositionPermission> findPmPermissionsByDept(@Param("deptId") Integer deptId);

    /**
     * Find all position IDs (in a department) whose permission flag
     * {@code columnFlag} equals true.
     * Used for generic permission checks.
     */
    @Query("""
            SELECT u.id FROM User u
            WHERE u.position IS NOT NULL
              AND u.departmentId = :deptId
              AND (u.active IS NULL OR u.active = true)
              AND EXISTS (
                  SELECT 1 FROM PositionPermission pp
                  WHERE pp.position.id = u.position.id
                    AND pp.teamAssignAsLeader = true
              )
            """)
    List<Integer> findLeaderCandidateUserIdsByDept(@Param("deptId") Integer deptId);

    @Query("""
            SELECT u.id FROM User u
            WHERE u.position IS NOT NULL
              AND u.departmentId = :deptId
              AND (u.active IS NULL OR u.active = true)
              AND EXISTS (
                  SELECT 1 FROM PositionPermission pp
                  WHERE pp.position.id = u.position.id
                    AND pp.teamAssignAsPm = true
              )
            """)
    List<Integer> findPmCandidateUserIdsByDept(@Param("deptId") Integer deptId);

    @Query("""
            SELECT u.id FROM User u
            WHERE u.position IS NOT NULL
              AND u.departmentId = :deptId
              AND (u.active IS NULL OR u.active = true)
              AND EXISTS (
                  SELECT 1 FROM PositionPermission pp
                  WHERE pp.position.id = u.position.id
                    AND pp.teamAssignAsMember = true
              )
            """)
    List<Integer> findMemberCandidateUserIdsByDept(@Param("deptId") Integer deptId);
}
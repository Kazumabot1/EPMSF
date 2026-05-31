package com.epms.repository;

import com.epms.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    interface AuditLogEditorProjection {
        Integer getUserId();
        String getDisplayName();
        String getRoleName();
    }

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    @Query("""
            SELECT u FROM User u
            WHERE LOWER(u.email) = LOWER(:email)
              AND (u.active IS NULL OR u.active = true)
            """)
    Optional<User> findActiveByEmail(@Param("email") String email);

    Optional<User> findByEmployeeId(Integer employeeId);

    List<User> findByEmployeeIdIn(Collection<Integer> employeeIds);

    @Query("""
            SELECT u FROM User u
            WHERE u.employeeId = :employeeId
              AND (u.active IS NULL OR u.active = true)
            """)
    Optional<User> findActiveByEmployeeId(@Param("employeeId") Integer employeeId);


    @EntityGraph(attributePaths = {"position", "position.level"})
    @Query("""
            SELECT u
            FROM User u
            LEFT JOIN u.position p
            WHERE p.id = :positionId
            ORDER BY u.fullName ASC, u.email ASC, u.id ASC
            """)
    List<User> findByPositionIdForPositionDetails(@Param("positionId") Integer positionId);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);

    @Query("""
            SELECT COUNT(u)
            FROM User u
            WHERE LOWER(u.email) = LOWER(:email)
              AND (:employeeId IS NULL OR u.employeeId IS NULL OR u.employeeId <> :employeeId)
            """)
    long countByEmailIgnoreCaseForDifferentEmployee(
            @Param("email") String email,
            @Param("employeeId") Integer employeeId
    );

    long countByManagerId(Integer managerId);

    long countByDepartmentId(Integer departmentId);

    long countByActiveTrue();

    List<User> findByManagerIdAndActiveTrue(Integer managerId);

    List<User> findByDepartmentIdAndActiveTrue(Integer departmentId);


    @Query(value = """
            SELECT DISTINCT UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_'))
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE u.id = :userId
            """, nativeQuery = true)
    List<String> findNormalizedRoleNamesByUserId(@Param("userId") Integer userId);

    @Query(value = """
            SELECT DISTINCT u.*
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE (u.active IS NULL OR u.active = true)
              AND UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_')) IN (:roleNames)
            """, nativeQuery = true)
    List<User> findActiveUsersByNormalizedRoleNames(@Param("roleNames") Collection<String> roleNames);


    @Query(value = """
            SELECT DISTINCT u.*
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE u.department_id = :departmentId
              AND (u.active IS NULL OR u.active = true)
              AND UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_'))
                  IN ('DEPARTMENT_HEAD', 'DEPARTMENTHEAD', 'DEPT_HEAD', 'HEAD_OF_DEPARTMENT')
            """, nativeQuery = true)
    List<User> findActiveDepartmentHeadsByDepartmentId(@Param("departmentId") Integer departmentId);


    @Query(value = """
            SELECT DISTINCT u.*
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE u.department_id = :departmentId
              AND (u.active IS NULL OR u.active = true)
              AND UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_'))
                  IN ('MANAGER', 'PROJECT_MANAGER', 'TEAM_MANAGER')
            """, nativeQuery = true)
    List<User> findActiveManagersByDepartmentId(@Param("departmentId") Integer departmentId);

    @Query(value = """
        SELECT DISTINCT u.*
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE u.department_id = :departmentId
          AND (u.active IS NULL OR u.active = true)
          AND UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_'))
              IN ('MANAGER', 'PROJECT_MANAGER', 'PROJECTMANAGER', 'TEAM_MANAGER', 'PM')
        """, nativeQuery = true)
    List<User> findActiveFeedback360ManagersByDepartmentId(@Param("departmentId") Integer departmentId);

    @Query(value = """
        SELECT DISTINCT u.*
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE u.department_id = :departmentId
          AND (u.active IS NULL OR u.active = true)
          AND UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_'))
              IN ('DEPARTMENT_HEAD', 'DEPARTMENTHEAD', 'DEPT_HEAD', 'DEPTHEAD', 'HEAD_OF_DEPARTMENT')
        """, nativeQuery = true)
    List<User> findActiveFeedback360DepartmentHeadsByDepartmentId(@Param("departmentId") Integer departmentId);

    @Query(value = """
            SELECT
                u.id AS userId,
                COALESCE(NULLIF(u.full_name, ''), NULLIF(u.email, ''), CONCAT('User #', u.id)) AS displayName,
                CASE
                    WHEN MAX(CASE
                        WHEN UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_')) = 'ADMIN'
                        THEN 1 ELSE 0 END) = 1
                    THEN 'Admin'

                    WHEN MAX(CASE
                        WHEN UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_'))
                             IN ('HR', 'HUMAN_RESOURCE', 'HUMAN_RESOURCES', 'HR_MANAGER', 'HR_ADMIN')
                        THEN 1 ELSE 0 END) = 1
                    THEN 'HR'

                    WHEN MAX(CASE
                        WHEN UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_'))
                             IN ('DEPARTMENT_HEAD', 'DEPARTMENTHEAD', 'DEPT_HEAD', 'HEAD_OF_DEPARTMENT')
                        THEN 1 ELSE 0 END) = 1
                    THEN 'Department Head'

                    WHEN MAX(CASE
                        WHEN UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_'))
                             IN ('MANAGER', 'PROJECT_MANAGER', 'TEAM_MANAGER')
                        THEN 1 ELSE 0 END) = 1
                    THEN 'Manager'

                    WHEN MAX(CASE
                        WHEN UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_'))
                             IN ('CEO', 'EXECUTIVE')
                        THEN 1 ELSE 0 END) = 1
                    THEN 'CEO'

                    ELSE 'User'
                END AS roleName
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.id IN (:userIds)
            GROUP BY u.id, u.full_name, u.email
            ORDER BY displayName
            """, nativeQuery = true)
    List<AuditLogEditorProjection> findAuditLogEditorOptionsByUserIds(
            @Param("userIds") Collection<Integer> userIds
    );
}
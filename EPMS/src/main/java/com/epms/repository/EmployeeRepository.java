package com.epms.repository;

import com.epms.entity.Employee;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Employee repository.
 *
 * Department lookup supports both:
 * - employee_department.currentdepartment / parentdepartment
 * - users.department_id legacy/login link
 */
public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    @EntityGraph(attributePaths = {
            "employeeDepartments",
            "employeeDepartments.currentDepartment",
            "employeeDepartments.parentDepartment",
            "position",
            "position.level"
    })
    List<Employee> findAll();

    @EntityGraph(attributePaths = {
            "employeeDepartments",
            "employeeDepartments.currentDepartment",
            "employeeDepartments.parentDepartment",
            "position",
            "position.level"
    })
    @Query("SELECT e FROM Employee e WHERE e.active IS NULL OR e.active = true")
    List<Employee> findAllActiveWithDepartments();

    @EntityGraph(attributePaths = {
            "employeeDepartments",
            "employeeDepartments.currentDepartment",
            "employeeDepartments.parentDepartment",
            "position",
            "position.level"
    })
    @Query("SELECT e FROM Employee e WHERE e.id = :id")
    Optional<Employee> findWithDepartmentsById(@Param("id") Integer id);


    @EntityGraph(attributePaths = {
            "employeeDepartments",
            "employeeDepartments.currentDepartment",
            "employeeDepartments.parentDepartment",
            "position",
            "position.level"
    })
    @Query("""
       SELECT DISTINCT e
       FROM Employee e
       LEFT JOIN e.position p
       WHERE p.id = :positionId
       ORDER BY e.firstName ASC, e.lastName ASC, e.id ASC
       """)
    List<Employee> findByPositionIdForPositionDetails(@Param("positionId") Integer positionId);

    Optional<Employee> findByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Integer id);

    boolean existsByStaffNrcIgnoreCase(String staffNrc);

    boolean existsByStaffNrcIgnoreCaseAndIdNot(String staffNrc, Integer id);

    /**
     * Used by Department Head employee pages.
     *
     * Working department rule:
     * - employee_department.parentDepartment if present
     * - otherwise employee_department.currentDepartment
     * - fallback users.department_id for older/login-linked data
     */
    @EntityGraph(attributePaths = {
            "employeeDepartments",
            "employeeDepartments.currentDepartment",
            "employeeDepartments.parentDepartment",
            "position",
            "position.level"
    })
    @Query("""
       SELECT DISTINCT e
       FROM Employee e
       LEFT JOIN e.employeeDepartments ed
       LEFT JOIN ed.parentDepartment pd
       LEFT JOIN ed.currentDepartment cd
       LEFT JOIN User u ON u.employeeId = e.id
       WHERE (:includeInactive = true OR e.active IS NULL OR e.active = true)
         AND (
              (
                  ed.enddate IS NULL
                  AND COALESCE(pd.id, cd.id) = :departmentId
              )
              OR (
                  (u.active IS NULL OR u.active = true)
                  AND u.departmentId = :departmentId
              )
         )
       ORDER BY e.firstName ASC, e.lastName ASC
       """)
    List<Employee> findCurrentByWorkingDepartmentId(
            @Param("departmentId") Integer departmentId,
            @Param("includeInactive") boolean includeInactive
    );

    /**
     * Used by One-on-One employee dropdown.
     *
     * This is intentionally broader than working-department lookup because
     * old/real data may link employees through users.department_id instead of
     * only employee_department.
     *
     * It returns active employees when selected department matches:
     * - employee_department.currentdepartment
     * - employee_department.parentdepartment
     * - users.department_id
     */
    @Query("""
       SELECT DISTINCT e
       FROM Employee e
       LEFT JOIN e.employeeDepartments ed
       LEFT JOIN ed.currentDepartment cd
       LEFT JOIN ed.parentDepartment pd
       LEFT JOIN User u ON u.employeeId = e.id
       WHERE (e.active IS NULL OR e.active = true)
         AND (
              (
                  ed.enddate IS NULL
                  AND (
                      cd.id = :departmentId
                      OR pd.id = :departmentId
                  )
              )
              OR (
                  (u.active IS NULL OR u.active = true)
                  AND u.departmentId = :departmentId
              )
         )
       ORDER BY e.firstName ASC, e.lastName ASC
       """)
    List<Employee> findActiveDropdownEmployeesByDepartmentId(
            @Param("departmentId") Integer departmentId
    );
}
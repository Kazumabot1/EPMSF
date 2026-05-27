
package com.epms.repository;

import com.epms.entity.EmployeeDepartment;
import com.epms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeDepartmentRepository extends JpaRepository<EmployeeDepartment, Integer> {


    @Query("""
    SELECT ed
    FROM EmployeeDepartment ed
    LEFT JOIN FETCH ed.currentDepartment cd
    LEFT JOIN FETCH ed.parentDepartment pd
    WHERE ed.employee.id = :employeeId
    ORDER BY ed.startdate DESC, ed.id DESC
    """)
    List<EmployeeDepartment> findHistoryByEmployeeId(
            @Param("employeeId") Integer employeeId
    );


    @Query("""
        SELECT ed
        FROM EmployeeDepartment ed
        LEFT JOIN FETCH ed.currentDepartment cd
        LEFT JOIN FETCH ed.parentDepartment pd
        WHERE ed.employee.id = :employeeId
          AND ed.enddate IS NULL
        ORDER BY ed.startdate DESC, ed.id DESC
        """)
    List<EmployeeDepartment> findActiveAssignmentsForEmployeeId(
            @Param("employeeId") Integer employeeId
    );

    /*
     * Used by One-on-One employee dropdown.
     *
     * HR selects a department and expects employees to appear if that department
     * is either the employee's currentDepartment OR parentDepartment.
     */
    @Query("""
        SELECT DISTINCT ed
        FROM EmployeeDepartment ed
        JOIN FETCH ed.employee e
        LEFT JOIN FETCH e.position p
        LEFT JOIN ed.currentDepartment cd
        LEFT JOIN ed.parentDepartment pd
        WHERE ed.enddate IS NULL
          AND (e.active IS NULL OR e.active = true)
          AND (cd.id = :departmentId OR pd.id = :departmentId)
        ORDER BY e.firstName ASC, e.lastName ASC
        """)
    List<EmployeeDepartment> findActiveAssignmentsByDepartmentId(
            @Param("departmentId") Integer departmentId
    );

    /*
     * Working department rule:
     * parentDepartment if not null, otherwise currentDepartment.
     * Keep this because other modules may depend on it.
     */
    @Query("""
        SELECT DISTINCT ed
        FROM EmployeeDepartment ed
        JOIN FETCH ed.employee e
        LEFT JOIN FETCH e.position p
        LEFT JOIN ed.parentDepartment pd
        LEFT JOIN ed.currentDepartment cd
        WHERE ed.enddate IS NULL
          AND (e.active IS NULL OR e.active = true)
          AND COALESCE(pd.id, cd.id) = :departmentId
        ORDER BY e.firstName ASC, e.lastName ASC
        """)
    List<EmployeeDepartment> findActiveAssignmentsByWorkingDepartmentId(
            @Param("departmentId") Integer departmentId
    );

    @Query("""
        SELECT DISTINCT u
        FROM EmployeeDepartment ed
        JOIN ed.employee e
        JOIN User u ON u.employeeId = e.id
        LEFT JOIN ed.parentDepartment pd
        LEFT JOIN ed.currentDepartment cd
        WHERE ed.enddate IS NULL
          AND (u.active IS NULL OR u.active = true)
          AND (e.active IS NULL OR e.active = true)
          AND COALESCE(pd.id, cd.id) = :departmentId
        ORDER BY u.fullName ASC
        """)
    List<User> findActiveUsersByWorkingDepartmentId(
            @Param("departmentId") Integer departmentId
    );

    @Query("""
        SELECT CASE WHEN COUNT(ed) > 0 THEN true ELSE false END
        FROM EmployeeDepartment ed
        JOIN ed.employee e
        JOIN User u ON u.employeeId = e.id
        LEFT JOIN ed.parentDepartment pd
        LEFT JOIN ed.currentDepartment cd
        WHERE u.id = :userId
          AND ed.enddate IS NULL
          AND (u.active IS NULL OR u.active = true)
          AND (e.active IS NULL OR e.active = true)
          AND COALESCE(pd.id, cd.id) = :departmentId
        """)
    boolean existsActiveUserInWorkingDepartment(
            @Param("userId") Integer userId,
            @Param("departmentId") Integer departmentId
    );

    @Query("""
        SELECT COALESCE(pd.departmentName, cd.departmentName)
        FROM EmployeeDepartment ed
        JOIN ed.employee e
        JOIN User u ON u.employeeId = e.id
        LEFT JOIN ed.parentDepartment pd
        LEFT JOIN ed.currentDepartment cd
        WHERE u.id = :userId
          AND ed.enddate IS NULL
        ORDER BY ed.startdate DESC
        """)
    List<String> findWorkingDepartmentNamesByUserId(@Param("userId") Integer userId);

    @Query("""
        SELECT COUNT(DISTINCT e.id)
        FROM EmployeeDepartment ed
        JOIN ed.employee e
        LEFT JOIN ed.currentDepartment cd
        WHERE ed.enddate IS NULL
          AND (e.active IS NULL OR e.active = true)
          AND cd.id = :departmentId
        """)
    Long countActiveEmployeesAsCurrentDepartment(
            @Param("departmentId") Integer departmentId
    );

    @Query("""
        SELECT COUNT(DISTINCT e.id)
        FROM EmployeeDepartment ed
        JOIN ed.employee e
        LEFT JOIN ed.parentDepartment pd
        WHERE ed.enddate IS NULL
          AND (e.active IS NULL OR e.active = true)
          AND pd.id = :departmentId
        """)
    Long countActiveEmployeesAsParentDepartment(
            @Param("departmentId") Integer departmentId
    );

    @Query("""
        SELECT COUNT(DISTINCT e.id)
        FROM EmployeeDepartment ed
        JOIN ed.employee e
        LEFT JOIN ed.currentDepartment cd
        LEFT JOIN ed.parentDepartment pd
        WHERE ed.enddate IS NULL
          AND (e.active IS NULL OR e.active = true)
          AND (cd.id = :departmentId OR pd.id = :departmentId)
        """)
    Long countActiveEmployeesInCurrentOrParentDepartment(
            @Param("departmentId") Integer departmentId
    );

    @Query("""
        SELECT DISTINCT ed
        FROM EmployeeDepartment ed
        JOIN FETCH ed.employee e
        LEFT JOIN FETCH e.position p
        LEFT JOIN ed.currentDepartment cd
        LEFT JOIN ed.parentDepartment pd
        WHERE ed.enddate IS NULL
          AND (e.active IS NULL OR e.active = true)
          AND (cd.id = :departmentId OR pd.id = :departmentId)
        ORDER BY e.firstName ASC, e.lastName ASC
        """)
    List<EmployeeDepartment> findActiveAssignmentsByCurrentOrParentDepartmentId(
            @Param("departmentId") Integer departmentId
    );
}

package com.epms.repository;

import com.epms.entity.EmployeeDepartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeDepartmentRepository extends JpaRepository<EmployeeDepartment, Integer> {

    // Find all EmployeeDepartment records for a given department,
    // filtering to only include employees whose User account is active.
    @Query("""
        SELECT ed FROM EmployeeDepartment ed
        JOIN ed.employee e
        WHERE ed.department.id = :departmentId
        AND EXISTS (
            SELECT u FROM User u
            WHERE u.employeeId = e.id
            AND u.active = true
        )
    """)
    List<EmployeeDepartment> findActiveEmployeesByDepartmentId(@Param("departmentId") Integer departmentId);
}

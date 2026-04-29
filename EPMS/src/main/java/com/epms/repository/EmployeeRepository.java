package com.epms.repository;

import com.epms.entity.Employee;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
    List<Employee> findAll();

    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
    @Query("SELECT e FROM Employee e WHERE e.active IS NULL OR e.active = true")
    List<Employee> findAllActiveWithDepartments();

    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
    @Query("SELECT e FROM Employee e WHERE e.id = :id")
    Optional<Employee> findWithDepartmentsById(@Param("id") Integer id);

    Optional<Employee> findByEmail(String email);
    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
    @Query("""
       SELECT DISTINCT e FROM Employee e
       JOIN e.employeeDepartments ed
       WHERE ed.department.id = :departmentId
       AND ed.enddate IS NULL
       AND (:includeInactive = true OR e.active IS NULL OR e.active = true)
       """)
    List<Employee> findCurrentByDepartmentId(
            @Param("departmentId") Integer departmentId,
            @Param("includeInactive") boolean includeInactive
    );
}
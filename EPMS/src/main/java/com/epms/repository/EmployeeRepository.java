package com.epms.repository;

import com.epms.entity.Employee;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department"})
    List<Employee> findAll();
}
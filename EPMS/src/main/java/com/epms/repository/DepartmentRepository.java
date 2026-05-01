package com.epms.repository;

import com.epms.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {

    Optional<Department> findByDepartmentName(String departmentName);

    Optional<Department> findByDepartmentNameIgnoreCase(String departmentName);

    Optional<Department> findByDepartmentCode(String departmentCode);

    Optional<Department> findByDepartmentCodeIgnoreCase(String departmentCode);

    boolean existsByDepartmentName(String departmentName);

    boolean existsByDepartmentNameIgnoreCase(String departmentName);

    boolean existsByDepartmentCode(String departmentCode);

    boolean existsByDepartmentCodeIgnoreCase(String departmentCode);
}
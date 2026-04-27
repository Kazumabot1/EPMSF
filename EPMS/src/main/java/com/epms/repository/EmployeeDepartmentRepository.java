package com.epms.repository;

import com.epms.entity.EmployeeDepartment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeDepartmentRepository extends JpaRepository<EmployeeDepartment, Integer> {
}

package com.epms.repository;

import com.epms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailAndActiveTrue(String email);
    Optional<User> findByEmployeeId(Integer employeeId);
    boolean existsByEmailIgnoreCase(String email);

    long countByManagerId(Integer managerId);
    long countByDepartmentId(Integer departmentId);
    long countByActiveTrue();

    List<User> findByDepartmentIdAndActiveTrue(Integer departmentId);
}
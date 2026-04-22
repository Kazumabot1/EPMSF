package com.epms.repository;

import com.epms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailAndActiveTrue(String email);

    long countByManagerId(Integer managerId);
    long countByDepartmentId(Integer departmentId);
    long countByActiveTrue();
}
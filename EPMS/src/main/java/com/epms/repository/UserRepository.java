package com.epms.repository;

import com.epms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);

    @Query("""
            SELECT u FROM User u
            WHERE LOWER(u.email) = LOWER(:email)
              AND (u.active IS NULL OR u.active = true)
            """)
    Optional<User> findActiveByEmail(@Param("email") String email);

    Optional<User> findByEmployeeId(Integer employeeId);
    boolean existsByEmailIgnoreCase(String email);

    long countByManagerId(Integer managerId);
    long countByDepartmentId(Integer departmentId);
    long countByActiveTrue();

    List<User> findByDepartmentIdAndActiveTrue(Integer departmentId);
}

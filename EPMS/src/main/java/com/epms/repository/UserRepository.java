//package com.epms.repository;
//
//import com.epms.entity.User;
//import org.springframework.data.jpa.repository.JpaRepository;
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.data.repository.query.Param;
//
//import java.util.List;
//import java.util.Optional;
//
//public interface UserRepository extends JpaRepository<User, Integer> {
//    Optional<User> findByEmail(String email);
//
//    @Query("""
//            SELECT u FROM User u
//            WHERE LOWER(u.email) = LOWER(:email)
//              AND (u.active IS NULL OR u.active = true)
//            """)
//    Optional<User> findActiveByEmail(@Param("email") String email);
//
//    Optional<User> findByEmployeeId(Integer employeeId);
//    boolean existsByEmailIgnoreCase(String email);
//
//    long countByManagerId(Integer managerId);
//    long countByDepartmentId(Integer departmentId);
//    long countByActiveTrue();
//
//    List<User> findByDepartmentIdAndActiveTrue(Integer departmentId);
//}

package com.epms.repository;

import com.epms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Why this file is updated:
 * - 1:1 Meeting and PIP notifications must find the correct login account for an Employee record.
 * - findActiveByEmployeeId() avoids sending to disabled accounts or failing silently with old data.
 * - PIP employee dropdown also uses active users by department.
 */
public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);

    @Query("""
            SELECT u FROM User u
            WHERE LOWER(u.email) = LOWER(:email)
              AND (u.active IS NULL OR u.active = true)
            """)
    Optional<User> findActiveByEmail(@Param("email") String email);

    Optional<User> findByEmployeeId(Integer employeeId);

    @Query("""
            SELECT u FROM User u
            WHERE u.employeeId = :employeeId
              AND (u.active IS NULL OR u.active = true)
            """)
    Optional<User> findActiveByEmployeeId(@Param("employeeId") Integer employeeId);

    boolean existsByEmailIgnoreCase(String email);

    long countByManagerId(Integer managerId);
    long countByDepartmentId(Integer departmentId);
    long countByActiveTrue();

    List<User> findByDepartmentIdAndActiveTrue(Integer departmentId);
}
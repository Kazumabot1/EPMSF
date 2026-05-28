package com.epms.repository;

import com.epms.entity.Pip;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Why this file exists:
 * - Handles database queries for PIP.
 * - Includes active/past queries.
 * - Includes check for "only one active PIP per employee".
 * - @EntityGraph loads phases together with PIP to avoid lazy loading problems.
 */
@Repository
public interface PipRepository extends JpaRepository<Pip, Integer> {
    long count();

    boolean existsByEmployeeUserIdAndStatusTrue(Integer employeeUserId);

    @EntityGraph(attributePaths = {"phases"})
    List<Pip> findByEmployeeUserIdOrderByCreatedAtDesc(Integer employeeUserId);

    @EntityGraph(attributePaths = {"phases"})
    Optional<Pip> findById(Integer id);

    @EntityGraph(attributePaths = {"phases"})
    List<Pip> findByStatusTrueOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"phases"})
    List<Pip> findByStatusFalseOrderByEndDateDesc();

    @EntityGraph(attributePaths = {"phases"})
    List<Pip> findByEmployeeUserIdAndStatusTrueOrderByCreatedAtDesc(Integer employeeUserId);

    @EntityGraph(attributePaths = {"phases"})
    List<Pip> findByEmployeeUserIdAndStatusFalseOrderByEndDateDesc(Integer employeeUserId);

    @EntityGraph(attributePaths = {"phases"})
    List<Pip> findByCreatedByUserIdAndStatusTrueOrderByCreatedAtDesc(Integer createdByUserId);

    @EntityGraph(attributePaths = {"phases"})
    List<Pip> findByCreatedByUserIdAndStatusFalseOrderByEndDateDesc(Integer createdByUserId);
}
package com.epms.repository;

import com.epms.entity.DepartmentKpiTemplate;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentKpiTemplateRepository extends JpaRepository<DepartmentKpiTemplate, Integer> {
    Optional<DepartmentKpiTemplate> findDetailById(Integer id);

    @EntityGraph(attributePaths = {"departments", "departments.department"})
    List<DepartmentKpiTemplate> findAllByOrderByCreatedAtDesc();
}

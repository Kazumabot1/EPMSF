package com.epms.repository;

import com.epms.entity.DepartmentKpiTemplate;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DepartmentKpiTemplateRepository extends JpaRepository<DepartmentKpiTemplate, Integer> {
    @EntityGraph(attributePaths = {
            "rows", "rows.kpiCategory", "rows.kpiUnit", "rows.kpiItem",
            "departments", "departments.department",
            "createdByUser"
    })
    @Query("SELECT t FROM DepartmentKpiTemplate t WHERE t.id = :id")
    Optional<DepartmentKpiTemplate> findDetailById(@Param("id") Integer id);

    @EntityGraph(attributePaths = {
            "rows", "rows.kpiCategory", "rows.kpiUnit", "rows.kpiItem",
            "departments", "departments.department",
            "createdByUser"
    })
    List<DepartmentKpiTemplate> findAllByOrderByCreatedAtDesc();
}

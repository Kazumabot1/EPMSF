package com.epms.repository;

import com.epms.entity.DepartmentKpiCycleTemplate;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartmentKpiCycleTemplateRepository extends JpaRepository<DepartmentKpiCycleTemplate, Integer> {
    @EntityGraph(attributePaths = {"template"})
    List<DepartmentKpiCycleTemplate> findByCycle_Id(Integer cycleId);
}

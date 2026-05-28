package com.epms.repository;

import com.epms.entity.DepartmentKpiCycle;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentKpiCycleRepository extends JpaRepository<DepartmentKpiCycle, Integer> {
    @EntityGraph(attributePaths = {"cycleTemplates", "cycleTemplates.template"})
    Optional<DepartmentKpiCycle> findDetailById(Integer id);

    List<DepartmentKpiCycle> findAllByOrderByCreatedAtDesc();
}

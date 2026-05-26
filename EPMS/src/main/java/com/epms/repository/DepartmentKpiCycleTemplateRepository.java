package com.epms.repository;

import com.epms.entity.DepartmentKpiCycleTemplate;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface DepartmentKpiCycleTemplateRepository extends JpaRepository<DepartmentKpiCycleTemplate, Integer> {
    @EntityGraph(attributePaths = {"template"})
    List<DepartmentKpiCycleTemplate> findByCycle_Id(Integer cycleId);

    @Query("""
            SELECT ct FROM DepartmentKpiCycleTemplate ct
            JOIN FETCH ct.cycle c
            JOIN FETCH ct.template t
            WHERE c.status = :status
            AND (:excludeCycleId IS NULL OR c.id <> :excludeCycleId)
            AND t.id IN :templateIds
            """)
    List<DepartmentKpiCycleTemplate> findConflictingLinks(
            @Param("status") KpiTemplateCycleStatus status,
            @Param("excludeCycleId") Integer excludeCycleId,
            @Param("templateIds") Collection<Integer> templateIds
    );
}

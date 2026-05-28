package com.epms.repository;

import com.epms.dto.DepartmentKpiTemplateSummaryDto;
import com.epms.entity.DepartmentKpiResult;
import com.epms.entity.enums.DepartmentKpiResultStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DepartmentKpiResultRepository extends JpaRepository<DepartmentKpiResult, Integer> {
    boolean existsByDepartment_IdAndTemplate_IdAndCyclePeriod_Id(Integer departmentId, Integer templateId, Integer cyclePeriodId);

    @EntityGraph(attributePaths = {
            "department", "template", "cycle", "cyclePeriod",
            "scores", "scores.templateRow", "scores.templateRow.kpiItem",
            "scores.templateRow.kpiUnit", "scores.templateRow.kpiCategory"
    })
    Optional<DepartmentKpiResult> findDetailById(Integer id);

    @EntityGraph(attributePaths = {
            "department", "template", "cycle", "cyclePeriod",
            "scores", "scores.templateRow", "scores.templateRow.kpiItem",
            "scores.templateRow.kpiUnit", "scores.templateRow.kpiCategory"
    })
    @Query("""
            SELECT r FROM DepartmentKpiResult r
            WHERE r.template.id = :templateId
              AND ((:cyclePeriodId IS NULL AND r.cyclePeriod.id IS NULL) OR r.cyclePeriod.id = :cyclePeriodId)
            ORDER BY r.department.departmentName ASC
            """)
    List<DepartmentKpiResult> findByTemplateAndPeriod(@Param("templateId") Integer templateId, @Param("cyclePeriodId") Integer cyclePeriodId);

    @EntityGraph(attributePaths = {
            "department", "template", "cycle", "cyclePeriod",
            "scores", "scores.templateRow", "scores.templateRow.kpiItem",
            "scores.templateRow.kpiUnit", "scores.templateRow.kpiCategory"
    })
    List<DepartmentKpiResult> findByStatusInOrderByAssignedAtDesc(Collection<DepartmentKpiResultStatus> statuses);

    @EntityGraph(attributePaths = {
            "department", "template", "cycle", "cyclePeriod",
            "scores", "scores.templateRow", "scores.templateRow.kpiItem",
            "scores.templateRow.kpiUnit", "scores.templateRow.kpiCategory"
    })
    List<DepartmentKpiResult> findByDepartment_IdAndStatusOrderByFinalizedAtDesc(Integer departmentId, DepartmentKpiResultStatus status);

    @Query("""
            SELECT new com.epms.dto.DepartmentKpiTemplateSummaryDto(
                t.id,
                p.id,
                t.title,
                SUM(CASE WHEN r.status <> com.epms.entity.enums.DepartmentKpiResultStatus.FINALIZED THEN 1 ELSE 0 END),
                CASE WHEN p.startDate IS NOT NULL THEN p.startDate WHEN c.startDate IS NOT NULL THEN c.startDate ELSE t.startDate END,
                CASE WHEN p.endDate IS NOT NULL THEN p.endDate WHEN c.endDate IS NOT NULL THEN c.endDate ELSE t.endDate END,
                p.status
            )
            FROM DepartmentKpiResult r
            JOIN r.template t
            LEFT JOIN r.cycle c
            LEFT JOIN r.cyclePeriod p
            GROUP BY t.id, p.id, t.title, p.startDate, p.endDate, c.startDate, c.endDate, t.startDate, t.endDate, p.status
            ORDER BY t.title
            """)
    List<DepartmentKpiTemplateSummaryDto> summarizeTemplates();
}

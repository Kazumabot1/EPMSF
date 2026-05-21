package com.epms.repository;

import com.epms.entity.KpiTemplateVersionRow;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KpiTemplateVersionRowRepository extends JpaRepository<KpiTemplateVersionRow, Integer> {

    boolean existsByKpiForm_IdAndVersionNumber(Integer kpiFormId, Integer versionNumber);

    @EntityGraph(attributePaths = {"kpiForm", "kpiForm.kpiPositions", "kpiForm.kpiPositions.position", "changedByUser"})
    List<KpiTemplateVersionRow> findByKpiForm_IdOrderByVersionNumberDescChangedAtDesc(Integer kpiFormId);

    @EntityGraph(attributePaths = {"kpiForm", "kpiForm.kpiPositions", "kpiForm.kpiPositions.position", "changedByUser"})
    List<KpiTemplateVersionRow> findByKpiForm_IdAndVersionNumberOrderByIdAsc(Integer kpiFormId, Integer versionNumber);

    @EntityGraph(attributePaths = {"kpiForm", "kpiForm.kpiPositions", "kpiForm.kpiPositions.position", "changedByUser"})
    List<KpiTemplateVersionRow> findAllByOrderByChangedAtDesc();
}

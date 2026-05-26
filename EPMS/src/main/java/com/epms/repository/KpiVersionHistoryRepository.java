package com.epms.repository;

import com.epms.entity.KpiVersionHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KpiVersionHistoryRepository extends JpaRepository<KpiVersionHistory, Integer> {

    @EntityGraph(attributePaths = {
            "kpiForm",
            "kpiForm.kpiPositions",
            "kpiForm.kpiPositions.position",
            "modifiedByUser"
    })
    List<KpiVersionHistory> findByKpiForm_IdOrderByVersionNumberDescChangedAtDesc(Integer kpiFormId);

    @EntityGraph(attributePaths = {
            "kpiForm",
            "kpiForm.kpiPositions",
            "kpiForm.kpiPositions.position",
            "modifiedByUser"
    })
    List<KpiVersionHistory> findByKpiForm_IdAndVersionNumberOrderByChangedAtAsc(
            Integer kpiFormId,
            Integer versionNumber
    );

    @EntityGraph(attributePaths = {
            "kpiForm",
            "kpiForm.kpiPositions",
            "kpiForm.kpiPositions.position",
            "modifiedByUser"
    })
    List<KpiVersionHistory> findAllByOrderByChangedAtDesc();
}

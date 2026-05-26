package com.epms.repository;

import com.epms.entity.KpiTemplateCycleForm;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface KpiTemplateCycleFormRepository extends JpaRepository<KpiTemplateCycleForm, Integer> {

    @Query("""
            SELECT cf FROM KpiTemplateCycleForm cf
            JOIN FETCH cf.kpiForm f
            WHERE cf.cycle.id = :cycleId
            ORDER BY f.title ASC
            """)
    List<KpiTemplateCycleForm> findWithFormsByCycleId(@Param("cycleId") Integer cycleId);

    @Query("""
            SELECT cf FROM KpiTemplateCycleForm cf
            JOIN FETCH cf.cycle c
            JOIN FETCH cf.kpiForm f
            WHERE cf.cycle.status IN :statuses
            AND (:excludeCycleId IS NULL OR cf.cycle.id <> :excludeCycleId)
            AND cf.kpiForm.id IN :formIds
            """)
    List<KpiTemplateCycleForm> findConflictingLinks(
            @Param("statuses") Collection<KpiTemplateCycleStatus> statuses,
            @Param("excludeCycleId") Integer excludeCycleId,
            @Param("formIds") Collection<Integer> formIds
    );
}

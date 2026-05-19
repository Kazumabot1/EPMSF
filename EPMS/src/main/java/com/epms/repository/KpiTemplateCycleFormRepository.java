package com.epms.repository;

import com.epms.entity.KpiTemplateCycleForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}

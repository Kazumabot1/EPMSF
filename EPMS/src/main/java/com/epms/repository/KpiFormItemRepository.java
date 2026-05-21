package com.epms.repository;

import com.epms.entity.KpiFormItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KpiFormItemRepository extends JpaRepository<KpiFormItem, Integer> {

    @Query("""
            SELECT CASE WHEN COUNT(score) > 0 THEN true ELSE false END
            FROM EmployeeKpiScore score
            WHERE score.kpiFormItem.id = :itemId
            """)
    boolean isReferencedByEmployeeScores(@Param("itemId") Integer itemId);
}

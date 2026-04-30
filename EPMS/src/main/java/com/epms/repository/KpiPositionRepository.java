package com.epms.repository;

import com.epms.entity.KpiPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface KpiPositionRepository extends JpaRepository<KpiPosition, Integer> {

    @Query("SELECT kp FROM KpiPosition kp JOIN FETCH kp.position WHERE kp.kpiForm.id = :formId")
    List<KpiPosition> findWithPositionByKpiForm_Id(@Param("formId") Integer formId);
}

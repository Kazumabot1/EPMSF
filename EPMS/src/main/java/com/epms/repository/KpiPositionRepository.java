package com.epms.repository;

import com.epms.entity.KpiPosition;
import com.epms.entity.enums.KpiPositionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface KpiPositionRepository extends JpaRepository<KpiPosition, Integer> {

    @Query("SELECT kp FROM KpiPosition kp JOIN FETCH kp.position WHERE kp.kpiForm.id = :formId")
    List<KpiPosition> findWithPositionByKpiForm_Id(@Param("formId") Integer formId);

    boolean existsByPosition_IdAndStatus(Integer positionId, KpiPositionStatus status);

    boolean existsByPosition_IdAndStatusAndKpiForm_IdNot(
            Integer positionId,
            KpiPositionStatus status,
            Integer kpiFormId
    );

    @Query("""
            SELECT kp FROM KpiPosition kp
            JOIN FETCH kp.kpiForm
            JOIN FETCH kp.position
            WHERE kp.position.id = :positionId
            """)
    Optional<KpiPosition> findWithFormByPositionId(@Param("positionId") Integer positionId);

    @Query("""
            SELECT kp FROM KpiPosition kp
            JOIN FETCH kp.kpiForm
            JOIN FETCH kp.position
            WHERE kp.position.id = :positionId
              AND kp.kpiForm.id <> :excludeFormId
            """)
    Optional<KpiPosition> findWithFormByPositionIdExcludingForm(
            @Param("positionId") Integer positionId,
            @Param("excludeFormId") Integer excludeFormId
    );

    @Query("""
            SELECT kp FROM KpiPosition kp JOIN FETCH kp.kpiForm
            WHERE kp.position.id = :positionId
              AND kp.status = com.epms.entity.enums.KpiPositionStatus.ACTIVE
            """)
    Optional<KpiPosition> findActiveWithFormByPositionId(@Param("positionId") Integer positionId);

    @Query("""
            SELECT kp FROM KpiPosition kp JOIN FETCH kp.kpiForm
            WHERE kp.position.id = :positionId
              AND kp.status = com.epms.entity.enums.KpiPositionStatus.ACTIVE
              AND kp.kpiForm.id <> :excludeFormId
            """)
    Optional<KpiPosition> findActiveWithFormByPositionIdExcludingForm(
            @Param("positionId") Integer positionId,
            @Param("excludeFormId") Integer excludeFormId
    );

    /**
     * Positions that already have a KPI template link (one row per position; any link status).
     */
    @Query("""
            SELECT kp.position.id FROM KpiPosition kp
            WHERE (:excludeFormId IS NULL OR kp.kpiForm.id <> :excludeFormId)
            """)
    List<Integer> findAssignedPositionIds(@Param("excludeFormId") Integer excludeFormId);

    /**
     * KPI template ↔ position links for UI lists.
     */
    @Query("""
            SELECT kp FROM KpiPosition kp
            JOIN FETCH kp.kpiForm
            JOIN FETCH kp.position
            WHERE (:excludeFormId IS NULL OR kp.kpiForm.id <> :excludeFormId)
            ORDER BY kp.position.positionTitle ASC
            """)
    List<KpiPosition> findActiveAssignments(@Param("excludeFormId") Integer excludeFormId);
}

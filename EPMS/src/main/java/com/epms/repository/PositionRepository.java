package com.epms.repository;

import com.epms.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PositionRepository extends JpaRepository<Position, Integer> {
    Optional<Position> findByPositionTitleIgnoreCase(String positionTitle);

    /**
     * Positions with no active row in {@code kpi_positions}, optionally ignoring one form when editing.
     * Must stay aligned with {@link com.epms.repository.KpiPositionRepository#findActiveWithFormByPositionId}.
     */
    @Query("""
            SELECT DISTINCT p FROM Position p
            JOIN FETCH p.level
            WHERE NOT EXISTS (
                SELECT 1 FROM KpiPosition kp
                WHERE kp.position.id = p.id
                  AND (:excludeFormId IS NULL OR kp.kpiForm.id <> :excludeFormId)
            )
            ORDER BY p.positionTitle ASC
            """)
    List<Position> findAvailableForKpiTemplate(@Param("excludeFormId") Integer excludeFormId);
}

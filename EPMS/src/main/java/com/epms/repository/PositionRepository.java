package com.epms.repository;

import com.epms.entity.Position;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PositionRepository extends JpaRepository<Position, Integer> {

    @Override
    @EntityGraph(attributePaths = {"level", "role"})
    List<Position> findAll();

    @EntityGraph(attributePaths = {"level", "role"})
    List<Position> findAllByOrderByPositionTitleAsc();

    @Override
    @EntityGraph(attributePaths = {"level", "role"})
    Optional<Position> findById(Integer id);

    Optional<Position> findByPositionTitleIgnoreCase(String positionTitle);

    boolean existsByPositionTitleIgnoreCase(String positionTitle);

    /*
     * Used by KPI Template Create/Edit:
     *
     * Do NOT use native SQL here.
     * Do NOT check kp.status here.
     *
     * Why:
     * - Your merged DB may not have the same kpi_positions.status schema yet.
     * - The old working KPI logic only needs to exclude positions already linked
     *   to a non-archived KPI template.
     * - When editing, the current template's own positions must stay selectable.
     */
    @Query("""
            SELECT p
            FROM Position p
            WHERE (p.status IS NULL OR p.status = true)
              AND NOT EXISTS (
                  SELECT kp.id
                  FROM KpiPosition kp
                  WHERE kp.position.id = p.id
                    AND (:templateId IS NULL OR kp.kpiForm.id <> :templateId)
                    AND kp.kpiForm.status <> com.epms.entity.enums.KpiFormStatus.ARCHIVED
              )
            ORDER BY p.positionTitle ASC
            """)
    List<Position> findAvailableForKpiTemplate(@Param("templateId") Integer templateId);
}
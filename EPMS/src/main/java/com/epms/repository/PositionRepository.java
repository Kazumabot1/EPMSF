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

    @Query(
            value = """
                    SELECT p.*
                    FROM positions p
                    WHERE (p.status IS NULL OR p.status = 1)
                      AND NOT EXISTS (
                          SELECT 1
                          FROM kpi_positions kp
                          WHERE kp.position_id = p.id
                            AND kp.status = 'ACTIVE'
                            AND (:templateId IS NULL OR kp.kpi_form_id <> :templateId)
                      )
                    ORDER BY p.position_title ASC
                    """,
            nativeQuery = true
    )
    List<Position> findAvailableForKpiTemplate(@Param("templateId") Integer templateId);
}
package com.epms.repository;

import com.epms.entity.KpiForm;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KpiFormRepository extends JpaRepository<KpiForm, Integer> {

    @EntityGraph(attributePaths = {
            "items",
            "items.kpiCategory",
            "items.kpiUnit",
            "items.kpiItem"
    })
    Optional<KpiForm> findDetailWithItemsById(Integer id);

    @EntityGraph(attributePaths = {
            "createdByUser",
            "updatedByUser",
            "kpiPositions",
            "kpiPositions.position"
    })
    List<KpiForm> findAllByOrderByCreatedAtDesc();

    List<KpiForm> findTop5ByOrderByCreatedAtDesc();

    long countByCreatedByUser_Id(Integer userId);
}

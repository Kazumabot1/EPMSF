package com.epms.repository;

import com.epms.entity.KpiItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KpiItemRepository extends JpaRepository<KpiItem, Integer> {

    @EntityGraph(attributePaths = "kpiCategory")
    List<KpiItem> findAllBy();

    @EntityGraph(attributePaths = "kpiCategory")
    Optional<KpiItem> findWithKpiCategoryById(Integer id);
}

package com.epms.repository;

import com.epms.entity.Kpi;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KpiRepository extends JpaRepository<Kpi, Integer> {

    boolean existsByTitle(String title);

    @EntityGraph(attributePaths = {"kpiUnit", "kpiCategory", "kpiItem"})
    List<Kpi> findByKpiCategoryId(Integer categoryId);

    @EntityGraph(attributePaths = {"kpiUnit", "kpiCategory", "kpiItem"})
    List<Kpi> findByKpiItemId(Integer itemId);

    @EntityGraph(attributePaths = {"kpiUnit", "kpiCategory", "kpiItem"})
    List<Kpi> findAllBy();

    @EntityGraph(attributePaths = {"kpiUnit", "kpiCategory", "kpiItem"})
    Optional<Kpi> findWithRelationsById(Integer id);

    long countByCreatedByUser_Id(Integer userId);
    long count();
}
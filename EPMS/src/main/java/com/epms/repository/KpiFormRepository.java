package com.epms.repository;

import com.epms.entity.KpiForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface KpiFormRepository extends JpaRepository<KpiForm, Integer> {

    @Query(
            "SELECT DISTINCT f FROM KpiForm f "
                    + "LEFT JOIN FETCH f.items i "
                    + "LEFT JOIN FETCH i.kpiCategory "
                    + "LEFT JOIN FETCH i.kpiUnit "
                    + "LEFT JOIN FETCH i.kpiItem "
                    + "WHERE f.id = :id"
    )
    Optional<KpiForm> findDetailWithItemsById(@Param("id") Integer id);

    List<KpiForm> findAllByOrderByCreatedAtDesc();

    List<KpiForm> findTop5ByOrderByCreatedAtDesc();

    long countByCreatedByUser_Id(Integer userId);
}

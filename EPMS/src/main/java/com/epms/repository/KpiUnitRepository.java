package com.epms.repository;

import com.epms.entity.KpiUnit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KpiUnitRepository extends JpaRepository<KpiUnit, Integer> {

    boolean existsByName(String name);

    Optional<KpiUnit> findByName(String name);
}

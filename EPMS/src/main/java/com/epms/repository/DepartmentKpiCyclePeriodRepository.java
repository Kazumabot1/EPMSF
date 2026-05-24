package com.epms.repository;

import com.epms.entity.DepartmentKpiCyclePeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DepartmentKpiCyclePeriodRepository extends JpaRepository<DepartmentKpiCyclePeriod, Integer> {
    Optional<DepartmentKpiCyclePeriod> findTopByCycle_IdOrderByPeriodNumberDesc(Integer cycleId);
}

package com.epms.repository;

import com.epms.entity.AppraisalCycleEmployee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppraisalCycleEmployeeRepository extends JpaRepository<AppraisalCycleEmployee, Integer> {
    Optional<AppraisalCycleEmployee> findByCycleIdAndEmployeeId(Integer cycleId, Integer employeeId);
}

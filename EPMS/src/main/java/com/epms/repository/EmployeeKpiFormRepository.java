package com.epms.repository;

import com.epms.entity.EmployeeKpiForm;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeKpiFormRepository extends JpaRepository<EmployeeKpiForm, Integer> {

    long countByKpiForm_Id(Integer kpiFormId);
}

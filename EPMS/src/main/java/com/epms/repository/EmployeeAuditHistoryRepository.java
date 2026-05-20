package com.epms.repository;

import com.epms.entity.EmployeeAuditHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeAuditHistoryRepository extends JpaRepository<EmployeeAuditHistory, Integer> {

    List<EmployeeAuditHistory> findByEmployeeIdOrderByEditedAtDesc(Integer employeeId);
}

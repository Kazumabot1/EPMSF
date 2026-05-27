package com.epms.repository;

import com.epms.entity.EmployeeChangeRequestAudit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeChangeRequestAuditRepository extends JpaRepository<EmployeeChangeRequestAudit, Long> {

    @EntityGraph(attributePaths = {
            "request",
            "performedByUser"
    })
    List<EmployeeChangeRequestAudit> findByRequestIdOrderByPerformedAtDesc(Long requestId);
}
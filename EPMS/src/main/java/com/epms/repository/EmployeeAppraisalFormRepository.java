package com.epms.repository;

import com.epms.entity.EmployeeAppraisalForm;
import com.epms.entity.enums.EmployeeAppraisalStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Collection;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeAppraisalFormRepository extends JpaRepository<EmployeeAppraisalForm, Integer> {

    Optional<EmployeeAppraisalForm> findByCycleIdAndEmployeeId(Integer cycleId, Integer employeeId);

    boolean existsByCycleIdAndEmployeeId(Integer cycleId, Integer employeeId);

    boolean existsByEmployeeIdAndStatusIn(
            Integer employeeId,
            Collection<EmployeeAppraisalStatus> statuses
    );

    List<EmployeeAppraisalForm> findByCycleId(Integer cycleId);

    List<EmployeeAppraisalForm> findByStatus(EmployeeAppraisalStatus status);

    List<EmployeeAppraisalForm> findByStatusOrderByHrApprovedAtDesc(EmployeeAppraisalStatus status);

    List<EmployeeAppraisalForm> findByDepartmentIdAndStatus(Integer departmentId, EmployeeAppraisalStatus status);

    List<EmployeeAppraisalForm> findByProjectManagerIdOrderByUpdatedAtDesc(Integer projectManagerId);

    List<EmployeeAppraisalForm> findByProjectManagerIdAndStatusNotOrderByUpdatedAtDesc(Integer projectManagerId, EmployeeAppraisalStatus status);

    List<EmployeeAppraisalForm> findByDepartmentHeadIdOrderByUpdatedAtDesc(Integer departmentHeadId);

    List<EmployeeAppraisalForm> findByEmployeeIdAndVisibleToEmployeeTrueOrderByHrApprovedAtDesc(Integer employeeId);

    @EntityGraph(attributePaths = {"cycle", "cycle.template", "employee", "department", "projectManager", "departmentHead"})
    @Query("SELECT f FROM EmployeeAppraisalForm f WHERE f.id = :formId")
    Optional<EmployeeAppraisalForm> findWithHeaderById(@Param("formId") Integer formId);

    @Query("""
        SELECT f
        FROM EmployeeAppraisalForm f
        WHERE f.cycle.id = :cycleId
          AND f.department.id = :departmentId
          AND f.status IN :statuses
        ORDER BY f.updatedAt DESC
        """)
    List<EmployeeAppraisalForm> findDepartmentQueue(
            @Param("cycleId") Integer cycleId,
            @Param("departmentId") Integer departmentId,
            @Param("statuses") List<EmployeeAppraisalStatus> statuses
    );
}

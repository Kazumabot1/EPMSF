package com.epms.repository;

import com.epms.dto.ManagerKpiTemplateSummaryDto;
import com.epms.entity.EmployeeKpiForm;
import com.epms.entity.enums.EmployeeKpiStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeKpiFormRepository extends JpaRepository<EmployeeKpiForm, Integer> {

    long countByKpiForm_Id(Integer kpiFormId);

    Optional<EmployeeKpiForm> findByEmployee_IdAndKpiForm_Id(Integer employeeId, Integer kpiFormId);

    Optional<EmployeeKpiForm> findByEmployee_IdAndKpiForm_IdAndKpiTemplateCycle_Id(
            Integer employeeId,
            Integer kpiFormId,
            Integer kpiTemplateCycleId
    );

    @EntityGraph(attributePaths = {"kpiForm", "kpiTemplateCycle", "scores", "scores.kpiFormItem", "scores.kpiFormItem.kpiUnit"})
    @Query("SELECT ekf FROM EmployeeKpiForm ekf WHERE ekf.employee.id = :employeeId AND ekf.status = :status")
    List<EmployeeKpiForm> findDetailedByEmployeeAndStatus(
            @Param("employeeId") Integer employeeId,
            @Param("status") EmployeeKpiStatus status
    );

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "kpiTemplateCycle",
            "scores",
            "scores.kpiFormItem",
            "scores.kpiFormItem.kpiUnit"
    })
    @Query("SELECT ekf FROM EmployeeKpiForm ekf WHERE ekf.kpiForm.id = :kpiFormId AND ekf.employee.id IN :employeeIds")
    List<EmployeeKpiForm> findByKpiFormIdAndEmployeeIdIn(
            @Param("kpiFormId") Integer kpiFormId,
            @Param("employeeIds") Collection<Integer> employeeIds
    );

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "kpiForm",
            "kpiTemplateCycle",
            "scores",
            "scores.kpiFormItem",
            "scores.kpiFormItem.kpiUnit"
    })
    @Query(
            """
                    SELECT ekf FROM EmployeeKpiForm ekf
                    WHERE ekf.employee.id IN :employeeIds
                    AND ekf.status = :status
                    ORDER BY ekf.finalizedAt DESC, ekf.id DESC
                    """
    )
    List<EmployeeKpiForm> findByEmployeeIdInAndStatusWithDetail(
            @Param("employeeIds") Collection<Integer> employeeIds,
            @Param("status") EmployeeKpiStatus status
    );

    @Query(
            """
                    SELECT DISTINCT ekf FROM EmployeeKpiForm ekf
                    JOIN FETCH ekf.employee emp
                    JOIN FETCH ekf.kpiForm kf
                    LEFT JOIN FETCH ekf.kpiTemplateCycle kc
                    JOIN FETCH ekf.scores sc
                    JOIN FETCH sc.kpiFormItem item
                    LEFT JOIN FETCH item.kpiUnit
                    WHERE ekf.id = :id
                    """
    )
    Optional<EmployeeKpiForm> findWithScoresForUpdate(@Param("id") Integer id);

    @Query(
            """
                    SELECT new com.epms.dto.ManagerKpiTemplateSummaryDto(
                        kf.id,
                        kf.title,
                        SUM(CASE WHEN ekf.status <> com.epms.entity.enums.EmployeeKpiStatus.FINALIZED THEN 1 ELSE 0 END),
                        CASE WHEN kc.startDate IS NOT NULL THEN kc.startDate ELSE kf.startDate END,
                        CASE WHEN kc.endDate IS NOT NULL THEN kc.endDate ELSE kf.endDate END
                    )
                    FROM EmployeeKpiForm ekf
                    JOIN ekf.kpiForm kf
                    LEFT JOIN ekf.kpiTemplateCycle kc
                    WHERE ekf.employee.id IN :employeeIds
                    GROUP BY kf.id, kf.title, kc.startDate, kc.endDate, kf.startDate, kf.endDate
                    ORDER BY kf.title
                    """
    )
    List<ManagerKpiTemplateSummaryDto> summarizeByDepartmentEmployees(@Param("employeeIds") Collection<Integer> employeeIds);

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "employee.employeeDepartments",
            "employee.employeeDepartments.currentDepartment",
            "employee.employeeDepartments.parentDepartment",
            "kpiForm",
            "kpiTemplateCycle",
            "scores",
            "scores.kpiFormItem",
            "scores.kpiFormItem.kpiUnit"
    })
    @Query("SELECT ekf FROM EmployeeKpiForm ekf WHERE ekf.status = :status ORDER BY ekf.finalizedAt DESC, ekf.id DESC")
    List<EmployeeKpiForm> findAllByStatusWithDetail(@Param("status") EmployeeKpiStatus status);

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "employee.employeeDepartments",
            "employee.employeeDepartments.currentDepartment",
            "employee.employeeDepartments.parentDepartment",
            "kpiForm",
            "kpiTemplateCycle",
            "scores",
            "scores.kpiFormItem",
            "scores.kpiFormItem.kpiUnit"
    })
    @Query("SELECT ekf FROM EmployeeKpiForm ekf WHERE ekf.status IN :statuses ORDER BY ekf.kpiForm.title ASC, ekf.id ASC")
    List<EmployeeKpiForm> findAllWithDetailByStatusIn(@Param("statuses") Collection<EmployeeKpiStatus> statuses);

    @Query(
            """
                    SELECT DISTINCT ekf FROM EmployeeKpiForm ekf
                    JOIN FETCH ekf.kpiForm kf
                    LEFT JOIN FETCH ekf.kpiTemplateCycle kc
                    JOIN FETCH ekf.scores sc
                    JOIN FETCH sc.kpiFormItem item
                    LEFT JOIN FETCH item.kpiUnit
                    WHERE ekf.status <> :finalizedStatus
                    AND (
                        (kc.id IS NOT NULL AND kc.endDate <= :today)
                        OR (kc.id IS NULL AND kf.endDate <= :today)
                    )
                    """
    )
    List<EmployeeKpiForm> findNonFinalizedPastPeriodEnd(@Param("today") LocalDate today, @Param("finalizedStatus") EmployeeKpiStatus finalizedStatus);
}

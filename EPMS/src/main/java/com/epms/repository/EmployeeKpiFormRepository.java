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

    @Query("SELECT DISTINCT ekf.employee.id FROM EmployeeKpiForm ekf WHERE ekf.employee.id IS NOT NULL")
    List<Integer> findDistinctEmployeeIdsWithAssignments();

    long countByKpiForm_Id(Integer kpiFormId);

    Optional<EmployeeKpiForm> findByEmployee_IdAndKpiForm_Id(Integer employeeId, Integer kpiFormId);

    Optional<EmployeeKpiForm> findByEmployee_IdAndKpiForm_IdAndKpiTemplateCycle_Id(
            Integer employeeId,
            Integer kpiFormId,
            Integer kpiTemplateCycleId
    );

    Optional<EmployeeKpiForm> findByEmployee_IdAndKpiForm_IdAndCyclePeriod_Id(
            Integer employeeId,
            Integer kpiFormId,
            Integer cyclePeriodId
    );

    boolean existsByCyclePeriod_Id(Integer cyclePeriodId);

    @EntityGraph(attributePaths = {"kpiForm", "kpiTemplateCycle", "cyclePeriod", "scores", "scores.kpiFormItem", "scores.kpiFormItem.kpiUnit"})
    @Query("SELECT ekf FROM EmployeeKpiForm ekf WHERE ekf.employee.id = :employeeId AND ekf.status = :status")
    List<EmployeeKpiForm> findDetailedByEmployeeAndStatus(
            @Param("employeeId") Integer employeeId,
            @Param("status") EmployeeKpiStatus status
    );

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "employee.employeeDepartments",
            "employee.employeeDepartments.currentDepartment",
            "employee.employeeDepartments.parentDepartment",
            "kpiForm",
            "kpiTemplateCycle",
            "cyclePeriod",
            "scores",
            "scores.kpiFormItem",
            "scores.kpiFormItem.kpiUnit"
    })
    @Query("""
        SELECT DISTINCT ekf
        FROM EmployeeKpiForm ekf
        WHERE ekf.employee.id = :employeeId
        ORDER BY ekf.assignedAt DESC, ekf.id DESC
        """)
    List<EmployeeKpiForm> findRecentByEmployeeIdWithDetail(@Param("employeeId") Integer employeeId);

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "kpiTemplateCycle",
            "cyclePeriod",
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
            "kpiTemplateCycle",
            "cyclePeriod",
            "scores",
            "scores.kpiFormItem",
            "scores.kpiFormItem.kpiUnit"
    })
    @Query(
            """
                    SELECT ekf FROM EmployeeKpiForm ekf
                    WHERE ekf.kpiForm.id = :kpiFormId
                    AND ekf.employee.id IN :employeeIds
                    AND (
                        (:cyclePeriodId IS NULL AND ekf.cyclePeriod.id IS NULL)
                        OR ekf.cyclePeriod.id = :cyclePeriodId
                    )
                    """
    )
    List<EmployeeKpiForm> findByKpiFormIdAndCyclePeriodIdAndEmployeeIdIn(
            @Param("kpiFormId") Integer kpiFormId,
            @Param("cyclePeriodId") Integer cyclePeriodId,
            @Param("employeeIds") Collection<Integer> employeeIds
    );

    @Query(
            """
                    SELECT DISTINCT ekf FROM EmployeeKpiForm ekf
                    LEFT JOIN FETCH ekf.scores sc
                    LEFT JOIN FETCH sc.kpiFormItem
                    WHERE ekf.kpiForm.id = :kpiFormId
                    AND ekf.status <> :finalizedStatus
                    """
    )
    List<EmployeeKpiForm> findNonFinalizedByKpiFormIdWithScores(
            @Param("kpiFormId") Integer kpiFormId,
            @Param("finalizedStatus") EmployeeKpiStatus finalizedStatus
    );

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "employee.employeeDepartments",
            "employee.employeeDepartments.currentDepartment",
            "employee.employeeDepartments.parentDepartment",
            "kpiForm",
            "kpiTemplateCycle",
            "cyclePeriod",
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

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "employee.employeeDepartments",
            "employee.employeeDepartments.currentDepartment",
            "employee.employeeDepartments.parentDepartment",
            "kpiForm",
            "kpiTemplateCycle",
            "cyclePeriod",
            "scores",
            "scores.kpiFormItem",
            "scores.kpiFormItem.kpiUnit"
    })
    @Query(
            """
                    SELECT DISTINCT ekf FROM EmployeeKpiForm ekf
                    WHERE ekf.employee.id IN :employeeIds
                    AND ekf.status IN :statuses
                    ORDER BY ekf.finalizedAt DESC, ekf.id DESC
                    """
    )
    List<EmployeeKpiForm> findByEmployeeIdInAndStatusInWithDetail(
            @Param("employeeIds") Collection<Integer> employeeIds,
            @Param("statuses") Collection<EmployeeKpiStatus> statuses
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
                        cp.id,
                        kf.title,
                        SUM(CASE WHEN ekf.status NOT IN (com.epms.entity.enums.EmployeeKpiStatus.FINALIZED, com.epms.entity.enums.EmployeeKpiStatus.CLOSED) THEN 1 ELSE 0 END),
                        CASE WHEN cp.startDate IS NOT NULL THEN cp.startDate WHEN kc.startDate IS NOT NULL THEN kc.startDate ELSE kf.startDate END,
                        CASE WHEN cp.endDate IS NOT NULL THEN cp.endDate WHEN kc.endDate IS NOT NULL THEN kc.endDate ELSE kf.endDate END,
                        cp.status,
                        COALESCE(MAX(ekf.graceEndsAt), cp.graceEndsAt)
                    )
                    FROM EmployeeKpiForm ekf
                    JOIN ekf.kpiForm kf
                    LEFT JOIN ekf.kpiTemplateCycle kc
                    LEFT JOIN ekf.cyclePeriod cp
                    WHERE ekf.employee.id IN :employeeIds
                    GROUP BY kf.id, cp.id, kf.title, cp.startDate, cp.endDate, kc.startDate, kc.endDate, kf.startDate, kf.endDate, cp.status, cp.graceEndsAt
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
            "cyclePeriod",
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
            "cyclePeriod",
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
                    LEFT JOIN FETCH ekf.cyclePeriod cp
                    JOIN FETCH ekf.scores sc
                    JOIN FETCH sc.kpiFormItem item
                    LEFT JOIN FETCH item.kpiUnit
                    WHERE ekf.status <> :finalizedStatus
                    AND (
                        (kc.id IS NOT NULL AND kc.endDate <= :today)
                        OR (cp.id IS NOT NULL AND cp.endDate <= :today)
                        OR (kc.id IS NULL AND kf.endDate <= :today)
                    )
                    """
    )
    List<EmployeeKpiForm> findNonFinalizedPastPeriodEnd(@Param("today") LocalDate today, @Param("finalizedStatus") EmployeeKpiStatus finalizedStatus);

    @Query(
            """
                    SELECT DISTINCT ekf FROM EmployeeKpiForm ekf
                    JOIN FETCH ekf.employee emp
                    JOIN FETCH ekf.kpiForm kf
                    LEFT JOIN FETCH ekf.kpiTemplateCycle kc
                    LEFT JOIN FETCH ekf.cyclePeriod cp
                    LEFT JOIN FETCH ekf.scores sc
                    LEFT JOIN FETCH sc.kpiFormItem item
                    LEFT JOIN FETCH item.kpiUnit
                    WHERE ekf.cyclePeriod.id = :cyclePeriodId
                    AND ekf.status NOT IN :closedStatuses
                    """
    )
    List<EmployeeKpiForm> findOpenByCyclePeriodIdWithDetail(
            @Param("cyclePeriodId") Integer cyclePeriodId,
            @Param("closedStatuses") Collection<EmployeeKpiStatus> closedStatuses
    );

    @Query(
            """
                    SELECT DISTINCT ekf FROM EmployeeKpiForm ekf
                    JOIN FETCH ekf.employee emp
                    JOIN FETCH ekf.kpiForm kf
                    LEFT JOIN FETCH ekf.kpiTemplateCycle kc
                    LEFT JOIN FETCH ekf.cyclePeriod cp
                    LEFT JOIN FETCH ekf.scores sc
                    LEFT JOIN FETCH sc.kpiFormItem item
                    LEFT JOIN FETCH item.kpiUnit
                    WHERE ekf.employee.id = :employeeId
                    AND ekf.status NOT IN :closedStatuses
                    ORDER BY ekf.assignedAt DESC
                    """
    )
    List<EmployeeKpiForm> findOpenByEmployeeIdWithDetail(
            @Param("employeeId") Integer employeeId,
            @Param("closedStatuses") Collection<EmployeeKpiStatus> closedStatuses
    );
}

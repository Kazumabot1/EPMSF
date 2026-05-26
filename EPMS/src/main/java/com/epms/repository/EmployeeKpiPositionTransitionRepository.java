package com.epms.repository;

import com.epms.entity.EmployeeKpiPositionTransition;
import com.epms.entity.enums.KpiPositionTransitionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface EmployeeKpiPositionTransitionRepository extends JpaRepository<EmployeeKpiPositionTransition, Integer> {

    boolean existsByEmployee_IdAndStatus(Integer employeeId, KpiPositionTransitionStatus status);

    List<EmployeeKpiPositionTransition> findByEmployee_IdAndStatus(Integer employeeId, KpiPositionTransitionStatus status);

    @Query(
            """
                    SELECT t FROM EmployeeKpiPositionTransition t
                    JOIN FETCH t.employee e
                    LEFT JOIN FETCH t.oldPosition
                    LEFT JOIN FETCH t.newPosition
                    LEFT JOIN FETCH t.oldEmployeeKpiForm oldForm
                    WHERE t.status = :status
                    AND t.graceEndsAt <= :now
                    """
    )
    List<EmployeeKpiPositionTransition> findDueTransitions(
            @Param("status") KpiPositionTransitionStatus status,
            @Param("now") LocalDateTime now
    );

    @Query(
            """
                    SELECT t FROM EmployeeKpiPositionTransition t
                    JOIN FETCH t.employee e
                    LEFT JOIN FETCH t.oldPosition
                    LEFT JOIN FETCH t.newPosition
                    LEFT JOIN FETCH t.oldEmployeeKpiForm oldForm
                    WHERE t.oldEmployeeKpiForm.id IN :assignmentIds
                    AND t.status = :status
                    """
    )
    List<EmployeeKpiPositionTransition> findByOldEmployeeKpiFormIdsAndStatus(
            @Param("assignmentIds") Collection<Integer> assignmentIds,
            @Param("status") KpiPositionTransitionStatus status
    );
}

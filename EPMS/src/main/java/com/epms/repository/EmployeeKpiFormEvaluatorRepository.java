package com.epms.repository;

import com.epms.entity.EmployeeKpiForm;
import com.epms.entity.EmployeeKpiFormEvaluator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface EmployeeKpiFormEvaluatorRepository extends JpaRepository<EmployeeKpiFormEvaluator, Integer> {

    boolean existsByEmployeeKpiForm_IdAndEvaluatorUser_Id(Integer employeeKpiFormId, Integer evaluatorUserId);

    @Query(
            """
                    SELECT DISTINCT e.employeeKpiForm.employee.id
                    FROM EmployeeKpiFormEvaluator e
                    WHERE e.evaluatorUser.id = :evaluatorUserId
                    """
    )
    List<Integer> findEmployeeIdsByEvaluatorUserId(@Param("evaluatorUserId") Integer evaluatorUserId);

    @Query(
            """
                    SELECT DISTINCT e.evaluatorUser.id
                    FROM EmployeeKpiFormEvaluator e
                    WHERE e.employeeKpiForm.id IN :employeeKpiFormIds
                    """
    )
    List<Integer> findEvaluatorUserIdsByEmployeeKpiFormIdIn(@Param("employeeKpiFormIds") Collection<Integer> employeeKpiFormIds);

    @Query(
            """
                    SELECT DISTINCT e.evaluatorUser.id
                    FROM EmployeeKpiFormEvaluator e
                    WHERE e.employeeKpiForm.id = :employeeKpiFormId
                    """
    )
    List<Integer> findEvaluatorUserIdsByEmployeeKpiFormId(@Param("employeeKpiFormId") Integer employeeKpiFormId);
}

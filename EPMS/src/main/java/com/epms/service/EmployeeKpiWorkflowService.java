package com.epms.service;

import com.epms.dto.AssignKpiEvaluatorRequest;
import com.epms.dto.EmployeeKpiResultDto;
import com.epms.dto.FinalizeEmployeeKpiRequest;
import com.epms.dto.HrEmployeeKpiRowDto;
import com.epms.dto.KpiCycleActivationReadinessDto;
import com.epms.dto.ManagerKpiAssignmentDto;
import com.epms.dto.ManagerKpiTemplateSummaryDto;
import com.epms.dto.UpdateEmployeeKpiScoresRequest;
import com.epms.dto.UseKpiDepartmentRequest;
import com.epms.dto.UseKpiTemplateResultDto;

import java.time.LocalDateTime;
import java.util.List;

public interface EmployeeKpiWorkflowService {

    UseKpiTemplateResultDto useTemplateForDepartment(Integer kpiFormId, UseKpiDepartmentRequest request);

    UseKpiTemplateResultDto useCycleForAllActiveDepartments(Integer cycleId);

    UseKpiTemplateResultDto useCyclePeriodForAllActiveDepartments(Integer cycleId, Integer cyclePeriodId);

    List<ManagerKpiTemplateSummaryDto> listKpiTemplatesForManagerDepartment();

    default List<ManagerKpiAssignmentDto> listDepartmentAssignmentsForManager(Integer kpiFormId) {
        return listDepartmentAssignmentsForManager(kpiFormId, null);
    }

    List<ManagerKpiAssignmentDto> listDepartmentAssignmentsForManager(Integer kpiFormId, Integer cyclePeriodId);

    List<ManagerKpiAssignmentDto> listFinalizedHistoryForManagerDepartment();

    ManagerKpiAssignmentDto updateScores(Integer employeeKpiFormId, UpdateEmployeeKpiScoresRequest request);

    default UseKpiTemplateResultDto finalizeDepartmentKpi(Integer kpiFormId) {
        return finalizeDepartmentKpi(kpiFormId, null);
    }

    UseKpiTemplateResultDto finalizeDepartmentKpi(Integer kpiFormId, Integer cyclePeriodId);

    ManagerKpiAssignmentDto finalizeEmployeeKpi(Integer employeeKpiFormId, FinalizeEmployeeKpiRequest request);

    List<EmployeeKpiResultDto> listFinalizedForCurrentEmployee();

    /**
     * Finalizes employee KPI assignments whose template period has ended and every line is scored.
     *
     * @return number of assignments newly finalized in this run
     */
    int runAutoFinalizePastDueAssignments();

    int runCycleMaintenance();

    void startCycleClosingGrace(Integer cycleId);

    void startCycleClosingGrace(Integer cycleId, LocalDateTime graceEndsAt);

    void handleEmployeePositionChanged(Integer employeeId, Integer oldPositionId, Integer newPositionId);

    List<HrEmployeeKpiRowDto> listFinalizedForHr();

    /** Assigned / in-progress KPI forms (scores as entered by managers; not yet finalized). */
    List<HrEmployeeKpiRowDto> listInProgressForHr();

    KpiCycleActivationReadinessDto buildCycleActivationReadiness(Integer cycleId);

    void assignManualEvaluator(Integer employeeKpiFormId, AssignKpiEvaluatorRequest request);
}

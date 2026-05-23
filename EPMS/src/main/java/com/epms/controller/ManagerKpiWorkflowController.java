package com.epms.controller;

import com.epms.dto.*;
import com.epms.service.EmployeeKpiWorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/manager/kpi-workflow", "/api/kpi-workflow"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize(
        "hasRole('MANAGER') "
                + "or hasAuthority('ROLE_MANAGER') "
                + "or hasRole('PROJECT_MANAGER') "
                + "or hasRole('TEAM_MANAGER') "
                + "or hasRole('DEPARTMENT_HEAD') "
                + "or hasRole('CEO') "
                + "or hasRole('EXECUTIVE') "
                + "or authentication.principal.dashboard == 'MANAGER_DASHBOARD' "
                + "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD' "
                + "or authentication.principal.dashboard == 'DEPARTMENTHEAD_DASHBOARD' "
                + "or authentication.principal.dashboard == 'DEPT_HEAD_DASHBOARD' "
                + "or authentication.principal.dashboard == 'EXECUTIVE_DASHBOARD' "
                + "or authentication.principal.dashboard == 'CEO_DASHBOARD'"
)
public class ManagerKpiWorkflowController {

    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @GetMapping("/templates")
    public ResponseEntity<List<ManagerKpiTemplateSummaryDto>> listTemplates() {
        return ResponseEntity.ok(employeeKpiWorkflowService.listKpiTemplatesForManagerDepartment());
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<ManagerKpiAssignmentDto>> listAssignments(
            @RequestParam Integer kpiFormId,
            @RequestParam(required = false) Integer cyclePeriodId
    ) {
        return ResponseEntity.ok(employeeKpiWorkflowService.listDepartmentAssignmentsForManager(kpiFormId, cyclePeriodId));
    }

    @GetMapping("/history")
    public ResponseEntity<List<ManagerKpiAssignmentDto>> history() {
        return ResponseEntity.ok(employeeKpiWorkflowService.listFinalizedHistoryForManagerDepartment());
    }

    @PutMapping("/assignments/{employeeKpiFormId}/scores")
    public ResponseEntity<ManagerKpiAssignmentDto> updateScores(
            @PathVariable Integer employeeKpiFormId,
            @Valid @RequestBody UpdateEmployeeKpiScoresRequest request
    ) {
        return ResponseEntity.ok(employeeKpiWorkflowService.updateScores(employeeKpiFormId, request));
    }

    @PostMapping("/finalize")
    public ResponseEntity<UseKpiTemplateResultDto> finalizeDepartment(@Valid @RequestBody FinalizeDepartmentKpiRequest request) {
        return ResponseEntity.ok(employeeKpiWorkflowService.finalizeDepartmentKpi(request.getKpiFormId(), request.getCyclePeriodId()));
    }

    @PostMapping("/assignments/{employeeKpiFormId}/finalize")
    public ResponseEntity<ManagerKpiAssignmentDto> finalizeEmployee(
            @PathVariable Integer employeeKpiFormId,
            @Valid @RequestBody FinalizeEmployeeKpiRequest request
    ) {
        return ResponseEntity.ok(employeeKpiWorkflowService.finalizeEmployeeKpi(employeeKpiFormId, request));
    }
}

package com.epms.controller;

import com.epms.dto.ManagerKpiAssignmentDto;
import com.epms.service.EmployeeKpiWorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/kpi-history")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize(
        "hasRole('HRADMIN') "
                + "or hasRole('HR_ADMIN') "
                + "or hasRole('ADMIN') "
                + "or hasRole('HR') "
                + "or hasRole('MANAGER') "
                + "or hasRole('PROJECT_MANAGER') "
                + "or hasRole('TEAM_MANAGER') "
                + "or hasRole('TEAM_LEADER') "
                + "or hasRole('DEPARTMENT_HEAD') "
                + "or hasRole('DEPARTMENTHEAD') "
                + "or hasRole('DEPT_HEAD') "
                + "or hasRole('EMPLOYEE') "
                + "or authentication.principal.dashboard == 'HRADMIN_DASHBOARD' "
                + "or authentication.principal.dashboard == 'HR_ADMIN_DASHBOARD' "
                + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD' "
                + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                + "or authentication.principal.dashboard == 'MANAGER_DASHBOARD' "
                + "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD' "
                + "or authentication.principal.dashboard == 'DEPARTMENTHEAD_DASHBOARD' "
                + "or authentication.principal.dashboard == 'DEPT_HEAD_DASHBOARD' "
                + "or authentication.principal.dashboard == 'EMPLOYEE_DASHBOARD'"
)
public class KpiHistoryController {

    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @GetMapping
    public ResponseEntity<List<ManagerKpiAssignmentDto>> history() {
        return ResponseEntity.ok(employeeKpiWorkflowService.listFinalizedHistoryForCurrentUserScope());
    }
}

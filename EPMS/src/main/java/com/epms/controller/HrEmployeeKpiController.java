package com.epms.controller;

import com.epms.dto.AssignKpiEvaluatorRequest;
import com.epms.dto.HrEmployeeKpiRowDto;
import com.epms.service.EmployeeKpiWorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/hr/employee-kpis")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class HrEmployeeKpiController {

    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    /**
     * Applies period-end auto-finalization for complete assignments, then returns all finalized rows for HR reporting.
     */
    @GetMapping("/finalized-results")
    public ResponseEntity<List<HrEmployeeKpiRowDto>> finalizedResults() {
        employeeKpiWorkflowService.runAutoFinalizePastDueAssignments();
        return ResponseEntity.ok(employeeKpiWorkflowService.listFinalizedForHr());
    }

    /** Current scores while managers are still editing (not finalized). Does not run auto-finalization. */
    @GetMapping("/in-progress-results")
    public ResponseEntity<List<HrEmployeeKpiRowDto>> inProgressResults() {
        return ResponseEntity.ok(employeeKpiWorkflowService.listInProgressForHr());
    }

    @PostMapping("/{employeeKpiFormId}/evaluators")
    public ResponseEntity<Void> assignEvaluator(
            @PathVariable Integer employeeKpiFormId,
            @Valid @RequestBody AssignKpiEvaluatorRequest request
    ) {
        employeeKpiWorkflowService.assignManualEvaluator(employeeKpiFormId, request);
        return ResponseEntity.noContent().build();
    }
}

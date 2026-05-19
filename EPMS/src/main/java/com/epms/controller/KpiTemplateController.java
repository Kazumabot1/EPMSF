package com.epms.controller;

import com.epms.dto.KpiFormRequestDTO;
import com.epms.dto.KpiFormResponseDTO;
import com.epms.dto.KpiPositionAssignmentDto;
import com.epms.dto.KpiPositionAvailabilityDto;
import com.epms.dto.PositionResponseDto;
import com.epms.dto.UseKpiDepartmentRequest;
import com.epms.dto.UseKpiTemplateResultDto;
import com.epms.service.EmployeeKpiWorkflowService;
import com.epms.service.KpiFormService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Authorization for this API is enforced in {@link com.epms.config.SecurityConfig}
 * on {@code /api/hr/kpi-templates/**} (HR-like roles, HR dashboards, and position checks).
 * {@code POST …/use-for-department} uses {@link com.epms.security.HrKpiTemplateAuthority} in the filter chain only.
 * Do not narrow access again with {@code @PreAuthorize(hasAnyRole('HR','ADMIN'))}: many HR users
 * carry roles such as PEOPLE_OPS or HR_MANAGER that match the filter chain but not that expression,
 * which causes HTTP 403 after the request already passed gateway security.
 */
@RestController
@RequestMapping("/api/hr/kpi-templates")
@RequiredArgsConstructor
public class KpiTemplateController {

    private final KpiFormService kpiFormService;
    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @PostMapping("/create")
    public ResponseEntity<KpiFormResponseDTO> create(@Valid @RequestBody KpiFormRequestDTO dto) {
        return new ResponseEntity<>(kpiFormService.createTemplate(dto), HttpStatus.CREATED);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<KpiFormResponseDTO> update(@PathVariable Integer id, @Valid @RequestBody KpiFormRequestDTO dto) {
        return ResponseEntity.ok(kpiFormService.updateTemplate(id, dto));
    }

    @GetMapping("/list")
    public ResponseEntity<List<KpiFormResponseDTO>> list() {
        return ResponseEntity.ok(kpiFormService.getAllTemplates());
    }

    /**
     * Without {@code checkPositionId}: active position → KPI template links.
     * With {@code checkPositionId}: whether that position can receive a new form (pre-create check).
     */
    @GetMapping("/available-positions")
    public ResponseEntity<List<PositionResponseDto>> availablePositions(
            @RequestParam(required = false) Integer excludeFormId
    ) {
        return ResponseEntity.ok(kpiFormService.getAvailablePositions(excludeFormId));
    }

    @GetMapping("/assigned-position-ids")
    public ResponseEntity<?> assignedPositionIds(
            @RequestParam(required = false) Integer excludeFormId,
            @RequestParam(required = false) Integer checkPositionId,
            @RequestParam(required = false) String view
    ) {
        if ("available".equalsIgnoreCase(view)) {
            return ResponseEntity.ok(kpiFormService.getAvailablePositions(excludeFormId));
        }
        if (checkPositionId != null) {
            return ResponseEntity.ok(kpiFormService.checkPositionAvailability(checkPositionId, excludeFormId));
        }
        return ResponseEntity.ok(kpiFormService.getPositionAssignments(excludeFormId));
    }

    @GetMapping("/by-position/{positionId}")
    public ResponseEntity<KpiFormResponseDTO> getByPosition(@PathVariable Integer positionId) {
        return ResponseEntity.ok(kpiFormService.getTemplateByPositionId(positionId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<KpiFormResponseDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(kpiFormService.getTemplateById(id));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        kpiFormService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/use-for-department")
    public ResponseEntity<UseKpiTemplateResultDto> useForDepartment(
            @PathVariable Integer id,
            @Valid @RequestBody UseKpiDepartmentRequest request
    ) {
        return ResponseEntity.ok(employeeKpiWorkflowService.useTemplateForDepartment(id, request));
    }
}

package com.epms.controller;

import com.epms.dto.EmployeeDepartmentTransferPreviewDto;
import com.epms.dto.EmployeeDropdownDto;
import com.epms.dto.EmployeeRequestDto;
import com.epms.dto.EmployeeResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.Employee;
import com.epms.service.EmployeeService;
import com.epms.repository.EmployeeRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN', 'HRADMIN', 'HR_ADMIN', 'HR_ADMINISTRATOR') "
                    + "or principal.dashboard == 'HR_DASHBOARD' "
                    + "or principal.dashboard == 'ADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HRADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HR_ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<EmployeeResponseDto>>> getAllEmployees(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        List<EmployeeResponseDto> employees = employeeService.getAllEmployees(includeInactive);
        return ResponseEntity.ok(GenericApiResponse.success("Employees fetched", employees));
    }

    @GetMapping("/{id}")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN', 'HRADMIN', 'HR_ADMIN', 'HR_ADMINISTRATOR') "
                    + "or principal.dashboard == 'HR_DASHBOARD' "
                    + "or principal.dashboard == 'ADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HRADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HR_ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> getEmployeeById(@PathVariable Integer id) {
        EmployeeResponseDto dto = employeeService.getEmployeeById(id);
        return ResponseEntity.ok(GenericApiResponse.success("Employee fetched", dto));
    }

    @GetMapping("/{id}/department-transfer-preview")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN', 'HRADMIN', 'HR_ADMIN', 'HR_ADMINISTRATOR') "
                    + "or principal.dashboard == 'HR_DASHBOARD' "
                    + "or principal.dashboard == 'ADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HRADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HR_ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeDepartmentTransferPreviewDto>> previewDepartmentTransfer(
            @PathVariable Integer id,
            @RequestParam(required = false) Integer currentDepartmentId,
            @RequestParam(required = false) Integer parentDepartmentId
    ) {
        EmployeeDepartmentTransferPreviewDto dto = employeeService.previewDepartmentTransfer(
                id,
                currentDepartmentId,
                parentDepartmentId
        );

        return ResponseEntity.ok(GenericApiResponse.success("Department transfer preview fetched", dto));
    }

    /**
     * Used by One-on-One Meeting employee dropdown.
     *
     * This endpoint now checks both:
     * - employee_department.currentdepartment / parentdepartment
     * - users.department_id
     *
     * This fixes the case where HR selects a department but employees do not appear
     * because older data is only linked through users.department_id.
     */
    @GetMapping("/active-by-department/{departmentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<GenericApiResponse<List<EmployeeDropdownDto>>> getActiveByDepartment(
            @PathVariable Integer departmentId
    ) {
        List<EmployeeDropdownDto> employees = employeeRepository
                .findActiveDropdownEmployeesByDepartmentId(departmentId)
                .stream()
                .map(this::toDropdownDto)
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                EmployeeDropdownDto::getId,
                                dto -> dto,
                                (first, second) -> first
                        ),
                        map -> map.values()
                                .stream()
                                .sorted(Comparator.comparing(
                                        dto -> (
                                                (dto.getFirstName() == null ? "" : dto.getFirstName()) + " " +
                                                        (dto.getLastName() == null ? "" : dto.getLastName())
                                        ).trim(),
                                        String.CASE_INSENSITIVE_ORDER
                                ))
                                .toList()
                ));

        return ResponseEntity.ok(GenericApiResponse.success("Active employees fetched", employees));
    }

    @PostMapping
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN', 'HRADMIN', 'HR_ADMIN', 'HR_ADMINISTRATOR') "
                    + "or principal.dashboard == 'HR_DASHBOARD' "
                    + "or principal.dashboard == 'ADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HRADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HR_ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> createEmployee(
            @Valid @RequestBody EmployeeRequestDto request
    ) {
        EmployeeResponseDto created = employeeService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Employee created", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN', 'HRADMIN', 'HR_ADMIN', 'HR_ADMINISTRATOR') "
                    + "or principal.dashboard == 'HR_DASHBOARD' "
                    + "or principal.dashboard == 'ADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HRADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HR_ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> updateEmployee(
            @PathVariable Integer id,
            @Valid @RequestBody EmployeeRequestDto request
    ) {
        EmployeeResponseDto updated = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(GenericApiResponse.success("Employee updated", updated));
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN', 'HRADMIN', 'HR_ADMIN', 'HR_ADMINISTRATOR') "
                    + "or principal.dashboard == 'HR_DASHBOARD' "
                    + "or principal.dashboard == 'ADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HRADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HR_ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> deactivateEmployee(@PathVariable Integer id) {
        EmployeeResponseDto dto = employeeService.deactivateEmployee(id);
        return ResponseEntity.ok(GenericApiResponse.success("Employee deactivated", dto));
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN', 'HRADMIN', 'HR_ADMIN', 'HR_ADMINISTRATOR') "
                    + "or principal.dashboard == 'HR_DASHBOARD' "
                    + "or principal.dashboard == 'ADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HRADMIN_DASHBOARD' "
                    + "or principal.dashboard == 'HR_ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> activateEmployee(@PathVariable Integer id) {
        EmployeeResponseDto dto = employeeService.activateEmployee(id);
        return ResponseEntity.ok(GenericApiResponse.success("Employee activated", dto));
    }

    private EmployeeDropdownDto toDropdownDto(Employee employee) {
        EmployeeDropdownDto dto = new EmployeeDropdownDto();

        dto.setId(employee.getId());
        dto.setFirstName(employee.getFirstName());
        dto.setLastName(employee.getLastName());

        return dto;
    }
}

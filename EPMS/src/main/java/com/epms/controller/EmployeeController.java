package com.epms.controller;

import com.epms.dto.EmployeeDropdownDto;
import com.epms.dto.EmployeeRequestDto;
import com.epms.dto.EmployeeResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<EmployeeResponseDto>>> getAllEmployees(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        List<EmployeeResponseDto> employees = employeeService.getAllEmployees(includeInactive);
        return ResponseEntity.ok(
                GenericApiResponse.success("Employees fetched", employees)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> getEmployeeById(@PathVariable Integer id) {
        EmployeeResponseDto dto = employeeService.getEmployeeById(id);
        return ResponseEntity.ok(GenericApiResponse.success("Employee fetched", dto));
    }

    /**
     * Returns only employees belonging to the given department whose User account is active.
     * Used to populate the employee dropdown on the 1:1 meeting creation form.
     */
    @GetMapping("/active-by-department/{departmentId}")
    public ResponseEntity<GenericApiResponse<List<EmployeeDropdownDto>>> getActiveByDepartment(
            @PathVariable Integer departmentId) {
        List<EmployeeDropdownDto> employees = employeeDepartmentRepository
                .findActiveEmployeesByDepartmentId(departmentId)
                .stream()
                .map(ed -> {
                    EmployeeDropdownDto dto = new EmployeeDropdownDto();
                    dto.setId(ed.getEmployee().getId());
                    dto.setFirstName(ed.getEmployee().getFirstName());
                    dto.setLastName(ed.getEmployee().getLastName());
                    return dto;
                })
                // deduplicate in case an employee has multiple records in the same dept
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                EmployeeDropdownDto::getId,
                                d -> d,
                                (a, b) -> a
                        ),
                        map -> List.copyOf(map.values())
                ));
        return ResponseEntity.ok(GenericApiResponse.success("Active employees fetched", employees));
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> createEmployee(
            @Valid @RequestBody EmployeeRequestDto request
    ) {
        EmployeeResponseDto created = employeeService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Employee created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> updateEmployee(
            @PathVariable Integer id,
            @Valid @RequestBody EmployeeRequestDto request
    ) {
        EmployeeResponseDto updated = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(GenericApiResponse.success("Employee updated", updated));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> deactivateEmployee(@PathVariable Integer id) {
        EmployeeResponseDto dto = employeeService.deactivateEmployee(id);
        return ResponseEntity.ok(GenericApiResponse.success("Employee deactivated", dto));
    }
}

package com.epms.controller;

import com.epms.dto.EmployeeRequestDto;
import com.epms.dto.EmployeeResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeService employeeService;

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

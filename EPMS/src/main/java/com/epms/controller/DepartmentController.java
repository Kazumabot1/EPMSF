package com.epms.controller;

import com.epms.dto.DepartmentRequestDto;
import com.epms.dto.DepartmentResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.Department;
import com.epms.exception.BadRequestException;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<DepartmentResponseDto>>> getAllDepartments() {
        List<DepartmentResponseDto> departments = departmentRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(Department::getDepartmentName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(
                GenericApiResponse.success("Departments fetched", departments)
        );
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<DepartmentResponseDto>> createDepartment(
            @Valid @RequestBody DepartmentRequestDto request
    ) {
        String name = normalizeRequired(request.getDepartmentName(), "Department name is required");
        String code = normalizeOptional(request.getDepartmentCode());

        ensureNameAvailable(name, null);
        ensureCodeAvailable(code, null);

        Department department = new Department();
        department.setDepartmentName(name);
        department.setDepartmentCode(code);
        department.setHeadEmployee(normalizeOptional(request.getHeadEmployee()));
        department.setStatus(request.getStatus() == null ? true : request.getStatus());
        department.setCreatedAt(new Date());
        department.setCreatedBy(currentUsername());

        Department saved = saveDepartment(department);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department created", toResponse(saved))
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<DepartmentResponseDto>> updateDepartment(
            @PathVariable Integer id,
            @Valid @RequestBody DepartmentRequestDto request
    ) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        String name = normalizeRequired(request.getDepartmentName(), "Department name is required");
        String code = normalizeOptional(request.getDepartmentCode());

        ensureNameAvailable(name, id);
        ensureCodeAvailable(code, id);

        department.setDepartmentName(name);
        department.setDepartmentCode(code);
        department.setHeadEmployee(normalizeOptional(request.getHeadEmployee()));
        if (request.getStatus() != null) {
            department.setStatus(request.getStatus());
        }

        Department saved = saveDepartment(department);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department updated", toResponse(saved))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GenericApiResponse<Void>> deleteDepartment(@PathVariable Integer id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        department.setStatus(false);
        saveDepartment(department);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department deactivated", null)
        );
    }

    private Department saveDepartment(Department department) {
        try {
            return departmentRepository.save(department);
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateResourceException("Department name or code already exists");
        }
    }

    private void ensureNameAvailable(String name, Integer currentId) {
        departmentRepository.findByDepartmentNameIgnoreCase(name)
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Department name already exists");
                });
    }

    private void ensureCodeAvailable(String code, Integer currentId) {
        if (code == null) {
            return;
        }
        departmentRepository.findByDepartmentCodeIgnoreCase(code)
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Department code already exists");
                });
    }

    private DepartmentResponseDto toResponse(Department d) {
        return DepartmentResponseDto.builder()
                .id(d.getId())
                .departmentName(d.getDepartmentName())
                .departmentCode(d.getDepartmentCode())
                .headEmployee(d.getHeadEmployee())
                .status(d.getStatus())
                .createdAt(d.getCreatedAt())
                .createdBy(d.getCreatedBy())
                .build();
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String currentUsername() {
        try {
            return SecurityUtils.currentUser().getUsername();
        } catch (Exception ignored) {
            return "system";
        }
    }
}

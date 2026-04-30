package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.entity.Department;
import com.epms.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    private Map<String, Object> toResponse(Department d) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("departmentName", d.getDepartmentName());
        map.put("departmentCode", d.getDepartmentCode());
        map.put("headEmployee", d.getHeadEmployee());
        map.put("status", d.getStatus());
        map.put("createdAt", d.getCreatedAt());
        map.put("createdBy", d.getCreatedBy());
        return map;
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<Map<String, Object>>>> getAllDepartments() {
        List<Map<String, Object>> departments = departmentRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();

        System.out.println("===== DEPARTMENT COUNT ===== " + departments.size());

        return ResponseEntity.ok(
                GenericApiResponse.success("Departments fetched", departments)
        );
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<Map<String, Object>>> createDepartment(
            @RequestBody Department request
    ) {
        if (request.getDepartmentName() == null || request.getDepartmentName().trim().isEmpty()) {
            throw new RuntimeException("Department name is required");
        }

        String name = request.getDepartmentName().trim();

        if (departmentRepository.existsByDepartmentName(name)) {
            throw new RuntimeException("Department name already exists");
        }

        Department department = new Department();
        department.setDepartmentName(name);
        department.setDepartmentCode(request.getDepartmentCode());
        department.setHeadEmployee(request.getHeadEmployee());
        department.setStatus(true);
        department.setCreatedAt(new Date());
        department.setCreatedBy("system");

        Department saved = departmentRepository.save(department);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department created", toResponse(saved))
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<Map<String, Object>>> updateDepartment(
            @PathVariable Integer id,
            @RequestBody Department request
    ) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found"));

        if (request.getDepartmentName() == null || request.getDepartmentName().trim().isEmpty()) {
            throw new RuntimeException("Department name is required");
        }

        department.setDepartmentName(request.getDepartmentName().trim());

        if (request.getDepartmentCode() != null) {
            department.setDepartmentCode(request.getDepartmentCode());
        }

        if (request.getHeadEmployee() != null) {
            department.setHeadEmployee(request.getHeadEmployee());
        }

        Department saved = departmentRepository.save(department);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department updated", toResponse(saved))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GenericApiResponse<Void>> deleteDepartment(@PathVariable Integer id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found"));

        departmentRepository.delete(department);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department deleted", null)
        );
    }
}
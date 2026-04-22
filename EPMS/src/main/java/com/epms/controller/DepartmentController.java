// KHN new file
// (REST API controller for Department management)

// KHN modified files
// (Wrap departments in GenericApiResponse for consistent data transport)

package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.entity.Department;
import com.epms.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    // KHN added parts
    // (Endpoint to get all departments for dropdowns)
    @GetMapping
    public ResponseEntity<GenericApiResponse<List<Department>>> getAllDepartments() {
        return ResponseEntity.ok(GenericApiResponse.success("Departments fetched", departmentRepository.findAll()));
    }
}

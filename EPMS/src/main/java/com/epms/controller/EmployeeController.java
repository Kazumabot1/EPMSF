// KHN modified files
// (Wrap employees in GenericApiResponse for consistent data transport)

package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.entity.Employee;
import com.epms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<Employee>>> getAllEmployees() {
        return ResponseEntity.ok(GenericApiResponse.success("Employees fetched", employeeRepository.findAll()));
    }
}

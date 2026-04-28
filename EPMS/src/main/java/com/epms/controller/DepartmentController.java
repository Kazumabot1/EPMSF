//// KHN new file
//// (REST API controller for Department management)
//
//// KHN modified files
//// (Wrap departments in GenericApiResponse for consistent data transport)
//
//package com.epms.controller;
//
//import com.epms.dto.GenericApiResponse;
//import com.epms.entity.Department;
//import com.epms.repository.DepartmentRepository;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//
//@RestController
//@RequestMapping("/api/departments")
//@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
//public class DepartmentController {
//
//    private final DepartmentRepository departmentRepository;
//
//    // KHN added parts
//    // (Endpoint to get all departments for dropdowns)
//    @GetMapping
//    public ResponseEntity<GenericApiResponse<List<Department>>> getAllDepartments() {
//        return ResponseEntity.ok(GenericApiResponse.success("Departments fetched", departmentRepository.findAll()));
//    }
//}


// Modified by KHN ( ChatGPT)
package com.epms.controller;

import com.epms.dto.DepartmentResponseDto;
import com.epms.dto.GenericApiResponse;
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

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<DepartmentResponseDto>>> getAllDepartments() {
        List<DepartmentResponseDto> departments = departmentRepository.findAll()
                .stream()
                .map(dept -> new DepartmentResponseDto(
                        dept.getId(),
                        dept.getDepartmentName(),
                        dept.getDepartmentCode(),
                        dept.getStatus()
                ))
                .toList();

        return ResponseEntity.ok(GenericApiResponse.success("Departments fetched", departments));
    }
}
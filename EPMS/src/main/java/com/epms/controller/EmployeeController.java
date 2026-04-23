package com.epms.controller;

import com.epms.dto.EmployeeResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<EmployeeResponseDto>>> getAllEmployees() {
        List<EmployeeResponseDto> employees = employeeRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();

        return ResponseEntity.ok(
                GenericApiResponse.success("Employees fetched", employees)
        );
    }

    private EmployeeResponseDto toDto(Employee employee) {
        List<EmployeeDepartment> history = employee.getEmployeeDepartments() == null
                ? List.of()
                : employee.getEmployeeDepartments()
                .stream()
                .filter(Objects::nonNull)
                .toList();

        Optional<EmployeeDepartment> currentAssignment = history.stream()
                .filter(ed -> ed.getEnddate() == null)
                .max(Comparator.comparing(
                        ed -> ed.getStartdate() == null ? new java.util.Date(0) : ed.getStartdate()
                ));

        EmployeeDepartment latestAssignment = currentAssignment.orElseGet(() ->
                history.stream()
                        .max(Comparator.comparing(
                                ed -> ed.getStartdate() == null ? new java.util.Date(0) : ed.getStartdate()
                        ))
                        .orElse(null)
        );

        String currentDepartment = null;
        String parentDepartment = null;
        String assignedBy = null;
        java.util.Date startDate = null;
        java.util.Date endDate = null;

        if (latestAssignment != null) {
            currentDepartment =
                    latestAssignment.getCurrentdepartment() != null && !latestAssignment.getCurrentdepartment().isBlank()
                            ? latestAssignment.getCurrentdepartment()
                            : latestAssignment.getDepartment() != null
                            ? latestAssignment.getDepartment().getDepartmentName()
                            : null;

            parentDepartment = latestAssignment.getParentdepartment();
            assignedBy = latestAssignment.getAssignBy();
            startDate = latestAssignment.getStartdate();
            endDate = latestAssignment.getEnddate();
        }

        String fullName = ((employee.getFirstName() == null ? "" : employee.getFirstName()) + " " +
                (employee.getLastName() == null ? "" : employee.getLastName())).trim();

        return new EmployeeResponseDto(
                employee.getId(),
                employee.getFirstName(),
                employee.getLastName(),
                fullName,
                employee.getPhoneNumber(),
                employee.getStaffNrc(),
                employee.getGender(),
                employee.getRace(),
                employee.getReligion(),
                employee.getDateOfBirth(),
                employee.getMaritalStatus(),
                employee.getContactAddress(),
                employee.getPermanentAddress(),
                currentDepartment,
                parentDepartment,
                assignedBy,
                startDate,
                endDate,
                history.size()
        );
    }
}
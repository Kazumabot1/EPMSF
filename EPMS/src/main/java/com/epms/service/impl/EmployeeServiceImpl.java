package com.epms.service.impl;

import com.epms.dto.EmployeeResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.repository.EmployeeRepository;
import com.epms.service.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;

    @Override
    public List<EmployeeResponseDto> getAllEmployees() {
        return employeeRepository.findAll()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    private EmployeeResponseDto mapToDto(Employee emp) {
        List<EmployeeDepartment> history = emp.getEmployeeDepartments() == null
                ? List.of()
                : emp.getEmployeeDepartments()
                .stream()
                .filter(Objects::nonNull)
                .toList();

        Optional<EmployeeDepartment> currentAssignment = history.stream()
                .filter(item -> item.getEnddate() == null)
                .max(Comparator.comparing(
                        item -> item.getStartdate() == null ? new Date(0) : item.getStartdate()
                ));

        EmployeeDepartment latestAssignment = currentAssignment.orElseGet(() ->
                history.stream()
                        .max(Comparator.comparing(
                                item -> item.getStartdate() == null ? new Date(0) : item.getStartdate()
                        ))
                        .orElse(null)
        );

        String currentDepartment = null;
        String parentDepartment = null;
        String assignedBy = null;
        Date departmentStartDate = null;
        Date departmentEndDate = null;

        if (latestAssignment != null) {
            Department department = latestAssignment.getDepartment();

            currentDepartment =
                    latestAssignment.getCurrentdepartment() != null &&
                            !latestAssignment.getCurrentdepartment().isBlank()
                            ? latestAssignment.getCurrentdepartment()
                            : department != null
                            ? department.getDepartmentName()
                            : null;

            parentDepartment = latestAssignment.getParentdepartment();
            assignedBy = latestAssignment.getAssignBy();
            departmentStartDate = latestAssignment.getStartdate();
            departmentEndDate = latestAssignment.getEnddate();
        }

        String firstName = emp.getFirstName() != null ? emp.getFirstName() : "";
        String lastName = emp.getLastName() != null ? emp.getLastName() : "";
        String fullName = (firstName + " " + lastName).trim();

        return new EmployeeResponseDto(
                emp.getId(),
                emp.getFirstName(),
                emp.getLastName(),
                fullName,
                emp.getPhoneNumber(),
                emp.getStaffNrc(),
                emp.getGender(),
                emp.getRace(),
                emp.getReligion(),
                emp.getDateOfBirth(),
                emp.getMaritalStatus(),
                emp.getContactAddress(),
                emp.getPermanentAddress(),
                currentDepartment,
                parentDepartment,
                assignedBy,
                departmentStartDate,
                departmentEndDate,
                history.size()
        );
    }
}
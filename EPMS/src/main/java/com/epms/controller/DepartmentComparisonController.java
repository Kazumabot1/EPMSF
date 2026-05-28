package com.epms.controller;

import com.epms.dto.DepartmentComparisonDetailDto;
import com.epms.dto.DepartmentComparisonEmployeeDto;
import com.epms.dto.DepartmentComparisonSummaryDto;
import com.epms.dto.DepartmentComparisonTeamDto;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.Team;
import com.epms.entity.User;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DepartmentComparisonController {

    private final DepartmentRepository departmentRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    @GetMapping("/comparison")
    @Transactional(readOnly = true)
    public ResponseEntity<GenericApiResponse<List<DepartmentComparisonSummaryDto>>> searchDepartments(
            @RequestParam(required = false) String search
    ) {
        String cleanSearch = search == null ? "" : search.trim();

        List<DepartmentComparisonSummaryDto> departments = departmentRepository
                .searchForComparison(cleanSearch)
                .stream()
                .map(this::toSummaryDto)
                .toList();

        return ResponseEntity.ok(
                GenericApiResponse.success("Department comparison search fetched", departments)
        );
    }

    @GetMapping("/{id}/comparison")
    @Transactional(readOnly = true)
    public ResponseEntity<GenericApiResponse<DepartmentComparisonDetailDto>> getDepartmentComparisonDetail(
            @PathVariable Integer id
    ) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));

        DepartmentComparisonDetailDto dto = new DepartmentComparisonDetailDto();

        dto.setId(department.getId());
        dto.setDepartmentName(department.getDepartmentName());
        dto.setDepartmentCode(department.getDepartmentCode());
        dto.setStatus(department.getStatus());
        dto.setCreatedAt(department.getCreatedAt());
        dto.setCreatedBy(department.getCreatedBy());
        dto.setHeadEmployee(department.getHeadEmployee());

        dto.setCurrentDepartmentEmployeeCount(
                employeeDepartmentRepository.countActiveEmployeesAsCurrentDepartment(department.getId())
        );

        dto.setParentDepartmentEmployeeCount(
                employeeDepartmentRepository.countActiveEmployeesAsParentDepartment(department.getId())
        );

        dto.setTotalEmployeeCount(
                employeeDepartmentRepository.countActiveEmployeesInCurrentOrParentDepartment(department.getId())
        );

        List<DepartmentComparisonEmployeeDto> employees = employeeDepartmentRepository
                .findActiveAssignmentsByCurrentOrParentDepartmentId(department.getId())
                .stream()
                .map(this::toEmployeeDto)
                .sorted(Comparator.comparing(
                        item -> item.getEmployeeName() == null ? "" : item.getEmployeeName(),
                        String.CASE_INSENSITIVE_ORDER
                ))
                .toList();

        List<DepartmentComparisonTeamDto> teams = teamRepository
                .findByDepartmentId(department.getId())
                .stream()
                .sorted(Comparator.comparing(
                        team -> team.getTeamName() == null ? "" : team.getTeamName(),
                        String.CASE_INSENSITIVE_ORDER
                ))
                .map(this::toTeamDto)
                .toList();

        dto.setEmployees(employees);
        dto.setTeams(teams);
        dto.setTeamCount((long) teams.size());

        return ResponseEntity.ok(
                GenericApiResponse.success("Department comparison detail fetched", dto)
        );
    }

    private DepartmentComparisonSummaryDto toSummaryDto(Department department) {
        return new DepartmentComparisonSummaryDto(
                department.getId(),
                department.getDepartmentName(),
                department.getDepartmentCode(),
                department.getStatus(),
                department.getCreatedAt(),
                department.getCreatedBy()
        );
    }

    private DepartmentComparisonTeamDto toTeamDto(Team team) {
        DepartmentComparisonTeamDto dto = new DepartmentComparisonTeamDto();

        dto.setId(team.getId());
        dto.setTeamName(team.getTeamName());
        dto.setStatus(team.getStatus());
        dto.setTeamGoal(team.getTeamGoal());
        dto.setCreatedDate(team.getCreatedDate());

        if (team.getTeamLeader() != null) {
            dto.setTeamLeaderId(team.getTeamLeader().getId());
            dto.setTeamLeaderName(userDisplayName(team.getTeamLeader()));
            dto.setTeamLeaderPositionTitle(positionTitle(team.getTeamLeader()));
        }

        if (team.getCreatedByUser() != null) {
            dto.setCreatedById(team.getCreatedByUser().getId());
            dto.setCreatedByName(userDisplayName(team.getCreatedByUser()));
        }

        List<DepartmentComparisonEmployeeDto> members =
                team.getTeamMembers() == null
                        ? List.of()
                        : team.getTeamMembers()
                        .stream()
                        .filter(Objects::nonNull)
                        .filter(member -> member.getEndedDate() == null)
                        .filter(member -> member.getMemberUser() != null)
                        .map(member -> toEmployeeDto(member.getMemberUser()))
                        .sorted(Comparator.comparing(
                                item -> item.getEmployeeName() == null ? "" : item.getEmployeeName(),
                                String.CASE_INSENSITIVE_ORDER
                        ))
                        .toList();

        dto.setMembers(members);

        int teamLeaderCount = team.getTeamLeader() != null ? 1 : 0;
        dto.setEmployeeCount(teamLeaderCount + members.size());

        return dto;
    }

    private DepartmentComparisonEmployeeDto toEmployeeDto(EmployeeDepartment assignment) {
        Employee employee = assignment.getEmployee();
        User user = null;

        if (employee != null && employee.getId() != null) {
            user = userRepository.findByEmployeeId(employee.getId()).orElse(null);
        }

        DepartmentComparisonEmployeeDto dto = new DepartmentComparisonEmployeeDto();

        if (user != null) {
            dto.setUserId(user.getId());
            dto.setEmployeeId(user.getEmployeeId());
            dto.setEmployeeName(userDisplayName(user));
            dto.setEmail(user.getEmail());
            dto.setPositionTitle(positionTitle(user));
            return dto;
        }

        if (employee != null) {
            dto.setEmployeeId(employee.getId());
            dto.setEmployeeName(employeeName(employee));
            dto.setEmail(employee.getEmail());
            dto.setPositionTitle(
                    employee.getPosition() != null ? employee.getPosition().getPositionTitle() : null
            );
        }

        return dto;
    }

    private DepartmentComparisonEmployeeDto toEmployeeDto(User user) {
        DepartmentComparisonEmployeeDto dto = new DepartmentComparisonEmployeeDto();

        dto.setUserId(user.getId());
        dto.setEmployeeId(user.getEmployeeId());
        dto.setEmployeeName(userDisplayName(user));
        dto.setEmail(user.getEmail());
        dto.setPositionTitle(positionTitle(user));

        return dto;
    }

    private String employeeName(Employee employee) {
        if (employee == null) {
            return "—";
        }

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        if (!fullName.isEmpty()) {
            return fullName;
        }

        if (employee.getEmail() != null && !employee.getEmail().trim().isEmpty()) {
            return employee.getEmail().trim();
        }

        return "Employee #" + employee.getId();
    }

    private String userDisplayName(User user) {
        if (user == null) {
            return "—";
        }

        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
            return user.getFullName().trim();
        }

        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            return user.getEmail().trim();
        }

        return "User #" + user.getId();
    }

    private String positionTitle(User user) {
        if (user == null || user.getPosition() == null) {
            return null;
        }

        return user.getPosition().getPositionTitle();
    }
}
package com.epms.controller;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.DepartmentHeadDashboardResponseDto;
import com.epms.dto.EmployeeResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.entity.Department;
import com.epms.exception.BusinessValidationException;
import com.epms.repository.DepartmentRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.EmployeeService;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/department-head")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('DEPARTMENT_HEAD')")
public class DepartmentHeadDashboardController {

    private final EmployeeService employeeService;
    private final TeamService teamService;
    private final DepartmentRepository departmentRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<GenericApiResponse<DepartmentHeadDashboardResponseDto>> dashboard(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        Integer departmentId = requireCurrentDepartmentId();

        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new BusinessValidationException("Assigned department not found."));

        List<EmployeeResponseDto> employees = employeeService.getMyDepartmentEmployees(includeInactive);
        List<TeamResponseDto> teams = teamService.getMyDepartmentTeams();

        DepartmentHeadDashboardResponseDto dto = new DepartmentHeadDashboardResponseDto(
                department.getId(),
                department.getDepartmentName(),
                (long) employees.size(),
                teams.size(),
                employees,
                teams
        );

        return ResponseEntity.ok(GenericApiResponse.success("Department head dashboard fetched", dto));
    }

    @GetMapping("/employees")
    public ResponseEntity<GenericApiResponse<List<EmployeeResponseDto>>> employees(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return ResponseEntity.ok(GenericApiResponse.success(
                "Department employees fetched",
                employeeService.getMyDepartmentEmployees(includeInactive)
        ));
    }

    @GetMapping("/employees/{id}")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> employeeById(@PathVariable Integer id) {
        return ResponseEntity.ok(GenericApiResponse.success(
                "Department employee fetched",
                employeeService.getMyDepartmentEmployeeById(id)
        ));
    }

    @GetMapping("/teams")
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> teams() {
        return ResponseEntity.ok(GenericApiResponse.success(
                "Department teams fetched",
                teamService.getMyDepartmentTeams()
        ));
    }

    @GetMapping("/teams/{id}")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> teamById(@PathVariable Integer id) {
        return ResponseEntity.ok(GenericApiResponse.success(
                "Department team fetched",
                teamService.getMyDepartmentTeamById(id)
        ));
    }

    @PostMapping("/teams")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> createTeam(@RequestBody TeamRequestDto requestDto) {
        return ResponseEntity.ok(GenericApiResponse.success(
                "Department team created",
                teamService.createMyDepartmentTeam(requestDto)
        ));
    }

    @PutMapping("/teams/{id}")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> updateTeam(
            @PathVariable Integer id,
            @RequestBody TeamRequestDto requestDto
    ) {
        return ResponseEntity.ok(GenericApiResponse.success(
                "Department team updated",
                teamService.updateMyDepartmentTeam(id, requestDto)
        ));
    }

    @GetMapping("/teams/candidates/users")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> candidateUsers() {
        return ResponseEntity.ok(GenericApiResponse.success(
                "Candidate users fetched",
                teamService.getMyDepartmentCandidateUsers()
        ));
    }

    @GetMapping("/teams/candidates/members")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> candidateMembers() {
        return ResponseEntity.ok(GenericApiResponse.success(
                "Candidate members fetched",
                teamService.getMyDepartmentCandidateMembers()
        ));
    }

    private Integer requireCurrentDepartmentId() {
        UserPrincipal currentUser = SecurityUtils.currentUser();

        if (currentUser.getDepartmentId() == null) {
            throw new BusinessValidationException("Current department head has no assigned department.");
        }

        return currentUser.getDepartmentId();
    }
}
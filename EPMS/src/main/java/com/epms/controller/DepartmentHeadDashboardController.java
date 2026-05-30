/*
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
@PreAuthorize(
        "hasRole('DEPARTMENT_HEAD') " +
                "or hasRole('DEPARTMENTHEAD') " +
                "or hasAuthority('ROLE_DEPARTMENT_HEAD') " +
                "or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD' " +
                "or hasRole('HR') " +
                "or hasRole('HRADMIN')"
)
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

        return ResponseEntity.ok(
                GenericApiResponse.success("Department head dashboard fetched", dto)
        );
    }

    @GetMapping("/employees")
    public ResponseEntity<GenericApiResponse<List<EmployeeResponseDto>>> employees(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department employees fetched",
                        employeeService.getMyDepartmentEmployees(includeInactive)
                )
        );
    }

    @GetMapping("/employees/{id}")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> employeeById(@PathVariable Integer id) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department employee fetched",
                        employeeService.getMyDepartmentEmployeeById(id)
                )
        );
    }

    @GetMapping("/teams")
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> teams() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department teams fetched",
                        teamService.getMyDepartmentTeams()
                )
        );
    }

    @GetMapping("/teams/{id}")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> teamById(@PathVariable Integer id) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department team fetched",
                        teamService.getMyDepartmentTeamById(id)
                )
        );
    }

    @PostMapping("/teams")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> createTeam(@RequestBody TeamRequestDto requestDto) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department team created",
                        teamService.createMyDepartmentTeam(requestDto)
                )
        );
    }

    @PutMapping("/teams/{id}")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> updateTeam(
            @PathVariable Integer id,
            @RequestBody TeamRequestDto requestDto
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department team updated",
                        teamService.updateMyDepartmentTeam(id, requestDto)
                )
        );
    }

    @GetMapping("/teams/candidates/users")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> candidateUsers() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate users fetched",
                        teamService.getMyDepartmentCandidateUsers()
                )
        );
    }

    @GetMapping("/teams/candidates/members")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> candidateMembers() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate members fetched",
                        teamService.getMyDepartmentCandidateMembers()
                )
        );
    }

    private Integer requireCurrentDepartmentId() {
        UserPrincipal currentUser = SecurityUtils.currentUser();

        if (currentUser.getDepartmentId() == null) {
            throw new BusinessValidationException("Current department head has no assigned department.");
        }

        return currentUser.getDepartmentId();
    }
}*/




/*
DepartmentHeadDashboardController.java file:
*/

package com.epms.controller;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.DepartmentHeadDashboardResponseDto;
import com.epms.dto.EmployeeResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.TeamHistoryResponseDto;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.entity.Department;
import com.epms.exception.BusinessValidationException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeDepartmentRepository;
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
@PreAuthorize(
        "hasRole('DEPARTMENT_HEAD') " +
                "or hasRole('DEPARTMENTHEAD') " +
                "or hasAuthority('ROLE_DEPARTMENT_HEAD') " +
                "or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD' " +
                "or hasRole('HR') " +
                "or hasRole('HRADMIN')"
)
public class DepartmentHeadDashboardController {

    private final EmployeeService employeeService;
    private final TeamService teamService;
    private final DepartmentRepository departmentRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<GenericApiResponse<DepartmentHeadDashboardResponseDto>> dashboard(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        Integer departmentId = requireCurrentDepartmentId();

        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new BusinessValidationException("Assigned department not found."));

        List<EmployeeResponseDto> employees = employeeService.getMyDepartmentEmployees(includeInactive);
        List<TeamResponseDto> teams = teamService.getMyDepartmentTeams();

        int activeTeamCount = (int) teams.stream()
                .filter(team -> team.getStatus() != null && team.getStatus().equalsIgnoreCase("Active"))
                .count();

        int inactiveTeamCount = (int) teams.stream()
                .filter(team -> team.getStatus() != null && team.getStatus().equalsIgnoreCase("Inactive"))
                .count();

        DepartmentHeadDashboardResponseDto dto = new DepartmentHeadDashboardResponseDto();

        dto.setDepartmentId(department.getId());
        dto.setDepartmentName(department.getDepartmentName());
        dto.setDepartmentCode(department.getDepartmentCode());
        String headEmployee = department.getHeadEmployee();
        if (headEmployee == null || headEmployee.isBlank()) {
            UserPrincipal current = SecurityUtils.currentUser();
            if (current.getFullName() != null && !current.getFullName().isBlank()) {
                headEmployee = current.getFullName().trim();
            }
        }
        dto.setHeadEmployee(headEmployee);
        dto.setStatus(department.getStatus());
        dto.setCreatedBy(department.getCreatedBy());
        dto.setCreatedAt(department.getCreatedAt());

        dto.setEmployeeCount((long) employees.size());
        dto.setCurrentDepartmentEmployeeCount(
                employeeDepartmentRepository.countActiveEmployeesAsCurrentDepartment(department.getId())
        );
        dto.setParentDepartmentEmployeeCount(
                employeeDepartmentRepository.countActiveEmployeesAsParentDepartment(department.getId())
        );

        dto.setTeamCount(teams.size());
        dto.setActiveTeamCount(activeTeamCount);
        dto.setInactiveTeamCount(inactiveTeamCount);

        dto.setEmployees(employees);
        dto.setTeams(teams);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department head dashboard fetched", dto)
        );
    }





    @GetMapping("/employees")
    public ResponseEntity<GenericApiResponse<List<EmployeeResponseDto>>> employees(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department employees fetched",
                        employeeService.getMyDepartmentEmployees(includeInactive)
                )
        );
    }

    @GetMapping("/employees/{id}")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> employeeDetail(
            @PathVariable Integer id
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department employee fetched",
                        employeeService.getMyDepartmentEmployeeById(id)
                )
        );
    }

    @GetMapping("/teams")
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> teams() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department teams fetched",
                        teamService.getMyDepartmentTeams()
                )
        );
    }

    @GetMapping("/teams/{id}")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> teamDetail(
            @PathVariable Integer id
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department team fetched",
                        teamService.getMyDepartmentTeamById(id)
                )
        );
    }

    @PostMapping("/teams")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> createTeam(
            @RequestBody TeamRequestDto request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team created successfully",
                        teamService.createMyDepartmentTeam(request)
                )
        );
    }

    @PutMapping("/teams/{id}")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> updateTeam(
            @PathVariable Integer id,
            @RequestBody TeamRequestDto request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team updated successfully",
                        teamService.updateMyDepartmentTeam(id, request)
                )
        );
    }

    @GetMapping("/teams/candidates/users")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> candidateUsers() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate users fetched",
                        teamService.getMyDepartmentCandidateUsers()
                )
        );
    }

    @GetMapping("/teams/candidates/members")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> candidateMembers() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate members fetched",
                        teamService.getMyDepartmentCandidateMembers()
                )
        );
    }

    @GetMapping("/teams/candidates/project-managers")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> candidateProjectManagers() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate project managers fetched",
                        teamService.getMyDepartmentCandidateProjectManagers()
                )
        );
    }

    @GetMapping("/teams/{teamId}/history")
    public ResponseEntity<GenericApiResponse<List<TeamHistoryResponseDto>>> teamHistory(
            @PathVariable Integer teamId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team history fetched",
                        teamService.getMyDepartmentTeamHistory(teamId)
                )
        );
    }

    private Integer requireCurrentDepartmentId() {
        UserPrincipal currentUser = SecurityUtils.currentUser();

        if (currentUser.getDepartmentId() == null) {
            throw new BusinessValidationException("Current department head has no assigned department.");
        }

        return currentUser.getDepartmentId();
    }
}
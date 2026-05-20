package com.epms.service.impl;

import com.epms.dto.ContinuousFeedbackRequestDto;
import com.epms.dto.ContinuousFeedbackResponseDto;
import com.epms.dto.TeamEmployeeOptionResponseDto;
import com.epms.dto.TeamOptionResponseDto;
import com.epms.entity.ContinuousFeedback;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.ContinuousFeedbackRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.ContinuousFeedbackService;
import com.epms.service.NotificationService;
import com.epms.service.PositionPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ContinuousFeedbackServiceImpl implements ContinuousFeedbackService {

    private final ContinuousFeedbackRepository continuousFeedbackRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final TeamRepository teamRepository;
    private final PositionPermissionService positionPermissionService;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public List<TeamOptionResponseDto> getMyTeams() {
        assertCanGiveFeedback();
        Integer departmentId = requireCurrentUserDepartmentId();

        return teamRepository.findByDepartmentIdAndStatusIgnoreCase(departmentId, "Active")
                .stream()
                .map(this::toTeamOption)
                .sorted(Comparator.comparing(TeamOptionResponseDto::getTeamName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamEmployeeOptionResponseDto> getActiveEmployeesByTeam(Integer teamId) {
        assertCanGiveFeedback();
        Team team = requireTeamInCurrentDepartment(teamId);

        return getActiveEmployeeOptions(team)
                .stream()
                .sorted(employeeOptionComparator())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamEmployeeOptionResponseDto> getEligibleEmployees(Integer teamId) {
        assertCanGiveFeedback();

        if (teamId != null) {
            return getActiveEmployeesByTeam(teamId);
        }

        Integer departmentId = requireCurrentUserDepartmentId();
        return employeeRepository.findActiveDropdownEmployeesByDepartmentId(departmentId)
                .stream()
                .map(this::toEmployeeOption)
                .sorted(employeeOptionComparator())
                .toList();
    }

    @Override
    @Transactional
    public ContinuousFeedbackResponseDto create(ContinuousFeedbackRequestDto request) {
        validateRequest(request);
        assertCanGiveFeedback();

        Integer currentUserId = SecurityUtils.currentUserId();
        Integer departmentId = requireCurrentUserDepartmentId();

        Team team = null;
        if (request.getTeamId() != null) {
            team = requireTeamInCurrentDepartment(request.getTeamId());
        }

        Employee employee = requireActiveEmployeeInScope(request.getEmployeeId(), departmentId, team);

        User giver = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found."));

        ContinuousFeedback feedback = new ContinuousFeedback();
        feedback.setTeam(team);
        feedback.setEmployee(employee);
        feedback.setGiverUser(giver);
        feedback.setFeedbackText(request.getFeedbackText().trim());
        feedback.setCategory(request.getCategory().trim());
        feedback.setRating(request.getRating());

        ContinuousFeedback saved = continuousFeedbackRepository.save(feedback);

        notifyEmployee(saved);

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContinuousFeedbackResponseDto> getMyGivenFeedback() {
        return continuousFeedbackRepository
                .findByGiverUserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContinuousFeedbackResponseDto> getMyReceivedFeedback() {
        Integer employeeId = resolveCurrentEmployeeId();

        if (employeeId == null) {
            return List.of();
        }

        return continuousFeedbackRepository
                .findByEmployeeIdOrderByCreatedAtDesc(employeeId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void validateRequest(ContinuousFeedbackRequestDto request) {
        if (request == null) {
            throw new RuntimeException("Feedback request is required.");
        }

        if (request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required.");
        }

        if (request.getFeedbackText() == null || request.getFeedbackText().trim().isEmpty()) {
            throw new RuntimeException("Feedback message is required.");
        }

        if (request.getFeedbackText().length() > 3000) {
            throw new RuntimeException("Feedback message cannot exceed 3000 characters.");
        }

        if (request.getCategory() == null || request.getCategory().trim().isEmpty()) {
            throw new RuntimeException("Category is required.");
        }

        if (request.getCategory().length() > 50) {
            throw new RuntimeException("Category cannot exceed 50 characters.");
        }

        if (request.getRating() != null && (request.getRating() < 1 || request.getRating() > 5)) {
            throw new RuntimeException("Rating must be between 1 and 5.");
        }
    }

    private void assertCanGiveFeedback() {
        if (positionPermissionService.currentUserHasPermission("continuousFeedbackGive")
                || positionPermissionService.currentUserHasPermission("feedbackSend")) {
            return;
        }

        throw new UnauthorizedActionException("Your position does not have permission to give continuous feedback.");
    }

    private Integer requireCurrentUserDepartmentId() {
        User currentUser = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new RuntimeException("Current user not found."));

        if (currentUser.getEmployeeId() != null) {
            List<EmployeeDepartment> assignments = employeeDepartmentRepository.findActiveAssignmentsForEmployeeId(currentUser.getEmployeeId());
            for (EmployeeDepartment assignment : assignments) {
                if (assignment == null) continue;
                if (assignment.getParentDepartment() != null && assignment.getParentDepartment().getId() != null) {
                    return assignment.getParentDepartment().getId();
                }
                if (assignment.getCurrentDepartment() != null && assignment.getCurrentDepartment().getId() != null) {
                    return assignment.getCurrentDepartment().getId();
                }
            }
        }

        if (currentUser.getDepartmentId() != null) {
            return currentUser.getDepartmentId();
        }

        throw new RuntimeException("Your account has no department for continuous feedback.");
    }

    private Team requireTeamInCurrentDepartment(Integer teamId) {
        if (teamId == null) {
            throw new RuntimeException("Team is required.");
        }

        Integer departmentId = requireCurrentUserDepartmentId();
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found."));

        if (team.getStatus() == null || !team.getStatus().equalsIgnoreCase("Active")) {
            throw new RuntimeException("Selected team is not active.");
        }

        Integer teamDepartmentId = team.getDepartment() == null ? null : team.getDepartment().getId();
        if (!Objects.equals(teamDepartmentId, departmentId)) {
            throw new UnauthorizedActionException("Selected team is outside your department.");
        }

        return team;
    }

    private Employee requireActiveEmployeeInScope(Integer employeeId, Integer departmentId, Team team) {
        if (team != null) {
            return getActiveEmployeesFromTeam(team)
                    .stream()
                    .filter(employee -> Objects.equals(employee.getId(), employeeId))
                    .findFirst()
                    .orElseThrow(() -> new UnauthorizedActionException("You can select only active employees from the selected team."));
        }

        return employeeRepository.findActiveDropdownEmployeesByDepartmentId(departmentId)
                .stream()
                .filter(employee -> Objects.equals(employee.getId(), employeeId))
                .findFirst()
                .orElseThrow(() -> new UnauthorizedActionException("You can select only active employees from your department."));
    }

    private List<TeamEmployeeOptionResponseDto> getActiveEmployeeOptions(Team team) {
        return getActiveEmployeesFromTeam(team).stream()
                .map(this::toEmployeeOption)
                .toList();
    }

    private List<Employee> getActiveEmployeesFromTeam(Team team) {
        Map<Integer, Employee> employees = new LinkedHashMap<>();

        addActiveEmployeeFromUser(employees, team.getTeamLeader());
        addActiveEmployeeFromUser(employees, team.getProjectManager());

        if (team.getTeamMembers() != null) {
            team.getTeamMembers().stream()
                    .filter(member -> member.getEndedDate() == null)
                    .map(TeamMember::getMemberUser)
                    .forEach(user -> addActiveEmployeeFromUser(employees, user));
        }

        return employees.values().stream().toList();
    }

    private void addActiveEmployeeFromUser(Map<Integer, Employee> employees, User user) {
        if (user == null || user.getEmployeeId() == null) {
            return;
        }

        if (user.getActive() != null && !Boolean.TRUE.equals(user.getActive())) {
            return;
        }

        employeeRepository.findById(user.getEmployeeId())
                .filter(employee -> employee.getActive() == null || Boolean.TRUE.equals(employee.getActive()))
                .ifPresent(employee -> employees.put(employee.getId(), employee));
    }

    private TeamEmployeeOptionResponseDto toEmployeeOption(Employee employee) {
        User user = userRepository.findActiveByEmployeeId(employee.getId()).orElse(null);

        return TeamEmployeeOptionResponseDto.builder()
                .id(employee.getId())
                .employeeId(employee.getId())
                .userId(user == null ? null : user.getId())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .email(employee.getEmail())
                .positionTitle(employee.getPosition() == null ? null : employee.getPosition().getPositionTitle())
                .build();
    }

    private Comparator<TeamEmployeeOptionResponseDto> employeeOptionComparator() {
        return Comparator
                .comparing(TeamEmployeeOptionResponseDto::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                .thenComparing(TeamEmployeeOptionResponseDto::getLastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
    }

    private TeamOptionResponseDto toTeamOption(Team team) {
        return TeamOptionResponseDto.builder()
                .id(team.getId())
                .teamName(team.getTeamName())
                .departmentId(team.getDepartment() == null ? null : team.getDepartment().getId())
                .departmentName(team.getDepartment() == null ? null : team.getDepartment().getDepartmentName())
                .teamLeaderId(team.getTeamLeader() == null ? null : team.getTeamLeader().getId())
                .teamLeaderName(displayUser(team.getTeamLeader()))
                .projectManagerId(team.getProjectManager() == null ? null : team.getProjectManager().getId())
                .projectManagerName(displayUser(team.getProjectManager()))
                .build();
    }

    private void notifyEmployee(ContinuousFeedback feedback) {
        userRepository.findActiveByEmployeeId(feedback.getEmployee().getId())
                .or(() -> userRepository.findByEmployeeId(feedback.getEmployee().getId()))
                .ifPresent(employeeUser -> notificationService.send(
                        employeeUser.getId(),
                        "New Continuous Feedback",
                        displayUser(feedback.getGiverUser())
                                + " gave you continuous feedback"
                                + (feedback.getTeam() == null ? "." : " for team " + feedback.getTeam().getTeamName() + "."),
                        "FEEDBACK"
                ));
    }

    private Integer resolveCurrentEmployeeId() {
        User currentUser = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new RuntimeException("Current user not found."));

        if (currentUser.getEmployeeId() != null) {
            return currentUser.getEmployeeId();
        }

        if (currentUser.getEmail() != null && !currentUser.getEmail().isBlank()) {
            return employeeRepository.findByEmail(currentUser.getEmail().trim())
                    .map(Employee::getId)
                    .orElse(null);
        }

        return null;
    }

    private ContinuousFeedbackResponseDto toResponse(ContinuousFeedback feedback) {
        return ContinuousFeedbackResponseDto.builder()
                .id(feedback.getId())
                .teamId(feedback.getTeam() == null ? null : feedback.getTeam().getId())
                .teamName(feedback.getTeam() == null ? null : feedback.getTeam().getTeamName())
                .employeeId(feedback.getEmployee() == null ? null : feedback.getEmployee().getId())
                .employeeName(displayEmployee(feedback.getEmployee()))
                .employeeEmail(feedback.getEmployee() == null ? null : feedback.getEmployee().getEmail())
                .giverUserId(feedback.getGiverUser() == null ? null : feedback.getGiverUser().getId())
                .giverName(displayUser(feedback.getGiverUser()))
                .giverEmail(feedback.getGiverUser() == null ? null : feedback.getGiverUser().getEmail())
                .feedbackText(feedback.getFeedbackText())
                .category(feedback.getCategory())
                .rating(feedback.getRating())
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }

    private String displayEmployee(Employee employee) {
        if (employee == null) {
            return null;
        }

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        if (!fullName.isEmpty()) {
            return fullName;
        }

        if (employee.getEmail() != null && !employee.getEmail().isBlank()) {
            return employee.getEmail();
        }

        return "Employee #" + employee.getId();
    }

    private String displayUser(User user) {
        if (user == null) {
            return "Someone";
        }

        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }

        return "User #" + user.getId();
    }
}

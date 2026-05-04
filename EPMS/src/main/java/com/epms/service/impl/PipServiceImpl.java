//package com.epms.service.impl;
//
//import com.epms.dto.*;
//import com.epms.entity.*;
//import com.epms.repository.*;
//import com.epms.security.SecurityUtils;
//import com.epms.service.NotificationService;
//import com.epms.service.PipService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.time.LocalDate;
//import java.time.LocalDateTime;
//import java.time.format.DateTimeFormatter;
//import java.util.*;
//
///**
// * Why this file exists:
// * - This is the main business logic for the new PIP feature.
// *
// * Main rules applied here:
// * - HR can view all PIPs but cannot create/update/finish.
// * - Team Leader/Manager can create PIP only for employees in their own team.
// * - Department Head can create PIP for every active employee in their department.
// * - Employee can view only their own PIP.
// * - Only one active PIP is allowed per employee.
// * - Inactive employees are not selectable.
// * - All important changes are saved in pip_updates for history tracking.
// */
//@Service
//@RequiredArgsConstructor
//public class PipServiceImpl implements PipService {
//
//    private static final int WORD_LIMIT = 1000;
//
//    private static final Set<String> PHASE_STATUSES = Set.of(
//            "HASNT_STARTED_YET",
//            "ONGOING",
//            "COMPLETED"
//    );
//
//    private static final DateTimeFormatter NOTIFICATION_DATE =
//            DateTimeFormatter.ofPattern("h:mm a d.M.yyyy");
//
//    private final PipRepository pipRepository;
//    private final PipPhaseRepository pipPhaseRepository;
//    private final PipUpdateRepository pipUpdateRepository;
//    private final UserRepository userRepository;
//    private final EmployeeRepository employeeRepository;
//    private final RoleRepository roleRepository;
//    private final UserRoleRepository userRoleRepository;
//    private final TeamRepository teamRepository;
//    private final NotificationService notificationService;
//
//    @Override
//    public List<PipEligibleEmployeeDto> getEligibleEmployees() {
//        User currentUser = getCurrentUser();
//
//        /*
//         * HR is view-only for this version.
//         * So HR should not get employee list for PIP creation.
//         */
//        if (isHr(currentUser)) {
//            return List.of();
//        }
//
//        List<User> candidates;
//
//        if (isDepartmentHead(currentUser)) {
//            /*
//             * Department Head can create PIP for every active employee in the same department.
//             */
//            candidates = userRepository.findByDepartmentIdAndActiveTrue(currentUser.getDepartmentId());
//        } else {
//            /*
//             * Team Leader/Manager can create PIP only for active members in their own active teams.
//             */
//            candidates = teamRepository.findByTeamLeaderId(currentUser.getId()).stream()
//                    .filter(Team::isActiveTeam)
//                    .flatMap(team -> team.getTeamMembers().stream())
//                    .filter(member -> member.getEndedDate() == null)
//                    .map(TeamMember::getMemberUser)
//                    .filter(Objects::nonNull)
//                    .filter(user -> Boolean.TRUE.equals(user.getActive()))
//                    .distinct()
//                    .toList();
//        }
//
//        return candidates.stream()
//                .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
//                .filter(this::hasActiveEmployeeRecord)
//                .map(user -> {
//                    boolean hasActivePip = pipRepository.existsByEmployeeUserIdAndStatusTrue(user.getId());
//
//                    return new PipEligibleEmployeeDto(
//                            user.getId(),
//                            displayName(user),
//                            user.getDepartmentId(),
//                            null,
//                            hasActivePip,
//                            hasActivePip ? "Already have PIP currently" : null
//                    );
//                })
//                .sorted(Comparator.comparing(PipEligibleEmployeeDto::getEmployeeName, String.CASE_INSENSITIVE_ORDER))
//                .toList();
//    }
//
//    @Override
//    @Transactional
//    public PipDetailResponseDto createPip(PipCreateRequestDto requestDto) {
//        User currentUser = getCurrentUser();
//        User employee = getUser(requestDto.getEmployeeUserId(), "Employee user not found.");
//
//        if (isHr(currentUser)) {
//            throw new RuntimeException("HR can view PIPs only and cannot create PIPs.");
//        }
//
//        if (!hasActiveEmployeeRecord(employee)) {
//            throw new RuntimeException("Inactive employees cannot be selected for PIP.");
//        }
//
//        if (pipRepository.existsByEmployeeUserIdAndStatusTrue(employee.getId())) {
//            throw new RuntimeException("This employee already has an active PIP currently.");
//        }
//
//        assertCanManageEmployee(currentUser, employee);
//        validateCreateRequest(requestDto);
//
//        Pip pip = new Pip();
//        pip.setEmployeeUserId(employee.getId());
//        pip.setCreatedByUserId(currentUser.getId());
//        pip.setGoal(clean(requestDto.getGoal()));
//        pip.setExpectedOutcomes(clean(requestDto.getExpectedOutcomes()));
//        pip.setStartDate(requestDto.getStartDate());
//        pip.setEndDate(requestDto.getEndDate());
//        pip.setStatus(true);
//        pip.setCreatedAt(LocalDateTime.now());
//
//        /*
//         * Status and reason/note are not filled during creation.
//         * Each phase starts as HASNT_STARTED_YET.
//         */
//        for (PipPhaseRequestDto phaseRequest : requestDto.getPhases()) {
//            PipPhase phase = new PipPhase();
//            phase.setPhaseNumber(phaseRequest.getPhaseNumber());
//            phase.setPhaseGoal(clean(phaseRequest.getPhaseGoal()));
//            phase.setStartDate(phaseRequest.getStartDate());
//            phase.setEndDate(phaseRequest.getEndDate());
//            phase.setStatus("HASNT_STARTED_YET");
//            phase.setCreatedAt(LocalDateTime.now());
//
//            pip.addPhase(phase);
//        }
//
//        Pip saved = pipRepository.save(pip);
//
//        addHistory(
//                saved.getId(),
//                null,
//                "PIP_CREATED",
//                null,
//                "Created",
//                "PIP created",
//                currentUser.getId(),
//                null
//        );
//
//        /*
//         * Notify employee after PIP is created.
//         */
//        notificationService.send(
//                employee.getId(),
//                "PIP",
//                displayName(currentUser) + " (" + positionName(currentUser) + ") created a PIP for you at "
//                        + LocalDateTime.now().format(NOTIFICATION_DATE)
//                        + ". The PIP will begin on " + saved.getStartDate() + ".",
//                "PIP"
//        );
//
//        return toDetail(saved, currentUser);
//    }
//
//    @Override
//    public List<PipDetailResponseDto> getOngoingPips() {
//        User currentUser = getCurrentUser();
//
//        return filterVisible(pipRepository.findByStatusTrueOrderByCreatedAtDesc(), currentUser)
//                .stream()
//                .map(pip -> toDetail(pip, currentUser))
//                .toList();
//    }
//
//    @Override
//    public List<PipDetailResponseDto> getPastPips() {
//        User currentUser = getCurrentUser();
//
//        return filterVisible(pipRepository.findByStatusFalseOrderByEndDateDesc(), currentUser)
//                .stream()
//                .map(pip -> toDetail(pip, currentUser))
//                .toList();
//    }
//
//    @Override
//    public PipDetailResponseDto getPipById(Integer id) {
//        User currentUser = getCurrentUser();
//        Pip pip = getPip(id);
//
//        if (!canView(currentUser, pip)) {
//            throw new RuntimeException("You are not allowed to view this PIP.");
//        }
//
//        return toDetail(pip, currentUser);
//    }
//
//    @Override
//    @Transactional
//    public PipDetailResponseDto updatePhase(Integer pipId, Integer phaseId, PipPhaseUpdateRequestDto requestDto) {
//        User currentUser = getCurrentUser();
//        Pip pip = getPip(pipId);
//
//        if (!Boolean.TRUE.equals(pip.getStatus())) {
//            throw new RuntimeException("Finished PIPs are view-only and cannot be edited.");
//        }
//
//        if (!canEdit(currentUser, pip)) {
//            throw new RuntimeException("You are not allowed to update this PIP.");
//        }
//
//        String newStatus = normalizePhaseStatus(requestDto.getStatus());
//        String reason = cleanNullable(requestDto.getReasonNote());
//
//        if (reason != null) {
//            assertWordLimit(reason, "Reason/Note");
//        }
//
//        PipPhase phase = pipPhaseRepository.findById(phaseId)
//                .orElseThrow(() -> new RuntimeException("PIP phase not found."));
//
//        if (phase.getPip() == null || !Objects.equals(phase.getPip().getId(), pipId)) {
//            throw new RuntimeException("Selected phase does not belong to this PIP.");
//        }
//
//        String oldValue = phase.getStatus() + " | " + nullToBlank(phase.getReasonNote());
//
//        phase.setStatus(newStatus);
//        phase.setReasonNote(reason);
//        phase.setUpdatedAt(LocalDateTime.now());
//        phase.setUpdatedByUserId(currentUser.getId());
//
//        pipPhaseRepository.save(phase);
//
//        String newValue = newStatus + " | " + nullToBlank(reason);
//
//        addHistory(
//                pipId,
//                phaseId,
//                "PHASE_UPDATED",
//                oldValue,
//                newValue,
//                reason,
//                currentUser.getId(),
//                newStatus
//        );
//
//        pip.setUpdatedAt(LocalDateTime.now());
//        pipRepository.save(pip);
//
//        return toDetail(getPip(pipId), currentUser);
//    }
//
//    @Override
//    @Transactional
//    public PipDetailResponseDto finishPip(Integer id, PipFinishRequestDto requestDto) {
//        User currentUser = getCurrentUser();
//        Pip pip = getPip(id);
//
//        if (!Boolean.TRUE.equals(pip.getStatus())) {
//            throw new RuntimeException("This PIP is already finished.");
//        }
//
//        if (!canEdit(currentUser, pip)) {
//            throw new RuntimeException("You are not allowed to finish this PIP.");
//        }
//
//        if (LocalDate.now().isBefore(pip.getEndDate())) {
//            throw new RuntimeException("FINISH is available only after the PIP end date.");
//        }
//
//        String comments = clean(requestDto.getComments());
//        assertWordLimit(comments, "Final comments");
//
//        pip.setComments(comments);
//        pip.setStatus(false);
//        pip.setFinishedAt(LocalDateTime.now());
//        pip.setFinishedByUserId(currentUser.getId());
//        pip.setUpdatedAt(LocalDateTime.now());
//
//        Pip saved = pipRepository.save(pip);
//
//        addHistory(
//                id,
//                null,
//                "PIP_FINISHED",
//                "active",
//                "finished",
//                comments,
//                currentUser.getId(),
//                "FINISHED"
//        );
//
//        return toDetail(saved, currentUser);
//    }
//
//    private void validateCreateRequest(PipCreateRequestDto request) {
//        LocalDate today = LocalDate.now();
//
//        if (request.getStartDate().isBefore(today)) {
//            throw new RuntimeException("PIP start date cannot be in the past.");
//        }
//
//        if (request.getEndDate().isBefore(today)) {
//            throw new RuntimeException("PIP end date cannot be in the past.");
//        }
//
//        if (!request.getEndDate().isAfter(request.getStartDate())) {
//            throw new RuntimeException("PIP end date must be after start date.");
//        }
//
//        assertWordLimit(request.getGoal(), "PIP goal");
//        assertWordLimit(request.getExpectedOutcomes(), "Expected outcomes");
//
//        List<PipPhaseRequestDto> phases = request.getPhases().stream()
//                .sorted(Comparator.comparing(PipPhaseRequestDto::getPhaseNumber))
//                .toList();
//
//        LocalDate previousEnd = null;
//        int expectedNumber = 1;
//
//        for (PipPhaseRequestDto phase : phases) {
//            if (!Objects.equals(phase.getPhaseNumber(), expectedNumber++)) {
//                throw new RuntimeException("Phase numbers must be sequential starting from 1.");
//            }
//
//            assertWordLimit(phase.getPhaseGoal(), "Phase " + phase.getPhaseNumber() + " goal");
//
//            if (phase.getStartDate().isBefore(today)) {
//                throw new RuntimeException("Phase start date cannot be in the past.");
//            }
//
//            if (!phase.getEndDate().isAfter(phase.getStartDate())) {
//                throw new RuntimeException("Phase end date must be after phase start date.");
//            }
//
//            if (phase.getStartDate().isBefore(request.getStartDate()) || phase.getEndDate().isAfter(request.getEndDate())) {
//                throw new RuntimeException("Phase dates must be inside the PIP start and end dates.");
//            }
//
//            if (previousEnd != null && phase.getStartDate().isBefore(previousEnd)) {
//                throw new RuntimeException("Next phase start date cannot be before previous phase end date.");
//            }
//
//            previousEnd = phase.getEndDate();
//        }
//    }
//
//    private void assertCanManageEmployee(User manager, User employee) {
//        if (!Objects.equals(manager.getDepartmentId(), employee.getDepartmentId())) {
//            throw new RuntimeException("The selected employee must be in your department.");
//        }
//
//        if (isDepartmentHead(manager)) {
//            return;
//        }
//
//        boolean isTeamLeaderForEmployee = teamRepository.findByTeamLeaderId(manager.getId()).stream()
//                .filter(Team::isActiveTeam)
//                .anyMatch(team -> team.hasMember(employee.getId()));
//
//        if (!isTeamLeaderForEmployee) {
//            throw new RuntimeException("Team Leader can create PIP only for employees in their own team.");
//        }
//    }
//
//    private List<Pip> filterVisible(List<Pip> pips, User currentUser) {
//        return pips.stream()
//                .filter(pip -> canView(currentUser, pip))
//                .toList();
//    }
//
//    private boolean canView(User currentUser, Pip pip) {
//        if (isHr(currentUser)) {
//            return true;
//        }
//
//        if (Objects.equals(currentUser.getId(), pip.getEmployeeUserId())) {
//            return true;
//        }
//
//        return canEdit(currentUser, pip);
//    }
//
//    private boolean canEdit(User currentUser, Pip pip) {
//        if (isHr(currentUser)) {
//            return false;
//        }
//
//        if (Objects.equals(currentUser.getId(), pip.getEmployeeUserId())) {
//            return false;
//        }
//
//        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");
//
//        try {
//            assertCanManageEmployee(currentUser, employee);
//            return true;
//        } catch (RuntimeException ex) {
//            return false;
//        }
//    }
//
//    private PipDetailResponseDto toDetail(Pip pip, User viewer) {
//        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");
//        User creator = getUser(pip.getCreatedByUserId(), "Creator user not found.");
//
//        User finishedBy = null;
//        if (pip.getFinishedByUserId() != null) {
//            finishedBy = userRepository.findById(pip.getFinishedByUserId()).orElse(null);
//        }
//
//        List<PipPhaseResponseDto> phaseDtos = pip.getPhases() == null
//                ? List.of()
//                : pip.getPhases().stream()
//                .sorted(Comparator.comparing(PipPhase::getPhaseNumber))
//                .map(this::toPhaseDto)
//                .toList();
//
//        List<PipUpdateHistoryDto> updateDtos = pipUpdateRepository.findByPipIdOrderByUpdatedAtDesc(pip.getId())
//                .stream()
//                .map(this::toHistoryDto)
//                .toList();
//
//        boolean editable = Boolean.TRUE.equals(pip.getStatus()) && canEdit(viewer, pip);
//        boolean finishable = editable && !LocalDate.now().isBefore(pip.getEndDate());
//
//        return new PipDetailResponseDto(
//                pip.getId(),
//                pip.getEmployeeUserId(),
//                displayName(employee),
//                pip.getCreatedByUserId(),
//                displayName(creator),
//                positionName(creator),
//                pip.getGoal(),
//                pip.getExpectedOutcomes(),
//                pip.getComments(),
//                pip.getStartDate(),
//                pip.getEndDate(),
//                pip.getStatus(),
//                pip.getCreatedAt(),
//                pip.getUpdatedAt(),
//                pip.getFinishedAt(),
//                pip.getFinishedByUserId(),
//                finishedBy == null ? null : displayName(finishedBy),
//                editable,
//                finishable,
//                phaseDtos,
//                updateDtos
//        );
//    }
//
//    private PipPhaseResponseDto toPhaseDto(PipPhase phase) {
//        User updatedBy = null;
//
//        if (phase.getUpdatedByUserId() != null) {
//            updatedBy = userRepository.findById(phase.getUpdatedByUserId()).orElse(null);
//        }
//
//        return new PipPhaseResponseDto(
//                phase.getId(),
//                phase.getPhaseNumber(),
//                phase.getPhaseGoal(),
//                phase.getStartDate(),
//                phase.getEndDate(),
//                phase.getStatus(),
//                phase.getReasonNote(),
//                phase.getUpdatedAt(),
//                phase.getUpdatedByUserId(),
//                updatedBy == null ? null : displayName(updatedBy)
//        );
//    }
//
//    private PipUpdateHistoryDto toHistoryDto(PipUpdate update) {
//        User updatedBy = null;
//
//        if (update.getUpdatedBy() != null) {
//            updatedBy = userRepository.findById(update.getUpdatedBy()).orElse(null);
//        }
//
//        return new PipUpdateHistoryDto(
//                update.getId(),
//                update.getPhaseId(),
//                update.getActionType(),
//                update.getOldValue(),
//                update.getNewValue(),
//                update.getComments(),
//                update.getUpdatedBy(),
//                updatedBy == null ? null : displayName(updatedBy),
//                update.getUpdatedAt()
//        );
//    }
//
//    private void addHistory(
//            Integer pipId,
//            Integer phaseId,
//            String actionType,
//            String oldValue,
//            String newValue,
//            String comments,
//            Integer updatedBy,
//            String status
//    ) {
//        PipUpdate history = new PipUpdate();
//        history.setPipId(pipId);
//        history.setPhaseId(phaseId);
//        history.setActionType(actionType);
//        history.setOldValue(oldValue);
//        history.setNewValue(newValue);
//        history.setComments(comments);
//        history.setUpdatedBy(updatedBy);
//        history.setUpdatedAt(LocalDateTime.now());
//        history.setStatus(status);
//
//        pipUpdateRepository.save(history);
//    }
//
//    private Pip getPip(Integer id) {
//        return pipRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("PIP not found."));
//    }
//
//    private User getCurrentUser() {
//        return getUser(SecurityUtils.currentUserId(), "Current user not found.");
//    }
//
//    private User getUser(Integer id, String errorMessage) {
//        return userRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException(errorMessage));
//    }
//
//    private boolean hasActiveEmployeeRecord(User user) {
//        if (user == null) {
//            return false;
//        }
//
//        if (!Boolean.TRUE.equals(user.getActive())) {
//            return false;
//        }
//
//        if (user.getEmployeeId() == null) {
//            return true;
//        }
//
//        return employeeRepository.findById(user.getEmployeeId())
//                .map(employee -> employee.getActive() == null || Boolean.TRUE.equals(employee.getActive()))
//                .orElse(false);
//    }
//
//    private boolean isHr(User user) {
//        return hasRole(user, "HR") || hasRole(user, "ROLE_HR");
//    }
//
//    private boolean isDepartmentHead(User user) {
//        return hasRole(user, "DEPARTMENT_HEAD")
//                || hasRole(user, "ROLE_DEPARTMENT_HEAD")
//                || hasRole(user, "DepartmentHead")
//                || hasRole(user, "Department Head");
//    }
//
//    private boolean hasRole(User user, String roleName) {
//        if (user == null || user.getId() == null || roleName == null) {
//            return false;
//        }
//
//        String expected = normalizeRole(roleName);
//
//        return userRoleRepository.findByUserId(user.getId()).stream()
//                .map(UserRole::getRoleId)
//                .filter(Objects::nonNull)
//                .map(roleRepository::findById)
//                .flatMap(Optional::stream)
//                .map(Role::getName)
//                .filter(Objects::nonNull)
//                .map(this::normalizeRole)
//                .anyMatch(expected::equals);
//    }
//
//    private String normalizeRole(String role) {
//        return role.trim()
//                .replace("ROLE_", "")
//                .replace(" ", "_")
//                .replace("-", "_")
//                .toUpperCase(Locale.ROOT);
//    }
//
//    private String normalizePhaseStatus(String status) {
//        if (status == null) {
//            throw new RuntimeException("Phase status is required.");
//        }
//
//        String normalized = status.trim().toUpperCase(Locale.ROOT);
//
//        if ("HAS_NOT_STARTED_YET".equals(normalized) || "NOT_STARTED".equals(normalized)) {
//            normalized = "HASNT_STARTED_YET";
//        }
//
//        if (!PHASE_STATUSES.contains(normalized)) {
//            throw new RuntimeException("Invalid phase status.");
//        }
//
//        return normalized;
//    }
//
//    private void assertWordLimit(String value, String fieldName) {
//        if (wordCount(value) > WORD_LIMIT) {
//            throw new RuntimeException(fieldName + " cannot exceed 1000 words.");
//        }
//    }
//
//    private int wordCount(String value) {
//        if (value == null || value.trim().isEmpty()) {
//            return 0;
//        }
//
//        return value.trim().split("\\s+").length;
//    }
//
//    private String clean(String value) {
//        if (value == null || value.trim().isEmpty()) {
//            throw new RuntimeException("Required text cannot be empty.");
//        }
//
//        return value.trim();
//    }
//
//    private String cleanNullable(String value) {
//        if (value == null || value.trim().isEmpty()) {
//            return null;
//        }
//
//        return value.trim();
//    }
//
//    private String nullToBlank(String value) {
//        return value == null ? "" : value;
//    }
//
//    private String displayName(User user) {
//        if (user == null) {
//            return "Unknown";
//        }
//
//        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
//            return user.getFullName().trim();
//        }
//
//        if (user.getEmail() != null) {
//            return user.getEmail();
//        }
//
//        return "User #" + user.getId();
//    }
//
//    private String positionName(User user) {
//        if (user == null || user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
//            return "Employee";
//        }
//
//        return user.getPosition().getPositionTitle();
//    }
//}








/*
package com.epms.service.impl;

import com.epms.dto.PipCreateRequestDto;
import com.epms.dto.PipDetailResponseDto;
import com.epms.dto.PipEligibleEmployeeDto;
import com.epms.dto.PipFinishRequestDto;
import com.epms.dto.PipPhaseRequestDto;
import com.epms.dto.PipPhaseResponseDto;
import com.epms.dto.PipPhaseUpdateRequestDto;
import com.epms.dto.PipUpdateHistoryDto;
import com.epms.entity.Employee;
import com.epms.entity.Pip;
import com.epms.entity.PipPhase;
import com.epms.entity.PipUpdate;
import com.epms.entity.Role;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.PipPhaseRepository;
import com.epms.repository.PipRepository;
import com.epms.repository.PipUpdateRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.NotificationService;
import com.epms.service.PipService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

*/
/**
 * Why this file exists:
 * - Holds the complete PIP business flow.
 *
 * Rules:
 * - HR can view all PIPs but cannot create/update/finish.
 * - Team Leader/Manager can create/update PIP only for employees in their own active team.
 * - Department Head can create/update PIP for active employees in their department.
 * - Employee can view only their own PIPs and cannot edit.
 * - Only one active PIP is allowed per employee.
 * - Active users and active employees only appear in the creation dropdown.
 * - Every create/update/finish action is recorded in pip_updates.
 * - PIP creation and finish send notifications.
 *//*

@Service
@RequiredArgsConstructor
public class PipServiceImpl implements PipService {

    private static final int WORD_LIMIT = 1000;

    private static final Set<String> PHASE_STATUSES = Set.of(
            "HASNT_STARTED_YET",
            "ONGOING",
            "COMPLETED"
    );

    private static final DateTimeFormatter NOTIFICATION_DATE =
            DateTimeFormatter.ofPattern("h:mm a d.M.yyyy");

    private final PipRepository pipRepository;
    private final PipPhaseRepository pipPhaseRepository;
    private final PipUpdateRepository pipUpdateRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final TeamRepository teamRepository;
    private final NotificationService notificationService;

    @Override
    public List<PipEligibleEmployeeDto> getEligibleEmployees() {
        User currentUser = getCurrentUser();

        if (isHr(currentUser)) {
            return List.of();
        }

        List<User> candidates;

        if (isDepartmentHead(currentUser)) {
            candidates = userRepository.findByDepartmentIdAndActiveTrue(currentUser.getDepartmentId());
        } else {
            candidates = teamRepository.findByTeamLeaderId(currentUser.getId()).stream()
                    .filter(Team::isActiveTeam)
                    .flatMap(team -> team.getTeamMembers().stream())
                    .filter(member -> member.getEndedDate() == null)
                    .map(TeamMember::getMemberUser)
                    .filter(Objects::nonNull)
                    .filter(user -> Boolean.TRUE.equals(user.getActive()))
                    .distinct()
                    .toList();
        }

        return candidates.stream()
                .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
                .filter(this::hasActiveEmployeeRecord)
                .map(user -> {
                    boolean hasActivePip = pipRepository.existsByEmployeeUserIdAndStatusTrue(user.getId());

                    return new PipEligibleEmployeeDto(
                            user.getId(),
                            displayName(user),
                            user.getDepartmentId(),
                            null,
                            hasActivePip,
                            hasActivePip ? "Already have PIP currently" : null
                    );
                })
                .sorted(Comparator.comparing(PipEligibleEmployeeDto::getEmployeeName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    @Transactional
    public PipDetailResponseDto createPip(PipCreateRequestDto requestDto) {
        User currentUser = getCurrentUser();
        User employee = getUser(requestDto.getEmployeeUserId(), "Employee user not found.");

        if (isHr(currentUser)) {
            throw new RuntimeException("HR can view PIPs only and cannot create PIPs.");
        }

        if (!hasActiveEmployeeRecord(employee)) {
            throw new RuntimeException("Inactive employees cannot be selected for PIP.");
        }

        if (pipRepository.existsByEmployeeUserIdAndStatusTrue(employee.getId())) {
            throw new RuntimeException("This employee already has an active PIP currently.");
        }

        assertCanManageEmployee(currentUser, employee);
        validateCreateRequest(requestDto);

        Pip pip = new Pip();
        pip.setEmployeeUserId(employee.getId());
        pip.setCreatedByUserId(currentUser.getId());
        pip.setGoal(clean(requestDto.getGoal()));
        pip.setExpectedOutcomes(clean(requestDto.getExpectedOutcomes()));
        pip.setStartDate(requestDto.getStartDate());
        pip.setEndDate(requestDto.getEndDate());
        pip.setStatus(true);
        pip.setCreatedAt(LocalDateTime.now());

        for (PipPhaseRequestDto phaseRequest : requestDto.getPhases()) {
            PipPhase phase = new PipPhase();
            phase.setPhaseNumber(phaseRequest.getPhaseNumber());
            phase.setPhaseGoal(clean(phaseRequest.getPhaseGoal()));
            phase.setStartDate(phaseRequest.getStartDate());
            phase.setEndDate(phaseRequest.getEndDate());
            phase.setStatus("HASNT_STARTED_YET");
            phase.setCreatedAt(LocalDateTime.now());
            pip.addPhase(phase);
        }

        Pip saved = pipRepository.save(pip);

        addHistory(
                saved.getId(),
                null,
                "PIP_CREATED",
                null,
                "Created",
                "PIP created",
                currentUser.getId(),
                null
        );

        notificationService.send(
                employee.getId(),
                "PIP Created",
                displayName(currentUser) + " (" + positionName(currentUser) + ") created a PIP for you at "
                        + LocalDateTime.now().format(NOTIFICATION_DATE)
                        + ". The PIP will begin on " + saved.getStartDate() + ".",
                "PIP"
        );

        notificationService.send(
                currentUser.getId(),
                "PIP Created",
                "You created a PIP for " + displayName(employee)
                        + ". The PIP will begin on " + saved.getStartDate() + ".",
                "PIP"
        );

        return toDetail(saved, currentUser);
    }

    @Override
    public List<PipDetailResponseDto> getOngoingPips() {
        User currentUser = getCurrentUser();

        return filterVisible(pipRepository.findByStatusTrueOrderByCreatedAtDesc(), currentUser)
                .stream()
                .map(pip -> toDetail(pip, currentUser))
                .toList();
    }

    @Override
    public List<PipDetailResponseDto> getPastPips() {
        User currentUser = getCurrentUser();

        return filterVisible(pipRepository.findByStatusFalseOrderByEndDateDesc(), currentUser)
                .stream()
                .map(pip -> toDetail(pip, currentUser))
                .toList();
    }

    @Override
    public PipDetailResponseDto getPipById(Integer id) {
        User currentUser = getCurrentUser();
        Pip pip = getPip(id);

        if (!canView(currentUser, pip)) {
            throw new RuntimeException("You are not allowed to view this PIP.");
        }

        return toDetail(pip, currentUser);
    }

    @Override
    @Transactional
    public PipDetailResponseDto updatePhase(Integer pipId, Integer phaseId, PipPhaseUpdateRequestDto requestDto) {
        User currentUser = getCurrentUser();
        Pip pip = getPip(pipId);

        if (!Boolean.TRUE.equals(pip.getStatus())) {
            throw new RuntimeException("Finished PIPs are view-only and cannot be edited.");
        }

        if (!canEdit(currentUser, pip)) {
            throw new RuntimeException("You are not allowed to update this PIP.");
        }

        String newStatus = normalizePhaseStatus(requestDto.getStatus());
        String reason = cleanNullable(requestDto.getReasonNote());

        if (reason != null) {
            assertWordLimit(reason, "Reason/Note");
        }

        PipPhase phase = pipPhaseRepository.findById(phaseId)
                .orElseThrow(() -> new RuntimeException("PIP phase not found."));

        if (phase.getPip() == null || !Objects.equals(phase.getPip().getId(), pipId)) {
            throw new RuntimeException("Selected phase does not belong to this PIP.");
        }

        String oldValue = phase.getStatus() + " | " + nullToBlank(phase.getReasonNote());

        phase.setStatus(newStatus);
        phase.setReasonNote(reason);
        phase.setUpdatedAt(LocalDateTime.now());
        phase.setUpdatedByUserId(currentUser.getId());
        pipPhaseRepository.save(phase);

        String newValue = newStatus + " | " + nullToBlank(reason);

        addHistory(
                pipId,
                phaseId,
                "PHASE_UPDATED",
                oldValue,
                newValue,
                reason,
                currentUser.getId(),
                newStatus
        );

        pip.setUpdatedAt(LocalDateTime.now());
        pipRepository.save(pip);

        return toDetail(getPip(pipId), currentUser);
    }

    @Override
    @Transactional
    public PipDetailResponseDto finishPip(Integer id, PipFinishRequestDto requestDto) {
        User currentUser = getCurrentUser();
        Pip pip = getPip(id);

        if (!Boolean.TRUE.equals(pip.getStatus())) {
            throw new RuntimeException("This PIP is already finished.");
        }

        if (!canEdit(currentUser, pip)) {
            throw new RuntimeException("You are not allowed to finish this PIP.");
        }

        if (LocalDate.now().isBefore(pip.getEndDate())) {
            throw new RuntimeException("FINISH is available only after the PIP end date.");
        }

        String comments = clean(requestDto.getComments());
        assertWordLimit(comments, "Final comments");

        pip.setComments(comments);
        pip.setStatus(false);
        pip.setFinishedAt(LocalDateTime.now());
        pip.setFinishedByUserId(currentUser.getId());
        pip.setUpdatedAt(LocalDateTime.now());

        Pip saved = pipRepository.save(pip);

        addHistory(
                id,
                null,
                "PIP_FINISHED",
                "active",
                "finished",
                comments,
                currentUser.getId(),
                "FINISHED"
        );

        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");

        notificationService.send(
                employee.getId(),
                "PIP Ended",
                "Your PIP \"" + pip.getGoal() + "\" has been finished by "
                        + displayName(currentUser) + " (" + positionName(currentUser) + ").",
                "PIP"
        );

        notificationService.send(
                currentUser.getId(),
                "PIP Ended",
                "You finished the PIP for " + displayName(employee) + ".",
                "PIP"
        );

        return toDetail(saved, currentUser);
    }

    private void validateCreateRequest(PipCreateRequestDto request) {
        LocalDate today = LocalDate.now();

        if (request.getStartDate().isBefore(today)) {
            throw new RuntimeException("PIP start date cannot be in the past.");
        }

        if (request.getEndDate().isBefore(today)) {
            throw new RuntimeException("PIP end date cannot be in the past.");
        }

        if (!request.getEndDate().isAfter(request.getStartDate())) {
            throw new RuntimeException("PIP end date must be after start date.");
        }

        assertWordLimit(request.getGoal(), "PIP goal");
        assertWordLimit(request.getExpectedOutcomes(), "Expected outcomes");

        List<PipPhaseRequestDto> phases = request.getPhases().stream()
                .sorted(Comparator.comparing(PipPhaseRequestDto::getPhaseNumber))
                .toList();

        LocalDate previousEnd = null;
        int expectedNumber = 1;

        for (PipPhaseRequestDto phase : phases) {
            if (!Objects.equals(phase.getPhaseNumber(), expectedNumber++)) {
                throw new RuntimeException("Phase numbers must be sequential starting from 1.");
            }

            assertWordLimit(phase.getPhaseGoal(), "Phase " + phase.getPhaseNumber() + " goal");

            if (phase.getStartDate().isBefore(today)) {
                throw new RuntimeException("Phase start date cannot be in the past.");
            }

            if (!phase.getEndDate().isAfter(phase.getStartDate())) {
                throw new RuntimeException("Phase end date must be after phase start date.");
            }

            if (phase.getStartDate().isBefore(request.getStartDate()) || phase.getEndDate().isAfter(request.getEndDate())) {
                throw new RuntimeException("Phase dates must be inside the PIP start and end dates.");
            }

            if (previousEnd != null && phase.getStartDate().isBefore(previousEnd)) {
                throw new RuntimeException("Next phase start date cannot be before previous phase end date.");
            }

            previousEnd = phase.getEndDate();
        }
    }

    private void assertCanManageEmployee(User manager, User employee) {
        if (!Objects.equals(manager.getDepartmentId(), employee.getDepartmentId())) {
            throw new RuntimeException("The selected employee must be in your department.");
        }

        if (isDepartmentHead(manager)) {
            return;
        }

        boolean isTeamLeaderForEmployee = teamRepository.findByTeamLeaderId(manager.getId()).stream()
                .filter(Team::isActiveTeam)
                .anyMatch(team -> team.hasMember(employee.getId()));

        if (!isTeamLeaderForEmployee) {
            throw new RuntimeException("Team Leader can create PIP only for employees in their own team.");
        }
    }

    private List<Pip> filterVisible(List<Pip> pips, User currentUser) {
        return pips.stream()
                .filter(pip -> canView(currentUser, pip))
                .toList();
    }

    private boolean canView(User currentUser, Pip pip) {
        if (isHr(currentUser)) {
            return true;
        }

        if (Objects.equals(currentUser.getId(), pip.getEmployeeUserId())) {
            return true;
        }

        return canEdit(currentUser, pip);
    }

    private boolean canEdit(User currentUser, Pip pip) {
        if (isHr(currentUser)) {
            return false;
        }

        if (Objects.equals(currentUser.getId(), pip.getEmployeeUserId())) {
            return false;
        }

        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");

        try {
            assertCanManageEmployee(currentUser, employee);
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private PipDetailResponseDto toDetail(Pip pip, User viewer) {
        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");
        User creator = getUser(pip.getCreatedByUserId(), "Creator user not found.");

        User finishedBy = null;
        if (pip.getFinishedByUserId() != null) {
            finishedBy = userRepository.findById(pip.getFinishedByUserId()).orElse(null);
        }

        List<PipPhaseResponseDto> phaseDtos = pip.getPhases() == null
                ? List.of()
                : pip.getPhases().stream()
                .sorted(Comparator.comparing(PipPhase::getPhaseNumber))
                .map(this::toPhaseDto)
                .toList();

        List<PipUpdateHistoryDto> updateDtos = pipUpdateRepository.findByPipIdOrderByUpdatedAtDesc(pip.getId())
                .stream()
                .map(this::toHistoryDto)
                .toList();

        boolean editable = Boolean.TRUE.equals(pip.getStatus()) && canEdit(viewer, pip);
        boolean finishable = editable && !LocalDate.now().isBefore(pip.getEndDate());

        return new PipDetailResponseDto(
                pip.getId(),
                pip.getEmployeeUserId(),
                displayName(employee),
                pip.getCreatedByUserId(),
                displayName(creator),
                positionName(creator),
                pip.getGoal(),
                pip.getExpectedOutcomes(),
                pip.getComments(),
                pip.getStartDate(),
                pip.getEndDate(),
                pip.getStatus(),
                pip.getCreatedAt(),
                pip.getUpdatedAt(),
                pip.getFinishedAt(),
                pip.getFinishedByUserId(),
                finishedBy == null ? null : displayName(finishedBy),
                editable,
                finishable,
                phaseDtos,
                updateDtos
        );
    }

    private PipPhaseResponseDto toPhaseDto(PipPhase phase) {
        User updatedBy = null;

        if (phase.getUpdatedByUserId() != null) {
            updatedBy = userRepository.findById(phase.getUpdatedByUserId()).orElse(null);
        }

        return new PipPhaseResponseDto(
                phase.getId(),
                phase.getPhaseNumber(),
                phase.getPhaseGoal(),
                phase.getStartDate(),
                phase.getEndDate(),
                phase.getStatus(),
                phase.getReasonNote(),
                phase.getUpdatedAt(),
                phase.getUpdatedByUserId(),
                updatedBy == null ? null : displayName(updatedBy)
        );
    }

    private PipUpdateHistoryDto toHistoryDto(PipUpdate update) {
        User updatedBy = null;

        if (update.getUpdatedBy() != null) {
            updatedBy = userRepository.findById(update.getUpdatedBy()).orElse(null);
        }

        return new PipUpdateHistoryDto(
                update.getId(),
                update.getPhaseId(),
                update.getActionType(),
                update.getOldValue(),
                update.getNewValue(),
                update.getComments(),
                update.getUpdatedBy(),
                updatedBy == null ? null : displayName(updatedBy),
                update.getUpdatedAt()
        );
    }

    private void addHistory(
            Integer pipId,
            Integer phaseId,
            String actionType,
            String oldValue,
            String newValue,
            String comments,
            Integer updatedBy,
            String status
    ) {
        PipUpdate history = new PipUpdate();
        history.setPipId(pipId);
        history.setPhaseId(phaseId);
        history.setActionType(actionType);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setComments(comments);
        history.setUpdatedBy(updatedBy);
        history.setUpdatedAt(LocalDateTime.now());
        history.setStatus(status);

        pipUpdateRepository.save(history);
    }

    private Pip getPip(Integer id) {
        return pipRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PIP not found."));
    }

    private User getCurrentUser() {
        return getUser(SecurityUtils.currentUserId(), "Current user not found.");
    }

    private User getUser(Integer id, String errorMessage) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(errorMessage));
    }

    private boolean hasActiveEmployeeRecord(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive())) {
            return false;
        }

        if (user.getEmployeeId() == null) {
            return true;
        }

        return employeeRepository.findById(user.getEmployeeId())
                .map(employee -> employee.getActive() == null || Boolean.TRUE.equals(employee.getActive()))
                .orElse(false);
    }

    private boolean isHr(User user) {
        return hasRole(user, "HR") || hasRole(user, "ROLE_HR");
    }

    private boolean isDepartmentHead(User user) {
        return hasRole(user, "DEPARTMENT_HEAD")
                || hasRole(user, "ROLE_DEPARTMENT_HEAD")
                || hasRole(user, "DepartmentHead")
                || hasRole(user, "Department Head");
    }

    private boolean hasRole(User user, String roleName) {
        if (user == null || user.getId() == null || roleName == null) {
            return false;
        }

        String expected = normalizeRole(roleName);

        return userRoleRepository.findByUserId(user.getId()).stream()
                .map(UserRole::getRoleId)
                .filter(Objects::nonNull)
                .map(roleRepository::findById)
                .flatMap(Optional::stream)
                .map(Role::getName)
                .filter(Objects::nonNull)
                .map(this::normalizeRole)
                .anyMatch(expected::equals);
    }

    private String normalizeRole(String role) {
        return role.trim()
                .replace("ROLE_", "")
                .replace(" ", "_")
                .replace("-", "_")
                .toUpperCase(Locale.ROOT);
    }

    private String normalizePhaseStatus(String status) {
        if (status == null) {
            throw new RuntimeException("Phase status is required.");
        }

        String normalized = status.trim().toUpperCase(Locale.ROOT);

        if ("HAS_NOT_STARTED_YET".equals(normalized) || "NOT_STARTED".equals(normalized)) {
            normalized = "HASNT_STARTED_YET";
        }

        if (!PHASE_STATUSES.contains(normalized)) {
            throw new RuntimeException("Invalid phase status.");
        }

        return normalized;
    }

    private void assertWordLimit(String value, String fieldName) {
        if (wordCount(value) > WORD_LIMIT) {
            throw new RuntimeException(fieldName + " cannot exceed 1000 words.");
        }
    }

    private int wordCount(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0;
        }

        return value.trim().split("\\s+").length;
    }

    private String clean(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException("Required text cannot be empty.");
        }

        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private String displayName(User user) {
        if (user == null) {
            return "Unknown";
        }

        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
            return user.getFullName().trim();
        }

        if (user.getEmail() != null) {
            return user.getEmail();
        }

        return "User #" + user.getId();
    }

    private String positionName(User user) {
        if (user == null || user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
            return "Employee";
        }

        return user.getPosition().getPositionTitle();
    }
}*/








package com.epms.service.impl;

import com.epms.dto.PipCreateRequestDto;
import com.epms.dto.PipDetailResponseDto;
import com.epms.dto.PipEligibleEmployeeDto;
import com.epms.dto.PipFinishRequestDto;
import com.epms.dto.PipPhaseRequestDto;
import com.epms.dto.PipPhaseResponseDto;
import com.epms.dto.PipPhaseUpdateRequestDto;
import com.epms.dto.PipUpdateHistoryDto;
import com.epms.entity.Employee;
import com.epms.entity.Pip;
import com.epms.entity.PipPhase;
import com.epms.entity.PipUpdate;
import com.epms.entity.Role;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.PipPhaseRepository;
import com.epms.repository.PipRepository;
import com.epms.repository.PipUpdateRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.NotificationService;
import com.epms.service.PipService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Why this file is fixed:
 * - The PIP creator must always be able to see their own ongoing/past PIPs.
 * - Manager-created PIPs were saved correctly, but list filtering could hide them
 *   if team relationship lookup failed later.
 * - canView() and canEdit() now first check createdByUserId.
 */
@Service
@RequiredArgsConstructor
public class PipServiceImpl implements PipService {

    private static final int WORD_LIMIT = 1000;

    private static final Set<String> PHASE_STATUSES = Set.of(
            "HASNT_STARTED_YET",
            "ONGOING",
            "COMPLETED"
    );

    private static final DateTimeFormatter NOTIFICATION_DATE =
            DateTimeFormatter.ofPattern("h:mm a d.M.yyyy");

    private final PipRepository pipRepository;
    private final PipPhaseRepository pipPhaseRepository;
    private final PipUpdateRepository pipUpdateRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final TeamRepository teamRepository;
    private final NotificationService notificationService;

    @Override
    public List<PipEligibleEmployeeDto> getEligibleEmployees() {
        User currentUser = getCurrentUser();

        if (isHr(currentUser)) {
            return List.of();
        }

        List<User> candidates;

        if (isDepartmentHead(currentUser)) {
            candidates = userRepository.findByDepartmentIdAndActiveTrue(currentUser.getDepartmentId());
        } else {
            candidates = teamRepository.findByTeamLeaderId(currentUser.getId()).stream()
                    .filter(Team::isActiveTeam)
                    .flatMap(team -> team.getTeamMembers().stream())
                    .filter(member -> member.getEndedDate() == null)
                    .map(TeamMember::getMemberUser)
                    .filter(Objects::nonNull)
                    .filter(user -> Boolean.TRUE.equals(user.getActive()))
                    .distinct()
                    .toList();
        }

        return candidates.stream()
                .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
                .filter(this::hasActiveEmployeeRecord)
                .map(user -> {
                    boolean hasActivePip = pipRepository.existsByEmployeeUserIdAndStatusTrue(user.getId());

                    return new PipEligibleEmployeeDto(
                            user.getId(),
                            displayName(user),
                            user.getDepartmentId(),
                            null,
                            hasActivePip,
                            hasActivePip ? "Already have PIP currently" : null
                    );
                })
                .sorted(Comparator.comparing(PipEligibleEmployeeDto::getEmployeeName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    @Transactional
    public PipDetailResponseDto createPip(PipCreateRequestDto requestDto) {
        User currentUser = getCurrentUser();
        User employee = getUser(requestDto.getEmployeeUserId(), "Employee user not found.");

        if (isHr(currentUser)) {
            throw new RuntimeException("HR can view PIPs only and cannot create PIPs.");
        }

        if (!hasActiveEmployeeRecord(employee)) {
            throw new RuntimeException("Inactive employees cannot be selected for PIP.");
        }

        if (pipRepository.existsByEmployeeUserIdAndStatusTrue(employee.getId())) {
            throw new RuntimeException("This employee already has an active PIP currently.");
        }

        assertCanManageEmployee(currentUser, employee);
        validateCreateRequest(requestDto);

        Pip pip = new Pip();
        pip.setEmployeeUserId(employee.getId());
        pip.setCreatedByUserId(currentUser.getId());
        pip.setGoal(clean(requestDto.getGoal()));
        pip.setExpectedOutcomes(clean(requestDto.getExpectedOutcomes()));
        pip.setStartDate(requestDto.getStartDate());
        pip.setEndDate(requestDto.getEndDate());
        pip.setStatus(true);
        pip.setCreatedAt(LocalDateTime.now());

        for (PipPhaseRequestDto phaseRequest : requestDto.getPhases()) {
            PipPhase phase = new PipPhase();
            phase.setPhaseNumber(phaseRequest.getPhaseNumber());
            phase.setPhaseGoal(clean(phaseRequest.getPhaseGoal()));
            phase.setStartDate(phaseRequest.getStartDate());
            phase.setEndDate(phaseRequest.getEndDate());
            phase.setStatus("HASNT_STARTED_YET");
            phase.setCreatedAt(LocalDateTime.now());
            pip.addPhase(phase);
        }

        Pip saved = pipRepository.save(pip);

        addHistory(
                saved.getId(),
                null,
                "PIP_CREATED",
                null,
                "Created",
                "PIP created",
                currentUser.getId(),
                null
        );

        notificationService.send(
                employee.getId(),
                "PIP Created",
                displayName(currentUser) + " (" + positionName(currentUser) + ") created a PIP for you at "
                        + LocalDateTime.now().format(NOTIFICATION_DATE)
                        + ". The PIP will begin on " + saved.getStartDate() + ".",
                "PIP"
        );

        notificationService.send(
                currentUser.getId(),
                "PIP Created",
                "You created a PIP for " + displayName(employee)
                        + ". The PIP will begin on " + saved.getStartDate() + ".",
                "PIP"
        );

        return toDetail(saved, currentUser);
    }

    @Override
    public List<PipDetailResponseDto> getOngoingPips() {
        User currentUser = getCurrentUser();

        return filterVisible(pipRepository.findByStatusTrueOrderByCreatedAtDesc(), currentUser)
                .stream()
                .map(pip -> toDetail(pip, currentUser))
                .toList();
    }

    @Override
    public List<PipDetailResponseDto> getPastPips() {
        User currentUser = getCurrentUser();

        return filterVisible(pipRepository.findByStatusFalseOrderByEndDateDesc(), currentUser)
                .stream()
                .map(pip -> toDetail(pip, currentUser))
                .toList();
    }

    @Override
    public PipDetailResponseDto getPipById(Integer id) {
        User currentUser = getCurrentUser();
        Pip pip = getPip(id);

        if (!canView(currentUser, pip)) {
            throw new RuntimeException("You are not allowed to view this PIP.");
        }

        return toDetail(pip, currentUser);
    }

    @Override
    @Transactional
    public PipDetailResponseDto updatePhase(Integer pipId, Integer phaseId, PipPhaseUpdateRequestDto requestDto) {
        User currentUser = getCurrentUser();
        Pip pip = getPip(pipId);

        if (!Boolean.TRUE.equals(pip.getStatus())) {
            throw new RuntimeException("Finished PIPs are view-only and cannot be edited.");
        }

        if (!canEdit(currentUser, pip)) {
            throw new RuntimeException("You are not allowed to update this PIP.");
        }

        String newStatus = normalizePhaseStatus(requestDto.getStatus());
        String reason = cleanNullable(requestDto.getReasonNote());

        if (reason != null) {
            assertWordLimit(reason, "Reason/Note");
        }

        PipPhase phase = pipPhaseRepository.findById(phaseId)
                .orElseThrow(() -> new RuntimeException("PIP phase not found."));

        if (phase.getPip() == null || !Objects.equals(phase.getPip().getId(), pipId)) {
            throw new RuntimeException("Selected phase does not belong to this PIP.");
        }

        String oldValue = phase.getStatus() + " | " + nullToBlank(phase.getReasonNote());

        phase.setStatus(newStatus);
        phase.setReasonNote(reason);
        phase.setUpdatedAt(LocalDateTime.now());
        phase.setUpdatedByUserId(currentUser.getId());
        pipPhaseRepository.save(phase);

        String newValue = newStatus + " | " + nullToBlank(reason);

        addHistory(
                pipId,
                phaseId,
                "PHASE_UPDATED",
                oldValue,
                newValue,
                reason,
                currentUser.getId(),
                newStatus
        );

        pip.setUpdatedAt(LocalDateTime.now());
        pipRepository.save(pip);

        User pipEmployee = getUser(pip.getEmployeeUserId(), "Employee user not found.");
        StringBuilder phaseNote = new StringBuilder();
        phaseNote.append("Phase ").append(phase.getPhaseNumber()).append(" of your PIP");
        String goalPrev = pipGoalPreview(pip.getGoal());
        if (!goalPrev.isEmpty()) {
            phaseNote.append(" \"" + goalPrev + "\"");
        }
        phaseNote.append(" was updated to ").append(phaseStatusForNotification(newStatus)).append(".");
        if (reason != null && !reason.isBlank()) {
            String note = reason.length() > 300 ? reason.substring(0, 297).trim() + "..." : reason;
            phaseNote.append(" Note: ").append(note);
        }

        notificationService.send(
                pipEmployee.getId(),
                "PIP Phase Updated",
                phaseNote.toString(),
                "PIP"
        );

        return toDetail(getPip(pipId), currentUser);
    }

    @Override
    @Transactional
    public PipDetailResponseDto finishPip(Integer id, PipFinishRequestDto requestDto) {
        User currentUser = getCurrentUser();
        Pip pip = getPip(id);

        if (!Boolean.TRUE.equals(pip.getStatus())) {
            throw new RuntimeException("This PIP is already finished.");
        }

        if (!canEdit(currentUser, pip)) {
            throw new RuntimeException("You are not allowed to finish this PIP.");
        }

        if (LocalDate.now().isBefore(pip.getEndDate())) {
            throw new RuntimeException("FINISH is available only after the PIP end date.");
        }

        String comments = clean(requestDto.getComments());
        assertWordLimit(comments, "Final comments");

        pip.setComments(comments);
        pip.setStatus(false);
        pip.setFinishedAt(LocalDateTime.now());
        pip.setFinishedByUserId(currentUser.getId());
        pip.setUpdatedAt(LocalDateTime.now());

        Pip saved = pipRepository.save(pip);

        addHistory(
                id,
                null,
                "PIP_FINISHED",
                "active",
                "finished",
                comments,
                currentUser.getId(),
                "FINISHED"
        );

        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");

        notificationService.send(
                employee.getId(),
                "PIP Ended",
                "Your PIP \"" + pip.getGoal() + "\" has been finished by "
                        + displayName(currentUser) + " (" + positionName(currentUser) + ").",
                "PIP"
        );

        notificationService.send(
                currentUser.getId(),
                "PIP Ended",
                "You finished the PIP for " + displayName(employee) + ".",
                "PIP"
        );

        return toDetail(saved, currentUser);
    }

    private void validateCreateRequest(PipCreateRequestDto request) {
        LocalDate today = LocalDate.now();

        if (request.getStartDate().isBefore(today)) {
            throw new RuntimeException("PIP start date cannot be in the past.");
        }

        if (request.getEndDate().isBefore(today)) {
            throw new RuntimeException("PIP end date cannot be in the past.");
        }

        if (!request.getEndDate().isAfter(request.getStartDate())) {
            throw new RuntimeException("PIP end date must be after start date.");
        }

        assertWordLimit(request.getGoal(), "PIP goal");
        assertWordLimit(request.getExpectedOutcomes(), "Expected outcomes");

        List<PipPhaseRequestDto> phases = request.getPhases().stream()
                .sorted(Comparator.comparing(PipPhaseRequestDto::getPhaseNumber))
                .toList();

        LocalDate previousEnd = null;
        int expectedNumber = 1;

        for (PipPhaseRequestDto phase : phases) {
            if (!Objects.equals(phase.getPhaseNumber(), expectedNumber++)) {
                throw new RuntimeException("Phase numbers must be sequential starting from 1.");
            }

            assertWordLimit(phase.getPhaseGoal(), "Phase " + phase.getPhaseNumber() + " goal");

            if (phase.getStartDate().isBefore(today)) {
                throw new RuntimeException("Phase start date cannot be in the past.");
            }

            if (!phase.getEndDate().isAfter(phase.getStartDate())) {
                throw new RuntimeException("Phase end date must be after phase start date.");
            }

            if (phase.getStartDate().isBefore(request.getStartDate()) || phase.getEndDate().isAfter(request.getEndDate())) {
                throw new RuntimeException("Phase dates must be inside the PIP start and end dates.");
            }

            if (previousEnd != null && phase.getStartDate().isBefore(previousEnd)) {
                throw new RuntimeException("Next phase start date cannot be before previous phase end date.");
            }

            previousEnd = phase.getEndDate();
        }
    }

    private void assertCanManageEmployee(User manager, User employee) {
        if (!Objects.equals(manager.getDepartmentId(), employee.getDepartmentId())) {
            throw new RuntimeException("The selected employee must be in your department.");
        }

        if (isDepartmentHead(manager)) {
            return;
        }

        boolean isTeamLeaderForEmployee = teamRepository.findByTeamLeaderId(manager.getId()).stream()
                .filter(Team::isActiveTeam)
                .anyMatch(team -> team.hasMember(employee.getId()));

        if (!isTeamLeaderForEmployee) {
            throw new RuntimeException("Team Leader can create PIP only for employees in their own team.");
        }
    }

    private List<Pip> filterVisible(List<Pip> pips, User currentUser) {
        return pips.stream()
                .filter(pip -> canView(currentUser, pip))
                .toList();
    }

    private boolean canView(User currentUser, Pip pip) {
        if (isHr(currentUser)) {
            return true;
        }

        if (Objects.equals(currentUser.getId(), pip.getEmployeeUserId())) {
            return true;
        }

        if (Objects.equals(currentUser.getId(), pip.getCreatedByUserId())) {
            return true;
        }

        return canEdit(currentUser, pip);
    }

    private boolean canEdit(User currentUser, Pip pip) {
        if (isHr(currentUser)) {
            return false;
        }

        if (Objects.equals(currentUser.getId(), pip.getEmployeeUserId())) {
            return false;
        }

        if (Objects.equals(currentUser.getId(), pip.getCreatedByUserId())) {
            return true;
        }

        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");

        try {
            assertCanManageEmployee(currentUser, employee);
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private PipDetailResponseDto toDetail(Pip pip, User viewer) {
        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");
        User creator = getUser(pip.getCreatedByUserId(), "Creator user not found.");

        User finishedBy = null;
        if (pip.getFinishedByUserId() != null) {
            finishedBy = userRepository.findById(pip.getFinishedByUserId()).orElse(null);
        }

        List<PipPhaseResponseDto> phaseDtos = pip.getPhases() == null
                ? List.of()
                : pip.getPhases().stream()
                .sorted(Comparator.comparing(PipPhase::getPhaseNumber))
                .map(this::toPhaseDto)
                .toList();

        List<PipUpdateHistoryDto> updateDtos = pipUpdateRepository.findByPipIdOrderByUpdatedAtDesc(pip.getId())
                .stream()
                .map(this::toHistoryDto)
                .toList();

        boolean editable = Boolean.TRUE.equals(pip.getStatus()) && canEdit(viewer, pip);
        boolean finishable = editable && !LocalDate.now().isBefore(pip.getEndDate());

        return new PipDetailResponseDto(
                pip.getId(),
                pip.getEmployeeUserId(),
                displayName(employee),
                pip.getCreatedByUserId(),
                displayName(creator),
                positionName(creator),
                pip.getGoal(),
                pip.getExpectedOutcomes(),
                pip.getComments(),
                pip.getStartDate(),
                pip.getEndDate(),
                pip.getStatus(),
                pip.getCreatedAt(),
                pip.getUpdatedAt(),
                pip.getFinishedAt(),
                pip.getFinishedByUserId(),
                finishedBy == null ? null : displayName(finishedBy),
                editable,
                finishable,
                phaseDtos,
                updateDtos
        );
    }

    private PipPhaseResponseDto toPhaseDto(PipPhase phase) {
        User updatedBy = null;

        if (phase.getUpdatedByUserId() != null) {
            updatedBy = userRepository.findById(phase.getUpdatedByUserId()).orElse(null);
        }

        return new PipPhaseResponseDto(
                phase.getId(),
                phase.getPhaseNumber(),
                phase.getPhaseGoal(),
                phase.getStartDate(),
                phase.getEndDate(),
                phase.getStatus(),
                phase.getReasonNote(),
                phase.getUpdatedAt(),
                phase.getUpdatedByUserId(),
                updatedBy == null ? null : displayName(updatedBy)
        );
    }

    private PipUpdateHistoryDto toHistoryDto(PipUpdate update) {
        User updatedBy = null;

        if (update.getUpdatedBy() != null) {
            updatedBy = userRepository.findById(update.getUpdatedBy()).orElse(null);
        }

        return new PipUpdateHistoryDto(
                update.getId(),
                update.getPhaseId(),
                update.getActionType(),
                update.getOldValue(),
                update.getNewValue(),
                update.getComments(),
                update.getUpdatedBy(),
                updatedBy == null ? null : displayName(updatedBy),
                update.getUpdatedAt()
        );
    }

    private void addHistory(
            Integer pipId,
            Integer phaseId,
            String actionType,
            String oldValue,
            String newValue,
            String comments,
            Integer updatedBy,
            String status
    ) {
        PipUpdate history = new PipUpdate();
        history.setPipId(pipId);
        history.setPhaseId(phaseId);
        history.setActionType(actionType);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setComments(comments);
        history.setUpdatedBy(updatedBy);
        history.setUpdatedAt(LocalDateTime.now());
        history.setStatus(status);

        pipUpdateRepository.save(history);
    }

    private Pip getPip(Integer id) {
        return pipRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PIP not found."));
    }

    private User getCurrentUser() {
        return getUser(SecurityUtils.currentUserId(), "Current user not found.");
    }

    private User getUser(Integer id, String errorMessage) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(errorMessage));
    }

    private boolean hasActiveEmployeeRecord(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive())) {
            return false;
        }

        if (user.getEmployeeId() == null) {
            return true;
        }

        return employeeRepository.findById(user.getEmployeeId())
                .map(employee -> employee.getActive() == null || Boolean.TRUE.equals(employee.getActive()))
                .orElse(false);
    }

    private boolean isHr(User user) {
        return hasRole(user, "HR") || hasRole(user, "ROLE_HR");
    }

    private boolean isDepartmentHead(User user) {
        return hasRole(user, "DEPARTMENT_HEAD")
                || hasRole(user, "ROLE_DEPARTMENT_HEAD")
                || hasRole(user, "DepartmentHead")
                || hasRole(user, "Department Head");
    }

    private boolean hasRole(User user, String roleName) {
        if (user == null || user.getId() == null || roleName == null) {
            return false;
        }

        String expected = normalizeRole(roleName);

        return userRoleRepository.findByUserId(user.getId()).stream()
                .map(UserRole::getRoleId)
                .filter(Objects::nonNull)
                .map(roleRepository::findById)
                .flatMap(Optional::stream)
                .map(Role::getName)
                .filter(Objects::nonNull)
                .map(this::normalizeRole)
                .anyMatch(expected::equals);
    }

    private String normalizeRole(String role) {
        return role.trim()
                .replace("ROLE_", "")
                .replace(" ", "_")
                .replace("-", "_")
                .toUpperCase(Locale.ROOT);
    }

    private String normalizePhaseStatus(String status) {
        if (status == null) {
            throw new RuntimeException("Phase status is required.");
        }

        String normalized = status.trim().toUpperCase(Locale.ROOT);

        if ("HAS_NOT_STARTED_YET".equals(normalized) || "NOT_STARTED".equals(normalized)) {
            normalized = "HASNT_STARTED_YET";
        }

        if (!PHASE_STATUSES.contains(normalized)) {
            throw new RuntimeException("Invalid phase status.");
        }

        return normalized;
    }

    private String pipGoalPreview(String goal) {
        if (goal == null || goal.isBlank()) {
            return "";
        }
        String g = goal.trim();
        return g.length() <= 120 ? g : g.substring(0, 117).trim() + "...";
    }

    private String phaseStatusForNotification(String normalizedStatus) {
        return switch (normalizedStatus) {
            case "HASNT_STARTED_YET" -> "Not started yet";
            case "ONGOING" -> "Ongoing";
            case "COMPLETED" -> "Completed";
            default -> normalizedStatus.replace('_', ' ').toLowerCase(Locale.ROOT);
        };
    }

    private void assertWordLimit(String value, String fieldName) {
        if (wordCount(value) > WORD_LIMIT) {
            throw new RuntimeException(fieldName + " cannot exceed 1000 words.");
        }
    }

    private int wordCount(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0;
        }

        return value.trim().split("\\s+").length;
    }

    private String clean(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException("Required text cannot be empty.");
        }

        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private String displayName(User user) {
        if (user == null) {
            return "Unknown";
        }

        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
            return user.getFullName().trim();
        }

        if (user.getEmail() != null) {
            return user.getEmail();
        }

        return "User #" + user.getId();
    }

    private String positionName(User user) {
        if (user == null || user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
            return "Employee";
        }

        return user.getPosition().getPositionTitle();
    }
}
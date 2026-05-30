package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignTargetResponse;
import com.epms.dto.FeedbackCampaignTargetsResponse;
import com.epms.dto.FeedbackTargetCandidateResponse;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.Position;
import com.epms.entity.PositionLevel;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import com.epms.service.FeedbackCampaignTargetService;
import com.epms.service.FeedbackOperationalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignTargetServiceImpl implements FeedbackCampaignTargetService {

    private static final Set<String> TARGET_LEVEL_CODES = Set.of("L05", "L06", "L07");
    private static final Set<String> TARGET_EXCLUDED_ROLES = Set.of(
            "HRADMIN", "HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES", "HR_MANAGER", "HR_ADMIN",
            "CEO", "EXECUTIVE", "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT"
    );

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackCampaignQuestionReviewService questionReviewService;

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackTargetCandidateResponse> searchTargetCandidates(
            String search,
            Integer currentDepartmentId,
            Integer parentDepartmentId,
            Integer teamId,
            String readiness,
            String levelCode,
            Long actorUserId
    ) {
        String normalizedSearch = normalizeSearch(search);
        String normalizedReadiness = normalizeFilter(readiness);
        String normalizedLevelCode = normalizeLevelCode(levelCode);

        return buildTargetContextMap(actorUserId).values().stream()
                .filter(context -> matchesSearch(context, normalizedSearch))
                .filter(context -> currentDepartmentId == null || Objects.equals(context.currentDepartmentId, currentDepartmentId))
                .filter(context -> parentDepartmentId == null || Objects.equals(context.parentDepartmentId, parentDepartmentId))
                .filter(context -> teamId == null || context.activeTeamIds.contains(teamId))
                .filter(context -> normalizedLevelCode == null || Objects.equals(normalizeLevelCode(context.levelCode), normalizedLevelCode))
                .filter(context -> matchesReadiness(context, normalizedReadiness))
                .sorted(Comparator.comparing(context -> context.employeeName.toLowerCase()))
                .map(this::toCandidateResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignTargetsResponse getCampaignTargets(Long campaignId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        Map<Long, TargetContext> contexts = buildTargetContextMap(campaign.getCreatedByUserId());
        List<FeedbackCampaignTargetResponse> targets = requests.stream()
                .map(request -> toCampaignTargetResponse(request, contexts.get(request.getTargetEmployeeId())))
                .toList();
        return buildTargetsResponse(campaign, targets);
    }

    @Override
    @Transactional
    public FeedbackCampaignTargetsResponse updateTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId) {
        replaceTargets(campaignId, targetEmployeeIds, requestedByUserId);
        return getCampaignTargets(campaignId);
    }

    @Override
    @Transactional
    public List<FeedbackRequest> replaceTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureDraftCampaign(campaign, "Only DRAFT campaigns can be reconfigured.");

        Set<Long> uniqueTargetIds = normalizeTargetIds(targetEmployeeIds);
        Map<Long, TargetContext> contexts = buildTargetContextMap(campaign.getCreatedByUserId() != null ? campaign.getCreatedByUserId() : requestedByUserId);
        List<TargetContext> selectedContexts = uniqueTargetIds.stream()
                .map(targetEmployeeId -> {
                    TargetContext context = contexts.get(targetEmployeeId);
                    if (context == null) {
                        throw new ResourceNotFoundException("Target employee not found: " + targetEmployeeId + ".");
                    }
                    if (!context.blockReasons.isEmpty()) {
                        throw new BusinessValidationException("Some selected employees are not available for this campaign.");
                    }
                    return context;
                })
                .toList();

        List<FeedbackRequest> existingRequests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (!existingRequests.isEmpty()) {
            // Draft target changes intentionally clear old generated assignments because assignment pools
            // depend on target, department, manager, and team readiness snapshots.
            assignmentRepository.deleteByFeedbackRequestCampaignId(campaignId);
            assignmentRepository.flush();
            feedbackRequestRepository.deleteAllInBatch(existingRequests);
            feedbackRequestRepository.flush();
            questionReviewService.clearCampaignQuestionSelection(campaignId);
        }

        List<FeedbackRequest> newRequests = selectedContexts.stream()
                .map(context -> buildRequest(campaign, context, requestedByUserId))
                .toList();
        List<FeedbackRequest> saved = feedbackRequestRepository.saveAll(newRequests);
        feedbackOperationalService.audit(
                requestedByUserId,
                FeedbackOperationalService.TARGETS_UPDATED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                null,
                "targetCount=" + saved.size(),
                "Feedback campaign targets replaced"
        );
        return saved;
    }

    private FeedbackCampaign getCampaignById(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    private void ensureDraftCampaign(FeedbackCampaign campaign, String message) {
        if (campaign.getStatus() != FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException(message);
        }
    }

    private FeedbackRequest buildRequest(FeedbackCampaign campaign, TargetContext context, Long requestedByUserId) {
        FeedbackRequest request = new FeedbackRequest();
        request.setCampaign(campaign);
        request.setTargetEmployeeId(context.employeeId);
        request.setForm(null);
        request.setRequestedByUserId(requestedByUserId);
        request.setDueAt(null);
        request.setIsAnonymousEnabled(false);
        request.setStatus(FeedbackRequestStatus.PENDING);

        request.setTargetUserId(context.userId);
        request.setTargetEmployeeCode(context.employeeCode);
        request.setTargetEmployeeName(context.employeeName);
        request.setTargetEmployeeEmail(context.email);
        request.setTargetParentDepartmentId(context.parentDepartmentId);
        request.setTargetParentDepartmentName(context.parentDepartmentName);
        request.setTargetCurrentDepartmentId(context.currentDepartmentId);
        request.setTargetCurrentDepartmentName(context.currentDepartmentName);
        request.setTargetPositionId(context.positionId);
        request.setTargetPositionName(context.positionName);
        request.setTargetLevelCode(context.levelCode);
        request.setTargetManagerUserId(context.managerUserId);
        request.setTargetManagerEmployeeId(context.managerEmployeeId);
        request.setTargetManagerName(context.managerName);
        request.setTargetEmploymentStatus(context.employmentStatus);
        request.setTargetWarningSnapshot(joinSnapshotMessages(context));
        request.setSelectedAt(LocalDateTime.now());
        request.setSelectedByUserId(requestedByUserId);
        return request;
    }

    private Map<Long, TargetContext> buildTargetContextMap() {
        return buildTargetContextMap(null);
    }

    private Map<Long, TargetContext> buildTargetContextMap(Long excludedTargetUserId) {
        List<Employee> employees = employeeRepository.findAll();
        Map<Integer, Employee> employeesById = employees.stream()
                .filter(employee -> employee.getId() != null)
                .collect(Collectors.toMap(Employee::getId, employee -> employee, (left, right) -> left));

        List<User> users = userRepository.findAll();
        Map<Integer, User> usersById = users.stream()
                .filter(user -> user.getId() != null)
                .collect(Collectors.toMap(User::getId, user -> user, (left, right) -> left));
        Map<Integer, User> usersByEmployeeId = users.stream()
                .filter(user -> user.getEmployeeId() != null)
                .collect(Collectors.toMap(User::getEmployeeId, user -> user, (left, right) -> preferActiveUser(left, right)));

        List<TeamMember> activeMemberships = teamMemberRepository.findActiveMemberships();
        Map<Integer, List<TeamMember>> membershipsByUserId = activeMemberships.stream()
                .filter(member -> member.getMemberUser() != null && member.getMemberUser().getId() != null)
                .collect(Collectors.groupingBy(member -> member.getMemberUser().getId()));

        Map<Long, TargetContext> contexts = new HashMap<>();
        for (Employee employee : employees) {
            User user = employee.getId() == null ? null : usersByEmployeeId.get(employee.getId());
            TargetContext context = buildBaseTargetContext(employee, user, usersById, employeesById, membershipsByUserId, excludedTargetUserId);
            contexts.put(context.employeeId, context);
        }

        contexts.values().forEach(context -> enrichRelationshipCounts(context, contexts.values()));
        return contexts;
    }

    private TargetContext buildBaseTargetContext(
            Employee employee,
            User user,
            Map<Integer, User> usersById,
            Map<Integer, Employee> employeesById,
            Map<Integer, List<TeamMember>> membershipsByUserId,
            Long excludedTargetUserId
    ) {
        EmployeeDepartment assignment = latestActiveDepartmentAssignment(employee);
        Department parentDepartment = assignment == null ? null : assignment.getParentDepartment();
        Department currentDepartment = assignment == null ? null : assignment.getCurrentDepartment();
        if (currentDepartment == null && parentDepartment != null) {
            currentDepartment = parentDepartment;
        }
        if (parentDepartment == null && currentDepartment != null) {
            parentDepartment = currentDepartment;
        }

        User managerUser = user != null && user.getManagerId() != null ? usersById.get(user.getManagerId()) : null;
        Employee managerEmployee = managerUser != null && managerUser.getEmployeeId() != null
                ? employeesById.get(managerUser.getEmployeeId())
                : null;
        Position position = employee.getPosition();
        PositionLevel level = position == null ? null : position.getLevel();

        List<TeamMember> memberships = user == null ? List.of() : membershipsByUserId.getOrDefault(user.getId(), List.of());
        Set<Integer> activeTeamIds = memberships.stream()
                .filter(member -> member.getTeam() != null && member.getTeam().getId() != null)
                .map(member -> member.getTeam().getId())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<String> activeTeamNames = memberships.stream()
                .filter(member -> member.getTeam() != null)
                .map(member -> safeText(member.getTeam().getTeamName(), "Team #" + member.getTeam().getId()))
                .distinct()
                .sorted()
                .toList();

        String employmentStatus = resolveEmploymentStatus(user);
        List<String> blockReasons = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        List<String> notes = new ArrayList<>();

        if (!isEmployeeActive(employee)) {
            blockReasons.add("This employee is not active.");
        }
        if (user == null) {
            blockReasons.add("No active login account is available.");
        } else if (!isUserActive(user)) {
            blockReasons.add("No active login account is available.");
        }
        if (isNonPermanentEmploymentStatus(employmentStatus)) {
            blockReasons.add("This employee is not available for this campaign.");
        }
        String normalizedLevelCode = normalizeLevelCode(level == null ? null : level.getLevelCode());
        if (normalizedLevelCode == null || !TARGET_LEVEL_CODES.contains(normalizedLevelCode)) {
            blockReasons.add("This employee is outside the selected campaign audience.");
        }
        if (user != null && hasTargetExcludedRole(user)) {
            blockReasons.add("Department heads, HR, HR Admin, and CEO users can give feedback when assigned, but they are not included as feedback recipients.");
        }
        if (excludedTargetUserId != null && user != null && user.getId() != null
                && Objects.equals(user.getId().longValue(), excludedTargetUserId)) {
            blockReasons.add("Campaign owner is not available as a feedback recipient.");
        }

        if (currentDepartment == null) {
            warnings.add("Current department is missing.");
        }
        if (user != null && (managerUser == null || !isUserActive(managerUser))) {
            warnings.add("No active manager found.");
        }
        if (activeTeamIds.isEmpty()) {
            notes.add("No active team found.");
        }

        String employeeName = employeeDisplayName(employee, user);
        return new TargetContext(
                employee.getId() == null ? null : employee.getId().longValue(),
                user == null ? null : user.getId(),
                safeText(user == null ? null : user.getEmployeeCode(), employee.getId() == null ? null : "EMP-" + employee.getId()),
                employeeName,
                safeText(employee.getEmail(), user == null ? null : user.getEmail()),
                departmentId(parentDepartment),
                departmentName(parentDepartment),
                departmentId(currentDepartment),
                departmentName(currentDepartment),
                position == null ? null : position.getId(),
                position == null ? null : position.getPositionTitle(),
                level == null ? null : level.getLevelCode(),
                managerUser == null ? null : managerUser.getId(),
                managerUser == null ? null : managerUser.getEmployeeId(),
                managerDisplayName(managerUser, managerEmployee),
                employmentStatus,
                activeTeamIds,
                activeTeamNames,
                blockReasons,
                warnings,
                notes
        );
    }

    private void enrichRelationshipCounts(TargetContext context, Collection<TargetContext> contexts) {
        if (context.userId == null) {
            context.peerCandidateCount = 0;
            context.subordinateCandidateCount = 0;
            return;
        }

        Set<Long> subordinateEmployeeIds = contexts.stream()
                .filter(other -> other.userId != null && Objects.equals(other.managerUserId, context.userId))
                .filter(this::isEligibleEvaluatorContext)
                .map(other -> other.employeeId)
                .collect(Collectors.toSet());
        context.subordinateCandidateCount = subordinateEmployeeIds.size();

        context.peerCandidateCount = (int) contexts.stream()
                .filter(other -> isPeerCandidate(context, other, subordinateEmployeeIds))
                .count();

        if (context.peerCandidateCount < 2 && context.blockReasons.isEmpty()) {
            context.warnings.add("Limited peer options found.");
        }
        if (context.subordinateCandidateCount == 0) {
            context.notes.add("No direct reports found.");
        }
    }

    private boolean hasTargetExcludedRole(User user) {
        if (user == null || user.getId() == null) {
            return false;
        }
        return userRepository.findNormalizedRoleNamesByUserId(user.getId()).stream()
                .map(this::normalizeRoleNameForPolicy)
                .anyMatch(TARGET_EXCLUDED_ROLES::contains);
    }

    private String normalizeRoleNameForPolicy(String role) {
        if (role == null) {
            return "";
        }
        return role.trim()
                .replaceFirst("(?i)^ROLE_", "")
                .replace(' ', '_')
                .replace('-', '_')
                .replace('/', '_')
                .toUpperCase(Locale.ROOT);
    }

    private boolean isPeerCandidate(TargetContext target, TargetContext other, Set<Long> subordinateEmployeeIds) {
        if (!isEligibleEvaluatorContext(other) || Objects.equals(target.employeeId, other.employeeId)) {
            return false;
        }
        if (Objects.equals(other.userId, target.managerUserId)) {
            return false;
        }
        if (subordinateEmployeeIds.contains(other.employeeId)) {
            return false;
        }
        if (!target.activeTeamIds.isEmpty()) {
            return other.activeTeamIds.stream().anyMatch(target.activeTeamIds::contains);
        }
        return target.currentDepartmentId != null && Objects.equals(target.currentDepartmentId, other.currentDepartmentId);
    }

    private boolean isEligibleEvaluatorContext(TargetContext context) {
        return context != null
                && context.userId != null
                && context.employeeId != null
                && context.blockReasons.isEmpty()
                && !isNonPermanentEmploymentStatus(context.employmentStatus);
    }

    private FeedbackTargetCandidateResponse toCandidateResponse(TargetContext context) {
        return FeedbackTargetCandidateResponse.builder()
                .employeeId(context.employeeId)
                .userId(context.userId)
                .employeeCode(context.employeeCode)
                .employeeName(context.employeeName)
                .email(context.email)
                .parentDepartmentId(context.parentDepartmentId)
                .parentDepartmentName(context.parentDepartmentName)
                .currentDepartmentId(context.currentDepartmentId)
                .currentDepartmentName(context.currentDepartmentName)
                .positionId(context.positionId)
                .positionName(context.positionName)
                .levelCode(context.levelCode)
                .managerUserId(context.managerUserId)
                .managerEmployeeId(context.managerEmployeeId)
                .managerName(context.managerName)
                .employmentStatus(context.employmentStatus)
                .eligible(context.blockReasons.isEmpty())
                .blockReasons(List.copyOf(context.blockReasons))
                .warnings(List.copyOf(context.warnings))
                .notes(List.copyOf(context.notes))
                .activeTeamCount(context.activeTeamIds.size())
                .activeTeamNames(List.copyOf(context.activeTeamNames))
                .peerCandidateCount(context.peerCandidateCount)
                .subordinateCandidateCount(context.subordinateCandidateCount)
                .build();
    }

    private FeedbackCampaignTargetResponse toCampaignTargetResponse(FeedbackRequest request, TargetContext liveContext) {
        List<String> warnings = liveContext != null ? List.copyOf(liveContext.warnings) : snapshotMessages(request.getTargetWarningSnapshot());
        List<String> blockReasons = liveContext != null ? List.copyOf(liveContext.blockReasons) : List.of();
        List<String> notes = liveContext != null ? List.copyOf(liveContext.notes) : List.of();

        return FeedbackCampaignTargetResponse.builder()
                .requestId(request.getId())
                .employeeId(request.getTargetEmployeeId())
                .userId(coalesce(request.getTargetUserId(), liveContext == null ? null : liveContext.userId))
                .employeeCode(coalesceText(request.getTargetEmployeeCode(), liveContext == null ? null : liveContext.employeeCode))
                .employeeName(coalesceText(request.getTargetEmployeeName(), liveContext == null ? null : liveContext.employeeName))
                .email(coalesceText(request.getTargetEmployeeEmail(), liveContext == null ? null : liveContext.email))
                .parentDepartmentId(coalesce(request.getTargetParentDepartmentId(), liveContext == null ? null : liveContext.parentDepartmentId))
                .parentDepartmentName(coalesceText(request.getTargetParentDepartmentName(), liveContext == null ? null : liveContext.parentDepartmentName))
                .currentDepartmentId(coalesce(request.getTargetCurrentDepartmentId(), liveContext == null ? null : liveContext.currentDepartmentId))
                .currentDepartmentName(coalesceText(request.getTargetCurrentDepartmentName(), liveContext == null ? null : liveContext.currentDepartmentName))
                .positionId(coalesce(request.getTargetPositionId(), liveContext == null ? null : liveContext.positionId))
                .positionName(coalesceText(request.getTargetPositionName(), liveContext == null ? null : liveContext.positionName))
                .levelCode(coalesceText(request.getTargetLevelCode(), liveContext == null ? null : liveContext.levelCode))
                .managerUserId(coalesce(request.getTargetManagerUserId(), liveContext == null ? null : liveContext.managerUserId))
                .managerEmployeeId(coalesce(request.getTargetManagerEmployeeId(), liveContext == null ? null : liveContext.managerEmployeeId))
                .managerName(coalesceText(request.getTargetManagerName(), liveContext == null ? null : liveContext.managerName))
                .employmentStatus(coalesceText(request.getTargetEmploymentStatus(), liveContext == null ? null : liveContext.employmentStatus))
                .eligible(blockReasons.isEmpty())
                .blockReasons(blockReasons)
                .warnings(warnings)
                .notes(notes)
                .activeTeamCount(liveContext == null ? 0 : liveContext.activeTeamIds.size())
                .activeTeamNames(liveContext == null ? List.of() : List.copyOf(liveContext.activeTeamNames))
                .peerCandidateCount(liveContext == null ? 0 : liveContext.peerCandidateCount)
                .subordinateCandidateCount(liveContext == null ? 0 : liveContext.subordinateCandidateCount)
                .selectedAt(request.getSelectedAt())
                .selectedByUserId(request.getSelectedByUserId())
                .build();
    }

    private FeedbackCampaignTargetsResponse buildTargetsResponse(FeedbackCampaign campaign, List<FeedbackCampaignTargetResponse> targets) {
        int blocked = (int) targets.stream().filter(target -> !Boolean.TRUE.equals(target.getEligible())).count();
        int warnings = (int) targets.stream().filter(target -> target.getWarnings() != null && !target.getWarnings().isEmpty()).count();
        List<String> summaryWarnings = new ArrayList<>();
        if (targets.isEmpty()) {
            summaryWarnings.add("Select at least one feedback recipient before continuing.");
        }
        if (blocked > 0) {
            summaryWarnings.add(blocked + " selected employee(s) are no longer available for this campaign.");
        }
        if (warnings > 0) {
            summaryWarnings.add(warnings + " selected employee(s) need review before continuing.");
        }

        return FeedbackCampaignTargetsResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .campaignStatus(campaign.getStatus().name())
                .targetCount(targets.size())
                .readyCount((int) targets.stream().filter(target -> Boolean.TRUE.equals(target.getEligible())
                        && (target.getWarnings() == null || target.getWarnings().isEmpty())).count())
                .warningCount(warnings)
                .blockedCount(blocked)
                .targets(targets)
                .warnings(summaryWarnings)
                .build();
    }

    private EmployeeDepartment latestActiveDepartmentAssignment(Employee employee) {
        if (employee == null || employee.getEmployeeDepartments() == null) {
            return null;
        }
        return employee.getEmployeeDepartments().stream()
                .filter(assignment -> assignment.getEnddate() == null)
                .max(Comparator
                        .comparing(EmployeeDepartment::getStartdate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(EmployeeDepartment::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
    }

    private boolean matchesSearch(TargetContext context, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String haystack = String.join(" ",
                nullToEmpty(context.employeeName),
                nullToEmpty(context.employeeCode),
                nullToEmpty(context.email),
                nullToEmpty(context.currentDepartmentName),
                nullToEmpty(context.parentDepartmentName),
                nullToEmpty(context.positionName),
                nullToEmpty(context.levelCode)
        ).toLowerCase();
        return haystack.contains(search);
    }

    private String normalizeLevelCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT).replace(" ", "");
    }

    private boolean matchesReadiness(TargetContext context, String readiness) {
        if (readiness == null || readiness.isBlank() || readiness.equals("ALL")) {
            return true;
        }
        return switch (readiness) {
            case "AVAILABLE" -> context.blockReasons.isEmpty();
            case "READY" -> context.blockReasons.isEmpty() && context.warnings.isEmpty();
            case "WARNINGS" -> context.blockReasons.isEmpty() && !context.warnings.isEmpty();
            case "BLOCKED" -> !context.blockReasons.isEmpty();
            default -> true;
        };
    }

    private String joinSnapshotMessages(TargetContext context) {
        List<String> messages = new ArrayList<>();
        messages.addAll(context.warnings);
        messages.addAll(context.notes);
        return messages.isEmpty() ? null : String.join(" | ", messages);
    }

    private List<String> snapshotMessages(String snapshot) {
        if (snapshot == null || snapshot.isBlank()) {
            return List.of();
        }
        return List.of(snapshot.split("\\s*\\|\\s*"));
    }

    private String resolveEmploymentStatus(User user) {
        if (user == null || isBlank(user.getAccountStatus())) {
            return "UNKNOWN";
        }
        return user.getAccountStatus().trim();
    }

    private boolean isNonPermanentEmploymentStatus(String status) {
        if (status == null) {
            return false;
        }
        String normalized = status.toUpperCase();
        return normalized.contains("PROBATION")
                || normalized.contains("CONTRACT")
                || normalized.contains("TEMP")
                || normalized.contains("INTERN")
                || normalized.contains("PART_TIME")
                || normalized.contains("PART TIME");
    }

    private User preferActiveUser(User left, User right) {
        if (isUserActive(left) && !isUserActive(right)) {
            return left;
        }
        if (isUserActive(right) && !isUserActive(left)) {
            return right;
        }
        return left.getId() != null && right.getId() != null && right.getId() > left.getId() ? right : left;
    }

    private boolean isEmployeeActive(Employee employee) {
        return employee != null && !Boolean.FALSE.equals(employee.getActive());
    }

    private boolean isUserActive(User user) {
        return user != null && !Boolean.FALSE.equals(user.getActive());
    }

    private String employeeDisplayName(Employee employee, User user) {
        String combined = (nullToEmpty(employee.getFirstName()) + " " + nullToEmpty(employee.getLastName())).trim();
        if (!combined.isBlank()) {
            return combined;
        }
        if (user != null && !isBlank(user.getFullName())) {
            return user.getFullName().trim();
        }
        return employee.getId() == null ? "Employee" : "Employee #" + employee.getId();
    }

    private String managerDisplayName(User managerUser, Employee managerEmployee) {
        if (managerUser == null) {
            return null;
        }
        if (managerEmployee != null) {
            return employeeDisplayName(managerEmployee, managerUser);
        }
        if (!isBlank(managerUser.getFullName())) {
            return managerUser.getFullName().trim();
        }
        return managerUser.getEmail();
    }

    private Integer departmentId(Department department) {
        return department == null ? null : department.getId();
    }

    private String departmentName(Department department) {
        return department == null ? null : department.getDepartmentName();
    }

    private String normalizeSearch(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    private String normalizeFilter(String value) {
        return value == null ? null : value.trim().toUpperCase();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String safeText(String primary, String fallback) {
        return isBlank(primary) ? fallback : primary.trim();
    }

    private String coalesceText(String first, String second) {
        return isBlank(first) ? second : first;
    }

    private <T> T coalesce(T first, T second) {
        return first != null ? first : second;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }

    private Set<Long> normalizeTargetIds(List<Long> targetEmployeeIds) {
        if (targetEmployeeIds == null || targetEmployeeIds.isEmpty()) {
            throw new BusinessValidationException("At least one target employee is required.");
        }

        Set<Long> uniqueTargetIds = new LinkedHashSet<>();
        for (Long employeeId : targetEmployeeIds) {
            if (employeeId == null) {
                throw new BusinessValidationException("Target employee IDs cannot contain null values.");
            }
            uniqueTargetIds.add(employeeId);
        }
        return uniqueTargetIds;
    }

    private static class TargetContext {
        private final Long employeeId;
        private final Integer userId;
        private final String employeeCode;
        private final String employeeName;
        private final String email;
        private final Integer parentDepartmentId;
        private final String parentDepartmentName;
        private final Integer currentDepartmentId;
        private final String currentDepartmentName;
        private final Integer positionId;
        private final String positionName;
        private final String levelCode;
        private final Integer managerUserId;
        private final Integer managerEmployeeId;
        private final String managerName;
        private final String employmentStatus;
        private final Set<Integer> activeTeamIds;
        private final List<String> activeTeamNames;
        private final List<String> blockReasons;
        private final List<String> warnings;
        private final List<String> notes;
        private int peerCandidateCount;
        private int subordinateCandidateCount;

        private TargetContext(
                Long employeeId,
                Integer userId,
                String employeeCode,
                String employeeName,
                String email,
                Integer parentDepartmentId,
                String parentDepartmentName,
                Integer currentDepartmentId,
                String currentDepartmentName,
                Integer positionId,
                String positionName,
                String levelCode,
                Integer managerUserId,
                Integer managerEmployeeId,
                String managerName,
                String employmentStatus,
                Set<Integer> activeTeamIds,
                List<String> activeTeamNames,
                List<String> blockReasons,
                List<String> warnings,
                List<String> notes
        ) {
            this.employeeId = employeeId;
            this.userId = userId;
            this.employeeCode = employeeCode;
            this.employeeName = employeeName;
            this.email = email;
            this.parentDepartmentId = parentDepartmentId;
            this.parentDepartmentName = parentDepartmentName;
            this.currentDepartmentId = currentDepartmentId;
            this.currentDepartmentName = currentDepartmentName;
            this.positionId = positionId;
            this.positionName = positionName;
            this.levelCode = levelCode;
            this.managerUserId = managerUserId;
            this.managerEmployeeId = managerEmployeeId;
            this.managerName = managerName;
            this.employmentStatus = employmentStatus;
            this.activeTeamIds = activeTeamIds;
            this.activeTeamNames = activeTeamNames;
            this.blockReasons = blockReasons;
            this.warnings = warnings;
            this.notes = notes;
        }
    }
}

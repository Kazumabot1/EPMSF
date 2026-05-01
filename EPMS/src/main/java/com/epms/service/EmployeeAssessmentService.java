package com.epms.service;

import com.epms.dto.EmployeeAssessmentDtos.AssessmentItemRequest;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentItemResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentRequest;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentSectionResponse;
import com.epms.dto.EmployeeAssessmentDtos.ScoreTableRowResponse;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeAssessment;
import com.epms.entity.EmployeeAssessmentAnswer;
import com.epms.entity.User;
import com.epms.entity.enums.AssessmentStatus;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeAssessmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmployeeAssessmentService {

    private static final int MAX_RATING = 5;

    private final EmployeeAssessmentRepository assessmentRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional(readOnly = true)
    public AssessmentResponse getTemplateForCurrentUser() {
        User user = currentUserEntity();
        EmployeeProfile profile = resolveProfile(user);
        return AssessmentResponse.builder()
                .id(null)
                .userId(user.getId())
                .employeeId(profile.employeeId())
                .employeeName(profile.employeeName())
                .employeeCode(profile.employeeCode())
                .departmentId(profile.departmentId())
                .departmentName(profile.departmentName())
                .period(String.valueOf(LocalDateTime.now().getYear()))
                .status(AssessmentStatus.DRAFT.name())
                .totalScore(0.0)
                .maxScore(0.0)
                .scorePercent(0.0)
                .performanceLabel("Not scored")
                .remarks("")
                .sections(defaultSections())
                .build();
    }

    @Transactional(readOnly = true)
    public AssessmentResponse getLatestDraftForCurrentUser() {
        Integer userId = SecurityUtils.currentUserId();
        return assessmentRepository.findFirstByUserIdAndStatusOrderByUpdatedAtDesc(userId, AssessmentStatus.DRAFT)
                .map(this::toResponse)
                .orElseGet(this::getTemplateForCurrentUser);
    }

    @Transactional(readOnly = true)
    public AssessmentResponse getById(Long id) {
        EmployeeAssessment assessment = findAssessment(id);
        assertCanView(assessment);
        return toResponse(assessment);
    }

    @Transactional
    public AssessmentResponse saveDraft(AssessmentRequest request) {
        User user = currentUserEntity();
        EmployeeAssessment assessment = createNewAssessment(user);
        applyRequest(assessment, request, AssessmentStatus.DRAFT);
        calculateScores(assessment);
        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse updateDraft(Long id, AssessmentRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        assertOwner(assessment);
        ensureEditable(assessment);
        applyRequest(assessment, request, AssessmentStatus.DRAFT);
        calculateScores(assessment);
        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse submit(Long id, AssessmentRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        assertOwner(assessment);
        ensureEditable(assessment);
        applyRequest(assessment, request, AssessmentStatus.SUBMITTED);
        validateComplete(assessment);
        calculateScores(assessment);
        assessment.setSubmittedAt(LocalDateTime.now());
        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional(readOnly = true)
    public List<ScoreTableRowResponse> getMyScores() {
        Integer userId = SecurityUtils.currentUserId();
        return assessmentRepository.findByUserIdAndStatusOrderBySubmittedAtDesc(userId, AssessmentStatus.SUBMITTED)
                .stream()
                .map(this::toScoreRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScoreTableRowResponse> getScoreTable() {
        UserPrincipal principal = SecurityUtils.currentUser();
        if (!canViewScoreTable(principal)) {
            throw new UnauthorizedActionException("Only HR, Admin, Managers, and Department Heads can view the employee score table.");
        }
        return assessmentRepository.findByStatusOrderBySubmittedAtDesc(AssessmentStatus.SUBMITTED)
                .stream()
                .map(this::toScoreRow)
                .toList();
    }

    private EmployeeAssessment createNewAssessment(User user) {
        EmployeeProfile profile = resolveProfile(user);
        return EmployeeAssessment.builder()
                .userId(user.getId())
                .employeeId(profile.employeeId())
                .employeeName(profile.employeeName())
                .employeeCode(profile.employeeCode())
                .departmentId(profile.departmentId())
                .departmentName(profile.departmentName())
                .status(AssessmentStatus.DRAFT)
                .period(String.valueOf(LocalDateTime.now().getYear()))
                .totalScore(0.0)
                .maxScore(0.0)
                .scorePercent(0.0)
                .performanceLabel("Not scored")
                .answers(new ArrayList<>())
                .build();
    }

    private void applyRequest(EmployeeAssessment assessment, AssessmentRequest request, AssessmentStatus status) {
        if (request == null) {
            throw new BadRequestException("Assessment request body is required");
        }
        String period = normalizeOptional(request.getPeriod());
        assessment.setPeriod(period == null ? String.valueOf(LocalDateTime.now().getYear()) : period);
        assessment.setRemarks(normalizeOptional(request.getRemarks()));
        assessment.setStatus(status);

        List<AssessmentItemRequest> items = request.getItems();
        if (items == null || items.isEmpty()) {
            items = flattenTemplate(defaultSections());
        }

        assessment.getAnswers().clear();
        int order = 1;
        for (AssessmentItemRequest item : items) {
            String sectionTitle = normalizeOptional(item.getSectionTitle());
            String questionText = normalizeOptional(item.getQuestionText());
            if (sectionTitle == null || questionText == null) {
                continue;
            }

            Integer rating = item.getRating();
            if (rating != null && (rating < 1 || rating > MAX_RATING)) {
                throw new BadRequestException("Ratings must be between 1 and 5");
            }

            EmployeeAssessmentAnswer answer = EmployeeAssessmentAnswer.builder()
                    .sectionTitle(sectionTitle)
                    .questionText(questionText)
                    .itemOrder(item.getItemOrder() == null ? order : item.getItemOrder())
                    .rating(rating)
                    .maxRating(MAX_RATING)
                    .comment(normalizeOptional(item.getComment()))
                    .build();
            assessment.addAnswer(answer);
            order++;
        }

        if (assessment.getAnswers().isEmpty()) {
            throw new BadRequestException("At least one assessment question is required");
        }
    }

    private void validateComplete(EmployeeAssessment assessment) {
        boolean missingRating = assessment.getAnswers().stream().anyMatch(answer -> answer.getRating() == null);
        if (missingRating) {
            throw new BadRequestException("Please rate every assessment item before submitting");
        }
    }

    private void calculateScores(EmployeeAssessment assessment) {
        double total = assessment.getAnswers().stream()
                .map(EmployeeAssessmentAnswer::getRating)
                .filter(rating -> rating != null)
                .mapToDouble(Integer::doubleValue)
                .sum();
        long answered = assessment.getAnswers().stream()
                .filter(answer -> answer.getRating() != null)
                .count();
        double max = answered * MAX_RATING;
        double percent = max == 0 ? 0.0 : round2((total * 100.0) / max);

        assessment.setTotalScore(round2(total));
        assessment.setMaxScore(round2(max));
        assessment.setScorePercent(percent);
        assessment.setPerformanceLabel(performanceLabel(percent));
    }

    private AssessmentResponse toResponse(EmployeeAssessment assessment) {
        return AssessmentResponse.builder()
                .id(assessment.getId())
                .userId(assessment.getUserId())
                .employeeId(assessment.getEmployeeId())
                .employeeName(assessment.getEmployeeName())
                .employeeCode(assessment.getEmployeeCode())
                .departmentId(assessment.getDepartmentId())
                .departmentName(assessment.getDepartmentName())
                .period(assessment.getPeriod())
                .status(assessment.getStatus() == null ? null : assessment.getStatus().name())
                .totalScore(nullToZero(assessment.getTotalScore()))
                .maxScore(nullToZero(assessment.getMaxScore()))
                .scorePercent(nullToZero(assessment.getScorePercent()))
                .performanceLabel(assessment.getPerformanceLabel())
                .remarks(assessment.getRemarks())
                .createdAt(assessment.getCreatedAt())
                .updatedAt(assessment.getUpdatedAt())
                .submittedAt(assessment.getSubmittedAt())
                .sections(groupSections(assessment.getAnswers()))
                .build();
    }

    private ScoreTableRowResponse toScoreRow(EmployeeAssessment assessment) {
        return ScoreTableRowResponse.builder()
                .id(assessment.getId())
                .employeeId(assessment.getEmployeeId())
                .employeeName(assessment.getEmployeeName())
                .employeeCode(assessment.getEmployeeCode())
                .departmentName(assessment.getDepartmentName())
                .period(assessment.getPeriod())
                .status(assessment.getStatus() == null ? null : assessment.getStatus().name())
                .totalScore(nullToZero(assessment.getTotalScore()))
                .maxScore(nullToZero(assessment.getMaxScore()))
                .scorePercent(nullToZero(assessment.getScorePercent()))
                .performanceLabel(assessment.getPerformanceLabel())
                .submittedAt(assessment.getSubmittedAt())
                .build();
    }

    private List<AssessmentSectionResponse> groupSections(List<EmployeeAssessmentAnswer> answers) {
        Map<String, List<AssessmentItemResponse>> grouped = new LinkedHashMap<>();
        answers.stream()
                .sorted(Comparator.comparing(EmployeeAssessmentAnswer::getItemOrder, Comparator.nullsLast(Integer::compareTo)))
                .forEach(answer -> grouped.computeIfAbsent(answer.getSectionTitle(), ignored -> new ArrayList<>())
                        .add(AssessmentItemResponse.builder()
                                .id(answer.getId())
                                .sectionTitle(answer.getSectionTitle())
                                .questionText(answer.getQuestionText())
                                .itemOrder(answer.getItemOrder())
                                .rating(answer.getRating())
                                .maxRating(answer.getMaxRating())
                                .comment(answer.getComment())
                                .build()));

        return grouped.entrySet().stream()
                .map(entry -> AssessmentSectionResponse.builder()
                        .title(entry.getKey())
                        .items(entry.getValue())
                        .build())
                .toList();
    }

    private List<AssessmentSectionResponse> defaultSections() {
        return List.of(
                AssessmentSectionResponse.builder()
                        .title("Performance Goals")
                        .items(List.of(
                                templateItem("Performance Goals", "I met the KPI goals and targets assigned for this review period.", 1),
                                templateItem("Performance Goals", "I completed my work on time and followed agreed priorities.", 2),
                                templateItem("Performance Goals", "I maintained good quality and accuracy in my deliverables.", 3)
                        ))
                        .build(),
                AssessmentSectionResponse.builder()
                        .title("Work Behavior")
                        .items(List.of(
                                templateItem("Work Behavior", "I communicated clearly with my manager, team members, and stakeholders.", 4),
                                templateItem("Work Behavior", "I collaborated well and supported team success.", 5),
                                templateItem("Work Behavior", "I followed company rules, attendance expectations, and compliance requirements.", 6)
                        ))
                        .build(),
                AssessmentSectionResponse.builder()
                        .title("Development")
                        .items(List.of(
                                templateItem("Development", "I solved problems effectively and asked for support when needed.", 7),
                                templateItem("Development", "I improved my skills and applied feedback during this review period.", 8)
                        ))
                        .build()
        );
    }

    private AssessmentItemResponse templateItem(String sectionTitle, String questionText, int itemOrder) {
        return AssessmentItemResponse.builder()
                .id(null)
                .sectionTitle(sectionTitle)
                .questionText(questionText)
                .itemOrder(itemOrder)
                .rating(null)
                .maxRating(MAX_RATING)
                .comment("")
                .build();
    }

    private List<AssessmentItemRequest> flattenTemplate(List<AssessmentSectionResponse> sections) {
        return sections.stream()
                .flatMap(section -> section.getItems().stream()
                        .map(item -> new AssessmentItemRequest(
                                item.getId(),
                                section.getTitle(),
                                item.getQuestionText(),
                                item.getItemOrder(),
                                item.getRating(),
                                item.getComment()
                        )))
                .toList();
    }

    private EmployeeAssessment findAssessment(Long id) {
        return assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
    }

    private User currentUserEntity() {
        Integer userId = SecurityUtils.currentUserId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private EmployeeProfile resolveProfile(User user) {
        Optional<Employee> employee = user.getEmployeeId() == null
                ? Optional.empty()
                : employeeRepository.findById(user.getEmployeeId());

        String employeeName = normalizeOptional(user.getFullName());
        if (employeeName == null && employee.isPresent()) {
            String firstName = normalizeOptional(employee.get().getFirstName());
            String lastName = normalizeOptional(employee.get().getLastName());
            employeeName = String.join(" ", List.of(firstName == null ? "" : firstName, lastName == null ? "" : lastName)).trim();
        }
        if (employeeName == null || employeeName.isBlank()) {
            employeeName = user.getEmail();
        }

        Integer departmentId = user.getDepartmentId();
        String departmentName = null;
        if (departmentId != null) {
            departmentName = departmentRepository.findById(departmentId)
                    .map(Department::getDepartmentName)
                    .orElse(null);
        }

        return new EmployeeProfile(
                user.getEmployeeId(),
                employeeName,
                normalizeOptional(user.getEmployeeCode()),
                departmentId,
                departmentName
        );
    }

    private void assertCanView(EmployeeAssessment assessment) {
        UserPrincipal principal = SecurityUtils.currentUser();
        if (assessment.getUserId().equals(principal.getId()) || canViewScoreTable(principal)) {
            return;
        }
        throw new UnauthorizedActionException("You do not have permission to view this assessment");
    }

    private void assertOwner(EmployeeAssessment assessment) {
        Integer userId = SecurityUtils.currentUserId();
        if (!assessment.getUserId().equals(userId)) {
            throw new UnauthorizedActionException("You can update only your own assessment");
        }
    }

    private void ensureEditable(EmployeeAssessment assessment) {
        if (AssessmentStatus.SUBMITTED.equals(assessment.getStatus())) {
            throw new BadRequestException("Submitted assessments cannot be edited");
        }
    }

    private boolean canViewScoreTable(UserPrincipal principal) {
        return principal.getRoles().stream()
                .map(role -> role == null ? "" : role.replace("ROLE_", "").replace(" ", "_").toUpperCase(Locale.ROOT))
                .anyMatch(role -> role.equals("HR")
                        || role.equals("ADMIN")
                        || role.equals("MANAGER")
                        || role.equals("DEPARTMENT_HEAD")
                        || role.equals("DEPARTMENTHEAD"));
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double nullToZero(Double value) {
        return value == null ? 0.0 : value;
    }

    private String performanceLabel(double percent) {
        if (percent >= 86) return "Outstanding";
        if (percent >= 71) return "Good";
        if (percent >= 60) return "Meet Requirement";
        if (percent >= 40) return "Need Improvement";
        return "Unsatisfactory";
    }

    private record EmployeeProfile(
            Integer employeeId,
            String employeeName,
            String employeeCode,
            Integer departmentId,
            String departmentName
    ) {
    }
}

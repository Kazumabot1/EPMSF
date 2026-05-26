package com.epms.service.impl;

import com.epms.dto.FeedbackAssignmentDetailResponse;
import com.epms.dto.FeedbackAssignmentEmployeeInfoResponse;
import com.epms.dto.FeedbackAssignmentQuestionDetailResponse;
import com.epms.dto.FeedbackAssignmentSectionDetailResponse;
import com.epms.dto.FeedbackEvaluatorTaskResponse;
import com.epms.dto.FeedbackRatingOptionResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.RatingScaleRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackEvaluatorTaskService;
import com.epms.service.FeedbackAssignmentQuestionSnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class FeedbackEvaluatorTaskServiceImpl implements FeedbackEvaluatorTaskService {

    private static final int MIN_REQUIRED_COMMENT_LENGTH = 10;

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final RatingScaleRepository ratingScaleRepository;
    private final FeedbackAssignmentQuestionSnapshotService assignmentQuestionSnapshotService;

    @Override
    @Transactional
    public List<FeedbackEvaluatorTaskResponse> getMyTasks(Long userId) {
        Long evaluatorEmployeeId = resolveEmployeeIdForUser(userId);
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByEvaluatorEmployeeId(evaluatorEmployeeId);
        Map<Long, String> targetNames = loadEmployeeNames(
                assignments.stream()
                        .map(assignment -> assignment.getFeedbackRequest().getTargetEmployeeId())
                        .distinct()
                        .toList()
        );

        return assignments.stream()
                .filter(this::isVisibleInEvaluatorWorkspace)
                .sorted(Comparator
                        .comparing(this::resolveEffectiveDeadline, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FeedbackEvaluatorAssignment::getId))
                .map(assignment -> {
                    FeedbackResponse response = assignment.getResponse();
                    List<FeedbackAssignmentQuestion> questions = assignmentQuestionSnapshotService.findOrCreateAssignmentQuestions(assignment);
                    Map<Long, FeedbackResponseItem> existingItems = mapExistingItemsByAssignmentQuestion(response, questions);
                    int totalQuestionCount = questions.size();
                    int requiredQuestionCount = (int) questions.stream()
                            .filter(question -> Boolean.TRUE.equals(question.getRequired()))
                            .count();
                    int answeredQuestionCount = (int) existingItems.values().stream()
                            .filter(item -> item.getRatingValue() != null)
                            .count();
                    int answeredRequiredQuestionCount = countCompleteRequiredQuestions(questions, existingItems);
                    int completionPercent = calculateCompletionPercent(requiredQuestionCount, answeredRequiredQuestionCount);
                    boolean submittedLocked = response != null && response.getSubmittedAt() != null;
                    boolean finalSubmissionReady = !submittedLocked
                            && canSubmit(assignment, response)
                            && answeredRequiredQuestionCount >= requiredQuestionCount;
                    Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
                    return FeedbackEvaluatorTaskResponse.builder()
                            .assignmentId(assignment.getId())
                            .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                            .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                            .campaignStatus(assignment.getFeedbackRequest().getCampaign().getStatus().name())
                            .campaignStartAt(assignment.getFeedbackRequest().getCampaign().getStartAt())
                            .targetEmployeeId(targetEmployeeId)
                            .targetEmployeeName(targetNames.getOrDefault(targetEmployeeId, "Employee #" + targetEmployeeId))
                            .relationshipType(assignment.getRelationshipType().name())
                            .anonymous(Boolean.TRUE.equals(assignment.getIsAnonymous()))
                            .status(assignment.getStatus().name())
                            .canSubmit(canSubmit(assignment, response))
                            .lifecycleMessage(lifecycleMessage(assignment, response))
                            .autoSubmitCompletedDraftsOnClose(isAutoSubmitCompletedDraftsOnClose(assignment))
                            .autoSubmitNotice(autoSubmitNotice(assignment))
                            .dueAt(resolveEffectiveDeadline(assignment))
                            .submittedAt(response != null ? response.getSubmittedAt() : null)
                            .totalQuestionCount(totalQuestionCount)
                            .requiredQuestionCount(requiredQuestionCount)
                            .answeredQuestionCount(answeredQuestionCount)
                            .answeredRequiredQuestionCount(answeredRequiredQuestionCount)
                            .completionPercent(completionPercent)
                            .finalSubmissionReady(finalSubmissionReady)
                            .build();
                })
                .toList();
    }

    @Override
    @Transactional
    public FeedbackAssignmentDetailResponse getAssignmentDetail(Long assignmentId, Long userId) {
        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback assignment not found."));

        Long evaluatorEmployeeId = resolveEmployeeIdForUser(userId);
        if (!Objects.equals(assignment.getEvaluatorEmployeeId(), evaluatorEmployeeId)) {
            throw new UnauthorizedActionException("You are not authorized to access this feedback assignment.");
        }

        FeedbackResponse response = feedbackResponseRepository.findByEvaluatorAssignmentId(assignmentId).orElse(null);
        ensureAssignmentVisibleToEvaluator(assignment, response);

        List<FeedbackAssignmentQuestion> questions = assignmentQuestionSnapshotService.findOrCreateAssignmentQuestions(assignment);
        Map<Long, FeedbackResponseItem> existingItems = mapExistingItemsByAssignmentQuestion(response, questions);

        int totalQuestionCount = questions.size();
        int requiredQuestionCount = (int) questions.stream()
                .filter(question -> Boolean.TRUE.equals(question.getRequired()))
                .count();
        int answeredQuestionCount = (int) existingItems.values().stream()
                .filter(item -> item.getRatingValue() != null)
                .count();
        int answeredRequiredQuestionCount = countCompleteRequiredQuestions(questions, existingItems);
        int completionPercent = calculateCompletionPercent(requiredQuestionCount, answeredRequiredQuestionCount);
        boolean submittedLocked = response != null && response.getSubmittedAt() != null;
        boolean finalSubmissionReady = !submittedLocked
                && canSubmit(assignment, response)
                && answeredRequiredQuestionCount >= requiredQuestionCount;

        Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
        return FeedbackAssignmentDetailResponse.builder()
                .assignmentId(assignment.getId())
                .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                .campaignStatus(assignment.getFeedbackRequest().getCampaign().getStatus().name())
                .campaignStartAt(assignment.getFeedbackRequest().getCampaign().getStartAt())
                .targetEmployeeId(targetEmployeeId)
                .targetEmployeeName(loadEmployeeNames(List.of(targetEmployeeId))
                        .getOrDefault(targetEmployeeId, "Employee #" + targetEmployeeId))
                .target(buildTargetInfo(assignment))
                .evaluator(buildEvaluatorInfo(assignment))
                .relationshipType(assignment.getRelationshipType().name())
                .anonymous(Boolean.TRUE.equals(assignment.getIsAnonymous()))
                .status(assignment.getStatus().name())
                .dueAt(resolveEffectiveDeadline(assignment))
                .submittedAt(response != null ? response.getSubmittedAt() : null)
                .canSubmit(canSubmit(assignment, response))
                .lifecycleMessage(lifecycleMessage(assignment, response))
                .autoSubmitCompletedDraftsOnClose(isAutoSubmitCompletedDraftsOnClose(assignment))
                .autoSubmitNotice(autoSubmitNotice(assignment))
                .comments(response != null ? response.getComments() : null)
                .assessmentDateText(response != null ? response.getAssessmentDateText() : null)
                .effectiveDateText(response != null ? response.getEffectiveDateText() : null)
                .totalQuestionCount(totalQuestionCount)
                .requiredQuestionCount(requiredQuestionCount)
                .answeredQuestionCount(answeredQuestionCount)
                .answeredRequiredQuestionCount(answeredRequiredQuestionCount)
                .completionPercent(completionPercent)
                .finalSubmissionReady(finalSubmissionReady)
                .submittedLocked(submittedLocked)
                .sections(mapSections(questions, existingItems))
                .build();
    }


    private FeedbackAssignmentEmployeeInfoResponse buildTargetInfo(FeedbackEvaluatorAssignment assignment) {
        if (assignment == null || assignment.getFeedbackRequest() == null) {
            return null;
        }
        com.epms.entity.FeedbackRequest request = assignment.getFeedbackRequest();
        Long employeeId = request.getTargetEmployeeId();
        User user = employeeId == null ? null : userRepository.findByEmployeeId(employeeId.intValue()).orElse(null);
        return FeedbackAssignmentEmployeeInfoResponse.builder()
                .employeeId(employeeId)
                .userId(request.getTargetUserId())
                .employeeCode(firstNonBlank(request.getTargetEmployeeCode(), user == null ? null : user.getEmployeeCode()))
                .employeeName(firstNonBlank(request.getTargetEmployeeName(), user == null ? null : user.getFullName(), employeeId == null ? null : "Employee #" + employeeId))
                .email(firstNonBlank(request.getTargetEmployeeEmail(), user == null ? null : user.getEmail()))
                .positionName(firstNonBlank(request.getTargetPositionName(), user == null || user.getPosition() == null ? null : user.getPosition().getPositionTitle()))
                .departmentName(firstNonBlank(request.getTargetCurrentDepartmentName(), request.getTargetParentDepartmentName(), resolveDepartmentName(user == null ? null : user.getDepartmentId())))
                .levelCode(firstNonBlank(request.getTargetLevelCode(), user == null || user.getPosition() == null || user.getPosition().getLevel() == null ? null : user.getPosition().getLevel().getLevelCode()))
                .build();
    }

    private FeedbackAssignmentEmployeeInfoResponse buildEvaluatorInfo(FeedbackEvaluatorAssignment assignment) {
        if (assignment == null) {
            return null;
        }
        Long employeeId = assignment.getEvaluatorEmployeeId();
        User user = employeeId == null ? null : userRepository.findByEmployeeId(employeeId.intValue()).orElse(null);
        Integer departmentId = assignment.getEvaluatorDepartmentId() != null ? assignment.getEvaluatorDepartmentId() : (user == null ? null : user.getDepartmentId());
        return FeedbackAssignmentEmployeeInfoResponse.builder()
                .employeeId(employeeId)
                .userId(assignment.getEvaluatorUserId())
                .employeeCode(firstNonBlank(assignment.getEvaluatorEmployeeCode(), user == null ? null : user.getEmployeeCode()))
                .employeeName(firstNonBlank(assignment.getEvaluatorEmployeeName(), user == null ? null : user.getFullName(), employeeId == null ? null : "Employee #" + employeeId))
                .email(firstNonBlank(assignment.getEvaluatorEmployeeEmail(), user == null ? null : user.getEmail()))
                .positionName(firstNonBlank(assignment.getEvaluatorPositionName(), user == null || user.getPosition() == null ? null : user.getPosition().getPositionTitle()))
                .departmentName(resolveDepartmentName(departmentId))
                .levelCode(user == null || user.getPosition() == null || user.getPosition().getLevel() == null ? null : user.getPosition().getLevel().getLevelCode())
                .build();
    }

    private String resolveDepartmentName(Integer departmentId) {
        if (departmentId == null) {
            return null;
        }
        return departmentRepository.findById(departmentId)
                .map(com.epms.entity.Department::getDepartmentName)
                .orElse(null);
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private int countCompleteRequiredQuestions(
            List<FeedbackAssignmentQuestion> questions,
            Map<Long, FeedbackResponseItem> existingItems
    ) {
        return (int) questions.stream()
                .filter(question -> Boolean.TRUE.equals(question.getRequired()))
                .filter(question -> {
                    FeedbackResponseItem item = existingItems.get(question.getId());
                    return item != null
                            && item.getRatingValue() != null
                            && normalizedCommentLength(item.getComment()) >= MIN_REQUIRED_COMMENT_LENGTH;
                })
                .count();
    }

    private int calculateCompletionPercent(int requiredQuestionCount, int answeredRequiredQuestionCount) {
        return requiredQuestionCount == 0
                ? 100
                : Math.min(100, Math.round((answeredRequiredQuestionCount * 100.0f) / requiredQuestionCount));
    }

    private int normalizedCommentLength(String value) {
        return value == null ? 0 : value.trim().length();
    }

    private Map<Long, FeedbackResponseItem> mapExistingItemsByAssignmentQuestion(
            FeedbackResponse response,
            List<FeedbackAssignmentQuestion> questions
    ) {
        if (response == null || response.getItems() == null || response.getItems().isEmpty()) {
            return Map.of();
        }

        Map<Long, Long> assignmentQuestionIdByLegacyQuestionId = questions.stream()
                .filter(question -> question.getSourceQuestion() != null && question.getSourceQuestion().getId() != null)
                .collect(Collectors.toMap(question -> question.getSourceQuestion().getId(), FeedbackAssignmentQuestion::getId, (first, duplicate) -> first));

        Map<Long, FeedbackResponseItem> existingItems = new HashMap<>();
        for (FeedbackResponseItem item : response.getItems()) {
            Long assignmentQuestionId = item.getAssignmentQuestion() != null ? item.getAssignmentQuestion().getId() : null;
            if (assignmentQuestionId == null && item.getQuestion() != null) {
                assignmentQuestionId = assignmentQuestionIdByLegacyQuestionId.get(item.getQuestion().getId());
            }
            if (assignmentQuestionId != null) {
                existingItems.putIfAbsent(assignmentQuestionId, item);
            }
        }
        return existingItems;
    }

    private List<FeedbackAssignmentSectionDetailResponse> mapSections(
            List<FeedbackAssignmentQuestion> questions,
            Map<Long, FeedbackResponseItem> existingItems
    ) {
        Map<String, List<FeedbackAssignmentQuestion>> grouped = questions.stream()
                .sorted(Comparator.comparing(FeedbackAssignmentQuestion::getSectionOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FeedbackAssignmentQuestion::getDisplayOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FeedbackAssignmentQuestion::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.groupingBy(
                        question -> question.getSectionOrder() + "::" + question.getSectionCode() + "::" + question.getSectionTitle(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        return grouped.values().stream()
                .map(sectionQuestions -> {
                    FeedbackAssignmentQuestion first = sectionQuestions.get(0);
                    return FeedbackAssignmentSectionDetailResponse.builder()
                            .id(first.getSectionOrder() == null ? 0L : first.getSectionOrder().longValue())
                            .sectionCode(first.getSectionCode())
                            .title(first.getSectionTitle())
                            .orderNo(first.getSectionOrder())
                            .questions(sectionQuestions.stream()
                                    .map(question -> mapQuestion(question, existingItems.get(question.getId())))
                                    .toList())
                            .build();
                })
                .toList();
    }

    private FeedbackAssignmentQuestionDetailResponse mapQuestion(
            FeedbackAssignmentQuestion question,
            FeedbackResponseItem existingItem
    ) {
        int maxRating = resolveMaxRating(question.getRatingScaleId());
        return FeedbackAssignmentQuestionDetailResponse.builder()
                .id(question.getId())
                .assignmentQuestionId(question.getId())
                .sourceQuestionId(question.getSourceQuestion() != null ? question.getSourceQuestion().getId() : null)
                .questionCode(question.getQuestionCode())
                .competencyCode(question.getCompetencyCode())
                .responseType(question.getResponseType())
                .scoringBehavior(question.getScoringBehavior())
                .questionText(question.getQuestionTextSnapshot())
                .questionOrder(question.getDisplayOrder())
                .ratingScaleId(question.getRatingScaleId())
                .ratingScaleMin(1)
                .ratingScaleMax(maxRating)
                .ratingOptions(buildRatingOptions(maxRating))
                .weight(question.getWeight())
                .required(Boolean.TRUE.equals(question.getRequired()))
                .existingRatingValue(existingItem != null ? existingItem.getRatingValue() : null)
                .existingComment(existingItem != null ? existingItem.getComment() : null)
                .build();
    }

    private int resolveMaxRating(Integer ratingScaleId) {
        if (ratingScaleId == null) {
            return 5;
        }
        return ratingScaleRepository.findById(ratingScaleId)
                .map(scale -> scale.getScales() != null && scale.getScales() > 0 ? scale.getScales() : 5)
                .orElse(5);
    }

    private List<FeedbackRatingOptionResponse> buildRatingOptions(int maxRating) {
        int boundedMax = Math.max(1, maxRating);
        return IntStream.rangeClosed(1, boundedMax)
                .mapToObj(value -> FeedbackRatingOptionResponse.builder()
                        .value(value)
                        .label(ratingLabel(value))
                        .build())
                .toList();
    }

    private String ratingLabel(int value) {
        return switch (value) {
            case 1 -> "Unsatisfactory";
            case 2 -> "Needs improvement";
            case 3 -> "Meets requirement";
            case 4 -> "Good";
            case 5 -> "Outstanding";
            default -> "Rating " + value;
        };
    }

    private boolean isAutoSubmitCompletedDraftsOnClose(FeedbackEvaluatorAssignment assignment) {
        return assignment != null
                && assignment.getFeedbackRequest() != null
                && assignment.getFeedbackRequest().getCampaign() != null
                && Boolean.TRUE.equals(assignment.getFeedbackRequest().getCampaign().getAutoSubmitCompletedDraftsOnClose());
    }

    private String autoSubmitNotice(FeedbackEvaluatorAssignment assignment) {
        if (!isAutoSubmitCompletedDraftsOnClose(assignment)) {
            return null;
        }
        return "This campaign auto-submits completed drafts when HR closes the campaign. Only drafts with all required ratings answered will be submitted automatically.";
    }

    private boolean isVisibleInEvaluatorWorkspace(FeedbackEvaluatorAssignment assignment) {
        FeedbackCampaignStatus campaignStatus = assignment.getFeedbackRequest().getCampaign().getStatus();
        if (campaignStatus == FeedbackCampaignStatus.DRAFT) {
            return false;
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            return false;
        }
        if (campaignStatus == FeedbackCampaignStatus.ACTIVE) {
            return true;
        }
        return assignment.getStatus() == AssignmentStatus.SUBMITTED || assignment.getResponse() != null;
    }

    private void ensureAssignmentVisibleToEvaluator(FeedbackEvaluatorAssignment assignment, FeedbackResponse response) {
        FeedbackCampaignStatus campaignStatus = assignment.getFeedbackRequest().getCampaign().getStatus();
        if (campaignStatus == FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException("This feedback assignment is not available until HR activates the campaign.");
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            throw new BusinessValidationException("This evaluator assignment was cancelled.");
        }
        if (campaignStatus == FeedbackCampaignStatus.CLOSED
                && assignment.getStatus() != AssignmentStatus.SUBMITTED
                && response == null) {
            throw new BusinessValidationException("This campaign is closed and this assignment was not submitted before the deadline.");
        }
    }

    private boolean canSubmit(FeedbackEvaluatorAssignment assignment, FeedbackResponse response) {
        if (response != null && response.getSubmittedAt() != null) {
            return false;
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            return false;
        }
        if (assignment.getFeedbackRequest().getStatus() == FeedbackRequestStatus.CANCELLED) {
            return false;
        }
        if (assignment.getFeedbackRequest().getCampaign().getStatus() != FeedbackCampaignStatus.ACTIVE) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startAt = assignment.getFeedbackRequest().getCampaign().getStartAt();
        if (startAt != null && now.isBefore(startAt)) {
            return false;
        }
        LocalDateTime dueAt = resolveEffectiveDeadline(assignment);
        return dueAt == null || !now.isAfter(dueAt);
    }

    private String lifecycleMessage(FeedbackEvaluatorAssignment assignment, FeedbackResponse response) {
        if (response != null && response.getSubmittedAt() != null) {
            return "Submitted feedback is locked and can only be viewed.";
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            return "This evaluator assignment was cancelled.";
        }
        if (assignment.getFeedbackRequest().getStatus() == FeedbackRequestStatus.CANCELLED) {
            return "This feedback request was cancelled.";
        }

        FeedbackCampaignStatus campaignStatus = assignment.getFeedbackRequest().getCampaign().getStatus();
        if (campaignStatus == FeedbackCampaignStatus.DRAFT) {
            return "This campaign is still in HR setup and is not open to evaluators yet.";
        }
        if (campaignStatus == FeedbackCampaignStatus.CLOSED) {
            return "This campaign is closed. Feedback can no longer be edited or submitted.";
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startAt = assignment.getFeedbackRequest().getCampaign().getStartAt();
        if (startAt != null && now.isBefore(startAt)) {
            return "This campaign is active but the submission window has not started yet.";
        }
        LocalDateTime dueAt = resolveEffectiveDeadline(assignment);
        if (dueAt != null && now.isAfter(dueAt)) {
            return "The feedback submission deadline has passed.";
        }
        return "Open for draft saving and final submission.";
    }

    private Map<Long, String> loadEmployeeNames(List<Long> employeeIds) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, String> employeeNames = employeeRepository.findAllById(
                        employeeIds.stream().map(Long::intValue).toList())
                .stream()
                .collect(Collectors.toMap(
                        employee -> employee.getId().longValue(),
                        this::toEmployeeName
                ));

        if (employeeNames.size() == employeeIds.size()) {
            return employeeNames;
        }

        for (Long employeeId : employeeIds) {
            employeeNames.computeIfAbsent(employeeId, id -> userRepository.findByEmployeeId(id.intValue())
                    .map(User::getFullName)
                    .filter(name -> name != null && !name.isBlank())
                    .orElse("Employee #" + id));
        }

        return employeeNames;
    }

    private String toEmployeeName(Employee employee) {
        String fullName = ((employee.getFirstName() != null ? employee.getFirstName() : "") + " "
                + (employee.getLastName() != null ? employee.getLastName() : "")).trim();
        return fullName.isBlank() ? "Employee #" + employee.getId() : fullName;
    }

    private Long resolveEmployeeIdForUser(Long userId) {
        User user = userRepository.findById(userId.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getEmployeeId() == null) {
            throw new BusinessValidationException("This user is not linked to an employee record.");
        }
        return user.getEmployeeId().longValue();
    }

    private LocalDateTime resolveEffectiveDeadline(FeedbackEvaluatorAssignment assignment) {
        return assignment.getFeedbackRequest().getCampaign().getEndAt();
    }
}

package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignQuestionReviewResponse;
import com.epms.dto.FeedbackCampaignQuestionReviewSaveRequest;
import com.epms.dto.FeedbackCampaignQuestionSelectionRequest;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignQuestionSelection;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.service.FeedbackCampaignQuestionReviewBuilderService;
import com.epms.service.FeedbackCampaignQuestionReviewBuilderService.QuestionGroup;
import com.epms.service.FeedbackCampaignQuestionReviewBuilderService.ResolvedQuestionReview;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import com.epms.service.FeedbackCampaignQuestionSelectionService;
import com.epms.service.FeedbackCampaignQuestionSelectionService.AssignmentSelectionContext;
import com.epms.service.FeedbackCampaignQuestionSelectionService.CompetencyWeightDraft;
import com.epms.service.FeedbackCampaignQuestionSelectionService.QuestionSelectionDraft;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignQuestionReviewServiceImpl implements FeedbackCampaignQuestionReviewService {

    private static final String DEFAULT_LEVEL = "UNSPECIFIED";

    private final FeedbackCampaignRepository campaignRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackCampaignQuestionSelectionService questionSelectionService;
    private final FeedbackCampaignQuestionReviewBuilderService questionReviewBuilderService;
    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignQuestionReviewResponse getQuestionReview(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        List<FeedbackCampaignQuestionSelection> saved = questionSelectionService.findSavedSelections(campaignId);
        if (saved.isEmpty()) {
            return questionReviewBuilderService.buildResolvedReview(campaign, false);
        }
        return questionReviewBuilderService.buildSavedReview(campaign, saved);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignQuestionReviewResponse resolveQuestionReview(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        return questionReviewBuilderService.buildResolvedReview(campaign, false);
    }

    @Override
    @Transactional
    public FeedbackCampaignQuestionReviewResponse saveQuestionReview(Long campaignId, FeedbackCampaignQuestionReviewSaveRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        ensureDraftCampaign(campaign);

        ResolvedQuestionReview resolved = questionReviewBuilderService.resolveCandidateGroups(campaign);
        if (resolved.groups().isEmpty()) {
            throw new BusinessValidationException("Generate evaluator assignments before saving campaign questions.");
        }

        Map<String, FeedbackCampaignQuestionSelectionRequest> decisions = (request.getSelections() == null ? List.<FeedbackCampaignQuestionSelectionRequest>of() : request.getSelections())
                .stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(
                        selection -> questionReviewBuilderService.decisionKey(
                                selection.getRelationshipType(),
                                selection.getTargetLevelCode(),
                                selection.getTargetDepartmentId(),
                                selection.getTargetPositionId(),
                                selection.getQuestionCode()),
                        selection -> selection,
                        (first, duplicate) -> duplicate,
                        LinkedHashMap::new
                ));

        List<QuestionGroup> groupsWithDecisions = questionReviewBuilderService.applyRequestDecisions(resolved.groups(), decisions);
        questionReviewBuilderService.validateEveryGroupHasIncludedQuestion(groupsWithDecisions);

        List<CompetencyWeightDraft> competencyWeightDrafts = questionReviewBuilderService.resolveCompetencyWeightsForSave(
                campaign,
                groupsWithDecisions,
                request.getCompetencyWeights()
        );
        List<QuestionSelectionDraft> selections = questionReviewBuilderService.buildQuestionSelectionDrafts(groupsWithDecisions);

        questionSelectionService.replaceSelectionsAndWeights(campaign, selections, competencyWeightDrafts);
        return questionReviewBuilderService.buildSavedReview(campaign, questionSelectionService.findSavedSelections(campaignId));
    }

    @Override
    @Transactional(readOnly = true)
    public void validateCampaignQuestionSelectionReady(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaignId).stream()
                .filter(assignment -> assignment.getStatus() != null)
                .toList();
        if (assignments.isEmpty()) {
            throw new BusinessValidationException("Generate evaluator assignments before validating campaign questions.");
        }
        questionSelectionService.validateReady(
                campaign.getId(),
                assignments,
                assignment -> {
                    AssignmentContext context = resolveAssignmentContext(assignment);
                    return new AssignmentSelectionContext(
                            context.targetLevelCode(),
                            context.targetPositionId(),
                            context.targetDepartmentId()
                    );
                }
        );
    }

    @Override
    @Transactional
    public void clearCampaignQuestionSelection(Long campaignId) {
        questionSelectionService.clearSelectionsAndWeights(campaignId);
    }

    private AssignmentContext resolveAssignmentContext(FeedbackEvaluatorAssignment assignment) {
        FeedbackRequest request = assignment.getFeedbackRequest();
        Employee employee = request.getTargetEmployeeId() == null ? null
                : employeeRepository.findById(request.getTargetEmployeeId().intValue()).orElse(null);
        String levelCode = normalizeLevel(firstNonBlank(request.getTargetLevelCode(), resolveLevelCode(employee)));
        Integer levelRank = resolveLevelRank(levelCode);
        Long positionId = firstNonNull(
                request.getTargetPositionId() == null ? null : request.getTargetPositionId().longValue(),
                resolvePositionId(employee)
        );
        Long departmentId = firstNonNull(
                request.getTargetCurrentDepartmentId() == null ? null : request.getTargetCurrentDepartmentId().longValue(),
                resolveCurrentDepartmentId(employee)
        );
        return new AssignmentContext(levelCode, levelRank, positionId, departmentId);
    }

    private Long resolvePositionId(Employee employee) {
        return employee != null && employee.getPosition() != null && employee.getPosition().getId() != null
                ? employee.getPosition().getId().longValue()
                : null;
    }

    private String resolveLevelCode(Employee employee) {
        return employee != null && employee.getPosition() != null && employee.getPosition().getLevel() != null
                ? employee.getPosition().getLevel().getLevelCode()
                : null;
    }

    private Long resolveCurrentDepartmentId(Employee employee) {
        EmployeeDepartment assignment = latestActiveDepartmentAssignment(employee);
        Department department = assignment == null ? null : firstNonNull(assignment.getCurrentDepartment(), assignment.getParentDepartment());
        return department == null || department.getId() == null ? null : department.getId().longValue();
    }

    private EmployeeDepartment latestActiveDepartmentAssignment(Employee employee) {
        if (employee == null || employee.getEmployeeDepartments() == null) {
            return null;
        }
        return employee.getEmployeeDepartments().stream()
                .filter(Objects::nonNull)
                .filter(assignment -> assignment.getEnddate() == null)
                .max(Comparator
                        .comparing(EmployeeDepartment::getStartdate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(EmployeeDepartment::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
    }

    private FeedbackCampaign getCampaign(Long campaignId) {
        return campaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    private void ensureDraftCampaign(FeedbackCampaign campaign) {
        if (campaign.getStatus() != FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException("Campaign questions can be changed only while the campaign is DRAFT.");
        }
    }

    private String normalizeLevel(String value) {
        String normalized = firstNonBlank(value, DEFAULT_LEVEL);
        return normalized.trim().replaceAll("\\s+", "_").toUpperCase();
    }

    private Integer resolveLevelRank(String levelCode) {
        String digits = firstNonBlank(levelCode, "9").replaceAll("\\D+", "");
        if (digits.isBlank()) {
            return 9;
        }
        try {
            return Math.max(1, Math.min(9, Integer.parseInt(digits)));
        } catch (NumberFormatException ignored) {
            return 9;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    @SafeVarargs
    private final <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private record AssignmentContext(String targetLevelCode, Integer targetLevelRank, Long targetPositionId, Long targetDepartmentId) {}
}

package com.epms.service.impl;

import com.epms.entity.Employee;
import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackCampaignQuestionSelection;
import com.epms.entity.FeedbackQuestionApplicabilityRule;
import com.epms.entity.FeedbackQuestionBank;
import com.epms.entity.FeedbackQuestionVersion;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackAssignmentQuestionRepository;
import com.epms.repository.FeedbackCampaignQuestionSelectionRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackQuestionApplicabilityRuleRepository;
import com.epms.repository.FeedbackQuestionVersionRepository;
import com.epms.service.FeedbackAssignmentQuestionSnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class FeedbackAssignmentQuestionSnapshotServiceImpl implements FeedbackAssignmentQuestionSnapshotService {

    private static final String DEFAULT_RESPONSE_TYPE = "RATING_WITH_COMMENT";
    private static final String RESPONSE_RATING_WITH_COMMENT = "RATING_WITH_COMMENT";
    private static final String RESPONSE_RATING = "RATING";
    private static final String RESPONSE_TEXT = "TEXT";
    private static final String RESPONSE_YES_NO = "YES_NO";
    private static final String SCORING_SCORED = "SCORED";
    private static final String SCORING_NON_SCORED = "NON_SCORED";
    private static final String SCORING_HR_REVIEW = "HR_REVIEW";

    private final FeedbackAssignmentQuestionRepository assignmentQuestionRepository;
    private final FeedbackCampaignQuestionSelectionRepository campaignQuestionSelectionRepository;
    private final FeedbackQuestionApplicabilityRuleRepository ruleRepository;
    private final FeedbackQuestionVersionRepository questionVersionRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public List<FeedbackAssignmentQuestion> findOrCreateAssignmentQuestions(FeedbackEvaluatorAssignment assignment) {
        if (assignment == null || assignment.getId() == null) {
            throw new ResourceNotFoundException("Feedback assignment not found.");
        }

        List<FeedbackAssignmentQuestion> existing = assignmentQuestionRepository.findDetailedByAssignmentId(assignment.getId());
        if (!existing.isEmpty()) {
            return existing;
        }

        List<FeedbackAssignmentQuestion> snapshots = resolveForAssignment(assignment);
        if (snapshots.isEmpty()) {
            throw new ResourceNotFoundException("No feedback questions are configured for this assignment.");
        }
        assignmentQuestionRepository.saveAll(snapshots);
        return assignmentQuestionRepository.findDetailedByAssignmentId(assignment.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackAssignmentQuestion> getAssignmentQuestions(Long assignmentId) {
        return assignmentQuestionRepository.findDetailedByAssignmentId(assignmentId);
    }

    @Override
    @Transactional
    public void snapshotCampaignAssignments(Long campaignId) {
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaignId);
        for (FeedbackEvaluatorAssignment assignment : assignments) {
            findOrCreateAssignmentQuestions(assignment);
        }
    }

    private List<FeedbackAssignmentQuestion> resolveForAssignment(FeedbackEvaluatorAssignment assignment) {
        Employee targetEmployee = employeeRepository.findById(assignment.getFeedbackRequest().getTargetEmployeeId().intValue())
                .orElse(null);
        int levelRank = resolveLevelRank(targetEmployee);
        Long positionId = targetEmployee != null && targetEmployee.getPosition() != null && targetEmployee.getPosition().getId() != null
                ? targetEmployee.getPosition().getId().longValue()
                : null;
        Long departmentId = resolveDepartmentId(targetEmployee);
        String targetLevelCode = resolveLevelCode(assignment, targetEmployee);

        if (assignment.getFeedbackRequest() != null && assignment.getFeedbackRequest().getCampaign() != null) {
            Long campaignId = assignment.getFeedbackRequest().getCampaign().getId();
            List<FeedbackCampaignQuestionSelection> selections = campaignQuestionSelectionRepository.findIncludedForAssignmentGroup(
                    campaignId,
                    assignment.getRelationshipType(),
                    targetLevelCode,
                    positionId,
                    departmentId
            );
            if (!selections.isEmpty()) {
                return snapshotCampaignSelectionQuestions(assignment, selections);
            }
            if (isLockedCampaignStatus(assignment.getFeedbackRequest().getCampaign().getStatus())) {
                throw new BusinessValidationException(noQuestionConfigurationMessage(assignment, targetLevelCode));
            }
        }

        List<FeedbackQuestionApplicabilityRule> rules = ruleRepository.findBestMatchingFormRules(
                levelRank,
                positionId,
                departmentId,
                assignment.getRelationshipType().name(),
                LocalDate.now()
        );

        if (!rules.isEmpty()) {
            return snapshotRuleQuestions(assignment, rules);
        }

        throw new BusinessValidationException(noQuestionConfigurationMessage(assignment, targetLevelCode));
    }

    private boolean isLockedCampaignStatus(FeedbackCampaignStatus status) {
        return status != null && status != FeedbackCampaignStatus.DRAFT;
    }

    private String noQuestionConfigurationMessage(FeedbackEvaluatorAssignment assignment, String targetLevelCode) {
        String relationship = assignment == null || assignment.getRelationshipType() == null
                ? "this evaluator role"
                : assignment.getRelationshipType().name();
        return "No campaign question preview or active Form Setup matched " + relationship
                + " for target level " + firstNonBlank(targetLevelCode, "UNSPECIFIED")
                + ". Refresh and save Campaign Question Preview before activation.";
    }


    private List<FeedbackAssignmentQuestion> snapshotCampaignSelectionQuestions(
            FeedbackEvaluatorAssignment assignment,
            List<FeedbackCampaignQuestionSelection> selections
    ) {
        Map<String, FeedbackAssignmentQuestion> byQuestionCode = new LinkedHashMap<>();
        for (FeedbackCampaignQuestionSelection selection : selections) {
            if (selection == null || selection.getQuestionCode() == null || !Boolean.TRUE.equals(selection.getIncluded())) {
                continue;
            }
            byQuestionCode.putIfAbsent(selection.getQuestionCode(), fromCampaignSelection(assignment, selection));
        }

        return byQuestionCode.values().stream()
                .sorted(Comparator.comparing(FeedbackAssignmentQuestion::getSectionOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FeedbackAssignmentQuestion::getDisplayOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FeedbackAssignmentQuestion::getQuestionCode, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private FeedbackAssignmentQuestion fromCampaignSelection(
            FeedbackEvaluatorAssignment assignment,
            FeedbackCampaignQuestionSelection selection
    ) {
        FeedbackAssignmentQuestion snapshot = new FeedbackAssignmentQuestion();
        snapshot.setAssignment(assignment);
        snapshot.setQuestionVersion(selection.getQuestionVersion());
        snapshot.setQuestionBankId(selection.getQuestionBankId());
        snapshot.setQuestionCode(normalizeCode(selection.getQuestionCode(), "CAMPAIGN-Q-" + selection.getId()));
        snapshot.setCompetencyCode(selection.getCompetencyCode());
        snapshot.setQuestionTextSnapshot(firstNonBlank(selection.getQuestionTextSnapshot(), "Untitled feedback question"));
        snapshot.setResponseType(RESPONSE_RATING_WITH_COMMENT);
        snapshot.setScoringBehavior(SCORING_SCORED);
        snapshot.setRatingScaleId(selection.getRatingScaleId());
        snapshot.setRequired(true);
        snapshot.setWeight(selection.getWeight() == null || selection.getWeight() <= 0 ? 1.0 : selection.getWeight());
        snapshot.setSectionCode(normalizeCode(firstNonBlank(selection.getCompetencyCode(), selection.getSectionCode()), "GENERAL"));
        snapshot.setSectionTitle(firstNonBlank(selection.getSectionTitle(), selection.getCompetencyCode(), "General Feedback"));
        snapshot.setSectionOrder(selection.getSectionOrder());
        snapshot.setDisplayOrder(selection.getDisplayOrder());
        return snapshot;
    }

    private List<FeedbackAssignmentQuestion> snapshotRuleQuestions(
            FeedbackEvaluatorAssignment assignment,
            List<FeedbackQuestionApplicabilityRule> rules
    ) {
        Map<String, FeedbackAssignmentQuestion> byQuestionCode = new LinkedHashMap<>();

        for (FeedbackQuestionApplicabilityRule rule : rules) {
            FeedbackQuestionBank bank = rule.getQuestionBank();
            FeedbackQuestionVersion version = findActiveVersion(bank);
            if (bank == null || version == null) {
                continue;
            }

            String questionCode = normalizeCode(bank.getQuestionCode(), "BANK-Q-" + bank.getId());
            byQuestionCode.putIfAbsent(questionCode, fromRule(assignment, rule, version, bank, questionCode));
        }

        return byQuestionCode.values().stream()
                .sorted(Comparator.comparing(FeedbackAssignmentQuestion::getDisplayOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FeedbackAssignmentQuestion::getQuestionCode, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private FeedbackAssignmentQuestion fromRule(
            FeedbackEvaluatorAssignment assignment,
            FeedbackQuestionApplicabilityRule rule,
            FeedbackQuestionVersion version,
            FeedbackQuestionBank bank,
            String questionCode
    ) {
        FeedbackAssignmentQuestion snapshot = new FeedbackAssignmentQuestion();
        snapshot.setAssignment(assignment);
        snapshot.setQuestionVersion(version);
        snapshot.setQuestionBankId(bank.getId());
        snapshot.setQuestionCode(questionCode);
        snapshot.setCompetencyCode(bank.getCompetencyCode());
        snapshot.setQuestionTextSnapshot(firstNonBlank(version.getQuestionText(), bank.getDefaultText()));
        String responseType = normalizeResponseType(firstNonBlank(version.getResponseType(), bank.getDefaultResponseType(), DEFAULT_RESPONSE_TYPE));
        String scoringBehavior = resolveScoringBehavior(version, bank, responseType);
        snapshot.setResponseType(responseType);
        snapshot.setScoringBehavior(scoringBehavior);
        snapshot.setRatingScaleId(firstNonNull(version.getRatingScaleId(), bank.getDefaultRatingScaleId()));
        snapshot.setRequired(true);
        snapshot.setWeight(resolveWeight(bank.getDefaultWeight(), 1.0));
        snapshot.setSectionCode(normalizeCode(bank.getCompetencyCode(), "GENERAL"));
        snapshot.setSectionTitle(firstNonBlank(bank.getCompetencyCode(), "General Feedback"));
        snapshot.setSectionOrder(1);
        snapshot.setDisplayOrder(rule.getDisplayOrder());
        return snapshot;
    }

    private FeedbackQuestionVersion findActiveVersion(FeedbackQuestionBank bank) {
        if (bank == null || bank.getId() == null) {
            return null;
        }
        return questionVersionRepository.findTopByQuestionBank_IdAndActiveTrueOrderByVersionNumberDesc(bank.getId()).orElse(null);
    }

    private String normalizeResponseType(String responseType) {
        return RESPONSE_RATING_WITH_COMMENT;
    }

    private String resolveScoringBehavior(FeedbackQuestionVersion version, FeedbackQuestionBank bank, String responseType) {
        return SCORING_SCORED;
    }

    private String inferDefaultScoringBehavior(String responseType) {
        return SCORING_SCORED;
    }

    private boolean isRatingResponseType(String responseType) {
        return true;
    }

    private boolean isScored(String responseType, String scoringBehavior) {
        return true;
    }

    private Double resolveWeight(Double primary, Double fallback) {
        if (primary != null && primary > 0) {
            return primary;
        }
        if (fallback != null && fallback > 0) {
            return fallback;
        }
        return 1.0;
    }

    private Long resolveDepartmentId(Employee employee) {
        if (employee == null || employee.getEmployeeDepartments() == null) {
            return null;
        }
        return employee.getEmployeeDepartments().stream()
                .filter(Objects::nonNull)
                .filter(assignment -> assignment.getEnddate() == null)
                .findFirst()
                .map(assignment -> assignment.getCurrentDepartment() != null ? assignment.getCurrentDepartment() : assignment.getParentDepartment())
                .filter(Objects::nonNull)
                .map(department -> department.getId() == null ? null : department.getId().longValue())
                .orElse(null);
    }

    private String resolveLevelCode(FeedbackEvaluatorAssignment assignment, Employee employee) {
        String snapshotLevel = assignment != null && assignment.getFeedbackRequest() != null
                ? assignment.getFeedbackRequest().getTargetLevelCode()
                : null;
        if (snapshotLevel != null && !snapshotLevel.isBlank()) {
            return snapshotLevel.trim().replaceAll("\\s+", "_").toUpperCase();
        }
        if (employee == null || employee.getPosition() == null || employee.getPosition().getLevel() == null
                || employee.getPosition().getLevel().getLevelCode() == null
                || employee.getPosition().getLevel().getLevelCode().isBlank()) {
            return "UNSPECIFIED";
        }
        return employee.getPosition().getLevel().getLevelCode().trim().replaceAll("\\s+", "_").toUpperCase();
    }

    private int resolveLevelRank(Employee employee) {
        if (employee == null || employee.getPosition() == null || employee.getPosition().getLevel() == null) {
            return 9;
        }
        String levelCode = employee.getPosition().getLevel().getLevelCode();
        if (levelCode == null || levelCode.isBlank()) {
            return 9;
        }
        String digits = levelCode.replaceAll("\\D+", "");
        if (digits.isBlank()) {
            return 9;
        }
        try {
            int parsed = Integer.parseInt(digits);
            return Math.max(1, Math.min(9, parsed));
        } catch (NumberFormatException ignored) {
            return 9;
        }
    }

    private String normalizeCode(String value, String fallback) {
        String normalized = firstNonBlank(value, fallback);
        return normalized.trim().replaceAll("\\s+", "_").toUpperCase();
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

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}

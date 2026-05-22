package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignCompetencyWeightRequest;
import com.epms.dto.FeedbackCampaignCompetencyWeightResponse;
import com.epms.dto.FeedbackCampaignQuestionGroupResponse;
import com.epms.dto.FeedbackCampaignQuestionItemResponse;
import com.epms.dto.FeedbackCampaignQuestionReviewResponse;
import com.epms.dto.FeedbackCampaignQuestionReviewSaveRequest;
import com.epms.dto.FeedbackCampaignQuestionSelectionRequest;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignCompetencyWeight;
import com.epms.entity.FeedbackCompetency;
import com.epms.entity.FeedbackCampaignQuestionSelection;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackQuestionApplicabilityRule;
import com.epms.entity.FeedbackQuestionBank;
import com.epms.entity.FeedbackQuestionVersion;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.Position;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignCompetencyWeightRepository;
import com.epms.repository.FeedbackCampaignQuestionSelectionRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackCompetencyRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackQuestionApplicabilityRuleRepository;
import com.epms.repository.FeedbackQuestionVersionRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignQuestionReviewServiceImpl implements FeedbackCampaignQuestionReviewService {

    private static final String DEFAULT_LEVEL = "UNSPECIFIED";
    private static final String DEFAULT_RESPONSE_TYPE = "RATING_WITH_COMMENT";
    private static final String RESPONSE_RATING_WITH_COMMENT = "RATING_WITH_COMMENT";
    private static final String RESPONSE_RATING = "RATING";
    private static final String RESPONSE_TEXT = "TEXT";
    private static final String RESPONSE_YES_NO = "YES_NO";
    private static final String SCORING_SCORED = "SCORED";
    private static final String SCORING_NON_SCORED = "NON_SCORED";
    private static final String SCORING_HR_REVIEW = "HR_REVIEW";

    private final FeedbackCampaignRepository campaignRepository;
    private final FeedbackRequestRepository requestRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackQuestionApplicabilityRuleRepository ruleRepository;
    private final FeedbackQuestionVersionRepository questionVersionRepository;
    private final FeedbackCampaignQuestionSelectionRepository selectionRepository;
    private final FeedbackCampaignCompetencyWeightRepository competencyWeightRepository;
    private final EmployeeRepository employeeRepository;
    private final FeedbackCompetencyRepository competencyRepository;

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignQuestionReviewResponse getQuestionReview(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        List<FeedbackCampaignQuestionSelection> saved = selectionRepository.findByCampaignIdOrderByRelationshipTypeAscTargetLevelRankAscSectionOrderAscDisplayOrderAscIdAsc(campaignId);
        if (saved.isEmpty()) {
            return buildResolvedReview(campaign, false);
        }
        return buildSavedReview(campaign, saved);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignQuestionReviewResponse resolveQuestionReview(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        return buildResolvedReview(campaign, false);
    }

    @Override
    @Transactional
    public FeedbackCampaignQuestionReviewResponse saveQuestionReview(Long campaignId, FeedbackCampaignQuestionReviewSaveRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        ensureDraftCampaign(campaign);

        ResolvedReview resolved = resolveCandidateGroups(campaign);
        if (resolved.groups().isEmpty()) {
            throw new BusinessValidationException("Generate evaluator assignments before saving campaign questions.");
        }

        Map<String, FeedbackCampaignQuestionSelectionRequest> decisions = (request.getSelections() == null ? List.<FeedbackCampaignQuestionSelectionRequest>of() : request.getSelections())
                .stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(
                        selection -> decisionKey(selection.getRelationshipType(), selection.getTargetLevelCode(), selection.getQuestionCode()),
                        selection -> selection,
                        (first, duplicate) -> duplicate
                ));

        List<QuestionGroup> groupsWithDecisions = resolved.groups().stream()
                .map(group -> applyRequestDecisions(group, decisions))
                .sorted(groupComparator())
                .toList();

        List<String> blocking = new ArrayList<>();
        for (QuestionGroup group : groupsWithDecisions) {
            long included = group.questions().stream().filter(QuestionCandidate::included).count();
            if (included == 0) {
                blocking.add(group.relationshipLabel() + " / " + group.targetLevelCode());
            }
        }
        if (!blocking.isEmpty()) {
            throw new BusinessValidationException("Each evaluator group must keep at least one question before activation. Empty group(s): " + blocking);
        }

        List<CompetencyWeightDraft> competencyWeightDrafts = resolveCompetencyWeightsForSave(
                campaign,
                groupsWithDecisions,
                request.getCompetencyWeights()
        );

        selectionRepository.deleteByCampaignId(campaignId);
        selectionRepository.flush();
        competencyWeightRepository.deleteByCampaignId(campaignId);
        competencyWeightRepository.flush();

        List<FeedbackCampaignQuestionSelection> selections = new ArrayList<>();
        for (QuestionGroup group : groupsWithDecisions) {
            for (QuestionCandidate question : group.questions()) {
                FeedbackCampaignQuestionSelection selection = new FeedbackCampaignQuestionSelection();
                selection.setCampaign(campaign);
                selection.setQuestionVersion(question.version());
                selection.setQuestionBankId(question.questionBankId());
                selection.setSourceRuleId(question.sourceRuleId());
                selection.setRelationshipType(group.relationshipType());
                selection.setTargetLevelCode(group.targetLevelCode());
                selection.setTargetLevelRank(group.targetLevelRank());
                selection.setTargetPositionId(question.targetPositionId());
                selection.setTargetDepartmentId(question.targetDepartmentId());
                selection.setTargetCount(group.targetCount());
                selection.setAssignmentCount(group.assignmentCount());
                selection.setQuestionCode(question.questionCode());
                selection.setCompetencyCode(question.competencyCode());
                selection.setQuestionTextSnapshot(question.questionText());
                selection.setResponseType(question.responseType());
                selection.setScoringBehavior(question.scoringBehavior());
                selection.setRatingScaleId(question.ratingScaleId());
                selection.setRequired(Boolean.TRUE.equals(question.required()));
                selection.setIncluded(Boolean.TRUE.equals(question.included()));
                selection.setWeight(question.weight());
                selection.setSectionCode(question.sectionCode());
                selection.setSectionTitle(question.sectionTitle());
                selection.setSectionOrder(question.sectionOrder());
                selection.setDisplayOrder(question.displayOrder());
                selections.add(selection);
            }
        }

        selectionRepository.saveAll(selections);
        saveCompetencyWeights(campaign, competencyWeightDrafts);
        return buildSavedReview(campaign, selectionRepository.findByCampaignIdOrderByRelationshipTypeAscTargetLevelRankAscSectionOrderAscDisplayOrderAscIdAsc(campaignId));
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
        if (!selectionRepository.existsByCampaignIdAndIncludedTrue(campaignId)) {
            throw new BusinessValidationException("Complete campaign question review before marking the campaign ready.");
        }

        List<String> missingGroups = new ArrayList<>();
        for (FeedbackEvaluatorAssignment assignment : assignments) {
            AssignmentContext context = resolveAssignmentContext(assignment);
            List<FeedbackCampaignQuestionSelection> selections = selectionRepository.findIncludedForAssignmentGroup(
                    campaignId,
                    assignment.getRelationshipType(),
                    context.targetLevelCode(),
                    context.targetPositionId(),
                    context.targetDepartmentId()
            );
            if (selections.isEmpty()) {
                missingGroups.add(relationshipLabel(assignment.getRelationshipType()) + " / " + context.targetLevelCode());
            }
        }
        if (!missingGroups.isEmpty()) {
            throw new BusinessValidationException("Question review is missing included questions for evaluator group(s): "
                    + missingGroups.stream().distinct().toList());
        }

        validateSavedCompetencyWeights(campaign);
    }

    @Override
    @Transactional
    public void clearCampaignQuestionSelection(Long campaignId) {
        selectionRepository.deleteByCampaignId(campaignId);
        competencyWeightRepository.deleteByCampaignId(campaignId);
    }

    private FeedbackCampaignQuestionReviewResponse buildResolvedReview(FeedbackCampaign campaign, boolean saved) {
        ResolvedReview resolved = resolveCandidateGroups(campaign);
        return buildResponse(campaign, saved, resolved.groups(), resolved.warnings(), null);
    }

    private FeedbackCampaignQuestionReviewResponse buildSavedReview(FeedbackCampaign campaign, List<FeedbackCampaignQuestionSelection> saved) {
        LocalDateTime lastSavedAt = saved.stream()
                .map(FeedbackCampaignQuestionSelection::getUpdatedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        ResolvedReview resolved = resolveCandidateGroups(campaign);
        if (resolved.groups().isEmpty()) {
            Map<String, List<FeedbackCampaignQuestionSelection>> byGroup = saved.stream()
                    .collect(Collectors.groupingBy(
                            selection -> groupKey(selection.getRelationshipType(), selection.getTargetLevelCode()),
                            LinkedHashMap::new,
                            Collectors.toList()
                    ));
            List<QuestionGroup> savedGroups = byGroup.values().stream()
                    .map(this::toSavedGroup)
                    .sorted(groupComparator())
                    .toList();
            List<String> warnings = new ArrayList<>(resolved.warnings());
            warnings.add("Current active Question Rules could not be resolved. Showing the last saved review only.");
            return buildResponse(campaign, true, savedGroups, warnings, lastSavedAt);
        }

        Map<String, FeedbackCampaignQuestionSelection> savedByQuestion = saved.stream()
                .filter(selection -> selection.getRelationshipType() != null && selection.getTargetLevelCode() != null && selection.getQuestionCode() != null)
                .collect(Collectors.toMap(
                        selection -> decisionKey(selection.getRelationshipType().name(), selection.getTargetLevelCode(), selection.getQuestionCode()),
                        selection -> selection,
                        (first, duplicate) -> duplicate,
                        LinkedHashMap::new
                ));

        Set<String> activeKeys = new LinkedHashSet<>();
        List<QuestionGroup> mergedGroups = resolved.groups().stream()
                .map(group -> mergeSavedDecisions(group, savedByQuestion, activeKeys))
                .sorted(groupComparator())
                .toList();

        Set<String> savedKeys = saved.stream()
                .filter(selection -> selection.getRelationshipType() != null && selection.getTargetLevelCode() != null && selection.getQuestionCode() != null)
                .map(selection -> decisionKey(selection.getRelationshipType().name(), selection.getTargetLevelCode(), selection.getQuestionCode()))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        boolean savedMatchesCurrentRules = savedKeys.equals(activeKeys);
        List<String> warnings = new ArrayList<>(resolved.warnings());
        if (!savedMatchesCurrentRules) {
            warnings.add("Saved question review is out of date. Current active Question Rules are shown; save the review again to update this campaign.");
        }

        return buildResponse(campaign, savedMatchesCurrentRules, mergedGroups, warnings, lastSavedAt);
    }

    private QuestionGroup mergeSavedDecisions(
            QuestionGroup group,
            Map<String, FeedbackCampaignQuestionSelection> savedByQuestion,
            Set<String> activeKeys
    ) {
        List<QuestionCandidate> questions = group.questions().stream()
                .map(question -> {
                    String key = decisionKey(group.relationshipType().name(), group.targetLevelCode(), question.questionCode());
                    activeKeys.add(key);
                    FeedbackCampaignQuestionSelection saved = savedByQuestion.get(key);
                    return saved == null ? question : applySavedDecision(question, saved);
                })
                .toList();

        return new QuestionGroup(
                group.relationshipType(),
                group.relationshipLabel(),
                group.targetLevelCode(),
                group.targetLevelRank(),
                group.targetCount(),
                group.assignmentCount(),
                questions,
                group.warnings()
        );
    }

    private QuestionCandidate applySavedDecision(QuestionCandidate current, FeedbackCampaignQuestionSelection saved) {
        return new QuestionCandidate(
                current.sourceRuleId(),
                current.version(),
                current.questionBankId(),
                current.questionCode(),
                current.competencyCode(),
                current.questionText(),
                current.responseType(),
                current.scoringBehavior(),
                current.ratingScaleId(),
                saved.getRequired() == null ? current.required() : saved.getRequired(),
                current.weight(),
                current.sectionCode(),
                current.sectionTitle(),
                saved.getSectionOrder() == null ? current.sectionOrder() : saved.getSectionOrder(),
                saved.getDisplayOrder() == null ? current.displayOrder() : saved.getDisplayOrder(),
                current.targetPositionId(),
                current.targetDepartmentId(),
                saved.getId(),
                saved.getIncluded() == null ? current.included() : saved.getIncluded()
        );
    }


    private QuestionGroup applyRequestDecisions(
            QuestionGroup group,
            Map<String, FeedbackCampaignQuestionSelectionRequest> decisions
    ) {
        List<QuestionCandidate> questions = group.questions().stream()
                .map(question -> {
                    FeedbackCampaignQuestionSelectionRequest decision = decisions.get(decisionKey(group.relationshipType().name(), group.targetLevelCode(), question.questionCode()));
                    if (decision == null) {
                        return question;
                    }
                    return new QuestionCandidate(
                            question.sourceRuleId(),
                            question.version(),
                            question.questionBankId(),
                            question.questionCode(),
                            question.competencyCode(),
                            question.questionText(),
                            question.responseType(),
                            question.scoringBehavior(),
                            question.ratingScaleId(),
                            decision.getRequired() == null ? question.required() : decision.getRequired(),
                            question.weight(),
                            question.sectionCode(),
                            question.sectionTitle(),
                            decision.getSectionOrder() == null ? question.sectionOrder() : decision.getSectionOrder(),
                            decision.getDisplayOrder() == null ? question.displayOrder() : decision.getDisplayOrder(),
                            question.targetPositionId(),
                            question.targetDepartmentId(),
                            question.selectionId(),
                            decision.getIncluded() == null ? question.included() : decision.getIncluded()
                    );
                })
                .toList();
        return new QuestionGroup(
                group.relationshipType(),
                group.relationshipLabel(),
                group.targetLevelCode(),
                group.targetLevelRank(),
                group.targetCount(),
                group.assignmentCount(),
                questions,
                group.warnings()
        );
    }

    private ResolvedReview resolveCandidateGroups(FeedbackCampaign campaign) {
        List<String> warnings = new ArrayList<>();
        List<FeedbackRequest> requests = requestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        if (requests.isEmpty()) {
            warnings.add("Select target employees before reviewing campaign questions.");
            return new ResolvedReview(List.of(), warnings);
        }

        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaign.getId());
        if (assignments.isEmpty()) {
            warnings.add("Generate evaluator assignments before reviewing campaign questions.");
            return new ResolvedReview(List.of(), warnings);
        }

        Map<String, MutableQuestionGroup> groups = new LinkedHashMap<>();
        for (FeedbackEvaluatorAssignment assignment : assignments) {
            AssignmentContext context = resolveAssignmentContext(assignment);
            String key = groupKey(assignment.getRelationshipType(), context.targetLevelCode());
            MutableQuestionGroup group = groups.computeIfAbsent(key, unused -> new MutableQuestionGroup(
                    assignment.getRelationshipType(),
                    relationshipLabel(assignment.getRelationshipType()),
                    context.targetLevelCode(),
                    context.targetLevelRank()
            ));
            group.targetIds.add(assignment.getFeedbackRequest().getTargetEmployeeId());
            group.assignmentCount++;

            List<FeedbackQuestionApplicabilityRule> rules = ruleRepository.findApplicableRules(
                    context.targetLevelRank(),
                    context.targetPositionId(),
                    context.targetDepartmentId(),
                    assignment.getRelationshipType().name(),
                    LocalDate.now()
            );
            if (rules.isEmpty()) {
                group.warnings.add("No active question rules matched " + relationshipLabel(assignment.getRelationshipType())
                        + " for level " + context.targetLevelCode() + ".");
            }
            for (FeedbackQuestionApplicabilityRule rule : rules) {
                QuestionCandidate candidate = fromRule(rule);
                group.questions.putIfAbsent(candidate.questionCode(), candidate);
            }
        }

        List<QuestionGroup> resolvedGroups = groups.values().stream()
                .map(MutableQuestionGroup::toImmutable)
                .sorted(groupComparator())
                .toList();

        for (QuestionGroup group : resolvedGroups) {
            if (group.questions().isEmpty()) {
                warnings.add(group.relationshipLabel() + " / " + group.targetLevelCode() + " has no matched questions.");
            } else if (group.questions().stream().noneMatch(question -> isScored(question.responseType(), question.scoringBehavior()))) {
                warnings.add(group.relationshipLabel() + " / " + group.targetLevelCode() + " has no scored questions.");
            } else if (group.questions().size() > 30) {
                warnings.add(group.relationshipLabel() + " / " + group.targetLevelCode() + " has more than 30 questions. Consider excluding lower-priority items.");
            } else if (group.questions().size() > 20) {
                warnings.add(group.relationshipLabel() + " / " + group.targetLevelCode() + " has more than 20 questions.");
            }
        }

        return new ResolvedReview(resolvedGroups, warnings.stream().distinct().toList());
    }

    private FeedbackQuestionVersion findActiveVersion(FeedbackQuestionBank bank) {
        if (bank == null || bank.getId() == null) {
            return null;
        }
        return questionVersionRepository.findTopByQuestionBank_IdAndActiveTrueOrderByVersionNumberDesc(bank.getId()).orElse(null);
    }

    private QuestionCandidate fromRule(FeedbackQuestionApplicabilityRule rule) {
        FeedbackQuestionBank bank = rule.getQuestionBank();
        FeedbackQuestionVersion version = findActiveVersion(bank);
        String responseType = normalizeResponseType(firstNonBlank(
                version == null ? null : version.getResponseType(),
                bank == null ? null : bank.getDefaultResponseType(),
                DEFAULT_RESPONSE_TYPE
        ));
        String scoringBehavior = resolveScoringBehavior(version, bank, responseType);
        String competencyCode = normalizeCode(bank == null ? null : bank.getCompetencyCode(), "GENERAL");
        FeedbackCompetency competency = findCompetency(competencyCode);
        return new QuestionCandidate(
                rule.getId(),
                version,
                bank == null ? null : bank.getId(),
                normalizeCode(bank == null ? null : bank.getQuestionCode(), "BANK-Q-" + (bank == null ? rule.getId() : bank.getId())),
                competencyCode,
                firstNonBlank(version == null ? null : version.getQuestionText(), bank == null ? null : bank.getDefaultText(), "Untitled feedback question"),
                responseType,
                scoringBehavior,
                null,
                true,
                resolveWeight(bank == null ? null : bank.getDefaultWeight(), 1.0),
                competencyCode,
                competencyName(competencyCode, competency),
                competency == null || competency.getDisplayOrder() == null ? 100 : competency.getDisplayOrder(),
                rule.getDisplayOrder() == null ? 1 : rule.getDisplayOrder(),
                rule.getTargetPositionId(),
                rule.getTargetDepartmentId()
        );
    }

    private QuestionGroup toSavedGroup(List<FeedbackCampaignQuestionSelection> selections) {
        FeedbackCampaignQuestionSelection first = selections.get(0);
        List<QuestionCandidate> questions = selections.stream()
                .map(this::fromSelection)
                .toList();
        Set<Long> syntheticTargetIds = new LinkedHashSet<>();
        int targetCount = first.getTargetCount() == null ? 0 : first.getTargetCount();
        for (long index = 0; index < targetCount; index++) {
            syntheticTargetIds.add(index);
        }
        return new QuestionGroup(
                first.getRelationshipType(),
                relationshipLabel(first.getRelationshipType()),
                normalizeLevel(first.getTargetLevelCode()),
                first.getTargetLevelRank() == null ? 9 : first.getTargetLevelRank(),
                targetCount,
                first.getAssignmentCount() == null ? 0 : first.getAssignmentCount(),
                questions,
                List.of()
        );
    }

    private QuestionCandidate fromSelection(FeedbackCampaignQuestionSelection selection) {
        return new QuestionCandidate(
                selection.getSourceRuleId(),
                selection.getQuestionVersion(),
                selection.getQuestionBankId(),
                selection.getQuestionCode(),
                selection.getCompetencyCode(),
                selection.getQuestionTextSnapshot(),
                selection.getResponseType(),
                selection.getScoringBehavior(),
                selection.getRatingScaleId(),
                Boolean.TRUE.equals(selection.getRequired()),
                selection.getWeight(),
                firstNonBlank(selection.getSectionCode(), selection.getCompetencyCode(), "GENERAL"),
                competencyName(selection.getCompetencyCode(), selection.getSectionTitle()),
                selection.getSectionOrder(),
                selection.getDisplayOrder(),
                selection.getTargetPositionId(),
                selection.getTargetDepartmentId(),
                selection.getId(),
                Boolean.TRUE.equals(selection.getIncluded())
        );
    }

    private FeedbackCampaignQuestionReviewResponse buildResponse(
            FeedbackCampaign campaign,
            boolean saved,
            List<QuestionGroup> groups,
            List<String> extraWarnings,
            LocalDateTime lastSavedAt
    ) {
        List<FeedbackCampaignQuestionGroupResponse> groupResponses = groups.stream()
                .map(this::toGroupResponse)
                .toList();
        List<FeedbackCampaignCompetencyWeightResponse> competencyWeights = buildCompetencyWeightResponses(campaign, groups);
        double totalCompetencyWeight = roundToTwoDecimals(competencyWeights.stream()
                .mapToDouble(item -> item.getWeightPercent() == null ? 0.0 : item.getWeightPercent())
                .sum());
        boolean competencyWeightsReady = !competencyWeights.isEmpty()
                && Math.abs(totalCompetencyWeight - 100.0) <= 0.01
                && competencyWeights.stream().allMatch(item -> item.getWarnings() == null || item.getWarnings().isEmpty());

        List<String> warnings = new ArrayList<>(extraWarnings == null ? List.of() : extraWarnings);
        groupResponses.stream()
                .filter(group -> group.getWarnings() != null)
                .flatMap(group -> group.getWarnings().stream())
                .forEach(warnings::add);
        competencyWeights.stream()
                .filter(weight -> weight.getWarnings() != null)
                .flatMap(weight -> weight.getWarnings().stream())
                .forEach(warnings::add);

        int assignmentCount = groups.stream().mapToInt(QuestionGroup::assignmentCount).sum();
        int targetCount = (int) assignmentRepository.findByCampaignIdWithRequest(campaign.getId()).stream()
                .map(assignment -> assignment.getFeedbackRequest().getTargetEmployeeId())
                .distinct()
                .count();
        int questionCount = groups.stream().mapToInt(group -> group.questions().size()).sum();
        int includedQuestionCount = groups.stream().flatMap(group -> group.questions().stream()).filter(QuestionCandidate::included).mapToInt(item -> 1).sum();
        int scoredQuestionCount = groups.stream().flatMap(group -> group.questions().stream()).filter(item -> isScored(item.responseType(), item.scoringBehavior())).mapToInt(item -> 1).sum();
        int includedScoredQuestionCount = groups.stream().flatMap(group -> group.questions().stream())
                .filter(QuestionCandidate::included)
                .filter(item -> isScored(item.responseType(), item.scoringBehavior()))
                .mapToInt(item -> 1)
                .sum();

        return FeedbackCampaignQuestionReviewResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .campaignStatus(campaign.getStatus().name())
                .saved(saved)
                .targetCount(targetCount)
                .assignmentCount(assignmentCount)
                .groupCount(groups.size())
                .questionCount(questionCount)
                .includedQuestionCount(includedQuestionCount)
                .scoredQuestionCount(scoredQuestionCount)
                .includedScoredQuestionCount(includedScoredQuestionCount)
                .totalCompetencyWeight(totalCompetencyWeight)
                .competencyWeightsReady(competencyWeightsReady)
                .lastSavedAt(lastSavedAt)
                .warnings(warnings.stream().distinct().toList())
                .competencyWeights(competencyWeights)
                .groups(groupResponses)
                .build();
    }

    private FeedbackCampaignQuestionGroupResponse toGroupResponse(QuestionGroup group) {
        int questionCount = group.questions().size();
        int includedCount = (int) group.questions().stream().filter(QuestionCandidate::included).count();
        int scoredCount = (int) group.questions().stream().filter(question -> isScored(question.responseType(), question.scoringBehavior())).count();
        int includedScoredCount = (int) group.questions().stream()
                .filter(QuestionCandidate::included)
                .filter(question -> isScored(question.responseType(), question.scoringBehavior()))
                .count();
        List<String> warnings = new ArrayList<>(group.warnings());
        if (questionCount == 0) {
            warnings.add("No matched questions. Add or adjust Question Rules before activation.");
        } else {
            if (includedCount == 0) {
                warnings.add("All questions are excluded. Keep at least one question for this evaluator group.");
            }
            if (includedScoredCount == 0) {
                warnings.add("No included scored questions for this evaluator group.");
            }
            if (includedCount > 30) {
                warnings.add("More than 30 included questions may make this review too long.");
            } else if (includedCount > 20) {
                warnings.add("More than 20 included questions. Review the workload before activation.");
            }
        }

        return FeedbackCampaignQuestionGroupResponse.builder()
                .groupKey(groupKey(group.relationshipType(), group.targetLevelCode()))
                .relationshipType(group.relationshipType().name())
                .relationshipLabel(group.relationshipLabel())
                .targetLevelCode(group.targetLevelCode())
                .targetLevelRank(group.targetLevelRank())
                .targetCount(group.targetCount())
                .assignmentCount(group.assignmentCount())
                .questionCount(questionCount)
                .includedQuestionCount(includedCount)
                .scoredQuestionCount(scoredCount)
                .includedScoredQuestionCount(includedScoredCount)
                .warnings(warnings.stream().distinct().toList())
                .questions(group.questions().stream()
                        .sorted(Comparator.comparing(QuestionCandidate::sectionOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                                .thenComparing(QuestionCandidate::displayOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                                .thenComparing(QuestionCandidate::questionCode, Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(this::toQuestionResponse)
                        .toList())
                .build();
    }

    private FeedbackCampaignQuestionItemResponse toQuestionResponse(QuestionCandidate question) {
        return FeedbackCampaignQuestionItemResponse.builder()
                .selectionId(question.selectionId())
                .questionBankId(question.questionBankId())
                .questionVersionId(question.version() == null ? null : question.version().getId())
                .sourceRuleId(question.sourceRuleId())
                .questionCode(question.questionCode())
                .competencyCode(question.competencyCode())
                .questionText(question.questionText())
                .responseType(question.responseType())
                .scoringBehavior(question.scoringBehavior())
                .ratingScaleId(question.ratingScaleId())
                .required(question.required())
                .included(question.included())
                .weight(question.weight())
                .competencyName(question.sectionTitle())
                .sectionCode(question.sectionCode())
                .sectionTitle(question.sectionTitle())
                .sectionOrder(question.sectionOrder())
                .displayOrder(question.displayOrder())
                .build();
    }

    private List<FeedbackCampaignCompetencyWeightResponse> buildCompetencyWeightResponses(FeedbackCampaign campaign, List<QuestionGroup> groups) {
        Map<String, CompetencyUsage> usageByCode = collectCompetencyUsage(groups);
        if (usageByCode.isEmpty()) {
            return List.of();
        }

        Map<String, Double> defaultWeights = calculateBalancedWeights(usageByCode);
        Map<String, FeedbackCampaignCompetencyWeight> savedWeights = competencyWeightRepository.findByCampaignIdOrderByCompetencyNameSnapshotAsc(campaign.getId()).stream()
                .filter(weight -> weight.getCompetencyCodeSnapshot() != null)
                .collect(Collectors.toMap(
                        weight -> normalizeCode(weight.getCompetencyCodeSnapshot(), "UNMAPPED"),
                        weight -> weight,
                        (first, duplicate) -> duplicate,
                        LinkedHashMap::new
                ));

        return usageByCode.values().stream()
                .sorted(Comparator
                        .comparing(CompetencyUsage::displayOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(CompetencyUsage::competencyName, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(CompetencyUsage::competencyCode, String.CASE_INSENSITIVE_ORDER))
                .map(usage -> {
                    FeedbackCampaignCompetencyWeight savedWeight = savedWeights.get(usage.competencyCode());
                    Double defaultWeight = defaultWeights.getOrDefault(usage.competencyCode(), 0.0);
                    Double weightPercent = savedWeight == null
                            ? defaultWeight
                            : toDouble(savedWeight.getWeightPercent());
                    List<String> warnings = new ArrayList<>();
                    if (usage.questionCountVariesByForm()) {
                        warnings.add(usage.competencyName() + " has a different question count across evaluator forms.");
                    }
                    if (weightPercent != null && weightPercent > 0 && usage.totalIncludedScoredQuestionCount() == 0) {
                        warnings.add(usage.competencyName() + " has a positive weight but no included scored questions.");
                    }
                    return FeedbackCampaignCompetencyWeightResponse.builder()
                            .competencyId(usage.competency() == null ? null : usage.competency().getId())
                            .competencyCode(usage.competencyCode())
                            .competencyName(usage.competencyName())
                            .displayOrder(usage.displayOrder())
                            .questionCountPerForm(usage.questionCountPerForm())
                            .questionCountVariesByForm(usage.questionCountVariesByForm())
                            .formCount(usage.formLabels().size())
                            .usedInForms(new ArrayList<>(usage.formLabels().values()))
                            .includedScoredQuestionCountByForm(new LinkedHashMap<>(usage.includedScoredQuestionCountByForm()))
                            .defaultWeightPercent(defaultWeight)
                            .weightPercent(weightPercent == null ? 0.0 : roundToTwoDecimals(weightPercent))
                            .saved(savedWeight != null)
                            .warnings(warnings.stream().distinct().toList())
                            .build();
                })
                .toList();
    }

    private List<CompetencyWeightDraft> resolveCompetencyWeightsForSave(
            FeedbackCampaign campaign,
            List<QuestionGroup> groups,
            List<FeedbackCampaignCompetencyWeightRequest> requestedWeights
    ) {
        Map<String, CompetencyUsage> usageByCode = collectCompetencyUsage(groups);
        if (usageByCode.isEmpty()) {
            throw new BusinessValidationException("At least one included scored competency is required before saving question review.");
        }

        Map<String, Double> defaultWeights = calculateBalancedWeights(usageByCode);
        Map<String, Double> requestedByCode = new LinkedHashMap<>();
        for (FeedbackCampaignCompetencyWeightRequest requested : requestedWeights == null ? List.<FeedbackCampaignCompetencyWeightRequest>of() : requestedWeights) {
            if (requested == null || requested.getCompetencyCode() == null || requested.getCompetencyCode().isBlank()) {
                continue;
            }
            String code = normalizeCode(requested.getCompetencyCode(), "UNMAPPED");
            if (!usageByCode.containsKey(code)) {
                throw new BusinessValidationException("Competency weight is not used by the current campaign questions: " + requested.getCompetencyCode());
            }
            double weight = requested.getWeightPercent() == null ? 0.0 : requested.getWeightPercent();
            if (!Double.isFinite(weight) || weight < 0 || weight > 100) {
                throw new BusinessValidationException("Competency weight must be between 0 and 100 for " + requested.getCompetencyCode() + ".");
            }
            requestedByCode.put(code, roundToTwoDecimals(weight));
        }

        List<CompetencyWeightDraft> drafts = new ArrayList<>();
        double totalWeight = 0.0;
        for (CompetencyUsage usage : usageByCode.values()) {
            double weight = requestedByCode.containsKey(usage.competencyCode())
                    ? requestedByCode.get(usage.competencyCode())
                    : defaultWeights.getOrDefault(usage.competencyCode(), 0.0);
            weight = roundToTwoDecimals(weight);
            totalWeight += weight;
            if (weight > 0 && usage.totalIncludedScoredQuestionCount() == 0) {
                throw new BusinessValidationException("Competency " + usage.competencyName() + " has a positive weight but no included scored questions.");
            }
            FeedbackCompetency competency = usage.competency();
            if (competency == null || competency.getId() == null) {
                throw new BusinessValidationException("Competency " + usage.competencyName() + " must be registered before it can be weighted.");
            }
            drafts.add(new CompetencyWeightDraft(competency, usage.competencyCode(), usage.competencyName(), weight));
        }

        totalWeight = roundToTwoDecimals(totalWeight);
        if (Math.abs(totalWeight - 100.0) > 0.01) {
            throw new BusinessValidationException("Competency weights must total 100%. Current total is " + totalWeight + "%.");
        }
        return drafts;
    }

    private void saveCompetencyWeights(FeedbackCampaign campaign, List<CompetencyWeightDraft> drafts) {
        List<FeedbackCampaignCompetencyWeight> weights = drafts.stream()
                .map(draft -> {
                    FeedbackCampaignCompetencyWeight weight = new FeedbackCampaignCompetencyWeight();
                    weight.setCampaign(campaign);
                    weight.setCompetency(draft.competency());
                    weight.setCompetencyCodeSnapshot(draft.competencyCode());
                    weight.setCompetencyNameSnapshot(draft.competencyName());
                    weight.setWeightPercent(BigDecimal.valueOf(draft.weightPercent()).setScale(2, RoundingMode.HALF_UP));
                    return weight;
                })
                .toList();
        competencyWeightRepository.saveAll(weights);
    }

    private Map<String, CompetencyUsage> collectCompetencyUsage(List<QuestionGroup> groups) {
        Map<String, CompetencyUsage> usageByCode = new LinkedHashMap<>();
        for (QuestionGroup group : groups == null ? List.<QuestionGroup>of() : groups) {
            String formKey = groupKey(group.relationshipType(), group.targetLevelCode());
            String formLabel = formLabelForWeightUsage(group);
            for (QuestionCandidate question : group.questions()) {
                if (!Boolean.TRUE.equals(question.included()) || !isScored(question.responseType(), question.scoringBehavior())) {
                    continue;
                }
                String competencyCode = normalizeCode(question.competencyCode(), "UNMAPPED");
                FeedbackCompetency competency = findCompetency(competencyCode);
                String competencyName = competencyName(competencyCode, competency == null ? question.sectionTitle() : competency.getName());
                Integer displayOrder = firstNonNull(competency == null ? null : competency.getDisplayOrder(), question.sectionOrder(), 100);
                CompetencyUsage usage = usageByCode.computeIfAbsent(
                        competencyCode,
                        unused -> new CompetencyUsage(competencyCode, competencyName, displayOrder, competency)
                );
                usage.formLabels().putIfAbsent(formKey, formLabel);
                usage.includedScoredQuestionCountByForm().merge(formKey, 1, Integer::sum);
            }
        }
        return usageByCode;
    }

    private Map<String, Double> calculateBalancedWeights(Map<String, CompetencyUsage> usageByCode) {
        Map<String, Double> weights = new LinkedHashMap<>();
        if (usageByCode == null || usageByCode.isEmpty()) {
            return weights;
        }
        int totalBasis = usageByCode.values().stream().mapToInt(CompetencyUsage::defaultQuestionBasis).sum();
        if (totalBasis <= 0) {
            return weights;
        }

        int totalPercentCents = 10_000;
        Map<String, Integer> allocatedCents = new LinkedHashMap<>();
        Map<String, Double> remainders = new LinkedHashMap<>();
        int usedCents = 0;
        for (CompetencyUsage usage : usageByCode.values()) {
            double rawCents = (usage.defaultQuestionBasis() * totalPercentCents) / (double) totalBasis;
            int cents = (int) Math.floor(rawCents);
            allocatedCents.put(usage.competencyCode(), cents);
            remainders.put(usage.competencyCode(), rawCents - cents);
            usedCents += cents;
        }

        int remaining = totalPercentCents - usedCents;
        List<String> orderedRemainders = remainders.entrySet().stream()
                .sorted((left, right) -> {
                    int byRemainder = Double.compare(right.getValue(), left.getValue());
                    return byRemainder != 0 ? byRemainder : left.getKey().compareTo(right.getKey());
                })
                .map(Map.Entry::getKey)
                .toList();
        for (int index = 0; index < remaining && !orderedRemainders.isEmpty(); index++) {
            String code = orderedRemainders.get(index % orderedRemainders.size());
            allocatedCents.put(code, allocatedCents.get(code) + 1);
        }
        allocatedCents.forEach((code, cents) -> weights.put(code, roundToTwoDecimals(cents / 100.0)));
        return weights;
    }

    private void validateSavedCompetencyWeights(FeedbackCampaign campaign) {
        List<FeedbackCampaignCompetencyWeight> weights = competencyWeightRepository.findByCampaignIdOrderByCompetencyNameSnapshotAsc(campaign.getId());
        if (weights.isEmpty()) {
            throw new BusinessValidationException("Save competency weights before marking the campaign ready.");
        }

        List<FeedbackCampaignQuestionSelection> selections = selectionRepository.findByCampaignIdOrderByRelationshipTypeAscTargetLevelRankAscSectionOrderAscDisplayOrderAscIdAsc(campaign.getId());
        Set<String> includedScoredCompetencies = selections.stream()
                .filter(selection -> Boolean.TRUE.equals(selection.getIncluded()))
                .filter(selection -> isScored(selection.getResponseType(), selection.getScoringBehavior()))
                .map(selection -> normalizeCode(selection.getCompetencyCode(), "UNMAPPED"))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> weightedCompetencies = weights.stream()
                .map(weight -> normalizeCode(weight.getCompetencyCodeSnapshot(), "UNMAPPED"))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<String> missingWeights = includedScoredCompetencies.stream()
                .filter(code -> !weightedCompetencies.contains(code))
                .toList();
        if (!missingWeights.isEmpty()) {
            throw new BusinessValidationException("Competency weights are missing for: " + missingWeights);
        }

        double totalWeight = roundToTwoDecimals(weights.stream()
                .map(FeedbackCampaignCompetencyWeight::getWeightPercent)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum());
        if (Math.abs(totalWeight - 100.0) > 0.01) {
            throw new BusinessValidationException("Competency weights must total 100%. Current total is " + totalWeight + "%.");
        }

        List<String> emptyPositiveWeights = weights.stream()
                .filter(weight -> toDouble(weight.getWeightPercent()) > 0)
                .map(weight -> normalizeCode(weight.getCompetencyCodeSnapshot(), "UNMAPPED"))
                .filter(code -> !includedScoredCompetencies.contains(code))
                .toList();
        if (!emptyPositiveWeights.isEmpty()) {
            throw new BusinessValidationException("Weighted competencies must have included scored questions: " + emptyPositiveWeights);
        }
    }

    private String formLabelForWeightUsage(QuestionGroup group) {
        String level = normalizeLevel(group.targetLevelCode());
        if (DEFAULT_LEVEL.equals(level)) {
            return group.relationshipLabel();
        }
        return group.relationshipLabel() + " · " + level;
    }

    private double toDouble(BigDecimal value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private double roundToTwoDecimals(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
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


    private FeedbackCompetency findCompetency(String competencyCode) {
        if (competencyCode == null || competencyCode.isBlank()) {
            return null;
        }
        return competencyRepository.findByCodeIgnoreCase(competencyCode).orElse(null);
    }

    private String competencyName(String competencyCode, FeedbackCompetency competency) {
        return competencyName(competencyCode, competency == null ? null : competency.getName());
    }

    private String competencyName(String competencyCode, String fallbackTitle) {
        String title = firstNonBlank(fallbackTitle, null);
        if (title != null && !title.equalsIgnoreCase("Questions") && !title.matches("(?i)^competency\\s*\\d+$")) {
            return title.trim();
        }
        FeedbackCompetency competency = findCompetency(competencyCode);
        if (competency != null && competency.getName() != null && !competency.getName().isBlank()) {
            return competency.getName().trim();
        }
        String code = firstNonBlank(competencyCode, null);
        return code == null ? "Unmapped competency" : code;
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

    private Comparator<QuestionGroup> groupComparator() {
        return Comparator.comparing(QuestionGroup::relationshipType)
                .thenComparing(QuestionGroup::targetLevelRank, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(QuestionGroup::targetLevelCode, Comparator.nullsLast(Comparator.naturalOrder()));
    }

    private String decisionKey(String relationshipType, String targetLevelCode, String questionCode) {
        return normalizeRelationship(relationshipType).name() + "::" + normalizeLevel(targetLevelCode) + "::" + normalizeCode(questionCode, "QUESTION");
    }

    private String groupKey(FeedbackRelationshipType relationshipType, String targetLevelCode) {
        return relationshipType.name() + "::" + normalizeLevel(targetLevelCode);
    }

    private FeedbackRelationshipType normalizeRelationship(String relationshipType) {
        try {
            return FeedbackRelationshipType.valueOf(firstNonBlank(relationshipType, "SELF").trim().toUpperCase().replace('-', '_').replace(' ', '_'));
        } catch (IllegalArgumentException ex) {
            throw new BusinessValidationException("Unsupported evaluator relationship type: " + relationshipType);
        }
    }

    private String relationshipLabel(FeedbackRelationshipType relationshipType) {
        return switch (relationshipType) {
            case MANAGER -> "Direct Manager";
            case PEER -> "Peer";
            case SUBORDINATE -> "Direct Subordinate";
            case SELF -> "Self";
        };
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

    private String normalizeResponseType(String responseType) {
        String value = firstNonBlank(responseType, DEFAULT_RESPONSE_TYPE)
                .trim()
                .toUpperCase()
                .replace('-', '_')
                .replace(' ', '_');
        if (value.equals("RATING_ONLY")) {
            value = RESPONSE_RATING;
        }
        if (value.equals("WRITTEN_ANSWER") || value.equals("WRITTEN_ANSWER_ONLY")) {
            value = RESPONSE_TEXT;
        }
        if (value.equals("YESNO") || value.equals("YES_OR_NO")) {
            value = RESPONSE_YES_NO;
        }
        if (List.of(RESPONSE_RATING_WITH_COMMENT, RESPONSE_RATING, RESPONSE_TEXT, RESPONSE_YES_NO).contains(value)) {
            return value;
        }
        return DEFAULT_RESPONSE_TYPE;
    }

    private String resolveScoringBehavior(FeedbackQuestionVersion version, FeedbackQuestionBank bank, String responseType) {
        String scoring = firstNonBlank(
                version == null ? null : version.getScoringBehavior(),
                bank == null ? null : bank.getDefaultScoringBehavior(),
                inferDefaultScoringBehavior(responseType)
        ).trim().toUpperCase().replace('-', '_').replace(' ', '_');
        if (!List.of(SCORING_SCORED, SCORING_NON_SCORED, SCORING_HR_REVIEW).contains(scoring)) {
            scoring = inferDefaultScoringBehavior(responseType);
        }
        if (!isRatingResponseType(responseType) && SCORING_SCORED.equals(scoring)) {
            return inferDefaultScoringBehavior(responseType);
        }
        return scoring;
    }

    private String inferDefaultScoringBehavior(String responseType) {
        String normalized = normalizeResponseType(responseType);
        if (isRatingResponseType(normalized)) {
            return SCORING_SCORED;
        }
        if (RESPONSE_YES_NO.equals(normalized)) {
            return SCORING_HR_REVIEW;
        }
        return SCORING_NON_SCORED;
    }

    private boolean isRatingResponseType(String responseType) {
        String normalized = normalizeResponseType(responseType);
        return RESPONSE_RATING_WITH_COMMENT.equals(normalized) || RESPONSE_RATING.equals(normalized);
    }

    private boolean isScored(String responseType, String scoringBehavior) {
        return isRatingResponseType(responseType) && SCORING_SCORED.equals(scoringBehavior);
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

    private String normalizeCode(String value, String fallback) {
        String normalized = firstNonBlank(value, fallback);
        return normalized.trim().replaceAll("\\s+", "_").toUpperCase();
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

    private record ResolvedReview(List<QuestionGroup> groups, List<String> warnings) {}
    private record AssignmentContext(String targetLevelCode, Integer targetLevelRank, Long targetPositionId, Long targetDepartmentId) {}

    private record QuestionCandidate(
            Long sourceRuleId,
            FeedbackQuestionVersion version,
            Long questionBankId,
            String questionCode,
            String competencyCode,
            String questionText,
            String responseType,
            String scoringBehavior,
            Integer ratingScaleId,
            Boolean required,
            Double weight,
            String sectionCode,
            String sectionTitle,
            Integer sectionOrder,
            Integer displayOrder,
            Long targetPositionId,
            Long targetDepartmentId,
            Long selectionId,
            Boolean included
    ) {
        private QuestionCandidate(
                Long sourceRuleId,
                FeedbackQuestionVersion version,
                Long questionBankId,
                String questionCode,
                String competencyCode,
                String questionText,
                String responseType,
                String scoringBehavior,
                Integer ratingScaleId,
                Boolean required,
                Double weight,
                String sectionCode,
                String sectionTitle,
                Integer sectionOrder,
                Integer displayOrder,
                Long targetPositionId,
                Long targetDepartmentId
        ) {
            this(sourceRuleId, version, questionBankId, questionCode, competencyCode, questionText, responseType, scoringBehavior,
                    ratingScaleId, required, weight, sectionCode, sectionTitle, sectionOrder, displayOrder, targetPositionId, targetDepartmentId, null, true);
        }
    }

    private record QuestionGroup(
            FeedbackRelationshipType relationshipType,
            String relationshipLabel,
            String targetLevelCode,
            Integer targetLevelRank,
            Integer targetCount,
            Integer assignmentCount,
            List<QuestionCandidate> questions,
            List<String> warnings
    ) {}

    private record CompetencyWeightDraft(
            FeedbackCompetency competency,
            String competencyCode,
            String competencyName,
            Double weightPercent
    ) {}

    private static class CompetencyUsage {
        private final String competencyCode;
        private final String competencyName;
        private final Integer displayOrder;
        private final FeedbackCompetency competency;
        private final Map<String, String> formLabels = new LinkedHashMap<>();
        private final Map<String, Integer> includedScoredQuestionCountByForm = new LinkedHashMap<>();

        private CompetencyUsage(String competencyCode, String competencyName, Integer displayOrder, FeedbackCompetency competency) {
            this.competencyCode = competencyCode;
            this.competencyName = competencyName;
            this.displayOrder = displayOrder;
            this.competency = competency;
        }

        private String competencyCode() {
            return competencyCode;
        }

        private String competencyName() {
            return competencyName;
        }

        private Integer displayOrder() {
            return displayOrder;
        }

        private FeedbackCompetency competency() {
            return competency;
        }

        private Map<String, String> formLabels() {
            return formLabels;
        }

        private Map<String, Integer> includedScoredQuestionCountByForm() {
            return includedScoredQuestionCountByForm;
        }

        private Integer questionCountPerForm() {
            Set<Integer> counts = new LinkedHashSet<>(includedScoredQuestionCountByForm.values());
            return counts.size() == 1 ? counts.iterator().next() : null;
        }

        private boolean questionCountVariesByForm() {
            return new LinkedHashSet<>(includedScoredQuestionCountByForm.values()).size() > 1;
        }

        private int totalIncludedScoredQuestionCount() {
            return includedScoredQuestionCountByForm.values().stream().mapToInt(Integer::intValue).sum();
        }

        private int defaultQuestionBasis() {
            Integer perForm = questionCountPerForm();
            if (perForm != null) {
                return perForm;
            }
            return includedScoredQuestionCountByForm.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        }
    }

    private static class MutableQuestionGroup {
        private final FeedbackRelationshipType relationshipType;
        private final String relationshipLabel;
        private final String targetLevelCode;
        private final Integer targetLevelRank;
        private final Set<Long> targetIds = new LinkedHashSet<>();
        private int assignmentCount = 0;
        private final Map<String, QuestionCandidate> questions = new LinkedHashMap<>();
        private final Set<String> warnings = new LinkedHashSet<>();

        private MutableQuestionGroup(
                FeedbackRelationshipType relationshipType,
                String relationshipLabel,
                String targetLevelCode,
                Integer targetLevelRank
        ) {
            this.relationshipType = relationshipType;
            this.relationshipLabel = relationshipLabel;
            this.targetLevelCode = targetLevelCode;
            this.targetLevelRank = targetLevelRank;
        }

        private QuestionGroup toImmutable() {
            return new QuestionGroup(
                    relationshipType,
                    relationshipLabel,
                    targetLevelCode,
                    targetLevelRank,
                    targetIds.size(),
                    assignmentCount,
                    new ArrayList<>(questions.values()),
                    new ArrayList<>(warnings)
            );
        }
    }
}

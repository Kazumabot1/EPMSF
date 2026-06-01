package com.epms.service.impl;

import com.epms.dto.FeedbackAssignmentQuestionDetailResponse;
import com.epms.dto.FeedbackAssignmentSectionDetailResponse;
import com.epms.dto.FeedbackDynamicFormPreviewResponse;
import com.epms.dto.FeedbackQuestionBankResponse;
import com.epms.dto.FeedbackQuestionBankUpsertRequest;
import com.epms.dto.FeedbackQuestionRuleResponse;
import com.epms.dto.FeedbackQuestionRuleUpsertRequest;
import com.epms.entity.FeedbackQuestionApplicabilityRule;
import com.epms.entity.FeedbackQuestionBank;
import com.epms.entity.FeedbackQuestionRuleSet;
import com.epms.entity.FeedbackQuestionVersion;
import com.epms.entity.PositionLevel;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCompetencyRepository;
import com.epms.repository.FeedbackQuestionApplicabilityRuleRepository;
import com.epms.repository.FeedbackQuestionBankRepository;
import com.epms.repository.FeedbackQuestionRuleSetRepository;
import com.epms.repository.FeedbackQuestionVersionRepository;
import com.epms.repository.PositionLevelRepository;
import com.epms.service.FeedbackQuestionBankService;
import com.epms.service.QuestionQualityValidationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class FeedbackQuestionBankServiceImpl implements FeedbackQuestionBankService {

    private static final String DEFAULT_RESPONSE_TYPE = "RATING_WITH_COMMENT";
    private static final String RESPONSE_RATING_WITH_COMMENT = "RATING_WITH_COMMENT";
    private static final String SCORING_SCORED = "SCORED";

    private static final Set<String> SUPPORTED_STATUSES = Set.of("ACTIVE", "DRAFT", "INACTIVE", "RETIRED", "ARCHIVED");
    private static final Set<String> SUPPORTED_RULE_RELATIONSHIPS = Set.of("MANAGER", "PEER", "SUBORDINATE", "SELF");

    private static final Map<String, String> COMPETENCY_CODE_PREFIXES = Map.ofEntries(
            Map.entry("COMMUNICATION_SKILLS", "COMM"),
            Map.entry("TEAMWORK_COLLABORATION", "TEAM"),
            Map.entry("TECHNICAL_SKILLS", "TECH"),
            Map.entry("WORK_QUALITY", "WORK"),
            Map.entry("ACCOUNTABILITY_RESPONSIBILITY", "ACCT"),
            Map.entry("PROBLEM_SOLVING", "PROB"),
            Map.entry("LEARNING_IMPROVEMENT", "LEARN"),
            Map.entry("ATTITUDE_PROFESSIONALISM", "PROF"),
            Map.entry("COMMUNICATION", "COMM"),
            Map.entry("TEAMWORK", "TEAM"),
            Map.entry("LEADERSHIP", "LEAD"),
            Map.entry("TECHNICAL_SKILL", "TECH"),
            Map.entry("ACCOUNTABILITY", "ACCT"),
            Map.entry("PROFESSIONALISM", "PROF"),
            Map.entry("ATTENDANCE_RELIABILITY", "RELY"),
            Map.entry("RELIABILITY", "RELY"),
            Map.entry("COMPLIANCE_SAFETY", "SAFE"),
            Map.entry("RESULTS_ORIENTATION", "RESULT"),
            Map.entry("COACHING", "COACH"),
            Map.entry("ADAPTABILITY", "ADAPT")
    );

    private final FeedbackQuestionBankRepository questionBankRepository;
    private final FeedbackQuestionVersionRepository questionVersionRepository;
    private final FeedbackQuestionApplicabilityRuleRepository ruleRepository;
    private final FeedbackQuestionRuleSetRepository ruleSetRepository;
    private final FeedbackCompetencyRepository competencyRepository;
    private final PositionLevelRepository positionLevelRepository;
    private final QuestionQualityValidationService qualityValidationService;

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackQuestionBankResponse> getQuestions() {
        Map<Long, FeedbackQuestionBank> byId = new LinkedHashMap<>();
        for (FeedbackQuestionBank question : questionBankRepository.findAllWithVersions()) {
            if (question != null && question.getId() != null) {
                byId.putIfAbsent(question.getId(), question);
            }
        }
        return byId.values().stream()
                .map(this::toQuestionResponse)
                .toList();
    }

    @Override
    @Transactional
    public FeedbackQuestionBankResponse createQuestion(FeedbackQuestionBankUpsertRequest request, Long actorUserId) {
        ensureQuestionCanBeSaved(request, null);
        String questionCode = resolveQuestionCodeForCreate(request);
        if (questionBankRepository.existsByQuestionCodeIgnoreCase(questionCode)) {
            throw new BadRequestException("A feedback question with code " + questionCode + " already exists.");
        }

        FeedbackQuestionBank bank = new FeedbackQuestionBank();
        bank.setQuestionCode(questionCode);
        applyQuestionDefaults(bank, request);
        bank.setCreatedByUserId(actorUserId == null ? 0L : actorUserId);
        FeedbackQuestionBank savedBank = questionBankRepository.save(bank);

        FeedbackQuestionVersion version = new FeedbackQuestionVersion();
        version.setQuestionBank(savedBank);
        version.setVersionNumber(1);
        applyVersionFields(version, request);
        questionVersionRepository.save(version);

        return toQuestionResponse(savedBank);
    }

    @Override
    @Transactional
    public FeedbackQuestionBankResponse updateQuestion(Long questionId, FeedbackQuestionBankUpsertRequest request) {
        FeedbackQuestionBank bank = questionBankRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback question not found."));
        ensureQuestionCanBeSaved(request, questionId);

        String newCode = request.getQuestionCode() == null || request.getQuestionCode().isBlank()
                ? bank.getQuestionCode()
                : normalizeCode(request.getQuestionCode(), "Question code is required.");
        questionBankRepository.findByQuestionCodeIgnoreCase(newCode)
                .filter(existing -> !Objects.equals(existing.getId(), bank.getId()))
                .ifPresent(existing -> {
                    throw new BadRequestException("A feedback question with code " + newCode + " already exists.");
                });

        bank.setQuestionCode(newCode);
        applyQuestionDefaults(bank, request);
        FeedbackQuestionBank savedBank = questionBankRepository.save(bank);

        FeedbackQuestionVersion activeVersion = questionVersionRepository
                .findTopByQuestionBank_IdAndActiveTrueOrderByVersionNumberDesc(savedBank.getId())
                .orElse(null);

        if (activeVersion == null || shouldCreateNewVersion(activeVersion, request)) {
            if (activeVersion != null) {
                activeVersion.setActive(false);
                questionVersionRepository.save(activeVersion);
            }
            FeedbackQuestionVersion newVersion = new FeedbackQuestionVersion();
            newVersion.setQuestionBank(savedBank);
            newVersion.setVersionNumber(Math.max(1, questionVersionRepository.findMaxVersionNumber(savedBank.getId()) + 1));
            applyVersionFields(newVersion, request);
            questionVersionRepository.save(newVersion);
        }

        return toQuestionResponse(savedBank);
    }

    @Override
    @Transactional
    public FeedbackQuestionBankResponse updateQuestionStatus(Long questionId, String status) {
        FeedbackQuestionBank bank = questionBankRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback question not found."));
        String normalizedStatus = normalizeStatus(status);
        if ("ARCHIVED".equals(normalizedStatus) && "ACTIVE".equals(bank.getStatus())) {
            throw new BadRequestException("Make the question inactive before archiving it.");
        }
        bank.setStatus(normalizedStatus);
        return toQuestionResponse(questionBankRepository.save(bank));
    }

    @Override
    @Transactional
    public List<FeedbackQuestionRuleResponse> getRules() {
        ruleRepository.repairQuestionBankReferencesFromLegacyVersions();
        ruleRepository.deactivateRulesWithBrokenQuestionBankReferences();
        return ruleRepository.findAllDetailed().stream()
                .map(this::toRuleResponse)
                .filter(response -> response.getQuestionBankId() != null)
                .toList();
    }

    @Override
    @Transactional
    public List<FeedbackQuestionRuleResponse> createRule(FeedbackQuestionRuleUpsertRequest request) {
        List<String> relationshipTypes = resolveRelationshipTypes(request);
        List<Long> questionBankIds = resolveQuestionBankIds(request);
        LevelRankRange availableLevels = resolveAvailableRuleLevelRange();
        Integer minRank = request.getTargetLevelMinRank() == null ? availableLevels.minRank() : request.getTargetLevelMinRank();
        Integer maxRank = request.getTargetLevelMaxRank() == null ? availableLevels.maxRank() : request.getTargetLevelMaxRank();
        validateRuleLevelRange(minRank, maxRank, availableLevels);

        String desiredStatus = normalizeRuleSetStatus(request.getRuleSetStatus(), request.getActive(), true);
        validateRuleSetGovernance(
                questionBankIds,
                relationshipTypes,
                minRank,
                maxRank,
                request.getTargetDepartmentId(),
                request.getTargetPositionId(),
                null,
                desiredStatus
        );
        request.setActive("ACTIVE".equals(desiredStatus));

        FeedbackQuestionRuleSet ruleSet = new FeedbackQuestionRuleSet();
        applyRuleSetFields(ruleSet, request, minRank, maxRank, relationshipTypes, desiredStatus);
        ruleSet = ruleSetRepository.save(ruleSet);

        List<FeedbackQuestionRuleResponse> responses = new ArrayList<>();
        int offset = 0;
        for (Long questionBankId : questionBankIds) {
            FeedbackQuestionBank bank = questionBankRepository.findById(questionBankId)
                    .orElseThrow(() -> new ResourceNotFoundException("Question bank item not found."));
            for (String relationshipType : relationshipTypes) {
                FeedbackQuestionApplicabilityRule rule = new FeedbackQuestionApplicabilityRule();
                rule.setRuleSet(ruleSet);
                applyRuleFields(rule, request, bank, relationshipType, rule.getId(), ruleSet.getId(), offset);
                responses.add(toRuleResponse(ruleRepository.save(rule)));
            }
            offset++;
        }
        return responses;
    }

    @Override
    @Transactional
    public FeedbackQuestionRuleResponse updateRule(Long ruleId, FeedbackQuestionRuleUpsertRequest request) {
        FeedbackQuestionApplicabilityRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Form question row not found."));
        List<String> relationshipTypes = resolveRelationshipTypes(request);
        if (relationshipTypes.size() > 1) {
            throw new BadRequestException("Update one evaluator role at a time. Create new rules for additional roles.");
        }
        Long questionBankId = firstQuestionBankId(request, rule.getQuestionBank() == null ? null : rule.getQuestionBank().getId());
        FeedbackQuestionBank bank = questionBankRepository.findById(questionBankId)
                .orElseThrow(() -> new ResourceNotFoundException("Question bank item not found."));
        applyRuleFields(rule, request, bank, relationshipTypes.get(0), ruleId, rule.getRuleSet() == null ? null : rule.getRuleSet().getId(), 0);
        return toRuleResponse(ruleRepository.save(rule));
    }

    @Override
    @Transactional
    public List<FeedbackQuestionRuleResponse> updateRuleSet(Long ruleSetId, FeedbackQuestionRuleUpsertRequest request) {
        FeedbackQuestionRuleSet ruleSet = ruleSetRepository.findById(ruleSetId)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found."));

        List<String> relationshipTypes = resolveRelationshipTypes(request);
        List<Long> questionBankIds = resolveQuestionBankIds(request);
        LevelRankRange availableLevels = resolveAvailableRuleLevelRange();
        Integer minRank = request.getTargetLevelMinRank() == null ? availableLevels.minRank() : request.getTargetLevelMinRank();
        Integer maxRank = request.getTargetLevelMaxRank() == null ? availableLevels.maxRank() : request.getTargetLevelMaxRank();
        validateRuleLevelRange(minRank, maxRank, availableLevels);

        String desiredStatus = normalizeRuleSetStatus(request.getRuleSetStatus(), request.getActive(), false);
        validateRuleSetGovernance(
                questionBankIds,
                relationshipTypes,
                minRank,
                maxRank,
                request.getTargetDepartmentId(),
                request.getTargetPositionId(),
                ruleSetId,
                desiredStatus
        );
        request.setActive("ACTIVE".equals(desiredStatus));

        applyRuleSetFields(ruleSet, request, minRank, maxRank, relationshipTypes, desiredStatus);
        ruleSet = ruleSetRepository.save(ruleSet);

        List<FeedbackQuestionApplicabilityRule> existingRows = ruleRepository.findDetailedByRuleSetId(ruleSetId);
        Set<String> requestedRelationshipTypes = new LinkedHashSet<>(relationshipTypes);
        List<FeedbackQuestionApplicabilityRule> rowsForRequestedEvaluatorTypes = existingRows.stream()
                .filter(row -> requestedRelationshipTypes.contains(row.getEvaluatorRelationshipType()))
                .toList();
        List<FeedbackQuestionApplicabilityRule> rowsForOtherEvaluatorTypes = existingRows.stream()
                .filter(row -> !requestedRelationshipTypes.contains(row.getEvaluatorRelationshipType()))
                .toList();
        for (FeedbackQuestionApplicabilityRule preservedRow : rowsForOtherEvaluatorTypes) {
            preservedRow.setTargetLevelMinRank(minRank);
            preservedRow.setTargetLevelMaxRank(maxRank);
            preservedRow.setTargetDepartmentId(request.getTargetDepartmentId());
            preservedRow.setTargetPositionId(request.getTargetPositionId());
            preservedRow.setActive("ACTIVE".equals(desiredStatus));
            ruleRepository.save(preservedRow);
        }
        ruleRepository.deleteAll(rowsForRequestedEvaluatorTypes);
        ruleRepository.flush();

        List<FeedbackQuestionRuleResponse> responses = new ArrayList<>();
        int offset = 0;
        for (Long questionBankId : questionBankIds) {
            FeedbackQuestionBank bank = questionBankRepository.findById(questionBankId)
                    .orElseThrow(() -> new ResourceNotFoundException("Question bank item not found."));
            for (String relationshipType : relationshipTypes) {
                FeedbackQuestionApplicabilityRule rule = new FeedbackQuestionApplicabilityRule();
                rule.setRuleSet(ruleSet);
                applyRuleFields(rule, request, bank, relationshipType, rule.getId(), ruleSet.getId(), offset);
                responses.add(toRuleResponse(ruleRepository.save(rule)));
            }
            offset++;
        }
        return responses;
    }

    @Override
    @Transactional
    public void deactivateRule(Long ruleId) {
        FeedbackQuestionApplicabilityRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Form question row not found."));
        if (rule.getRuleSet() != null && rule.getRuleSet().getId() != null) {
            FeedbackQuestionRuleSet ruleSet = ruleSetRepository.findById(rule.getRuleSet().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Form not found."));
            ruleSet.setStatus("DISABLED");
            ruleSet.setActive(false);
            ruleSetRepository.save(ruleSet);
            for (FeedbackQuestionApplicabilityRule item : ruleRepository.findDetailedByRuleSetId(ruleSet.getId())) {
                item.setActive(false);
                ruleRepository.save(item);
            }
            return;
        }
        rule.setActive(false);
        ruleRepository.save(rule);
    }

    @Override
    @Transactional
    public FeedbackQuestionRuleResponse activateRule(Long ruleId) {
        FeedbackQuestionApplicabilityRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Form question row not found."));
        if (rule.getRuleSet() != null && rule.getRuleSet().getId() != null) {
            Long ruleSetId = rule.getRuleSet().getId();
            FeedbackQuestionRuleSet ruleSet = ruleSetRepository.findById(ruleSetId)
                    .orElseThrow(() -> new ResourceNotFoundException("Form not found."));
            List<FeedbackQuestionApplicabilityRule> rows = ruleRepository.findDetailedByRuleSetId(ruleSetId);
            if (rows.isEmpty()) {
                throw new BadRequestException("This form has no questions. Edit it and select at least one question and evaluator type.");
            }
            List<Long> questionBankIds = rows.stream()
                    .map(FeedbackQuestionApplicabilityRule::getQuestionBank)
                    .filter(Objects::nonNull)
                    .map(FeedbackQuestionBank::getId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            List<String> relationshipTypes = rows.stream()
                    .map(FeedbackQuestionApplicabilityRule::getEvaluatorRelationshipType)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            validateRuleSetGovernance(
                    questionBankIds,
                    relationshipTypes,
                    ruleSet.getTargetLevelMinRank(),
                    ruleSet.getTargetLevelMaxRank(),
                    ruleSet.getTargetDepartmentId(),
                    ruleSet.getTargetPositionId(),
                    ruleSetId,
                    "ACTIVE"
            );
            ruleSet.setStatus("ACTIVE");
            ruleSet.setActive(true);
            ruleSetRepository.save(ruleSet);
            FeedbackQuestionRuleResponse first = null;
            for (FeedbackQuestionApplicabilityRule item : rows) {
                item.setActive(true);
                FeedbackQuestionRuleResponse response = toRuleResponse(ruleRepository.save(item));
                if (first == null || item.getId().equals(ruleId)) {
                    first = response;
                }
            }
            return first == null ? toRuleResponse(rule) : first;
        }

        validateRuleCanActivate(rule, rule.getId(), null);
        rule.setActive(true);
        return toRuleResponse(ruleRepository.save(rule));
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackDynamicFormPreviewResponse previewDynamicForm(
            String levelCode,
            String relationshipType,
            Long targetPositionId,
            Long targetDepartmentId
    ) {
        int levelRank = parseLevelRank(levelCode);
        String normalizedRelationship = normalizeRelationship(relationshipType);
        List<FeedbackQuestionApplicabilityRule> rules = ruleRepository.findBestMatchingFormRules(
                levelRank,
                targetPositionId,
                targetDepartmentId,
                normalizedRelationship,
                LocalDate.now()
        );

        Map<Long, FeedbackAssignmentQuestionDetailResponse> questionsByBankId = new LinkedHashMap<>();

        for (FeedbackQuestionApplicabilityRule rule : rules) {
            FeedbackQuestionBank bank = rule.getQuestionBank();
            if (bank == null || bank.getId() == null) {
                continue;
            }
            FeedbackQuestionVersion version = findActiveVersion(bank);
            if (version == null) {
                continue;
            }
            if (questionsByBankId.containsKey(bank.getId())) {
                continue;
            }
            String questionCode = firstNonBlank(bank.getQuestionCode(), "BANK-Q-" + bank.getId());
            String responseType = coerceStoredResponseType(firstNonBlank(version.getResponseType(), bank.getDefaultResponseType(), DEFAULT_RESPONSE_TYPE));
            FeedbackAssignmentQuestionDetailResponse question = FeedbackAssignmentQuestionDetailResponse.builder()
                    .id(version.getId())
                    .assignmentQuestionId(null)
                    .sourceQuestionId(null)
                    .questionCode(questionCode)
                    .competencyCode(bank.getCompetencyCode())
                    .responseType(responseType)
                    .scoringBehavior(SCORING_SCORED)
                    .questionText(firstNonBlank(version.getQuestionText(), bank.getDefaultText()))
                    .questionOrder(rule.getDisplayOrder() == null ? questionsByBankId.size() + 1 : rule.getDisplayOrder())
                    .ratingScaleId(null)
                    .ratingScaleMin(1)
                    .ratingScaleMax(5)
                    .ratingOptions(List.of())
                    .weight(1.0)
                    .required(true)
                    .existingRatingValue(null)
                    .existingComment(null)
                    .build();
            questionsByBankId.put(bank.getId(), question);
        }

        List<FeedbackAssignmentQuestionDetailResponse> questions = questionsByBankId.values().stream()
                .sorted(Comparator.comparing(FeedbackAssignmentQuestionDetailResponse::getQuestionOrder, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        List<FeedbackAssignmentSectionDetailResponse> sections = questions.isEmpty()
                ? List.of()
                : List.of(FeedbackAssignmentSectionDetailResponse.builder()
                          .id(null)
                          .sectionCode("QUESTIONS")
                          .title("Questions")
                          .orderNo(1)
                          .questions(questions)
                          .build());

        return FeedbackDynamicFormPreviewResponse.builder()
                .levelCode(firstNonBlank(levelCode, "L" + String.format("%02d", levelRank)))
                .levelRank(levelRank)
                .relationshipType(normalizedRelationship)
                .targetPositionId(targetPositionId)
                .targetDepartmentId(targetDepartmentId)
                .totalQuestions(questionsByBankId.size())
                .sections(sections)
                .build();
    }

    private void applyQuestionDefaults(FeedbackQuestionBank bank, FeedbackQuestionBankUpsertRequest request) {
        String responseType = normalizeResponseType(firstNonBlank(request.getResponseType(), DEFAULT_RESPONSE_TYPE));
        String scoringBehavior = normalizeScoringBehavior(request.getScoringBehavior(), responseType);
        bank.setCompetencyCode(normalizeCode(request.getCompetencyCode(), "Competency code is required."));
        bank.setDefaultText(requireText(request.getQuestionText(), "Question text is required."));
        bank.setDefaultResponseType(responseType);
        bank.setDefaultScoringBehavior(scoringBehavior);
        bank.setDefaultRatingScaleId(null);
        bank.setDefaultWeight(1.0);
        bank.setDefaultRequired(true);
        bank.setStatus(normalizeStatus(request.getStatus()));
    }

    private void applyVersionFields(FeedbackQuestionVersion version, FeedbackQuestionBankUpsertRequest request) {
        String responseType = normalizeResponseType(firstNonBlank(request.getResponseType(), DEFAULT_RESPONSE_TYPE));
        String scoringBehavior = normalizeScoringBehavior(request.getScoringBehavior(), responseType);
        version.setQuestionText(requireText(request.getQuestionText(), "Question text is required."));
        version.setResponseType(responseType);
        version.setScoringBehavior(scoringBehavior);
        version.setRatingScaleId(null);
        version.setHelpText(blankToNull(request.getHelpText()));
        version.setActive(true);
    }

    private boolean shouldCreateNewVersion(FeedbackQuestionVersion activeVersion, FeedbackQuestionBankUpsertRequest request) {
        return !Objects.equals(requireText(request.getQuestionText(), "Question text is required."), activeVersion.getQuestionText())
                || !Objects.equals(blankToNull(request.getHelpText()), blankToNull(activeVersion.getHelpText()))
                || !Objects.equals(normalizeResponseType(request.getResponseType()), coerceStoredResponseType(activeVersion.getResponseType()));
    }

    private void ensureQuestionCanBeSaved(FeedbackQuestionBankUpsertRequest request, Long excludeQuestionId) {
        var validation = qualityValidationService.validateQuestion(request, excludeQuestionId);
        if (Boolean.FALSE.equals(validation.getCanSave())) {
            String message = validation.getIssues().stream()
                    .filter(issue -> "ERROR".equals(issue.getSeverity()))
                    .map(issue -> issue.getMessage())
                    .findFirst()
                    .orElse("Question does not pass quality validation.");
            throw new BadRequestException(message);
        }
        String competencyCode = normalizeCode(request.getCompetencyCode(), "Competency code is required.");
        competencyRepository.findByCodeIgnoreCase(competencyCode)
                .orElseThrow(() -> new BadRequestException("Question must use an existing competency."));
    }

    private void applyRuleFields(
            FeedbackQuestionApplicabilityRule rule,
            FeedbackQuestionRuleUpsertRequest request,
            FeedbackQuestionBank bank,
            String relationshipType,
            Long excludeRuleId,
            Long excludeRuleSetId,
            int displayOrderOffset
    ) {
        if (request.getTargetLevelMinRank() != null && request.getTargetLevelMaxRank() != null
                && request.getTargetLevelMinRank() > request.getTargetLevelMaxRank()) {
            throw new BadRequestException("Minimum level rank cannot be greater than maximum level rank.");
        }
        if (bank == null || bank.getId() == null) {
            throw new BadRequestException("Question bank item is required.");
        }
        if (!"ACTIVE".equals(bank.getStatus())) {
            throw new BadRequestException("Only active rating questions with required comments can be used in Form Setup.");
        }
        FeedbackQuestionVersion activeVersion = findActiveVersion(bank);
        if (activeVersion == null) {
            throw new BadRequestException("The selected question has no active version.");
        }

        Integer minRank = request.getTargetLevelMinRank() == null ? 1 : request.getTargetLevelMinRank();
        Integer maxRank = request.getTargetLevelMaxRank() == null ? 9 : request.getTargetLevelMaxRank();
        boolean desiredActive = !Boolean.FALSE.equals(request.getActive());
        validateDuplicateRule(bank.getId(), minRank, maxRank, relationshipType,
                request.getTargetPositionId(), request.getTargetDepartmentId(), excludeRuleId, excludeRuleSetId, desiredActive);

        int baseDisplayOrder = request.getDisplayOrder() == null ? 10 : Math.max(1, request.getDisplayOrder());
        rule.setQuestionBank(bank);
        // Compatibility only for old schemas where question_version_id is still NOT NULL.
        // Rule logic continues to use questionBank; campaign activation snapshots the
        // exact active version later.
        rule.setLegacyQuestionVersion(activeVersion);
        rule.setTargetLevelMinRank(minRank);
        rule.setTargetLevelMaxRank(maxRank);
        rule.setTargetPositionId(request.getTargetPositionId());
        rule.setTargetDepartmentId(request.getTargetDepartmentId());
        rule.setEvaluatorRelationshipType(relationshipType);
        rule.setDisplayOrder(baseDisplayOrder + (displayOrderOffset * 10));
        rule.setRulePriority(request.getRulePriority() == null ? 100 : request.getRulePriority());
        rule.setActive(desiredActive);
    }

    private FeedbackQuestionBankResponse toQuestionResponse(FeedbackQuestionBank bank) {
        FeedbackQuestionVersion activeVersion = bank.getVersions() == null ? null : bank.getVersions().stream()
                                                                                    .filter(version -> Boolean.TRUE.equals(version.getActive()))
                                                                                    .max(Comparator.comparing(FeedbackQuestionVersion::getVersionNumber, Comparator.nullsLast(Comparator.naturalOrder())))
                                                                                    .orElse(null);
        if (activeVersion == null && bank.getId() != null) {
            activeVersion = questionVersionRepository.findTopByQuestionBank_IdAndActiveTrueOrderByVersionNumberDesc(bank.getId()).orElse(null);
        }
        String responseType = coerceStoredResponseType(activeVersion == null ? bank.getDefaultResponseType() : activeVersion.getResponseType());
        String scoringBehavior = SCORING_SCORED;
        return FeedbackQuestionBankResponse.builder()
                .id(bank.getId())
                .questionCode(bank.getQuestionCode())
                .competencyCode(bank.getCompetencyCode())
                .questionText(activeVersion == null ? bank.getDefaultText() : activeVersion.getQuestionText())
                .responseType(responseType)
                .scoringBehavior(scoringBehavior)
                .ratingScaleId(isRatingResponseType(responseType) ? activeVersion == null ? bank.getDefaultRatingScaleId() : activeVersion.getRatingScaleId() : null)
                .weight(1.0)
                .required(true)
                .helpText(activeVersion == null ? null : activeVersion.getHelpText())
                .status(bank.getStatus())
                .activeVersionId(activeVersion == null ? null : activeVersion.getId())
                .activeVersionNumber(activeVersion == null ? null : activeVersion.getVersionNumber())
                .createdAt(bank.getCreatedAt())
                .updatedAt(bank.getUpdatedAt())
                .build();
    }

    private FeedbackQuestionRuleResponse toRuleResponse(FeedbackQuestionApplicabilityRule rule) {
        FeedbackQuestionBank bank = rule.getQuestionBank();
        if (bank == null && rule.getLegacyQuestionVersion() != null) {
            bank = rule.getLegacyQuestionVersion().getQuestionBank();
        }
        FeedbackQuestionVersion version = bank == null ? null : findActiveVersion(bank);
        if (version == null && rule.getLegacyQuestionVersion() != null
                && bank != null
                && rule.getLegacyQuestionVersion().getQuestionBank() != null
                && bank.getId().equals(rule.getLegacyQuestionVersion().getQuestionBank().getId())) {
            version = rule.getLegacyQuestionVersion();
        }
        String responseType = coerceStoredResponseType(version == null ? null : version.getResponseType());
        FeedbackQuestionRuleSet ruleSet = rule.getRuleSet();
        String ruleSetStatus = normalizeStoredRuleSetStatus(ruleSet == null ? null : ruleSet.getStatus(), ruleSet == null ? null : ruleSet.getActive());
        boolean rowActive = Boolean.TRUE.equals(rule.getActive()) && (ruleSet == null || "ACTIVE".equals(ruleSetStatus));
        return FeedbackQuestionRuleResponse.builder()
                .id(rule.getId())
                .ruleSetId(ruleSet == null ? null : ruleSet.getId())
                .ruleSetName(ruleSet == null ? null : ruleSet.getName())
                .ruleSetDescription(ruleSet == null ? null : ruleSet.getDescription())
                .ruleSetStatus(ruleSetStatus)
                .ruleSetType(resolveRuleSetType(rule.getTargetDepartmentId(), rule.getTargetPositionId()))
                .questionBankId(bank == null ? null : bank.getId())
                .activeVersionId(version == null ? null : version.getId())
                .questionCode(bank == null ? null : bank.getQuestionCode())
                .competencyCode(bank == null ? null : bank.getCompetencyCode())
                .questionText(version == null ? bank == null ? null : bank.getDefaultText() : version.getQuestionText())
                .responseType(responseType)
                .scoringBehavior(SCORING_SCORED)
                .questionStatus(bank == null ? null : bank.getStatus())
                .effectiveActive(rowActive && bank != null && "ACTIVE".equals(bank.getStatus()) && version != null)
                .targetLevelMinRank(rule.getTargetLevelMinRank())
                .targetLevelMaxRank(rule.getTargetLevelMaxRank())
                .targetPositionId(rule.getTargetPositionId())
                .targetDepartmentId(rule.getTargetDepartmentId())
                .evaluatorRelationshipType(rule.getEvaluatorRelationshipType())
                .displayOrder(rule.getDisplayOrder())
                .rulePriority(rule.getRulePriority())
                .active(rowActive)
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    private String resolveQuestionCodeForCreate(FeedbackQuestionBankUpsertRequest request) {
        if (request.getQuestionCode() != null && !request.getQuestionCode().isBlank()) {
            return normalizeCode(request.getQuestionCode(), "Question code is required.");
        }
        String competencyCode = normalizeCode(request.getCompetencyCode(), "Competency code is required.");
        String prefix = buildQuestionCodePrefix(competencyCode);
        int next = findNextQuestionSequence(prefix);
        String candidate;
        do {
            candidate = prefix + String.format("%03d", next++);
        } while (questionBankRepository.existsByQuestionCodeIgnoreCase(candidate));
        return candidate;
    }

    private String buildQuestionCodePrefix(String competencyCode) {
        String codePart = COMPETENCY_CODE_PREFIXES.get(competencyCode);
        if (codePart == null) {
            String normalized = competencyCode.replaceAll("[^A-Z0-9]", "");
            codePart = normalized.length() <= 5 ? normalized : normalized.substring(0, 5);
        }
        return "FB-" + codePart + "-";
    }

    private int findNextQuestionSequence(String prefix) {
        Pattern suffixPattern = Pattern.compile(Pattern.quote(prefix) + "(\\d+)$", Pattern.CASE_INSENSITIVE);
        return questionBankRepository.findQuestionCodesByPrefix(prefix.toUpperCase(Locale.ROOT)).stream()
                .map(suffixPattern::matcher)
                .filter(Matcher::find)
                .map(matcher -> matcher.group(1))
                .mapToInt(value -> {
                    try {
                        return Integer.parseInt(value);
                    } catch (NumberFormatException ignored) {
                        return 0;
                    }
                })
                .max()
                .orElse(0) + 1;
    }


    private void applyRuleSetFields(
            FeedbackQuestionRuleSet ruleSet,
            FeedbackQuestionRuleUpsertRequest request,
            Integer minRank,
            Integer maxRank,
            List<String> relationshipTypes,
            String status
    ) {
        ruleSet.setName(resolveRuleSetName(request, minRank, maxRank, relationshipTypes));
        ruleSet.setDescription(resolveRuleSetDescription(request));
        ruleSet.setStatus(status);
        ruleSet.setActive("ACTIVE".equals(status));
        ruleSet.setTargetLevelMinRank(minRank);
        ruleSet.setTargetLevelMaxRank(maxRank);
        ruleSet.setTargetDepartmentId(request.getTargetDepartmentId());
        ruleSet.setTargetPositionId(request.getTargetPositionId());
    }

    private String normalizeRuleSetStatus(String status, Boolean active, boolean creatingNew) {
        String value = blankToNull(status);
        if (value == null) {
            if (active == null || Boolean.TRUE.equals(active)) {
                return "ACTIVE";
            }
            return creatingNew ? "DRAFT" : "DISABLED";
        }
        value = value.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if ("INACTIVE".equals(value)) {
            return creatingNew ? "DRAFT" : "DISABLED";
        }
        if (!Set.of("DRAFT", "ACTIVE", "DISABLED", "ARCHIVED").contains(value)) {
            throw new BadRequestException("Unsupported form status: " + status);
        }
        return value;
    }

    private String normalizeStoredRuleSetStatus(String status, Boolean active) {
        String value = blankToNull(status);
        if (value == null) {
            return Boolean.TRUE.equals(active) ? "ACTIVE" : "DISABLED";
        }
        value = value.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if ("INACTIVE".equals(value)) {
            return "DISABLED";
        }
        if (!Set.of("DRAFT", "ACTIVE", "DISABLED", "ARCHIVED").contains(value)) {
            return Boolean.TRUE.equals(active) ? "ACTIVE" : "DISABLED";
        }
        return value;
    }

    private String resolveRuleSetType(Long targetDepartmentId, Long targetPositionId) {
        if (targetDepartmentId == null && targetPositionId == null) {
            return "BASE";
        }
        if (targetDepartmentId != null && targetPositionId == null) {
            return "DEPARTMENT_ADD_ON";
        }
        if (targetDepartmentId == null) {
            return "POSITION_ADD_ON";
        }
        return "DEPARTMENT_POSITION_ADD_ON";
    }

    private record LevelRankRange(int minRank, int maxRank) {}

    private LevelRankRange resolveAvailableRuleLevelRange() {
        List<Integer> ranks = positionLevelRepository.findAll().stream()
                .filter(level -> level != null && !Boolean.FALSE.equals(level.getActive()))
                .map(PositionLevel::getLevelCode)
                .map(this::parsePositionLevelRank)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .toList();
        if (ranks.isEmpty()) {
            return new LevelRankRange(1, 9);
        }
        return new LevelRankRange(ranks.get(0), ranks.get(ranks.size() - 1));
    }

    private Integer parsePositionLevelRank(String levelCode) {
        if (levelCode == null || levelCode.isBlank()) {
            return null;
        }
        Matcher matcher = Pattern.compile("(\\d+)").matcher(levelCode);
        if (!matcher.find()) {
            return null;
        }
        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private void validateRuleLevelRange(Integer minRank, Integer maxRank, LevelRankRange availableLevels) {
        if (minRank == null || maxRank == null) {
            throw new BadRequestException("Select a valid employee level range.");
        }
        if (minRank > maxRank) {
            throw new BadRequestException("From level cannot be greater than To level.");
        }
        if (minRank < availableLevels.minRank() || maxRank > availableLevels.maxRank()) {
            throw new BadRequestException("Selected level range is no longer available. Refresh the page and choose active position levels again.");
        }
    }

    private void validateRuleSetGovernance(
            List<Long> questionBankIds,
            List<String> relationshipTypes,
            Integer minRank,
            Integer maxRank,
            Long targetDepartmentId,
            Long targetPositionId,
            Long excludeRuleSetId,
            String desiredStatus
    ) {
        validateExactDuplicateRuleSet(questionBankIds, relationshipTypes, minRank, maxRank, targetDepartmentId, targetPositionId, excludeRuleSetId);
        if (!"ACTIVE".equals(desiredStatus)) {
            return;
        }
        validateSameScopeActiveOverlap(relationshipTypes, minRank, maxRank, targetDepartmentId, targetPositionId, excludeRuleSetId);
        // Form Setup uses full replacement forms, so department and position forms may reuse questions from the default form.
    }

    private void validateSameScopeActiveOverlap(
            List<String> relationshipTypes,
            Integer minRank,
            Integer maxRank,
            Long targetDepartmentId,
            Long targetPositionId,
            Long excludeRuleSetId
    ) {
        Set<String> requestedRoles = new LinkedHashSet<>(relationshipTypes);
        for (Map.Entry<Long, List<FeedbackQuestionApplicabilityRule>> entry : groupedRuleRowsBySet().entrySet()) {
            FeedbackQuestionRuleSet existingSet = entry.getValue().isEmpty() ? null : entry.getValue().get(0).getRuleSet();
            if (existingSet == null || existingSet.getId() == null) {
                continue;
            }
            if (excludeRuleSetId != null && excludeRuleSetId.equals(existingSet.getId())) {
                continue;
            }
            if (!"ACTIVE".equals(normalizeStoredRuleSetStatus(existingSet.getStatus(), existingSet.getActive()))) {
                continue;
            }
            boolean sameExactScope = Objects.equals(existingSet.getTargetDepartmentId(), targetDepartmentId)
                    && Objects.equals(existingSet.getTargetPositionId(), targetPositionId);
            if (!sameExactScope || !rangesOverlap(existingSet.getTargetLevelMinRank(), existingSet.getTargetLevelMaxRank(), minRank, maxRank)) {
                continue;
            }
            Set<String> existingRoles = entry.getValue().stream()
                    .map(FeedbackQuestionApplicabilityRule::getEvaluatorRelationshipType)
                    .filter(Objects::nonNull)
                    .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
            boolean rolesOverlap = existingRoles.stream().anyMatch(requestedRoles::contains);
            if (rolesOverlap) {
                throw new BadRequestException("A form already exists for the same scope, level range, and evaluator type. Edit the existing form instead.");
            }
        }
    }

    private void validateInheritedQuestionDuplicates(
            List<Long> questionBankIds,
            List<String> relationshipTypes,
            Integer minRank,
            Integer maxRank,
            Long targetDepartmentId,
            Long targetPositionId,
            Long excludeRuleSetId
    ) {
        if (targetDepartmentId == null && targetPositionId == null) {
            return;
        }
        Set<Long> requestedQuestions = new LinkedHashSet<>(questionBankIds);
        Set<String> requestedRoles = new LinkedHashSet<>(relationshipTypes);
        for (FeedbackQuestionApplicabilityRule rule : ruleRepository.findAllDetailed()) {
            FeedbackQuestionRuleSet existingSet = rule.getRuleSet();
            if (existingSet == null || existingSet.getId() == null) {
                continue;
            }
            if (excludeRuleSetId != null && excludeRuleSetId.equals(existingSet.getId())) {
                continue;
            }
            if (!"ACTIVE".equals(normalizeStoredRuleSetStatus(existingSet.getStatus(), existingSet.getActive()))) {
                continue;
            }
            if (!Boolean.TRUE.equals(rule.getActive())) {
                continue;
            }
            FeedbackQuestionBank existingBank = rule.getQuestionBank();
            if (existingBank == null || existingBank.getId() == null || !requestedQuestions.contains(existingBank.getId())) {
                continue;
            }
            if (!requestedRoles.contains(rule.getEvaluatorRelationshipType())) {
                continue;
            }
            if (!rangesOverlap(rule.getTargetLevelMinRank(), rule.getTargetLevelMaxRank(), minRank, maxRank)) {
                continue;
            }
            if (isBroaderScope(rule.getTargetDepartmentId(), rule.getTargetPositionId(), targetDepartmentId, targetPositionId)) {
                String questionLabel = firstNonBlank(existingBank.getQuestionCode(), "Question #" + existingBank.getId());
                throw new BadRequestException("This question is already used by another active form for this scope and evaluator type.");
            }
        }
    }

    private Map<Long, List<FeedbackQuestionApplicabilityRule>> groupedRuleRowsBySet() {
        Map<Long, List<FeedbackQuestionApplicabilityRule>> groupedRows = new LinkedHashMap<>();
        for (FeedbackQuestionApplicabilityRule rule : ruleRepository.findAllDetailed()) {
            if (rule.getRuleSet() == null || rule.getRuleSet().getId() == null) {
                continue;
            }
            groupedRows.computeIfAbsent(rule.getRuleSet().getId(), ignored -> new ArrayList<>()).add(rule);
        }
        return groupedRows;
    }

    private boolean isBroaderScope(Long existingDepartmentId, Long existingPositionId, Long targetDepartmentId, Long targetPositionId) {
        boolean departmentMatches = existingDepartmentId == null || Objects.equals(existingDepartmentId, targetDepartmentId);
        boolean positionMatches = existingPositionId == null || Objects.equals(existingPositionId, targetPositionId);
        boolean atLeastOneBroader = (existingDepartmentId == null && targetDepartmentId != null)
                || (existingPositionId == null && targetPositionId != null);
        return departmentMatches && positionMatches && atLeastOneBroader;
    }

    private boolean rangesOverlap(Integer aMin, Integer aMax, Integer bMin, Integer bMax) {
        int leftMin = aMin == null ? 1 : aMin;
        int leftMax = aMax == null ? 9 : aMax;
        int rightMin = bMin == null ? 1 : bMin;
        int rightMax = bMax == null ? 9 : bMax;
        return leftMin <= rightMax && rightMin <= leftMax;
    }

    private void validateRuleCanActivate(
            FeedbackQuestionApplicabilityRule rule,
            Long excludeRuleId,
            Long excludeRuleSetId
    ) {
        if (!SUPPORTED_RULE_RELATIONSHIPS.contains(rule.getEvaluatorRelationshipType())) {
            throw new BadRequestException("Legacy all-role rules cannot be reactivated. Create role-specific rules instead.");
        }
        validateDuplicateRule(
                rule.getQuestionBank() == null ? null : rule.getQuestionBank().getId(),
                rule.getTargetLevelMinRank(),
                rule.getTargetLevelMaxRank(),
                rule.getEvaluatorRelationshipType(),
                rule.getTargetPositionId(),
                rule.getTargetDepartmentId(),
                excludeRuleId,
                excludeRuleSetId,
                true
        );
    }

    private void validateDuplicateRule(
            Long questionBankId,
            Integer minRank,
            Integer maxRank,
            String relationshipType,
            Long targetPositionId,
            Long targetDepartmentId,
            Long excludeRuleId,
            Long excludeRuleSetId,
            boolean desiredActive
    ) {
        if (!desiredActive) {
            return;
        }
        long duplicates = ruleRepository.countDuplicateRulesOutsideRuleSet(
                questionBankId,
                minRank,
                maxRank,
                relationshipType,
                targetPositionId,
                targetDepartmentId,
                excludeRuleId,
                excludeRuleSetId
        );
        if (duplicates > 0) {
            throw new BadRequestException("Another active rule set already covers the same question, level range, evaluator role, and targeting scope. Disable the overlapping rule set first.");
        }
    }

    private String resolveRuleSetDescription(FeedbackQuestionRuleUpsertRequest request) {
        String description = blankToNull(request.getRuleSetDescription());
        if (description != null && description.length() > 500) {
            throw new BadRequestException("Form notes must be 500 characters or fewer.");
        }
        return description;
    }

    private String resolveRuleSetName(FeedbackQuestionRuleUpsertRequest request, Integer minRank, Integer maxRank, List<String> relationshipTypes) {
        String providedName = blankToNull(request.getRuleSetName());
        if (providedName != null) {
            if (providedName.length() > 180) {
                throw new BadRequestException("Form name must be 180 characters or fewer.");
            }
            return providedName;
        }
        int min = minRank == null ? 1 : minRank;
        int max = maxRank == null ? 9 : maxRank;
        String roleLabel = relationshipTypes != null && relationshipTypes.size() == 4 ? "All roles" : (relationshipTypes == null || relationshipTypes.isEmpty() ? "Roles" : String.join(" + ", relationshipTypes));
        return "L" + String.format("%02d", min) + "–L" + String.format("%02d", max) + " · " + roleLabel;
    }

    private void validateExactDuplicateRuleSet(
            List<Long> questionBankIds,
            List<String> relationshipTypes,
            Integer minRank,
            Integer maxRank,
            Long targetDepartmentId,
            Long targetPositionId,
            Long excludeRuleSetId
    ) {
        Set<Long> requestedQuestions = Set.copyOf(questionBankIds);
        Set<String> requestedRoles = Set.copyOf(relationshipTypes);
        Map<Long, List<FeedbackQuestionApplicabilityRule>> groupedRows = new LinkedHashMap<>();
        for (FeedbackQuestionApplicabilityRule rule : ruleRepository.findAllDetailed()) {
            if (rule.getRuleSet() == null || rule.getRuleSet().getId() == null) {
                continue;
            }
            Long existingRuleSetId = rule.getRuleSet().getId();
            if (excludeRuleSetId != null && excludeRuleSetId.equals(existingRuleSetId)) {
                continue;
            }
            groupedRows.computeIfAbsent(existingRuleSetId, ignored -> new ArrayList<>()).add(rule);
        }

        for (List<FeedbackQuestionApplicabilityRule> rows : groupedRows.values()) {
            if (rows.isEmpty()) {
                continue;
            }
            FeedbackQuestionApplicabilityRule first = rows.get(0);
            FeedbackQuestionRuleSet existingSet = first.getRuleSet();
            if (existingSet != null && "ARCHIVED".equals(normalizeStoredRuleSetStatus(existingSet.getStatus(), existingSet.getActive()))) {
                continue;
            }
            boolean sameScope = Objects.equals(first.getTargetLevelMinRank(), minRank)
                    && Objects.equals(first.getTargetLevelMaxRank(), maxRank)
                    && Objects.equals(first.getTargetDepartmentId(), targetDepartmentId)
                    && Objects.equals(first.getTargetPositionId(), targetPositionId);
            if (!sameScope) {
                continue;
            }
            Set<Long> existingQuestions = rows.stream()
                    .map(FeedbackQuestionApplicabilityRule::getQuestionBank)
                    .filter(Objects::nonNull)
                    .map(FeedbackQuestionBank::getId)
                    .filter(Objects::nonNull)
                    .collect(java.util.stream.Collectors.toSet());
            Set<String> existingRoles = rows.stream()
                    .map(FeedbackQuestionApplicabilityRule::getEvaluatorRelationshipType)
                    .filter(Objects::nonNull)
                    .collect(java.util.stream.Collectors.toSet());
            if (existingQuestions.equals(requestedQuestions) && existingRoles.equals(requestedRoles)) {
                String existingName = first.getRuleSet() == null ? "an existing form" : first.getRuleSet().getName();
                throw new BadRequestException("This form is identical to \"" + existingName + "\". Change the level, scope, evaluator roles, or selected questions before saving.");
            }
        }
    }

    private List<Long> resolveQuestionBankIds(FeedbackQuestionRuleUpsertRequest request) {
        List<Long> ids = request.getQuestionBankIds() != null && !request.getQuestionBankIds().isEmpty()
                ? request.getQuestionBankIds()
                : List.of(firstQuestionBankId(request, null));
        List<Long> normalized = ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (normalized.isEmpty()) {
            throw new BadRequestException("Select at least one question.");
        }
        return normalized;
    }

    private Long firstQuestionBankId(FeedbackQuestionRuleUpsertRequest request, Long fallback) {
        if (request.getQuestionBankId() != null) {
            return request.getQuestionBankId();
        }
        if (request.getQuestionBankIds() != null && !request.getQuestionBankIds().isEmpty()) {
            return request.getQuestionBankIds().stream().filter(Objects::nonNull).findFirst().orElse(fallback);
        }
        if (fallback != null) {
            return fallback;
        }
        throw new BadRequestException("Select at least one question.");
    }

    private List<String> resolveRelationshipTypes(FeedbackQuestionRuleUpsertRequest request) {
        List<String> rawValues = request.getEvaluatorRelationshipTypes() != null && !request.getEvaluatorRelationshipTypes().isEmpty()
                ? request.getEvaluatorRelationshipTypes()
                : List.of(firstNonBlank(request.getEvaluatorRelationshipType(), ""));
        List<String> normalized = rawValues.stream()
                .filter(value -> value != null && !value.isBlank())
                .flatMap(value -> {
                    String normalizedValue = value.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
                    if ("ALL".equals(normalizedValue) || "ANY".equals(normalizedValue) || "ALL_ROLES".equals(normalizedValue)) {
                        return List.of("MANAGER", "PEER", "SUBORDINATE", "SELF").stream();
                    }
                    return List.of(normalizeRelationship(value)).stream();
                })
                .distinct()
                .toList();
        if (normalized.isEmpty()) {
            throw new BadRequestException("At least one evaluator relationship type is required.");
        }
        return normalized;
    }


    private FeedbackQuestionVersion findActiveVersion(FeedbackQuestionBank bank) {
        if (bank == null || bank.getId() == null) {
            return null;
        }
        if (bank.getVersions() != null) {
            FeedbackQuestionVersion version = bank.getVersions().stream()
                    .filter(item -> Boolean.TRUE.equals(item.getActive()))
                    .max(Comparator.comparing(FeedbackQuestionVersion::getVersionNumber, Comparator.nullsLast(Comparator.naturalOrder())))
                    .orElse(null);
            if (version != null) {
                return version;
            }
        }
        return questionVersionRepository.findTopByQuestionBank_IdAndActiveTrueOrderByVersionNumberDesc(bank.getId()).orElse(null);
    }

    private String normalizeResponseType(String responseType) {
        String value = firstNonBlank(responseType, DEFAULT_RESPONSE_TYPE)
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        if (!RESPONSE_RATING_WITH_COMMENT.equals(value)) {
            throw new BadRequestException("Question Bank only supports Rating 1–5 + Required Comment.");
        }
        return RESPONSE_RATING_WITH_COMMENT;
    }

    private String normalizeScoringBehavior(String scoringBehavior, String responseType) {
        normalizeResponseType(responseType);
        String value = firstNonBlank(scoringBehavior, SCORING_SCORED)
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        if (!SCORING_SCORED.equals(value)) {
            throw new BadRequestException("Question Bank scoring behavior is fixed to SCORED.");
        }
        return SCORING_SCORED;
    }

    /**
     * Existing databases may contain legacy TEXT, YES_NO, or RATING questions from the old form-based flow.
     * Listing the Question Bank must never fail because of those historical rows. New create/update requests
     * still go through normalizeResponseType(), which enforces Rating 1-5 + Required Comment.
     */
    private String coerceStoredResponseType(String responseType) {
        if (responseType == null || responseType.isBlank()) {
            return RESPONSE_RATING_WITH_COMMENT;
        }
        String value = responseType.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (RESPONSE_RATING_WITH_COMMENT.equals(value)) {
            return RESPONSE_RATING_WITH_COMMENT;
        }
        return RESPONSE_RATING_WITH_COMMENT;
    }

    private String resolveStoredScoringBehavior(FeedbackQuestionVersion version, FeedbackQuestionBank bank, String responseType) {
        String scoring = firstNonBlank(
                version == null ? null : version.getScoringBehavior(),
                bank == null ? null : bank.getDefaultScoringBehavior(),
                inferDefaultScoringBehavior(responseType)
        );
        return normalizeScoringBehavior(scoring, responseType);
    }

    private String inferDefaultScoringBehavior(String responseType) {
        normalizeResponseType(responseType);
        return SCORING_SCORED;
    }

    private boolean isRatingResponseType(String responseType) {
        return RESPONSE_RATING_WITH_COMMENT.equals(normalizeResponseType(responseType));
    }

    private boolean isScored(String responseType, String scoringBehavior) {
        return isRatingResponseType(responseType) && SCORING_SCORED.equals(normalizeScoringBehavior(scoringBehavior, responseType));
    }

    private Double resolveEffectiveWeight(String responseType, String scoringBehavior, Double primary, Double fallback) {
        normalizeScoringBehavior(scoringBehavior, responseType);
        return 1.0;
    }

    private int parseLevelRank(String levelCode) {
        String value = firstNonBlank(levelCode, "L09");
        String digits = value.replaceAll("\\D+", "");
        if (digits.isBlank()) {
            return 9;
        }
        try {
            int rank = Integer.parseInt(digits);
            return Math.max(1, Math.min(9, rank));
        } catch (NumberFormatException ex) {
            return 9;
        }
    }

    private String normalizeRelationship(String relationshipType) {
        String value = firstNonBlank(relationshipType, "");
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Evaluator relationship type is required.");
        }
        value = value.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (SUPPORTED_RULE_RELATIONSHIPS.contains(value)) {
            return value;
        }
        throw new BadRequestException("Unsupported evaluator relationship type for question rules: " + relationshipType);
    }

    private String normalizeStatus(String status) {
        String value = firstNonBlank(status, "DRAFT").trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (!SUPPORTED_STATUSES.contains(value)) {
            throw new BadRequestException("Unsupported question status: " + status);
        }
        return "RETIRED".equals(value) ? "INACTIVE" : value;
    }

    private String normalizeCode(String value, String message) {
        return requireText(value, message)
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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

package com.epms.service.impl;

import com.epms.dto.FeedbackQuestionBankReadinessResponse;
import com.epms.dto.FeedbackQuestionBankUpsertRequest;
import com.epms.dto.FeedbackQuestionQualityIssueResponse;
import com.epms.dto.FeedbackQuestionQualityValidationResponse;
import com.epms.entity.FeedbackCompetency;
import com.epms.entity.FeedbackQuestionBank;
import com.epms.repository.FeedbackCompetencyRepository;
import com.epms.repository.FeedbackQuestionBankRepository;
import com.epms.service.QuestionQualityValidationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuestionQualityValidationServiceImpl implements QuestionQualityValidationService {

    private static final int MIN_QUESTION_LENGTH = 20;
    private static final int MAX_QUESTION_LENGTH = 500;
    private static final int QUALITY_SCORE_START = 100;
    private static final Pattern MULTI_SPACE = Pattern.compile("\\s+");
    private static final Pattern PUNCTUATION = Pattern.compile("[^a-z0-9\\s]");
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "how", "in",
            "is", "it", "of", "on", "or", "the", "this", "to", "with", "within", "does", "do", "their", "his", "her"
    );
    private static final Set<String> VAGUE_WORDS = Set.of("good", "bad", "nice", "better", "poor", "great", "okay");
    private static final Set<String> ABSOLUTE_WORDS = Set.of("always", "never", "everyone", "no one", "every time");
    private static final Set<String> BEHAVIOR_WORDS = Set.of(
            "communicates", "collaborates", "delivers", "demonstrates", "shows", "takes", "supports", "provides",
            "solves", "analyzes", "learns", "improves", "adapts", "listens", "shares", "leads", "follows", "meets"
    );

    private final FeedbackQuestionBankRepository questionBankRepository;
    private final FeedbackCompetencyRepository competencyRepository;

    @Override
    @Transactional(readOnly = true)
    public FeedbackQuestionQualityValidationResponse validateQuestion(FeedbackQuestionBankUpsertRequest request, Long excludeQuestionId) {
        List<FeedbackQuestionQualityIssueResponse> issues = new ArrayList<>();
        validateHardRules(request, excludeQuestionId, issues);
        validateSoftRules(request, excludeQuestionId, issues);
        return buildValidationResponse(issues);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackQuestionBankReadinessResponse getReadiness() {
        List<FeedbackQuestionBank> questions = distinctQuestions(questionBankRepository.findAllWithVersions());
        List<FeedbackCompetency> competencies = competencyRepository.findAllOrdered();
        List<FeedbackQuestionQualityIssueResponse> issues = new ArrayList<>();

        int activeQuestionCount = (int) questions.stream().filter(question -> "ACTIVE".equals(question.getStatus())).count();
        int draftQuestionCount = (int) questions.stream().filter(question -> "DRAFT".equals(question.getStatus())).count();
        int activeCompetencyCount = competencies.size();
        double activeWeightTotal = 0;

        if (activeQuestionCount == 0) {
            issues.add(error("NO_ACTIVE_QUESTIONS", "At least one active question is required before building question rules."));
        }
        if (activeCompetencyCount == 0) {
            issues.add(error("NO_COMPETENCIES", "At least one competency is required."));
        }

        Set<String> competencyCodes = competencies.stream()
                .map(FeedbackCompetency::getCode)
                .collect(Collectors.toSet());
        questions.stream()
                .filter(question -> "ACTIVE".equals(question.getStatus()))
                .filter(question -> !competencyCodes.contains(question.getCompetencyCode()))
                .limit(5)
                .forEach(question -> issues.add(error(
                        "ACTIVE_QUESTION_MISSING_COMPETENCY",
                        "Question " + question.getQuestionCode() + " uses a missing competency."
                )));

        int qualityScore = calculateQualityScore(issues);
        boolean ready = issues.stream().noneMatch(issue -> "ERROR".equals(issue.getSeverity()));
        return FeedbackQuestionBankReadinessResponse.builder()
                .ready(ready)
                .qualityScore(qualityScore)
                .activeQuestionCount(activeQuestionCount)
                .draftQuestionCount(draftQuestionCount)
                .activeCompetencyCount(activeCompetencyCount)
                .totalActiveCompetencyWeight(round(activeWeightTotal))
                .issues(issues)
                .build();
    }

    private void validateHardRules(FeedbackQuestionBankUpsertRequest request, Long excludeQuestionId, List<FeedbackQuestionQualityIssueResponse> issues) {
        String questionText = request == null ? null : request.getQuestionText();
        if (questionText == null || questionText.isBlank()) {
            issues.add(error("QUESTION_TEXT_REQUIRED", "Question text is required."));
            return;
        }
        int length = questionText.trim().length();
        if (length < MIN_QUESTION_LENGTH) {
            issues.add(error("QUESTION_TEXT_TOO_SHORT", "Question text must be at least " + MIN_QUESTION_LENGTH + " characters."));
        }
        if (length > MAX_QUESTION_LENGTH) {
            issues.add(error("QUESTION_TEXT_TOO_LONG", "Question text cannot exceed " + MAX_QUESTION_LENGTH + " characters."));
        }
        String competencyCode = normalizeCode(request.getCompetencyCode());
        if (competencyCode == null) {
            issues.add(error("COMPETENCY_REQUIRED", "Question must be linked to a competency."));
        } else {
            competencyRepository.findByCodeIgnoreCase(competencyCode)
                    .orElseGet(() -> {
                        issues.add(error("COMPETENCY_NOT_FOUND", "Question must use an existing competency."));
                        return null;
                    });
        }
        if (!"RATING_WITH_COMMENT".equals(normalizeResponseType(request.getResponseType()))) {
            issues.add(error("RESPONSE_TYPE_LOCKED", "Question Bank only supports Rating 1–5 + Required Comment."));
        }
        if (request.getRequired() != null && !request.getRequired()) {
            issues.add(error("COMMENT_REQUIRED_LOCKED", "Rating and comment are required for every 360 feedback question."));
        }
        validateExactDuplicate(questionText, excludeQuestionId, issues);
    }

    private void validateSoftRules(FeedbackQuestionBankUpsertRequest request, Long excludeQuestionId, List<FeedbackQuestionQualityIssueResponse> issues) {
        if (request == null || request.getQuestionText() == null || request.getQuestionText().isBlank()) {
            return;
        }
        String text = request.getQuestionText().trim();
        String normalized = normalizeText(text);
        if (text.length() > 220) {
            issues.add(warning("QUESTION_TEXT_LONG", "Question is long. Consider making it shorter for evaluator clarity."));
        }
        if (containsAny(normalized, VAGUE_WORDS)) {
            issues.add(warning("VAGUE_WORDING", "Question may contain vague wording. Use observable behavior instead."));
        }
        if (containsAny(normalized, ABSOLUTE_WORDS)) {
            issues.add(warning("ABSOLUTE_WORDING", "Avoid absolute wording such as always or never unless it is truly required."));
        }
        if (mayBeDoubleBarreled(normalized)) {
            issues.add(warning("POSSIBLE_DOUBLE_BARRELED", "This question may measure more than one behavior. Consider splitting it."));
        }
        if (!containsAny(normalized, BEHAVIOR_WORDS)) {
            issues.add(warning("BEHAVIOR_ORIENTATION", "Question may not be behavior-oriented. Prefer observable work behaviors."));
        }
        validateSimilarQuestion(text, excludeQuestionId, issues);
    }

    private void validateExactDuplicate(String questionText, Long excludeQuestionId, List<FeedbackQuestionQualityIssueResponse> issues) {
        String normalized = normalizeText(questionText);
        distinctQuestions(questionBankRepository.findAllWithVersions()).stream()
                .filter(question -> excludeQuestionId == null || !Objects.equals(question.getId(), excludeQuestionId))
                .filter(question -> normalizeText(question.getDefaultText()).equals(normalized))
                .findFirst()
                .ifPresent(question -> issues.add(error(
                        "DUPLICATE_QUESTION",
                        "A question with the same text already exists: " + question.getQuestionCode() + "."
                )));
    }

    private void validateSimilarQuestion(String questionText, Long excludeQuestionId, List<FeedbackQuestionQualityIssueResponse> issues) {
        Set<String> sourceTokens = tokens(questionText);
        if (sourceTokens.size() < 4) {
            return;
        }
        distinctQuestions(questionBankRepository.findAllWithVersions()).stream()
                .filter(question -> excludeQuestionId == null || !Objects.equals(question.getId(), excludeQuestionId))
                .filter(question -> jaccard(sourceTokens, tokens(question.getDefaultText())) >= 0.72)
                .findFirst()
                .ifPresent(question -> issues.add(warning(
                        "SIMILAR_QUESTION",
                        "A similar question already exists: " + question.getQuestionCode() + "."
                )));
    }


    private List<FeedbackQuestionBank> distinctQuestions(List<FeedbackQuestionBank> questions) {
        return questions.stream()
                .filter(question -> question != null && question.getId() != null)
                .collect(Collectors.toMap(
                        FeedbackQuestionBank::getId,
                        question -> question,
                        (first, duplicate) -> first,
                        LinkedHashMap::new
                ))
                .values()
                .stream()
                .toList();
    }

    private FeedbackQuestionQualityValidationResponse buildValidationResponse(List<FeedbackQuestionQualityIssueResponse> issues) {
        boolean hasErrors = issues.stream().anyMatch(issue -> "ERROR".equals(issue.getSeverity()));
        return FeedbackQuestionQualityValidationResponse.builder()
                .canSave(!hasErrors)
                .canActivate(!hasErrors)
                .qualityScore(calculateQualityScore(issues))
                .issues(issues)
                .build();
    }

    private int calculateQualityScore(List<FeedbackQuestionQualityIssueResponse> issues) {
        int penalties = issues.stream()
                .mapToInt(issue -> "ERROR".equals(issue.getSeverity()) ? 25 : 8)
                .sum();
        return Math.max(0, QUALITY_SCORE_START - penalties);
    }

    private FeedbackQuestionQualityIssueResponse error(String code, String message) {
        return issue("ERROR", code, message);
    }

    private FeedbackQuestionQualityIssueResponse warning(String code, String message) {
        return issue("WARNING", code, message);
    }

    private FeedbackQuestionQualityIssueResponse issue(String severity, String code, String message) {
        return FeedbackQuestionQualityIssueResponse.builder()
                .severity(severity)
                .code(code)
                .message(message)
                .build();
    }

    private boolean mayBeDoubleBarreled(String normalized) {
        int connectorCount = 0;
        for (String connector : List.of(" and ", " or ", "/", ",")) {
            if (normalized.contains(connector)) {
                connectorCount++;
            }
        }
        long behaviorVerbCount = BEHAVIOR_WORDS.stream().filter(normalized::contains).count();
        return connectorCount >= 2 || (connectorCount >= 1 && behaviorVerbCount >= 2);
    }

    private boolean containsAny(String normalized, Set<String> words) {
        return words.stream().anyMatch(word -> normalized.contains(" " + word + " ") || normalized.startsWith(word + " ") || normalized.endsWith(" " + word));
    }

    private Set<String> tokens(String value) {
        return Arrays.stream(normalizeText(value).split(" "))
                .filter(token -> !token.isBlank())
                .filter(token -> !STOP_WORDS.contains(token))
                .collect(Collectors.toCollection(HashSet::new));
    }

    private double jaccard(Set<String> left, Set<String> right) {
        if (left.isEmpty() || right.isEmpty()) {
            return 0.0;
        }
        Set<String> union = new HashSet<>(left);
        union.addAll(right);
        Set<String> intersection = new HashSet<>(left);
        intersection.retainAll(right);
        return (double) intersection.size() / union.size();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        String normalized = PUNCTUATION.matcher(value.toLowerCase(Locale.ROOT)).replaceAll(" ");
        normalized = MULTI_SPACE.matcher(normalized).replaceAll(" ").trim();
        return " " + normalized + " ";
    }

    private String normalizeCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }

    private String normalizeResponseType(String responseType) {
        if (responseType == null || responseType.isBlank()) {
            return "RATING_WITH_COMMENT";
        }
        return responseType.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String trimNumber(double value) {
        if (value == Math.rint(value)) {
            return String.valueOf((long) value);
        }
        return String.valueOf(round(value));
    }
}

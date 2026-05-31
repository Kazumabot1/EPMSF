package com.epms.service.impl;

import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.entity.FeedbackResponseItem;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.RatingScaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class Feedback360ScoringServiceImpl {

    private static final double DEFAULT_MAX_RATING = 5.0;
    private static final String SCORING_SCORED = "SCORED";
    private static final String GENERAL_COMPETENCY_CODE = "GENERAL";

    private final RatingScaleRepository ratingScaleRepository;

    public double resolveMaxRating(FeedbackAssignmentQuestion question) {
        if (question == null || question.getRatingScaleId() == null) {
            return DEFAULT_MAX_RATING;
        }
        return ratingScaleRepository.findById(question.getRatingScaleId())
                .map(scale -> scale.getScales() != null && scale.getScales() > 0
                        ? scale.getScales().doubleValue()
                        : DEFAULT_MAX_RATING)
                .orElseThrow(() -> new BusinessValidationException(
                        "Rating scale not found for question " + question.getQuestionCode() + "."
                ));
    }

    public double normalizeQuestionScore(Double ratingValue, FeedbackAssignmentQuestion question) {
        if (ratingValue == null) {
            return 0.0;
        }
        double maxRating = resolveMaxRating(question);
        double normalized = (ratingValue / maxRating) * 100.0;
        return roundToTwoDecimals(Math.max(0.0, Math.min(100.0, normalized)));
    }

    public boolean isScoredQuestion(FeedbackAssignmentQuestion question) {
        return question != null
                && (question.getScoringBehavior() == null
                || question.getScoringBehavior().isBlank()
                || SCORING_SCORED.equalsIgnoreCase(question.getScoringBehavior()));
    }

    public String normalizeCompetencyCode(String competencyCode) {
        if (competencyCode == null || competencyCode.isBlank()) {
            return GENERAL_COMPETENCY_CODE;
        }
        return competencyCode.trim().toUpperCase().replace('-', '_').replace(' ', '_');
    }

    public String resolveCompetencyName(FeedbackAssignmentQuestion question, String normalizedCompetencyCode) {
        if (question != null && question.getSectionTitle() != null && !question.getSectionTitle().isBlank()) {
            return question.getSectionTitle().trim();
        }
        return GENERAL_COMPETENCY_CODE.equals(normalizedCompetencyCode) ? "General" : normalizedCompetencyCode;
    }

    public String questionKey(FeedbackAssignmentQuestion question) {
        if (question == null) {
            return "UNKNOWN";
        }
        if (question.getQuestionCode() != null && !question.getQuestionCode().isBlank()) {
            return question.getQuestionCode().trim().toUpperCase();
        }
        return question.getId() == null ? "UNKNOWN" : "QUESTION_" + question.getId();
    }

    public Double calculateResponseOverallScore(
            List<FeedbackResponseItem> items,
            Map<Long, FeedbackAssignmentQuestion> assignmentQuestions,
            Map<String, Double> competencyWeights
    ) {
        if (items == null || items.isEmpty()) {
            return 0.0;
        }

        Map<String, List<Double>> scoresByCompetency = new LinkedHashMap<>();
        for (FeedbackResponseItem item : items) {
            if (item == null || item.getRatingValue() == null || item.getAssignmentQuestion() == null) {
                continue;
            }

            Long assignmentQuestionId = item.getAssignmentQuestion().getId();
            FeedbackAssignmentQuestion question = assignmentQuestions == null ? null : assignmentQuestions.get(assignmentQuestionId);
            if (question == null) {
                throw new ResourceNotFoundException("Feedback assignment question not found: " + assignmentQuestionId);
            }
            if (!isScoredQuestion(question)) {
                continue;
            }

            String competencyCode = normalizeCompetencyCode(question.getCompetencyCode());
            scoresByCompetency
                    .computeIfAbsent(competencyCode, ignored -> new java.util.ArrayList<>())
                    .add(normalizeQuestionScore(item.getRatingValue(), question));
        }

        if (scoresByCompetency.isEmpty()) {
            return 0.0;
        }

        if (competencyWeights != null && !competencyWeights.isEmpty()) {
            double weightedScoreSum = 0.0;
            double availableWeightSum = 0.0;
            for (Map.Entry<String, List<Double>> entry : scoresByCompetency.entrySet()) {
                double weight = competencyWeights.getOrDefault(normalizeCompetencyCode(entry.getKey()), 0.0);
                if (weight <= 0) {
                    continue;
                }
                double competencyScore = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                weightedScoreSum += competencyScore * weight;
                availableWeightSum += weight;
            }
            if (availableWeightSum > 0) {
                return roundToTwoDecimals(weightedScoreSum / availableWeightSum);
            }
        }

        double competencyScoreSum = 0.0;
        int applicableCompetencyCount = 0;
        for (List<Double> scores : scoresByCompetency.values()) {
            competencyScoreSum += scores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            applicableCompetencyCount++;
        }

        return applicableCompetencyCount == 0
                ? 0.0
                : roundToTwoDecimals(competencyScoreSum / applicableCompetencyCount);
    }

    public double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

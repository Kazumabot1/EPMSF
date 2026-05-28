package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignRelationshipWeightRequest;
import com.epms.dto.FeedbackCampaignScoringConfigRequest;
import com.epms.dto.FeedbackCampaignScoringConfigResponse;
import com.epms.dto.FeedbackRelationshipWeightResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignRelationshipWeight;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCampaignRelationshipWeightRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.service.FeedbackCampaignScoringConfigService;
import com.epms.service.FeedbackOperationalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignScoringConfigServiceImpl implements FeedbackCampaignScoringConfigService {

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackCampaignRelationshipWeightRepository relationshipWeightRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackOperationalService feedbackOperationalService;

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignScoringConfigResponse getScoringConfig(Long campaignId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        return buildScoringConfigResponse(campaign, relationshipWeightsByType(campaign));
    }

    @Override
    @Transactional
    public FeedbackCampaignScoringConfigResponse updateScoringConfig(Long campaignId, FeedbackCampaignScoringConfigRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureDraftCampaign(campaign, "Scoring weights can be changed only while the campaign is DRAFT.");
        if (request == null || request.getRelationshipWeights() == null || request.getRelationshipWeights().isEmpty()) {
            throw new BusinessValidationException("Relationship weights are required.");
        }

        Map<FeedbackRelationshipType, BigDecimal> normalized = normalizeRelationshipWeightRequest(request.getRelationshipWeights());
        validateRelationshipWeightsTotal(normalized);

        campaign.setRedistributeMissingRelationshipWeight(!Boolean.FALSE.equals(request.getRedistributeMissingRelationshipWeight()));
        feedbackCampaignRepository.save(campaign);

        Map<FeedbackRelationshipType, FeedbackCampaignRelationshipWeight> existing = relationshipWeightsByType(campaign);
        List<FeedbackCampaignRelationshipWeight> toSave = new ArrayList<>();
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            FeedbackCampaignRelationshipWeight weight = existing.get(type);
            if (weight == null) {
                weight = new FeedbackCampaignRelationshipWeight();
                weight.setCampaign(campaign);
                weight.setRelationshipType(type);
            }
            weight.setWeightPercent(normalized.getOrDefault(type, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
            toSave.add(weight);
        }
        relationshipWeightRepository.saveAll(toSave);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_UPDATED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                null,
                "relationshipWeights=" + normalized + ",redistributeMissingRelationshipWeight=" + campaign.getRedistributeMissingRelationshipWeight(),
                "Campaign relationship scoring weights updated"
        );
        return buildScoringConfigResponse(campaign, relationshipWeightsByType(campaign));
    }

    @Override
    @Transactional
    public void ensureDefaultRelationshipWeights(FeedbackCampaign campaign) {
        if (campaign == null || campaign.getId() == null) {
            return;
        }
        Map<FeedbackRelationshipType, FeedbackCampaignRelationshipWeight> existing = relationshipWeightsByType(campaign);
        boolean changed = false;
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            if (!existing.containsKey(type)) {
                FeedbackCampaignRelationshipWeight weight = new FeedbackCampaignRelationshipWeight();
                weight.setCampaign(campaign);
                weight.setRelationshipType(type);
                weight.setWeightPercent(defaultRelationshipWeight(type));
                relationshipWeightRepository.save(weight);
                changed = true;
            }
        }
        if (changed) {
            relationshipWeightRepository.flush();
        }
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

    private Map<FeedbackRelationshipType, FeedbackCampaignRelationshipWeight> relationshipWeightsByType(FeedbackCampaign campaign) {
        if (campaign == null || campaign.getId() == null) {
            return new EnumMap<>(FeedbackRelationshipType.class);
        }
        return relationshipWeightRepository.findByCampaignIdOrderByRelationshipTypeAsc(campaign.getId()).stream()
                .collect(Collectors.toMap(
                        FeedbackCampaignRelationshipWeight::getRelationshipType,
                        weight -> weight,
                        (left, right) -> left,
                        () -> new EnumMap<>(FeedbackRelationshipType.class)
                ));
    }

    private Map<FeedbackRelationshipType, BigDecimal> normalizeRelationshipWeightRequest(List<FeedbackCampaignRelationshipWeightRequest> requests) {
        Map<FeedbackRelationshipType, BigDecimal> result = new EnumMap<>(FeedbackRelationshipType.class);
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            result.put(type, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }
        for (FeedbackCampaignRelationshipWeightRequest item : requests) {
            if (item == null || item.getRelationshipType() == null) {
                throw new BusinessValidationException("Every relationship weight must include a relationship type.");
            }
            BigDecimal value = item.getWeightPercent() == null ? BigDecimal.ZERO : item.getWeightPercent();
            if (value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(new BigDecimal("100.00")) > 0) {
                throw new BusinessValidationException("Relationship weight must be between 0 and 100%.");
            }
            if (result.containsKey(item.getRelationshipType()) && result.get(item.getRelationshipType()).compareTo(BigDecimal.ZERO) > 0) {
                throw new BusinessValidationException("Duplicate relationship weight for " + item.getRelationshipType() + ".");
            }
            result.put(item.getRelationshipType(), value.setScale(2, RoundingMode.HALF_UP));
        }
        return result;
    }

    private void validateRelationshipWeightsTotal(Map<FeedbackRelationshipType, BigDecimal> weights) {
        BigDecimal total = relationshipWeightTotal(weights);
        if (total.compareTo(new BigDecimal("100.00")) != 0) {
            throw new BusinessValidationException("Relationship weights must total exactly 100%. Current total is " + total + "%.");
        }
        boolean anyPositive = weights.values().stream().anyMatch(value -> value.compareTo(BigDecimal.ZERO) > 0);
        if (!anyPositive) {
            throw new BusinessValidationException("At least one evaluator relationship must have a positive weight.");
        }
    }

    private BigDecimal relationshipWeightTotal(Map<FeedbackRelationshipType, BigDecimal> weights) {
        return weights.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal defaultRelationshipWeight(FeedbackRelationshipType type) {
        return switch (type) {
            case MANAGER -> new BigDecimal("40.00");
            case PEER -> new BigDecimal("30.00");
            case SUBORDINATE -> new BigDecimal("20.00");
            case SELF -> new BigDecimal("10.00");
        };
    }

    private FeedbackCampaignScoringConfigResponse buildScoringConfigResponse(
            FeedbackCampaign campaign,
            Map<FeedbackRelationshipType, FeedbackCampaignRelationshipWeight> storedWeights
    ) {
        Map<FeedbackRelationshipType, BigDecimal> weights = new EnumMap<>(FeedbackRelationshipType.class);
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            FeedbackCampaignRelationshipWeight stored = storedWeights.get(type);
            weights.put(type, stored == null ? defaultRelationshipWeight(type) : stored.getWeightPercent().setScale(2, RoundingMode.HALF_UP));
        }
        BigDecimal total = relationshipWeightTotal(weights);
        List<FeedbackEvaluatorAssignment> assignments = campaign == null || campaign.getId() == null
                ? List.of()
                : assignmentRepository.findByCampaignIdWithRequest(campaign.getId());
        Map<FeedbackRelationshipType, Long> assignmentCountByRole = assignments.stream()
                .filter(assignment -> assignment.getRelationshipType() != null)
                .collect(Collectors.groupingBy(
                        FeedbackEvaluatorAssignment::getRelationshipType,
                        () -> new EnumMap<>(FeedbackRelationshipType.class),
                        Collectors.counting()
                ));
        Map<FeedbackRelationshipType, Set<Long>> targetsByRole = new EnumMap<>(FeedbackRelationshipType.class);
        for (FeedbackEvaluatorAssignment assignment : assignments) {
            if (assignment.getRelationshipType() == null || assignment.getFeedbackRequest() == null) continue;
            targetsByRole.computeIfAbsent(assignment.getRelationshipType(), ignored -> new LinkedHashSet<>())
                    .add(assignment.getFeedbackRequest().getId());
        }
        List<String> warnings = relationshipWeightWarnings(campaign, weights, assignments);
        List<FeedbackRelationshipWeightResponse> responseWeights = Arrays.stream(FeedbackRelationshipType.values())
                .map(type -> FeedbackRelationshipWeightResponse.builder()
                        .relationshipType(type.name())
                        .label(relationshipLabel(type))
                        .weightPercent(weights.get(type))
                        .assignmentCount(assignmentCountByRole.getOrDefault(type, 0L).intValue())
                        .targetCountWithRole(targetsByRole.getOrDefault(type, Set.of()).size())
                        .currentlyAvailable(assignmentCountByRole.getOrDefault(type, 0L) > 0)
                        .build())
                .toList();
        return FeedbackCampaignScoringConfigResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .campaignStatus(campaign.getStatus() == null ? null : campaign.getStatus().name())
                .redistributeMissingRelationshipWeight(!Boolean.FALSE.equals(campaign.getRedistributeMissingRelationshipWeight()))
                .totalRelationshipWeight(total)
                .relationshipWeightsReady(total.compareTo(new BigDecimal("100.00")) == 0)
                .relationshipWeights(responseWeights)
                .warnings(warnings)
                .build();
    }

    private List<String> relationshipWeightWarnings(
            FeedbackCampaign campaign,
            Map<FeedbackRelationshipType, BigDecimal> weights,
            List<FeedbackEvaluatorAssignment> assignments
    ) {
        if (campaign == null) return List.of();
        Map<Long, Set<FeedbackRelationshipType>> rolesByRequest = assignments.stream()
                .filter(assignment -> assignment.getFeedbackRequest() != null && assignment.getRelationshipType() != null)
                .collect(Collectors.groupingBy(
                        assignment -> assignment.getFeedbackRequest().getId(),
                        Collectors.mapping(FeedbackEvaluatorAssignment::getRelationshipType, Collectors.toCollection(() -> EnumSet.noneOf(FeedbackRelationshipType.class)))
                ));
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        List<FeedbackRelationshipType> weightedRoles = weights.entrySet().stream()
                .filter(entry -> entry.getValue().compareTo(BigDecimal.ZERO) > 0)
                .map(Map.Entry::getKey)
                .toList();
        if (weightedRoles.isEmpty()) return List.of();

        int targetsMissingWeightedRole = 0;
        for (FeedbackRequest request : requests) {
            Set<FeedbackRelationshipType> roles = rolesByRequest.getOrDefault(request.getId(), EnumSet.noneOf(FeedbackRelationshipType.class));
            boolean missing = weightedRoles.stream().anyMatch(role -> !roles.contains(role));
            if (missing) targetsMissingWeightedRole++;
        }
        if (targetsMissingWeightedRole <= 0) return List.of();
        String message = targetsMissingWeightedRole + " target(s) do not have every weighted evaluator role.";
        if (Boolean.TRUE.equals(campaign.getRedistributeMissingRelationshipWeight())) {
            return List.of(message + " Unavailable relationship weight will redistribute across that target's available evaluator groups.");
        }
        return List.of(message + " Enable redistribution or adjust evaluator generation before activation.");
    }

    private String relationshipLabel(FeedbackRelationshipType type) {
        return switch (type) {
            case MANAGER -> "Manager";
            case PEER -> "Peer";
            case SUBORDINATE -> "Subordinate";
            case SELF -> "Self";
        };
    }
}

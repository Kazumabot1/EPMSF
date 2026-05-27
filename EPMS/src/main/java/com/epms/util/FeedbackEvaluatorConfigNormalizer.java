package com.epms.util;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.exception.BusinessValidationException;

/**
 * Centralizes the 360 evaluator configuration API contract.
 *
 * The canonical model is min/max based:
 * peerMinCount / peerMaxCount and subordinateMinCount / subordinateMaxCount.
 * Legacy peerCount and legacy peer source switches are still accepted here so
 * older callers remain compatible while all services work with one normalized
 * configuration shape.
 */
public final class FeedbackEvaluatorConfigNormalizer {

    public static final int DEFAULT_PEER_MIN_COUNT = 2;
    public static final int DEFAULT_PEER_MAX_COUNT = 5;
    public static final int DEFAULT_SUBORDINATE_MIN_COUNT = 0;
    public static final int DEFAULT_SUBORDINATE_MAX_COUNT = 5;

    private FeedbackEvaluatorConfigNormalizer() {
    }

    public static EvaluatorConfigDTO normalize(EvaluatorConfigDTO source) {
        EvaluatorConfigDTO normalized = new EvaluatorConfigDTO();
        if (source == null) {
            normalized.setPeerCount(DEFAULT_PEER_MAX_COUNT);
            return normalized;
        }

        boolean includeManager = !Boolean.FALSE.equals(source.getIncludeManager());
        boolean includeSelf = !Boolean.FALSE.equals(source.getIncludeSelf());
        boolean includeSubordinates = !Boolean.FALSE.equals(source.getIncludeSubordinates());

        boolean includeTeamPeers = !Boolean.FALSE.equals(source.getIncludeTeamPeers());
        boolean includeDepartmentPeers = !Boolean.FALSE.equals(source.getIncludeDepartmentPeers());
        boolean includeProjectPeers = Boolean.TRUE.equals(source.getIncludeProjectPeers());
        boolean includeCrossTeamPeers = Boolean.TRUE.equals(source.getIncludeCrossTeamPeers());
        boolean includePeers = source.getIncludePeers() != null
                ? source.getIncludePeers()
                : includeTeamPeers || includeDepartmentPeers || includeProjectPeers || includeCrossTeamPeers;

        if (!includePeers) {
            includeTeamPeers = false;
            includeDepartmentPeers = false;
            includeProjectPeers = false;
            includeCrossTeamPeers = false;
        }

        int peerMinCount = source.getPeerMinCount() != null
                ? Math.max(0, source.getPeerMinCount())
                : source.getPeerCount() == null ? DEFAULT_PEER_MIN_COUNT : Math.max(0, source.getPeerCount());
        int peerMaxCount = source.getPeerMaxCount() != null
                ? Math.max(1, source.getPeerMaxCount())
                : source.getPeerCount() == null ? DEFAULT_PEER_MAX_COUNT : Math.max(1, source.getPeerCount());
        int subordinateMinCount = source.getSubordinateMinCount() == null
                ? DEFAULT_SUBORDINATE_MIN_COUNT
                : Math.max(0, source.getSubordinateMinCount());
        int subordinateMaxCount = source.getSubordinateMaxCount() == null
                ? DEFAULT_SUBORDINATE_MAX_COUNT
                : Math.max(0, source.getSubordinateMaxCount());

        normalized.setIncludeManager(includeManager);
        normalized.setIncludeSelf(includeSelf);
        normalized.setIncludeSubordinates(includeSubordinates);
        normalized.setIncludePeers(includePeers);
        normalized.setIncludeTeamPeers(includeTeamPeers);
        normalized.setIncludeDepartmentPeers(includeDepartmentPeers);
        normalized.setIncludeProjectPeers(includeProjectPeers);
        normalized.setIncludeCrossTeamPeers(includeCrossTeamPeers);
        normalized.setPeerMinCount(peerMinCount);
        normalized.setPeerMaxCount(peerMaxCount);
        normalized.setPeerCount(peerMaxCount);
        normalized.setSubordinateMinCount(subordinateMinCount);
        normalized.setSubordinateMaxCount(subordinateMaxCount);
        normalized.setFlexibleMode(!Boolean.FALSE.equals(source.getFlexibleMode()));
        return normalized;
    }

    public static void validate(EvaluatorConfigDTO source) {
        EvaluatorConfigDTO config = normalize(source);
        boolean anyEvaluatorSourceSelected = config.getIncludeManager()
                || config.getIncludeSelf()
                || config.getIncludeSubordinates()
                || isPeerSelectionEnabled(config);
        if (!anyEvaluatorSourceSelected) {
            throw new BusinessValidationException("Choose at least one evaluator role.");
        }

        if (isPeerSelectionEnabled(config)) {
            int peerMin = requestedPeerMinCount(config);
            int peerMax = requestedPeerMaxCount(config);
            if (peerMax <= 0) {
                throw new BusinessValidationException("Maximum peer count must be greater than zero when peer evaluators are enabled.");
            }
            if (peerMin > peerMax) {
                throw new BusinessValidationException("Minimum peer count cannot be greater than maximum peer count.");
            }
        }

        if (config.getIncludeSubordinates()) {
            int subordinateMin = requestedSubordinateMinCount(config);
            int subordinateMax = requestedSubordinateMaxCount(config);
            if (subordinateMin > subordinateMax) {
                throw new BusinessValidationException("Minimum subordinate count cannot be greater than maximum subordinate count.");
            }
        }
    }

    public static boolean isPeerSelectionEnabled(EvaluatorConfigDTO source) {
        EvaluatorConfigDTO config = normalize(source);
        return config.getIncludePeers()
                && (isTeamPeerSelectionEnabled(config)
                || isDepartmentPeerSelectionEnabled(config)
                || config.getIncludeProjectPeers()
                || config.getIncludeCrossTeamPeers());
    }

    public static boolean isTeamPeerSelectionEnabled(EvaluatorConfigDTO source) {
        EvaluatorConfigDTO config = normalize(source);
        return config.getIncludePeers() && config.getIncludeTeamPeers();
    }

    public static boolean isDepartmentPeerSelectionEnabled(EvaluatorConfigDTO source) {
        EvaluatorConfigDTO config = normalize(source);
        return config.getIncludePeers() && config.getIncludeDepartmentPeers();
    }

    public static int requestedPeerMinCount(EvaluatorConfigDTO source) {
        EvaluatorConfigDTO config = normalize(source);
        return config.getPeerMinCount() == null ? DEFAULT_PEER_MIN_COUNT : Math.max(0, config.getPeerMinCount());
    }

    public static int requestedPeerMaxCount(EvaluatorConfigDTO source) {
        EvaluatorConfigDTO config = normalize(source);
        return config.getPeerMaxCount() == null ? DEFAULT_PEER_MAX_COUNT : Math.max(1, config.getPeerMaxCount());
    }

    public static int requestedSubordinateMinCount(EvaluatorConfigDTO source) {
        EvaluatorConfigDTO config = normalize(source);
        return config.getSubordinateMinCount() == null ? DEFAULT_SUBORDINATE_MIN_COUNT : Math.max(0, config.getSubordinateMinCount());
    }

    public static int requestedSubordinateMaxCount(EvaluatorConfigDTO source) {
        EvaluatorConfigDTO config = normalize(source);
        return config.getSubordinateMaxCount() == null ? DEFAULT_SUBORDINATE_MAX_COUNT : Math.max(0, config.getSubordinateMaxCount());
    }
}

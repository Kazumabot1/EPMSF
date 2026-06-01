package com.epms.util;

import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.enums.FeedbackRelationshipType;

import java.util.Locale;
import java.util.Objects;

/**
 * Centralized privacy policy for 360-feedback evaluator identity display.
 *
 * This module follows a privacy-first rule: when an assignment is anonymous,
 * the backend does not expose evaluator employee IDs or names to viewers other
 * than the evaluator who submitted the feedback. Peer and subordinate feedback
 * are also treated as identity-protected by default because they are the most
 * sensitive 360-feedback sources.
 */
public final class FeedbackPrivacyUtil {

    private FeedbackPrivacyUtil() {
    }

    public static final int MIN_PROTECTED_RELATIONSHIP_RESPONSES = 3;

    public static boolean requiresGroupThreshold(FeedbackRelationshipType relationshipType) {
        return relationshipType == FeedbackRelationshipType.PEER
                || relationshipType == FeedbackRelationshipType.SUBORDINATE;
    }

    public static boolean hasEnoughProtectedResponses(FeedbackRelationshipType relationshipType, long submittedCount) {
        if (!requiresGroupThreshold(relationshipType)) {
            return submittedCount > 0;
        }
        return submittedCount >= MIN_PROTECTED_RELATIONSHIP_RESPONSES;
    }

    public static String protectedRelationshipThresholdMessage(FeedbackRelationshipType relationshipType) {
        return relationshipLabel(relationshipType) + " scores and comments require at least "
                + MIN_PROTECTED_RELATIONSHIP_RESPONSES
                + " submitted responses before they can be shown in employee-facing results.";
    }

    public static boolean isIdentityProtected(FeedbackEvaluatorAssignment assignment) {
        if (assignment == null) {
            return true;
        }
        if (Boolean.TRUE.equals(assignment.getIsAnonymous())) {
            return true;
        }
        FeedbackRelationshipType relationshipType = assignment.getRelationshipType();
        return relationshipType == FeedbackRelationshipType.PEER
                || relationshipType == FeedbackRelationshipType.SUBORDINATE;
    }

    public static boolean canViewerSeeEvaluatorIdentity(
            FeedbackEvaluatorAssignment assignment,
            Long requestingEmployeeId
    ) {
        if (assignment == null) {
            return false;
        }
        boolean isSubmitter = requestingEmployeeId != null
                && Objects.equals(assignment.getEvaluatorEmployeeId(), requestingEmployeeId);
        return isSubmitter || !isIdentityProtected(assignment);
    }

    public static String maskedEvaluatorLabel(FeedbackRelationshipType relationshipType) {
        if (relationshipType == null) {
            return "Anonymous Evaluator";
        }
        return "Anonymous " + relationshipLabel(relationshipType);
    }

    public static String identityProtectionReason(FeedbackEvaluatorAssignment assignment) {
        if (assignment == null) {
            return "Evaluator identity is protected by feedback privacy policy.";
        }
        FeedbackRelationshipType relationshipType = assignment.getRelationshipType();
        if (Boolean.TRUE.equals(assignment.getIsAnonymous())) {
            return relationshipLabel(relationshipType) + " feedback is anonymous; evaluator identity is hidden by policy.";
        }
        if (relationshipType == FeedbackRelationshipType.PEER || relationshipType == FeedbackRelationshipType.SUBORDINATE) {
            return relationshipLabel(relationshipType) + " feedback identity is protected by 360-feedback policy.";
        }
        return "Evaluator identity is visible for this feedback source.";
    }

    public static String relationshipLabel(FeedbackRelationshipType relationshipType) {
        if (relationshipType == null) {
            return "Evaluator";
        }
        String label = relationshipType.name().replace('_', ' ').toLowerCase(Locale.ROOT);
        StringBuilder result = new StringBuilder(label.length());
        boolean capitalize = true;
        for (char ch : label.toCharArray()) {
            if (Character.isWhitespace(ch)) {
                capitalize = true;
                result.append(ch);
            } else if (capitalize) {
                result.append(Character.toUpperCase(ch));
                capitalize = false;
            } else {
                result.append(ch);
            }
        }
        return result.toString();
    }
}

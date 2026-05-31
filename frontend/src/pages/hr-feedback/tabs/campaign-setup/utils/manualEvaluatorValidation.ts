import type {
    FeedbackRelationshipType,
    FeedbackTargetCandidate,
    FeedbackTargetEmployee,
} from '../../../../../types/feedbackCampaign';

export type ManualEvaluatorCandidate = FeedbackTargetEmployee & {
    employeeName?: string | null;
    levelCode?: string | null;
    positionName?: string | null;
    employeeCode?: string | null;
    email?: string | null;
    sourceLabel?: string | null;
    relationshipType?: FeedbackRelationshipType | string | null;
};

export const manualEvaluatorEligibilityMessage = (
    employee: ManualEvaluatorCandidate | null | undefined,
    target: FeedbackTargetCandidate | null | undefined,
    relationshipType: FeedbackRelationshipType,
    assignedEvaluatorIds: Set<number>,
    allowedCandidateIds?: Set<number>,
) => {
    if (!employee) return 'Choose an evaluator to add.';
    if (!target?.employeeId) return 'Choose a recipient before adding an evaluator.';

    const employeeId = Number(employee.id);
    const targetEmployeeId = Number(target.employeeId);

    if (assignedEvaluatorIds.has(employeeId)) {
        return 'This evaluator is already included for the selected recipient.';
    }

    if (relationshipType === 'SELF') {
        return employeeId === targetEmployeeId
            ? ''
            : 'Self review must use the selected recipient as evaluator.';
    }

    if (employeeId === targetEmployeeId) {
        return 'Use Self Review for the recipient; the recipient cannot be added as another evaluator role.';
    }

    if (allowedCandidateIds && !allowedCandidateIds.has(employeeId)) {
        if (relationshipType === 'MANAGER') {
            return 'Choose an eligible manager reviewer for this recipient.';
        }
        if (relationshipType === 'SUBORDINATE') {
            return 'Choose an eligible subordinate reviewer for this recipient.';
        }
        if (relationshipType === 'PEER') {
            return 'Choose an eligible peer reviewer for this recipient.';
        }
        return 'Choose an eligible reviewer for this recipient.';
    }

    return '';
};

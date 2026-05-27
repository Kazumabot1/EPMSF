import type {
    FeedbackRelationshipType,
    FeedbackTargetCandidate,
    FeedbackTargetEmployee,
} from '../../../../../types/feedbackCampaign';

const AUTO_PEER_LEVEL_CODES = new Set(['L05', 'L06', 'L07']);

const normalizeLabel = (value?: string | null) => String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const isManagerLikeTitle = (value?: string | null) => {
    const normalized = normalizeLabel(value);
    if (!normalized) return false;
    return [
        'MANAGER',
        'DEPARTMENT_HEAD',
        'HEAD',
        'DIRECTOR',
        'CHIEF',
        'EXECUTIVE',
        'CEO',
        'CTO',
        'CFO',
        'COO',
        'SUPERVISOR',
        'LEAD',
        'HR',
        'ADMIN',
    ].some(token => normalized.includes(token));
};

const hasPeerLevel = (employee?: FeedbackTargetEmployee | null) => {
    const levelCode = normalizeLabel(employee?.positionLevelCode).replace(/_/g, '');
    return AUTO_PEER_LEVEL_CODES.has(levelCode);
};

export const manualEvaluatorEligibilityMessage = (
    employee: FeedbackTargetEmployee | null | undefined,
    target: FeedbackTargetCandidate | null | undefined,
    relationshipType: FeedbackRelationshipType,
    assignedEvaluatorIds: Set<number>,
) => {
    if (!employee) return 'Choose an evaluator to add.';
    if (!target?.employeeId) return 'Choose a recipient before adding an evaluator.';
    if (employee.id === target.employeeId) return 'Use Self Review for the recipient; the recipient cannot be added as another evaluator role.';
    if (assignedEvaluatorIds.has(employee.id)) return 'This evaluator is already included for the selected recipient.';

    if (relationshipType !== 'PEER') return '';

    if (!hasPeerLevel(employee)) {
        return 'This employee is not eligible as a peer. Peer evaluators must use an eligible peer level.';
    }

    if (isManagerLikeTitle(employee.positionTitle)) {
        return 'This employee has a manager, head, HR, admin, or lead role and cannot be added as a peer.';
    }

    if (
        target.currentDepartmentName
        && employee.currentDepartment
        && employee.currentDepartment !== target.currentDepartmentName
    ) {
        return 'Peer evaluators must be from the same department as the selected recipient.';
    }

    return '';
};

import type {
    FeedbackRelationshipType,
    FeedbackTargetCandidate,
    FeedbackTargetEmployee,
} from '../../../../../types/feedbackCampaign';

export type ManualEvaluatorCandidate = FeedbackTargetEmployee & {
    managerEmployeeId?: number | null;
    employeeName?: string | null;
    levelCode?: string | null;
    positionName?: string | null;
};

const normalizeLabel = (value?: string | null) => String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const parseLevelRank = (value?: string | null) => {
    const digits = normalizeLabel(value).replace(/\D+/g, '');
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : 0;
};

const hasAny = (value: string, tokens: string[]) => tokens.some(token => value.includes(token));

const peerLayer = (title?: string | null) => {
    const normalized = normalizeLabel(title);
    if (hasAny(normalized, ['CEO', 'CHIEF', 'EXECUTIVE', 'DIRECTOR'])) return 'EXECUTIVE';
    if (hasAny(normalized, ['DEPARTMENT_HEAD', 'DEPT_HEAD', 'HEAD_OF_DEPARTMENT', 'HEAD'])) return 'DEPARTMENT_HEAD';
    if (hasAny(normalized, ['MANAGER'])) return 'MANAGER';
    if (hasAny(normalized, ['LEAD', 'SUPERVISOR'])) return 'LEAD';
    return 'INDIVIDUAL_CONTRIBUTOR';
};

const candidateTitle = (employee?: ManualEvaluatorCandidate | null) => employee?.positionTitle ?? employee?.positionName ?? '';
const targetTitle = (target?: FeedbackTargetCandidate | null) => target?.positionName ?? '';
const candidateLevel = (employee?: ManualEvaluatorCandidate | null) => employee?.positionLevelCode ?? employee?.levelCode ?? '';
const sameDepartment = (employee?: ManualEvaluatorCandidate | null, target?: FeedbackTargetCandidate | null) =>
    employee?.currentDepartmentId != null
    && target?.currentDepartmentId != null
    && Number(employee.currentDepartmentId) === Number(target.currentDepartmentId);

const peerLayerCompatible = (target?: FeedbackTargetCandidate | null, employee?: ManualEvaluatorCandidate | null) => {
    const targetLayer = peerLayer(targetTitle(target));
    const evaluatorLayer = peerLayer(candidateTitle(employee));

    if (targetLayer === 'INDIVIDUAL_CONTRIBUTOR') {
        return evaluatorLayer === 'INDIVIDUAL_CONTRIBUTOR' || evaluatorLayer === 'LEAD';
    }
    if (targetLayer === 'LEAD') {
        return evaluatorLayer === 'LEAD' || evaluatorLayer === 'INDIVIDUAL_CONTRIBUTOR';
    }
    if (targetLayer === 'MANAGER') {
        return evaluatorLayer === 'MANAGER';
    }
    if (targetLayer === 'DEPARTMENT_HEAD') {
        return evaluatorLayer === 'DEPARTMENT_HEAD';
    }
    return evaluatorLayer === 'EXECUTIVE';
};

const isHrOrAdminLike = (employee?: ManualEvaluatorCandidate | null) => {
    const title = normalizeLabel(candidateTitle(employee));
    return hasAny(title, ['HR', 'HUMAN_RESOURCE', 'HUMAN_RESOURCES', 'ADMIN']);
};

const isExecutiveLike = (employee?: ManualEvaluatorCandidate | null) => {
    const title = normalizeLabel(candidateTitle(employee));
    return hasAny(title, ['CEO', 'CHIEF', 'EXECUTIVE', 'DIRECTOR']);
};

const isTargetManager = (employee?: ManualEvaluatorCandidate | null, target?: FeedbackTargetCandidate | null) =>
    employee?.id != null && target?.managerEmployeeId != null && Number(employee.id) === Number(target.managerEmployeeId);

const isTargetDirectReport = (employee?: ManualEvaluatorCandidate | null, target?: FeedbackTargetCandidate | null) =>
    employee?.managerEmployeeId != null && target?.employeeId != null && Number(employee.managerEmployeeId) === Number(target.employeeId);

export const manualEvaluatorEligibilityMessage = (
    employee: ManualEvaluatorCandidate | null | undefined,
    target: FeedbackTargetCandidate | null | undefined,
    relationshipType: FeedbackRelationshipType,
    assignedEvaluatorIds: Set<number>,
) => {
    if (!employee) return 'Choose an evaluator to add.';
    if (!target?.employeeId) return 'Choose a recipient before adding an evaluator.';
    if (employee.id === target.employeeId) return 'Use Self Review for the recipient; the recipient cannot be added as another evaluator role.';
    if (assignedEvaluatorIds.has(employee.id)) return 'This evaluator is already included for the selected recipient.';

    if (relationshipType === 'MANAGER') {
        if (!target.managerEmployeeId) return 'This recipient has no Reports To manager recorded.';
        return isTargetManager(employee, target) ? '' : 'Manager review must use the recipient\'s Reports To manager.';
    }

    if (relationshipType === 'SUBORDINATE') {
        if (!isTargetDirectReport(employee, target)) {
            return 'Direct Report review must use an employee who reports to this recipient.';
        }
        return '';
    }

    if (relationshipType !== 'PEER') return '';

    if (isTargetManager(employee, target)) {
        return 'The recipient\'s manager cannot be added as a peer evaluator.';
    }

    if (isTargetDirectReport(employee, target)) {
        return 'A direct report cannot be added as a peer evaluator.';
    }

    if (isHrOrAdminLike(employee)) {
        return 'HR/Admin users cannot be added as peer evaluators.';
    }

    if (isExecutiveLike(employee) && peerLayer(targetTitle(target)) !== 'EXECUTIVE') {
        return 'Executive users are not peer evaluators for this recipient layer.';
    }

    if (!sameDepartment(employee, target)) {
        return 'Peer reviewers must be from the same department by default.';
    }

    if (!peerLayerCompatible(target, employee)) {
        return 'Choose someone from the same organization layer for peer feedback.';
    }

    const targetLevel = parseLevelRank(target.levelCode);
    const evaluatorLevel = parseLevelRank(candidateLevel(employee));
    if (targetLevel && evaluatorLevel && Math.abs(targetLevel - evaluatorLevel) > 1) {
        return 'Choose a peer from the same or adjacent level.';
    }

    return '';
};

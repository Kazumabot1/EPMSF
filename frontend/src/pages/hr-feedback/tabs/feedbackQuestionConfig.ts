import type {
    QuestionBankItem,
    QuestionRuleItem,
} from '../../../api/hrFeedbackApi';

export const LEVEL_OPTIONS = [
    { code: 'L01', rank: 1, label: 'L01 · Chairman' },
    { code: 'L02', rank: 2, label: 'L02 · CEO / COO' },
    { code: 'L03', rank: 3, label: 'L03 · Executive / GM' },
    { code: 'L04', rank: 4, label: 'L04 · Department Head / Senior Officer' },
    { code: 'L05', rank: 5, label: 'L05 · Manager / Supervisor' },
    { code: 'L06', rank: 6, label: 'L06 · Team Lead / Senior Staff' },
    { code: 'L07', rank: 7, label: 'L07 · Officer / Junior Staff' },
    { code: 'L08', rank: 8, label: 'L08 · OJT' },
    { code: 'L09', rank: 9, label: 'L09 · Support / Operations' },
];

export type QuestionRuleRole = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';

export const EVALUATOR_ROLE_OPTIONS: Array<{
    value: QuestionRuleRole;
    label: string;
    short: string;
    help: string;
}> = [
    {
        value: 'MANAGER',
        label: 'Manager',
        short: 'M',
        help: "The evaluated employee's direct reporting manager or supervisor.",
    },
    {
        value: 'PEER',
        label: 'Peer',
        short: 'P',
        help: 'Colleagues who work with the evaluated employee.',
    },
    {
        value: 'SUBORDINATE',
        label: 'Subordinate',
        short: 'S',
        help: 'Employees who report to the evaluated employee.',
    },
    {
        value: 'SELF',
        label: 'Self',
        short: 'SE',
        help: 'Self-evaluation by the employee being reviewed.',
    },
];

export const DEFAULT_COMPETENCY_OPTIONS = [
    { value: 'COMMUNICATION', label: 'Communication', codePart: 'COMM' },
    { value: 'TEAMWORK', label: 'Teamwork & Collaboration', codePart: 'TEAM' },
    { value: 'LEADERSHIP', label: 'Leadership', codePart: 'LEAD' },
    { value: 'TECHNICAL_SKILL', label: 'Technical Skill', codePart: 'TECH' },
    { value: 'WORK_QUALITY', label: 'Work Quality', codePart: 'WORK' },
    { value: 'ACCOUNTABILITY', label: 'Accountability', codePart: 'ACCT' },
    { value: 'PROBLEM_SOLVING', label: 'Problem Solving', codePart: 'PROB' },
    { value: 'LEARNING_IMPROVEMENT', label: 'Learning & Improvement', codePart: 'LEARN' },
    { value: 'PROFESSIONALISM', label: 'Professionalism', codePart: 'PROF' },
    { value: 'ATTENDANCE_RELIABILITY', label: 'Attendance / Reliability', codePart: 'RELY' },
    { value: 'COMPLIANCE_SAFETY', label: 'Compliance / Safety', codePart: 'SAFE' },
    { value: 'RESULTS_ORIENTATION', label: 'Results Orientation', codePart: 'RESULT' },
    { value: 'COACHING', label: 'Coaching', codePart: 'COACH' },
    { value: 'ADAPTABILITY', label: 'Adaptability', codePart: 'ADAPT' },
];

export const COMPETENCY_OPTIONS = DEFAULT_COMPETENCY_OPTIONS;

export const RESPONSE_TYPE_OPTIONS = [
    {
        value: 'RATING_WITH_COMMENT',
        label: 'Rating + Comment',
        icon: 'bi bi-star',
        description: 'Evaluator gives a numeric rating and may add written context.',
    },
    {
        value: 'RATING',
        label: 'Rating Only',
        icon: 'bi bi-star-half',
        description: 'Evaluator gives only a numeric rating.',
    },
    {
        value: 'TEXT',
        label: 'Written Answer Only',
        icon: 'bi bi-chat-left-text',
        description: 'Evaluator writes feedback only. This does not affect the score.',
    },
    {
        value: 'YES_NO',
        label: 'Yes / No',
        icon: 'bi bi-check2-circle',
        description: 'Evaluator answers Yes or No. Use for checklist, eligibility, or HR review items.',
    },
];


export const isRatingResponseType = (responseType?: string | null) =>
    responseType === 'RATING' || responseType === 'RATING_WITH_COMMENT';

export const toTitleCaseFromCode = (value?: string | null) => {
    const clean = (value ?? '').trim();

    if (!clean) {
        return '';
    }

    return clean
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
};

export const normalizeCompetencyCode = (value: string) =>
    value
        .trim()
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase();

export const getResponseTypeLabel = (responseType?: string | null) =>
    RESPONSE_TYPE_OPTIONS.find(option => option.value === responseType)?.label
    ?? toTitleCaseFromCode(responseType)
    ?? 'Unknown';

export const getCompetencyLabel = (competency?: string | null) =>
    (
        DEFAULT_COMPETENCY_OPTIONS.find(option => option.value === competency)?.label
        ?? toTitleCaseFromCode(competency)
    ) || 'General';

export const getRoleLabel = (value?: string | null) =>
    EVALUATOR_ROLE_OPTIONS.find(option => option.value === value)?.label
    ?? toTitleCaseFromCode(value)
    ?? 'Unknown';

export const getRoleShort = (value?: string | null) =>
    EVALUATOR_ROLE_OPTIONS.find(option => option.value === value)?.short ?? '—';

export type ScoringKind = 'SCORED' | 'NON_SCORED' | 'HR_REVIEW';

export const getScoringKind = (
    responseType?: string | null,
    scoringBehavior?: string | null,
): ScoringKind => {
    if (
        scoringBehavior === 'SCORED'
        || scoringBehavior === 'NON_SCORED'
        || scoringBehavior === 'HR_REVIEW'
    ) {
        return scoringBehavior;
    }

    if (isRatingResponseType(responseType)) {
        return 'SCORED';
    }

    if (responseType === 'YES_NO') {
        return 'HR_REVIEW';
    }

    return 'NON_SCORED';
};

export const getScoringCopy = (responseType?: string | null, scoringBehavior?: string | null) => {
    const kind = getScoringKind(responseType, scoringBehavior);

    if (kind === 'SCORED') {
        return {
            kind,
            label: 'Included in 360 score',
            shortLabel: 'Scored',
            description: 'Rating-based answers contribute to the 360 feedback score.',
        };
    }

    if (kind === 'HR_REVIEW') {
        return {
            kind,
            label: 'HR review / eligibility check',
            shortLabel: 'HR Review',
            description: 'Yes/No answers are used as checklist or eligibility context and do not affect the score.',
        };
    }

    return {
        kind,
        label: 'Not included in score',
        shortLabel: 'Non-scored',
        description: 'Written answers are available in reports for qualitative insight only.',
    };
};

export const formatLevelRange = (rule: QuestionRuleItem) =>
    `L${String(rule.targetLevelMinRank).padStart(2, '0')}–L${String(rule.targetLevelMaxRank).padStart(2, '0')}`;

export const normalizeText = (value?: string | null) => (value ?? '').trim().toLowerCase();

export const generateQuestionCode = (competencyCode: string, questions: QuestionBankItem[]) => {
    const normalizedCompetency = normalizeCompetencyCode(competencyCode);
    const competency = DEFAULT_COMPETENCY_OPTIONS.find(option => option.value === normalizedCompetency);
    const cleanCodePart = normalizedCompetency.replace(/[^A-Z0-9]/g, '');

    const prefixCodePart = competency?.codePart ?? (cleanCodePart.slice(0, 5) || 'GEN');
    const prefix = `FB-${prefixCodePart}-`;

    const nextSequence = questions
        .filter(question => question.questionCode?.startsWith(prefix))
        .map(question => Number(question.questionCode?.split('-').pop()))
        .filter(value => Number.isFinite(value))
        .reduce((max, value) => Math.max(max, value), 0) + 1;

    return `${prefix}${String(nextSequence).padStart(3, '0')}`;
};

const rangesOverlap = (aMin: number, aMax: number, bMin: number, bMax: number) =>
    aMin <= bMax && bMin <= aMax;

const nullableScopeOverlaps = (a?: number | null, b?: number | null) =>
    a == null || b == null || a === b;

export const findRuleConflictIds = (rules: QuestionRuleItem[]) => {
    const conflicts = new Set<number>();
    const activeRules = rules.filter(rule => rule.active);

    activeRules.forEach((rule, index) => {
        activeRules.slice(index + 1).forEach(other => {
            const sameQuestion = rule.questionBankId === other.questionBankId;
            const sameRole = rule.evaluatorRelationshipType === other.evaluatorRelationshipType;
            const levelsOverlap = rangesOverlap(
                rule.targetLevelMinRank,
                rule.targetLevelMaxRank,
                other.targetLevelMinRank,
                other.targetLevelMaxRank,
            );
            const departmentsOverlap = nullableScopeOverlaps(rule.targetDepartmentId, other.targetDepartmentId);
            const positionsOverlap = nullableScopeOverlaps(rule.targetPositionId, other.targetPositionId);

            if (sameQuestion && sameRole && levelsOverlap && departmentsOverlap && positionsOverlap) {
                conflicts.add(rule.id);
                conflicts.add(other.id);
            }
        });
    });

    return conflicts;
};

export const getRuleEffectiveStatus = (
    rule: QuestionRuleItem & { questionStatus?: string | null },
) => {
    const questionActive = (rule.questionStatus ?? 'ACTIVE') === 'ACTIVE';

    if (!rule.active) {
        return {
            label: 'Inactive',
            tone: 'INACTIVE',
            note: 'Rule disabled',
        };
    }

    if (!questionActive) {
        return {
            label: 'Not Used',
            tone: 'WARNING',
            note: 'Question inactive',
        };
    }

    return {
        label: 'Active',
        tone: 'ACTIVE',
        note: 'Used in preview',
    };
};
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    hrFeedbackApi,
    type DynamicFormPreview,
    type DynamicPreviewQuestion,
    type QuestionBankItem,
    type QuestionRuleItem,
    type QuestionRulePayload,
} from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import { positionService } from '../../../services/positionService';
import type { FeedbackDepartmentOption, FeedbackTargetEmployee } from '../../../types/feedbackCampaign';
import type { PositionLevelResponse, PositionResponse } from '../../../types/position';
import {
    EVALUATOR_ROLE_OPTIONS,
    getCompetencyLabel,
    getRoleLabel,
    type QuestionRuleRole,
} from './feedbackQuestionConfig.ts';

type RuleRole = QuestionRuleRole;
type FormScopeType = 'DEFAULT' | 'DEPARTMENT' | 'POSITION' | 'SPECIFIC';
type EditableFormScopeType = Exclude<FormScopeType, 'SPECIFIC'>;
type FormStatus = 'ACTIVE' | 'DRAFT' | 'DISABLED' | 'ARCHIVED';

interface LevelOption {
    code: string;
    rank: number;
    label: string;
}

interface FormSegment {
    key: string;
    ruleSetId?: number | null;
    firstRuleId?: number | null;
    name: string;
    description?: string | null;
    status: FormStatus;
    active: boolean;
    scopeType: FormScopeType;
    departmentId?: number | null;
    positionId?: number | null;
    minRank: number;
    maxRank: number;
    roles: RuleRole[];
    questionIds: number[];
    questions: QuestionRuleItem[];
}

interface FormCollection {
    key: string;
    scopeType: EditableFormScopeType;
    scopeId: number | 'default' | string;
    title: string;
    subtitle: string;
    departmentId?: number | null;
    positionId?: number | null;
    segments: FormSegment[];
    roleCounts: Record<RuleRole, number>;
    active: boolean;
}

interface EditorState {
    mode: 'create' | 'edit';
    scopeType: EditableFormScopeType;
    departmentId: number | '';
    positionId: number | '';
    evaluatorRoles: RuleRole[];
    minRank: number;
    maxRank: number;
    status: FormStatus;
    questionIds: number[];
    ruleSetId?: number | null;
    firstRuleId?: number | null;
}

const ROLE_VALUES = EVALUATOR_ROLE_OPTIONS.map(option => option.value);
const EMPTY_ROLE_COUNTS: Record<RuleRole, number> = {
    SELF: 0,
    MANAGER: 0,
    PEER: 0,
    SUBORDINATE: 0,
};

const parseLevelRank = (levelCode?: string | null) => {
    const match = String(levelCode ?? '').match(/(\d+)/);
    return match ? Number(match[1]) : null;
};

const fallbackLevels = (): LevelOption[] => [];

const toLevelOptions = (levels: PositionLevelResponse[]): LevelOption[] => levels
    .filter(level => level.active !== false)
    .map(level => {
        const rank = parseLevelRank(level.levelCode) ?? 0;
        return {
            code: level.levelCode,
            rank,
            label: level.levelCode,
        };
    })
    .filter(level => level.rank > 0)
    .sort((left, right) => left.rank - right.rank);

const normalizeStatus = (status?: string | null, active?: boolean | null): FormStatus => {
    const clean = String(status ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (clean === 'ACTIVE' || clean === 'DRAFT' || clean === 'DISABLED' || clean === 'ARCHIVED') {
        return clean;
    }
    return active === false ? 'DISABLED' : 'ACTIVE';
};

const isRole = (value?: string | null): value is RuleRole =>
    value === 'SELF' || value === 'MANAGER' || value === 'PEER' || value === 'SUBORDINATE';

const inferScopeType = (departmentId?: number | null, positionId?: number | null): FormScopeType => {
    if (departmentId == null && positionId == null) return 'DEFAULT';
    if (departmentId != null && positionId == null) return 'DEPARTMENT';
    if (departmentId == null && positionId != null) return 'POSITION';
    return 'SPECIFIC';
};

const toNumberOrNull = (value: number | '') => (value === '' ? null : Number(value));

const uniqueNumbers = (values: Array<number | null | undefined>) =>
    [...new Set(values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)))];

const uniqueRoles = (values: Array<string | null | undefined>) =>
    [...new Set(values.filter(isRole))];

const levelCodeForRank = (rank: number, levels: LevelOption[]) =>
    levels.find(level => level.rank === rank)?.code ?? `L${String(rank).padStart(2, '0')}`;

const levelLabel = (minRank: number, maxRank: number, levels: LevelOption[]) => {
    const minCode = levelCodeForRank(minRank, levels);
    const maxCode = levelCodeForRank(maxRank, levels);
    return minCode === maxCode ? minCode : `${minCode}–${maxCode}`;
};

const activeLevelSummary = (levels: LevelOption[]) => {
    if (levels.length === 0) return 'No active levels found';
    return levelLabel(levels[0].rank, levels[levels.length - 1].rank, levels);
};

const isUsableQuestion = (question: QuestionBankItem) =>
    question.status === 'ACTIVE'
    && question.responseType === 'RATING_WITH_COMMENT'
    && question.required !== false;

const formScopeLabel = (scopeType: FormScopeType) => ({
    DEFAULT: 'Default Form',
    DEPARTMENT: 'Department Form',
    POSITION: 'Position Form',
    SPECIFIC: 'Legacy Form',
}[scopeType]);

const formatFormSetupError = (error: unknown, fallback: string): string => {
    const raw = error instanceof Error ? error.message : fallback;
    const message = raw || fallback;
    if (/A form already exists/i.test(message)) {
        return 'A form already exists for this evaluator type and scope. Edit the existing form instead.';
    }
    if (/Question rule set not found|Question applicability rule not found/i.test(message)) {
        return 'This form is no longer available. Refresh the page and try again.';
    }
    if (/Only active questions can be used in Form Setup/i.test(message)) {
        return 'Only active rating questions with required comments can be used.';
    }
    if (/generated question rows/i.test(message)) {
        return 'Select at least one question before activating this form.';
    }
    return message;
};

const flattenPreviewQuestions = (preview: DynamicFormPreview | null): DynamicPreviewQuestion[] =>
    preview?.sections?.flatMap(section => section.questions ?? []) ?? [];

const makeSegmentKey = (rule: QuestionRuleItem) => {
    if (rule.ruleSetId != null) return `set-${rule.ruleSetId}`;
    return [
        'legacy',
        rule.targetLevelMinRank,
        rule.targetLevelMaxRank,
        rule.targetDepartmentId ?? 'all-dept',
        rule.targetPositionId ?? 'all-pos',
        rule.evaluatorRelationshipType,
    ].join('|');
};

const buildSegments = (rules: QuestionRuleItem[]): FormSegment[] => {
    const byKey = new Map<string, QuestionRuleItem[]>();
    for (const rule of rules) {
        const key = makeSegmentKey(rule);
        byKey.set(key, [...(byKey.get(key) ?? []), rule]);
    }

    return [...byKey.entries()].map(([key, groupedRules]) => {
        const first = groupedRules[0];
        const roles = uniqueRoles(groupedRules.map(rule => rule.evaluatorRelationshipType));
        const questionIds = uniqueNumbers(groupedRules.map(rule => rule.questionBankId));
        const status = normalizeStatus(first.ruleSetStatus, first.active);
        const scopeType = inferScopeType(first.targetDepartmentId, first.targetPositionId);
        return {
            key,
            ruleSetId: first.ruleSetId,
            firstRuleId: first.id,
            name: first.ruleSetName?.trim() || formScopeLabel(scopeType),
            description: first.ruleSetDescription ?? null,
            status,
            active: status === 'ACTIVE' && groupedRules.some(rule => rule.active),
            scopeType,
            departmentId: first.targetDepartmentId ?? null,
            positionId: first.targetPositionId ?? null,
            minRank: first.targetLevelMinRank,
            maxRank: first.targetLevelMaxRank,
            roles,
            questionIds,
            questions: groupedRules,
        } satisfies FormSegment;
    }).sort((left, right) => {
        const scopeDiff = ['DEFAULT', 'DEPARTMENT', 'POSITION', 'SPECIFIC'].indexOf(left.scopeType)
            - ['DEFAULT', 'DEPARTMENT', 'POSITION', 'SPECIFIC'].indexOf(right.scopeType);
        if (scopeDiff !== 0) return scopeDiff;
        if (left.status !== right.status) return left.status === 'ACTIVE' ? -1 : 1;
        return left.name.localeCompare(right.name);
    });
};

const buildCollections = (
    segments: FormSegment[],
    departments: FeedbackDepartmentOption[],
    positions: PositionResponse[],
): FormCollection[] => {
    const getDepartmentName = (id?: number | null) => departments.find(department => department.id === id)?.name ?? `Department #${id}`;
    const getPositionName = (id?: number | null) => positions.find(position => position.id === id)?.positionTitle ?? `Position #${id}`;
    const byKey = new Map<string, FormCollection>();

    const ensureCollection = (segment: FormSegment) => {
        if (segment.scopeType === 'SPECIFIC') return null;
        const scopeId = segment.scopeType === 'DEFAULT'
            ? 'default'
            : segment.scopeType === 'DEPARTMENT'
                ? segment.departmentId ?? 'unknown-department'
                : segment.positionId ?? 'unknown-position';
        const key = `${segment.scopeType}-${scopeId}`;
        const existing = byKey.get(key);
        if (existing) return existing;

        const title = segment.scopeType === 'DEFAULT'
            ? 'Default Form'
            : segment.scopeType === 'DEPARTMENT'
                ? `${getDepartmentName(segment.departmentId)} Form`
                : `${getPositionName(segment.positionId)} Form`;
        const subtitle = segment.scopeType === 'DEFAULT'
            ? 'Applies to all active departments, positions, and levels.'
            : segment.scopeType === 'DEPARTMENT'
                ? 'Used for employees in this department unless a position form is available.'
                : 'Used first for employees in this position.';

        const next: FormCollection = {
            key,
            scopeType: segment.scopeType,
            scopeId,
            title,
            subtitle,
            departmentId: segment.departmentId ?? null,
            positionId: segment.positionId ?? null,
            segments: [],
            roleCounts: { ...EMPTY_ROLE_COUNTS },
            active: false,
        };
        byKey.set(key, next);
        return next;
    };

    for (const segment of segments) {
        if (segment.scopeType === 'SPECIFIC' || segment.questionIds.length === 0) {
            continue;
        }
        const collection = ensureCollection(segment);
        if (!collection) continue;
        collection.segments.push(segment);
        if (segment.active) collection.active = true;
        for (const role of segment.roles) {
            const roleQuestionIds = uniqueNumbers(
                segment.questions
                    .filter(rule => rule.evaluatorRelationshipType === role)
                    .map(rule => rule.questionBankId),
            );
            collection.roleCounts[role] = Math.max(collection.roleCounts[role], roleQuestionIds.length);
        }
    }

    return [...byKey.values()].sort((left, right) => {
        const scopeOrder = ['DEFAULT', 'DEPARTMENT', 'POSITION'];
        const scopeDiff = scopeOrder.indexOf(left.scopeType) - scopeOrder.indexOf(right.scopeType);
        if (scopeDiff !== 0) return scopeDiff;
        return left.title.localeCompare(right.title);
    });
};

const findSegmentForRole = (collection: FormCollection, role: RuleRole) =>
    collection.segments
        .filter(segment => segment.roles.includes(role) && segment.questionIds.length > 0)
        .sort((left, right) => {
            if (left.active !== right.active) return left.active ? -1 : 1;
            const leftRoleCount = uniqueNumbers(
                left.questions
                    .filter(rule => rule.evaluatorRelationshipType === role)
                    .map(rule => rule.questionBankId),
            ).length;
            const rightRoleCount = uniqueNumbers(
                right.questions
                    .filter(rule => rule.evaluatorRelationshipType === role)
                    .map(rule => rule.questionBankId),
            ).length;
            return rightRoleCount - leftRoleCount;
        })[0] ?? null;

const getSegmentRoleQuestionIds = (segment: FormSegment | null, role: RuleRole) =>
    segment
        ? uniqueNumbers(
            segment.questions
                .filter(rule => rule.evaluatorRelationshipType === role)
                .map(rule => rule.questionBankId),
        )
        : [];

const getCollectionRoleCount = (collection: FormCollection, role: RuleRole) =>
    getSegmentRoleQuestionIds(findSegmentForRole(collection, role), role).length;

const firstMissingRole = (collection: FormCollection): RuleRole =>
    ROLE_VALUES.find(role => getCollectionRoleCount(collection, role) === 0) ?? 'MANAGER';

const collectionDisplayRoles = (collection: FormCollection): RuleRole[] => {
    if (collection.scopeType === 'DEFAULT') return ROLE_VALUES;
    return ROLE_VALUES.filter(role => getCollectionRoleCount(collection, role) > 0 || findSegmentForRole(collection, role));
};

const buildFormName = (editor: EditorState, departments: FeedbackDepartmentOption[], positions: PositionResponse[]) => {
    const roleLabel = editor.evaluatorRoles.length === 1
        ? getRoleLabel(editor.evaluatorRoles[0])
        : 'Evaluator';
    if (editor.scopeType === 'DEPARTMENT') {
        const departmentName = departments.find(department => department.id === editor.departmentId)?.name ?? 'Department';
        return `${departmentName} ${roleLabel} Form`;
    }
    if (editor.scopeType === 'POSITION') {
        const positionName = positions.find(position => position.id === editor.positionId)?.positionTitle ?? 'Position';
        return `${positionName} ${roleLabel} Form`;
    }
    return `Default ${roleLabel} Form`;
};

const createPayload = (
    editor: EditorState,
    departments: FeedbackDepartmentOption[],
    positions: PositionResponse[],
): QuestionRulePayload => ({
    ruleSetName: buildFormName(editor, departments, positions),
    ruleSetDescription: null,
    ruleSetStatus: editor.status,
    questionBankIds: editor.questionIds,
    targetLevelMinRank: Math.min(editor.minRank, editor.maxRank),
    targetLevelMaxRank: Math.max(editor.minRank, editor.maxRank),
    targetDepartmentId: editor.scopeType === 'DEPARTMENT' ? toNumberOrNull(editor.departmentId) : null,
    targetPositionId: editor.scopeType === 'POSITION' ? toNumberOrNull(editor.positionId) : null,
    evaluatorRelationshipTypes: editor.evaluatorRoles,
    displayOrder: 1,
    rulePriority: 100,
    active: editor.status === 'ACTIVE',
});

export default function QuestionRulesTab() {
    const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
    const [rules, setRules] = useState<QuestionRuleItem[]>([]);
    const [departments, setDepartments] = useState<FeedbackDepartmentOption[]>([]);
    const [positions, setPositions] = useState<PositionResponse[]>([]);
    const [employees, setEmployees] = useState<FeedbackTargetEmployee[]>([]);
    const [levels, setLevels] = useState<LevelOption[]>(fallbackLevels());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editor, setEditor] = useState<EditorState | null>(null);
    const [questionSearch, setQuestionSearch] = useState('');
    const [competencyFilter, setCompetencyFilter] = useState('ALL');
    const [previewRole, setPreviewRole] = useState<RuleRole>('MANAGER');
    const [previewDepartmentId, setPreviewDepartmentId] = useState<number | ''>('');
    const [previewPositionId, setPreviewPositionId] = useState<number | ''>('');
    const [previewLevelRank, setPreviewLevelRank] = useState(1);
    const [preview, setPreview] = useState<DynamicFormPreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const minRank = levels[0]?.rank ?? 1;
    const maxRank = levels[levels.length - 1]?.rank ?? 1;

    const loadData = async () => {
        setLoading(true);
        try {
            const [questionItems, ruleItems, departmentItems, positionItems, employeeItems, levelItems] = await Promise.all([
                hrFeedbackApi.getQuestionBank(),
                hrFeedbackApi.getQuestionRules(),
                feedbackCampaignApi.getDepartments(),
                positionService.getPositions(),
                feedbackCampaignApi.getEmployees(),
                positionService.getPositionLevels(),
            ]);
            const nextLevels = toLevelOptions(levelItems);
            const activePositions = positionItems.filter(position => position.status !== false);
            setQuestions(questionItems);
            setRules(ruleItems);
            setDepartments(departmentItems);
            setPositions(activePositions);
            setEmployees(employeeItems);
            setLevels(nextLevels);
            setPreviewLevelRank(nextLevels[0]?.rank ?? 1);
        } catch (error) {
            toast.error(formatFormSetupError(error, 'Could not load Form Setup.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const activeQuestions = useMemo(
        () => questions.filter(isUsableQuestion).sort((left, right) => {
            const competencyDiff = getCompetencyLabel(left.competencyCode).localeCompare(getCompetencyLabel(right.competencyCode));
            if (competencyDiff !== 0) return competencyDiff;
            return left.questionText.localeCompare(right.questionText);
        }),
        [questions],
    );

    const positionByTitle = useMemo(() => {
        const map = new Map<string, PositionResponse>();
        for (const position of positions) {
            map.set(position.positionTitle.trim().toLowerCase(), position);
        }
        return map;
    }, [positions]);

    const positionById = useMemo(() => new Map(positions.map(position => [position.id, position])), [positions]);
    const levelByRank = useMemo(() => new Map(levels.map(level => [level.rank, level])), [levels]);

    const departmentPositionIds = useMemo(() => {
        const map = new Map<number, Set<number>>();
        for (const employee of employees) {
            if (employee.currentDepartmentId == null || !employee.positionTitle) continue;
            const position = positionByTitle.get(employee.positionTitle.trim().toLowerCase());
            if (!position) continue;
            if (!map.has(employee.currentDepartmentId)) map.set(employee.currentDepartmentId, new Set<number>());
            map.get(employee.currentDepartmentId)?.add(position.id);
        }
        return map;
    }, [employees, positionByTitle]);

    const getDepartmentPositions = (departmentId: number | ''): PositionResponse[] => {
        if (departmentId === '') return [];
        const ids = departmentPositionIds.get(Number(departmentId));
        if (!ids) return [];
        return [...ids]
            .map(id => positionById.get(id))
            .filter((position): position is PositionResponse => Boolean(position))
            .sort((left, right) => left.positionTitle.localeCompare(right.positionTitle));
    };

    const getDepartmentLevels = (departmentId: number | ''): LevelOption[] => {
        const ranks = new Set<number>();
        for (const position of getDepartmentPositions(departmentId)) {
            const rank = parseLevelRank(position.levelCode);
            if (rank != null) ranks.add(rank);
        }
        return [...ranks]
            .map(rank => levelByRank.get(rank) ?? { code: `L${String(rank).padStart(2, '0')}`, rank, label: `L${String(rank).padStart(2, '0')}` })
            .sort((left, right) => left.rank - right.rank);
    };

    const getPositionLevel = (positionId: number | ''): LevelOption | null => {
        if (positionId === '') return null;
        const position = positionById.get(Number(positionId));
        const rank = parseLevelRank(position?.levelCode);
        if (rank == null) return null;
        return levelByRank.get(rank) ?? { code: position?.levelCode ?? `L${String(rank).padStart(2, '0')}`, rank, label: position?.levelCode ?? `L${String(rank).padStart(2, '0')}` };
    };

    const segments = useMemo(() => buildSegments(rules), [rules]);
    const collections = useMemo(() => buildCollections(segments, departments, positions), [segments, departments, positions]);

    const defaultCollection = collections.find(collection => collection.scopeType === 'DEFAULT');
    const departmentCollections = collections.filter(collection => collection.scopeType === 'DEPARTMENT');
    const positionCollections = collections.filter(collection => collection.scopeType === 'POSITION');

    const competencyOptions = useMemo(
        () => [...new Set(activeQuestions.map(question => question.competencyCode).filter(Boolean))]
            .sort((left, right) => getCompetencyLabel(left).localeCompare(getCompetencyLabel(right))),
        [activeQuestions],
    );

    const filteredQuestions = useMemo(() => {
        const search = questionSearch.trim().toLowerCase();
        return activeQuestions.filter(question => {
            const competencyMatch = competencyFilter === 'ALL' || question.competencyCode === competencyFilter;
            const text = `${question.questionCode ?? ''} ${question.questionText} ${getCompetencyLabel(question.competencyCode)}`.toLowerCase();
            const searchMatch = !search || text.includes(search);
            return competencyMatch && searchMatch;
        });
    }, [activeQuestions, competencyFilter, questionSearch]);

    const selectedQuestionMap = useMemo(
        () => new Map(questions.map(question => [question.id, question])),
        [questions],
    );

    const previewQuestions = useMemo(() => flattenPreviewQuestions(preview), [preview]);

    const previewPositionOptions = useMemo(() => {
        if (previewDepartmentId === '') return positions;
        return getDepartmentPositions(previewDepartmentId);
    }, [positions, previewDepartmentId, departmentPositionIds]);

    const workspacePreviewSource = useMemo(() => {
        const matchingPosition = previewPositionId !== ''
            ? positionCollections.find(collection => collection.positionId === previewPositionId && getCollectionRoleCount(collection, previewRole) > 0)
            : undefined;
        if (matchingPosition) return { title: matchingPosition.title, reason: 'A position form will be used for this evaluator type.' };

        const matchingDepartment = previewDepartmentId !== ''
            ? departmentCollections.find(collection => collection.departmentId === previewDepartmentId && getCollectionRoleCount(collection, previewRole) > 0)
            : undefined;
        if (matchingDepartment) return { title: matchingDepartment.title, reason: 'No position form was found, so the department form will be used.' };

        return {
            title: defaultCollection?.title ?? 'Default Form',
            reason: 'No position or department form was found, so the default form will be used.',
        };
    }, [defaultCollection?.title, departmentCollections, positionCollections, previewDepartmentId, previewPositionId, previewRole]);

    const openCreateEditor = (scopeType: EditableFormScopeType) => {
        setQuestionSearch('');
        setCompetencyFilter('ALL');
        const firstDepartmentId = scopeType === 'DEPARTMENT' && departments.length === 1 ? departments[0].id : '';
        const firstPositionId = scopeType === 'POSITION' && positions.length === 1 ? positions[0].id : '';
        const positionLevel = getPositionLevel(firstPositionId);
        const departmentLevels = getDepartmentLevels(firstDepartmentId);
        const startRank = scopeType === 'POSITION' && positionLevel
            ? positionLevel.rank
            : scopeType === 'DEPARTMENT' && departmentLevels.length > 0
                ? departmentLevels[0].rank
                : minRank;
        const endRank = scopeType === 'POSITION' && positionLevel
            ? positionLevel.rank
            : scopeType === 'DEPARTMENT' && departmentLevels.length > 0
                ? departmentLevels[departmentLevels.length - 1].rank
                : maxRank;
        setEditor({
            mode: 'create',
            scopeType,
            departmentId: firstDepartmentId,
            positionId: firstPositionId,
            evaluatorRoles: ['MANAGER'],
            minRank: startRank,
            maxRank: endRank,
            status: 'ACTIVE',
            questionIds: [],
        });
    };

    const openAddEvaluatorEditor = (collection: FormCollection) => {
        const role = firstMissingRole(collection);
        setQuestionSearch('');
        setCompetencyFilter('ALL');
        const departmentLevels = getDepartmentLevels(collection.departmentId ?? '');
        const positionLevel = getPositionLevel(collection.positionId ?? '');
        setEditor({
            mode: 'create',
            scopeType: collection.scopeType,
            departmentId: collection.departmentId ?? '',
            positionId: collection.positionId ?? '',
            evaluatorRoles: [role],
            minRank: collection.scopeType === 'POSITION' && positionLevel
                ? positionLevel.rank
                : collection.scopeType === 'DEPARTMENT' && departmentLevels.length > 0
                    ? departmentLevels[0].rank
                    : minRank,
            maxRank: collection.scopeType === 'POSITION' && positionLevel
                ? positionLevel.rank
                : collection.scopeType === 'DEPARTMENT' && departmentLevels.length > 0
                    ? departmentLevels[departmentLevels.length - 1].rank
                    : maxRank,
            status: 'ACTIVE',
            questionIds: [],
        });
    };

    const openEditEditor = (collection: FormCollection, role: RuleRole) => {
        const segment = findSegmentForRole(collection, role);
        const roleQuestionIds = getSegmentRoleQuestionIds(segment, role);
        const departmentLevels = getDepartmentLevels(collection.departmentId ?? '');
        const positionLevel = getPositionLevel(collection.positionId ?? '');
        setQuestionSearch('');
        setCompetencyFilter('ALL');
        setEditor({
            mode: segment ? 'edit' : 'create',
            scopeType: collection.scopeType,
            departmentId: collection.departmentId ?? '',
            positionId: collection.positionId ?? '',
            evaluatorRoles: [role],
            minRank: collection.scopeType === 'POSITION' && positionLevel
                ? positionLevel.rank
                : collection.scopeType === 'DEPARTMENT' && departmentLevels.length > 0
                    ? departmentLevels[0].rank
                    : minRank,
            maxRank: collection.scopeType === 'POSITION' && positionLevel
                ? positionLevel.rank
                : collection.scopeType === 'DEPARTMENT' && departmentLevels.length > 0
                    ? departmentLevels[departmentLevels.length - 1].rank
                    : maxRank,
            status: segment?.status ?? 'ACTIVE',
            questionIds: roleQuestionIds,
            ruleSetId: segment?.ruleSetId ?? null,
            firstRuleId: segment?.firstRuleId ?? null,
        });
    };

    const toggleEditorRole = (role: RuleRole) => {
        setEditor(current => current ? { ...current, evaluatorRoles: [role] } : current);
    };

    const toggleQuestion = (questionId: number) => {
        setEditor(current => {
            if (!current) return current;
            const exists = current.questionIds.includes(questionId);
            return {
                ...current,
                questionIds: exists
                    ? current.questionIds.filter(id => id !== questionId)
                    : [...current.questionIds, questionId],
            };
        });
    };

    const updateEditorDepartment = (value: number | '') => {
        const departmentLevels = getDepartmentLevels(value);
        setEditor(current => current ? {
            ...current,
            departmentId: value,
            minRank: departmentLevels[0]?.rank ?? current.minRank,
            maxRank: departmentLevels[departmentLevels.length - 1]?.rank ?? current.maxRank,
        } : current);
    };

    const updateEditorPosition = (value: number | '') => {
        const positionLevel = getPositionLevel(value);
        setEditor(current => current ? {
            ...current,
            positionId: value,
            minRank: positionLevel?.rank ?? current.minRank,
            maxRank: positionLevel?.rank ?? current.maxRank,
        } : current);
    };

    const validateEditor = (current: EditorState): boolean => {
        if (current.evaluatorRoles.length === 0) {
            toast.error('Choose an evaluator type.');
            return false;
        }
        if (current.questionIds.length === 0) {
            toast.error('Select at least one active rating question.');
            return false;
        }
        if (current.scopeType === 'DEPARTMENT') {
            if (current.departmentId === '') {
                toast.error('Choose a department.');
                return false;
            }
            const departmentLevels = getDepartmentLevels(current.departmentId);
            if (departmentLevels.length === 0) {
                toast.error('No active positions were found for this department.');
                return false;
            }
        }
        if (current.scopeType === 'POSITION') {
            if (current.positionId === '') {
                toast.error('Choose a position.');
                return false;
            }
            const positionLevel = getPositionLevel(current.positionId);
            if (!positionLevel) {
                toast.error('This position does not have a valid active level.');
                return false;
            }
        }
        return true;
    };

    const saveEditor = async () => {
        if (!editor || !validateEditor(editor)) return;
        setSaving(true);
        try {
            const normalizedEditor = { ...editor };
            if (normalizedEditor.scopeType === 'DEFAULT') {
                normalizedEditor.minRank = minRank;
                normalizedEditor.maxRank = maxRank;
            }
            if (normalizedEditor.scopeType === 'DEPARTMENT') {
                const departmentLevels = getDepartmentLevels(normalizedEditor.departmentId);
                if (departmentLevels.length > 0) {
                    normalizedEditor.minRank = departmentLevels[0].rank;
                    normalizedEditor.maxRank = departmentLevels[departmentLevels.length - 1].rank;
                }
            }
            if (normalizedEditor.scopeType === 'POSITION') {
                const positionLevel = getPositionLevel(normalizedEditor.positionId);
                if (positionLevel) {
                    normalizedEditor.minRank = positionLevel.rank;
                    normalizedEditor.maxRank = positionLevel.rank;
                }
            }
            const payload = createPayload(normalizedEditor, departments, positions);
            if (editor.ruleSetId != null) {
                await hrFeedbackApi.updateQuestionRuleSet(editor.ruleSetId, payload);
            } else {
                await hrFeedbackApi.createQuestionRule(payload);
            }
            setEditor(null);
            toast.success('Form saved.');
            await loadData();
        } catch (error) {
            toast.error(formatFormSetupError(error, 'Could not save this form.'));
        } finally {
            setSaving(false);
        }
    };

    const updateSegmentStatus = async (segment: FormSegment, active: boolean) => {
        if (!segment.firstRuleId || segment.questionIds.length === 0) return;
        try {
            if (active) {
                await hrFeedbackApi.activateQuestionRule(segment.firstRuleId);
                toast.success('Form activated.');
            } else {
                await hrFeedbackApi.deactivateQuestionRule(segment.firstRuleId);
                toast.success('Form disabled.');
            }
            await loadData();
        } catch (error) {
            toast.error(formatFormSetupError(error, 'Could not update form status.'));
        }
    };

    const runLivePreview = async () => {
        setPreviewLoading(true);
        try {
            const positionLevel = getPositionLevel(previewPositionId);
            const departmentLevels = getDepartmentLevels(previewDepartmentId);
            const levelRank = positionLevel?.rank ?? departmentLevels[0]?.rank ?? levels[0]?.rank ?? previewLevelRank;
            const result = await hrFeedbackApi.previewDynamicForm({
                levelCode: levelCodeForRank(levelRank, levels),
                relationshipType: previewRole,
                targetDepartmentId: toNumberOrNull(previewDepartmentId),
                targetPositionId: toNumberOrNull(previewPositionId),
            });
            setPreview(result);
        } catch (error) {
            toast.error(formatFormSetupError(error, 'Could not generate live preview.'));
        } finally {
            setPreviewLoading(false);
        }
    };

    const clearLivePreview = () => {
        setPreview(null);
        setPreviewDepartmentId('');
        setPreviewPositionId('');
        setPreviewRole('MANAGER');
        setPreviewLevelRank(levels[0]?.rank ?? 1);
    };

    const renderCollectionCard = (collection: FormCollection) => {
        const rolesToShow = collectionDisplayRoles(collection);
        const missingRoleCount = ROLE_VALUES.filter(role => getCollectionRoleCount(collection, role) === 0).length;
        return (
            <article key={collection.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">{collection.title}</h3>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${collection.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                                {collection.active ? 'Active' : 'Not active'}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{collection.subtitle}</p>
                    </div>
                    {missingRoleCount > 0 && (
                        <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                            onClick={() => openAddEvaluatorEditor(collection)}
                        >
                            <i className="bi bi-plus-circle" /> Add evaluator form
                        </button>
                    )}
                </div>

                {rolesToShow.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        No evaluator form has been created for this scope yet.
                    </div>
                ) : (
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {rolesToShow.map(role => {
                            const segment = findSegmentForRole(collection, role);
                            const count = getCollectionRoleCount(collection, role);
                            return (
                                <div key={role} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-slate-700">{getRoleLabel(role)} Form</span>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {count > 0 ? 'Ready' : 'Not set'}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p>
                                    <p className="text-xs text-slate-500">rating questions</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50"
                                            onClick={() => openEditEditor(collection, role)}
                                        >
                                            {count > 0 ? 'Edit' : 'Create'}
                                        </button>
                                        {segment && segment.questionIds.length > 0 && (
                                            <button
                                                type="button"
                                                className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                                                onClick={() => void updateSegmentStatus(segment, !segment.active)}
                                            >
                                                {segment.active ? 'Disable' : 'Activate'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </article>
        );
    };

    const renderSection = (title: string, eyebrow: string, description: string, items: FormCollection[], createType: EditableFormScopeType, icon: string) => {
        const canCreate = createType !== 'DEFAULT' || items.length === 0;
        return (
            <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">{eyebrow}</p>
                        <h2 className="mt-1 text-xl font-bold text-slate-950">{title}</h2>
                        <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>
                    </div>
                    {canCreate && (
                        <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                            onClick={() => openCreateEditor(createType)}
                        >
                            <i className={`bi ${icon}`} /> Create {formScopeLabel(createType)}
                        </button>
                    )}
                </div>
                {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                        <i className={`bi ${icon} text-3xl text-blue-500`} />
                        <h3 className="mt-3 text-base font-semibold text-slate-900">No {title.toLowerCase()} yet</h3>
                        <p className="mt-1 text-sm text-slate-500">Create one only when this scope needs its own form.</p>
                    </div>
                ) : (
                    <div className="space-y-4">{items.map(renderCollectionCard)}</div>
                )}
            </section>
        );
    };

    const renderEditorScopeFields = () => {
        if (!editor) return null;
        const departmentLevels = getDepartmentLevels(editor.departmentId);
        const positionLevel = getPositionLevel(editor.positionId);
        return (
            <>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                    <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Form type</span>
                    <strong className="mt-1 block text-slate-900">{formScopeLabel(editor.scopeType)}</strong>
                </div>
                {editor.scopeType === 'DEPARTMENT' && (
                    <>
                        <label className="block text-sm font-semibold text-slate-700">
                            Department
                            <select
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                value={editor.departmentId}
                                onChange={(event) => updateEditorDepartment(event.target.value === '' ? '' : Number(event.target.value))}
                            >
                                <option value="">Choose department</option>
                                {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                            </select>
                        </label>
                        {editor.departmentId !== '' && (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600">
                                <strong className="block text-slate-800">Available levels in this department</strong>
                                {departmentLevels.length > 0 ? (
                                    <span>{departmentLevels.map(level => level.code).join(', ')}</span>
                                ) : (
                                    <span>No active positions found for this department.</span>
                                )}
                            </div>
                        )}
                        {departmentLevels.length > 0 && (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                                <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Form applies to</span>
                                <strong className="mt-1 block text-slate-900">All active positions and levels in this department.</strong>
                            </div>
                        )}
                    </>
                )}
                {editor.scopeType === 'POSITION' && (
                    <>
                        <label className="block text-sm font-semibold text-slate-700">
                            Position
                            <select
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                value={editor.positionId}
                                onChange={(event) => updateEditorPosition(event.target.value === '' ? '' : Number(event.target.value))}
                            >
                                <option value="">Choose position</option>
                                {positions.map(position => <option key={position.id} value={position.id}>{position.positionTitle}</option>)}
                            </select>
                        </label>
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Position level</span>
                            <strong className="mt-1 block text-slate-900">{positionLevel?.code ?? 'Choose a position'}</strong>
                        </div>
                    </>
                )}
                {editor.scopeType === 'DEFAULT' && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                        <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Form applies to</span>
                        <strong className="mt-1 block text-slate-900">Applies to all active departments, positions, and levels.</strong>
                        {levels.length > 0 && (
                            <span className="mt-1 block text-xs text-slate-500">Current active level coverage: {activeLevelSummary(levels)}</span>
                        )}
                    </div>
                )}
            </>
        );
    };

    if (loading) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-600">
                <i className="bi bi-arrow-repeat mr-2 animate-spin" /> Loading Form Setup...
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-slate-50/60 p-4 sm:p-6">
            <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-6 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.26em] text-blue-600">360 Feedback</p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-950">Form Setup</h1>
                        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                            Prepare the evaluator forms used by campaigns. Position forms are used first, then department forms, then the default form.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl bg-white/80 p-4 text-center shadow-sm ring-1 ring-blue-100">
                            <strong className="block text-2xl text-slate-950">{defaultCollection ? 1 : 0}</strong>
                            <span className="text-xs font-semibold text-slate-500">Default</span>
                        </div>
                        <div className="rounded-2xl bg-white/80 p-4 text-center shadow-sm ring-1 ring-blue-100">
                            <strong className="block text-2xl text-slate-950">{departmentCollections.length}</strong>
                            <span className="text-xs font-semibold text-slate-500">Departments</span>
                        </div>
                        <div className="rounded-2xl bg-white/80 p-4 text-center shadow-sm ring-1 ring-blue-100">
                            <strong className="block text-2xl text-slate-950">{positionCollections.length}</strong>
                            <span className="text-xs font-semibold text-slate-500">Positions</span>
                        </div>
                        <div className="rounded-2xl bg-white/80 p-4 text-center shadow-sm ring-1 ring-blue-100">
                            <strong className="block text-2xl text-slate-950">{activeQuestions.length}</strong>
                            <span className="text-xs font-semibold text-slate-500">Questions</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-8">
                    {renderSection(
                        'Default Form',
                        'Default Form',
                        'This form applies to all active departments, positions, and levels.',
                        defaultCollection ? [defaultCollection] : [],
                        'DEFAULT',
                        'bi-ui-checks',
                    )}
                    {renderSection(
                        'Department Forms',
                        'Department Forms',
                        'Create one only when a department needs its own full evaluator form.',
                        departmentCollections,
                        'DEPARTMENT',
                        'bi-building',
                    )}
                    {renderSection(
                        'Position Forms',
                        'Position Forms',
                        'Create one only when a position needs its own full evaluator form.',
                        positionCollections,
                        'POSITION',
                        'bi-person-badge',
                    )}
                </div>

                <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm 2xl:sticky 2xl:top-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Live Preview</p>
                            <h2 className="mt-1 text-xl font-bold text-slate-950">Check final questions</h2>
                            <p className="mt-1 text-sm text-slate-500">Preview the form chosen for a target employee profile.</p>
                        </div>
                        <i className="bi bi-eye rounded-2xl bg-blue-50 p-3 text-blue-600" />
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-1">
                        <label className="block text-sm font-semibold text-slate-700">
                            Department
                            <select
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                value={previewDepartmentId}
                                onChange={(event) => {
                                    const nextDepartmentId = event.target.value === '' ? '' : Number(event.target.value);
                                    setPreviewDepartmentId(nextDepartmentId);
                                    setPreview(null);
                                    if (nextDepartmentId !== '' && previewPositionId !== '') {
                                        const allowed = getDepartmentPositions(nextDepartmentId).some(position => position.id === previewPositionId);
                                        if (!allowed) setPreviewPositionId('');
                                    }
                                }}
                            >
                                <option value="">No department selected</option>
                                {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                            </select>
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">
                            Position
                            <select
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                value={previewPositionId}
                                onChange={(event) => {
                                    const value = event.target.value === '' ? '' : Number(event.target.value);
                                    setPreviewPositionId(value);
                                    setPreview(null);
                                    const positionLevel = getPositionLevel(value);
                                    if (positionLevel) setPreviewLevelRank(positionLevel.rank);
                                }}
                            >
                                <option value="">No position selected</option>
                                {previewPositionOptions.map(position => <option key={position.id} value={position.id}>{position.positionTitle}</option>)}
                            </select>
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">
                            Evaluator form
                            <select
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                value={previewRole}
                                onChange={(event) => {
                                    setPreviewRole(event.target.value as RuleRole);
                                    setPreview(null);
                                }}
                            >
                                {ROLE_VALUES.map(role => <option key={role} value={role}>{getRoleLabel(role)}</option>)}
                            </select>
                        </label>
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                disabled={previewLoading}
                                onClick={() => void runLivePreview()}
                            >
                                {previewLoading ? 'Generating...' : 'Preview'}
                            </button>
                            <button
                                type="button"
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                onClick={clearLivePreview}
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                        <strong className="text-sm text-slate-900">{workspacePreviewSource.title}</strong>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{workspacePreviewSource.reason}</p>
                    </div>

                    <div className="mt-5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">Final questions</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{preview?.totalQuestions ?? previewQuestions.length}</span>
                        </div>
                        {previewQuestions.length === 0 ? (
                            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                                Run preview to see the final evaluator form.
                            </div>
                        ) : (
                            <div className="mt-3 max-h-[460px] space-y-2 overflow-y-auto pr-1">
                                {previewQuestions.map((question, index) => (
                                    <article key={`${question.questionCode}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <span className="text-xs font-bold text-blue-600">{index + 1}. {getCompetencyLabel(question.competencyCode)}</span>
                                        <p className="mt-1 text-sm font-medium text-slate-800">{question.questionText}</p>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {editor && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">{formScopeLabel(editor.scopeType)}</p>
                                <h2 className="mt-1 text-2xl font-bold text-slate-950">{editor.mode === 'edit' ? 'Edit Form' : 'Create Form'}</h2>
                                <p className="mt-1 text-sm text-slate-500">Choose active rating questions with required comments.</p>
                            </div>
                            <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={() => setEditor(null)}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
                            <aside className="space-y-4 overflow-y-auto border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
                                {renderEditorScopeFields()}
                                <label className="block text-sm font-semibold text-slate-700">
                                    Status
                                    <select
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                        value={editor.status}
                                        onChange={(event) => setEditor(current => current ? { ...current, status: event.target.value as FormStatus } : current)}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="DISABLED">Disabled</option>
                                    </select>
                                </label>
                                <div>
                                    <span className="text-sm font-semibold text-slate-700">Evaluator form</span>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {ROLE_VALUES.map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${editor.evaluatorRoles.includes(role) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                onClick={() => toggleEditorRole(role)}
                                            >
                                                {getRoleLabel(role)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </aside>

                            <main className="min-h-0 space-y-5 overflow-y-auto p-5">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                                    <input
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                                        value={questionSearch}
                                        onChange={(event) => setQuestionSearch(event.target.value)}
                                        placeholder="Search active rating questions..."
                                    />
                                    <select
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                        value={competencyFilter}
                                        onChange={(event) => setCompetencyFilter(event.target.value)}
                                    >
                                        <option value="ALL">All competencies</option>
                                        {competencyOptions.map(competency => <option key={competency} value={competency}>{getCompetencyLabel(competency)}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                                    <section>
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Question Bank</h3>
                                            <span className="text-xs font-semibold text-slate-400">{filteredQuestions.length} available</span>
                                        </div>
                                        <div className="max-h-[430px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                                            {filteredQuestions.map(question => {
                                                const selected = editor.questionIds.includes(question.id);
                                                return (
                                                    <button
                                                        key={question.id}
                                                        type="button"
                                                        className={`relative w-full rounded-2xl border p-3 pr-12 text-left transition ${selected ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/50'}`}
                                                        onClick={() => toggleQuestion(question.id)}
                                                    >
                                                        {selected && (
                                                            <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                                                                <i className="bi bi-check-lg" />
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-bold text-blue-600">{getCompetencyLabel(question.competencyCode)}</span>
                                                        <p className="mt-1 text-sm font-semibold text-slate-800">{question.questionText}</p>
                                                        <small className="mt-2 block text-xs text-slate-500">{question.questionCode ?? `Question #${question.id}`} · Rating 1–5 + required comment</small>
                                                    </button>
                                                );
                                            })}
                                            {filteredQuestions.length === 0 && (
                                                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                                                    No active rating questions found.
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section>
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Selected Questions</h3>
                                            <span className="text-xs font-semibold text-slate-400">{editor.questionIds.length} selected</span>
                                        </div>
                                        <div className="max-h-[430px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                                            {editor.questionIds.map((questionId, index) => {
                                                const question = selectedQuestionMap.get(questionId);
                                                return (
                                                    <article key={questionId} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <strong className="block text-sm text-slate-900">{question?.questionText ?? `Question #${questionId}`}</strong>
                                                            <small className="mt-1 block text-xs text-slate-500">{getCompetencyLabel(question?.competencyCode)}</small>
                                                        </div>
                                                        <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => toggleQuestion(questionId)}>
                                                            <i className="bi bi-trash" />
                                                        </button>
                                                    </article>
                                                );
                                            })}
                                            {editor.questionIds.length === 0 && (
                                                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                                                    Select questions from the question bank.
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </main>
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-end">
                            <button type="button" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setEditor(null)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                disabled={saving}
                                onClick={() => void saveEditor()}
                            >
                                {saving ? 'Saving...' : 'Save Form'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useEffect, useMemo, useState } from 'react';
import '../hr-feedback-dashboard.css';
import {
    hrFeedbackApi,
    type QuestionBankItem,
    type QuestionRuleItem,
    type QuestionRulePayload,
} from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import { positionService } from '../../../services/positionService';
import type { FeedbackDepartmentOption, FeedbackTargetCandidate } from '../../../types/feedbackCampaign';
import type { PositionResponse } from '../../../types/position';
import {
    EVALUATOR_ROLE_OPTIONS,
    LEVEL_OPTIONS,
    getCompetencyLabel,
    getRoleLabel,
    normalizeText,
    type QuestionRuleRole,
} from './feedbackQuestionConfig.ts';

type RuleRole = QuestionRuleRole;
type RuleSetStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
type StatusFilter = 'ALL' | RuleSetStatus;

interface RuleSetFormState {
    ruleSetName: string;
    ruleSetDescription: string;
    questionBankIds: number[];
    targetLevelMinRank: number;
    targetLevelMaxRank: number;
    evaluatorRoles: RuleRole[];
    targetDepartmentId: number | '';
    targetPositionId: number | '';
    ruleSetStatus: RuleSetStatus;
    active: boolean;
}

interface RuleSetGroup {
    key: string;
    ruleSetId?: number | null;
    ruleSetName?: string | null;
    ruleSetDescription?: string | null;
    rules: QuestionRuleItem[];
    ruleSetStatus: RuleSetStatus;
    ruleSetType?: string | null;
    active: boolean;
    targetLevelMinRank: number;
    targetLevelMaxRank: number;
    targetDepartmentId?: number | null;
    targetPositionId?: number | null;
    roles: RuleRole[];
    questionIds: number[];
    questions: QuestionRuleItem[];
    conflictCount: number;
}

interface MatrixSelection {
    levelRank: number;
    levelCode: string;
    role: RuleRole;
}

interface RuleHealthItem {
    tone: 'danger' | 'warning' | 'info' | 'success';
    icon: string;
    title: string;
    message: string;
    value?: number;
}

const emptyForm = (): RuleSetFormState => ({
    ruleSetName: '',
    ruleSetDescription: '',
    questionBankIds: [],
    targetLevelMinRank: 1,
    targetLevelMaxRank: 9,
    evaluatorRoles: [],
    targetDepartmentId: '',
    targetPositionId: '',
    ruleSetStatus: 'ACTIVE',
    active: true,
});

const normalizeRuleSetStatus = (status?: string | null, active?: boolean | null): RuleSetStatus => {
    const value = (status || '').toUpperCase().replace(/[-\s]+/g, '_');
    if (value === 'DRAFT' || value === 'ACTIVE' || value === 'DISABLED' || value === 'ARCHIVED') return value;
    if (value === 'INACTIVE') return 'DISABLED';
    return active === false ? 'DISABLED' : 'ACTIVE';
};

const isActiveRuleSetStatus = (status?: string | null, active?: boolean | null) => normalizeRuleSetStatus(status, active) === 'ACTIVE';

const ruleSetStatusLabel = (status: RuleSetStatus) => ({
    DRAFT: 'Draft',
    ACTIVE: 'Active',
    DISABLED: 'Disabled',
    ARCHIVED: 'Archived',
}[status]);

const ruleSetTypeLabel = (type?: string | null) => ({
    BASE: 'Base Rule Set',
    DEPARTMENT_ADD_ON: 'Department Add-on',
    POSITION_ADD_ON: 'Position Add-on',
    DEPARTMENT_POSITION_ADD_ON: 'Department + Position Add-on',
}[type || ''] || 'Rule Set');

const inferRuleSetType = (departmentId?: number | null, positionId?: number | null) => {
    if (departmentId == null && positionId == null) return 'BASE';
    if (departmentId != null && positionId == null) return 'DEPARTMENT_ADD_ON';
    if (departmentId == null && positionId != null) return 'POSITION_ADD_ON';
    return 'DEPARTMENT_POSITION_ADD_ON';
};

const toNumberOrNull = (value: number | '') => (value === '' ? null : Number(value));
const scopeKeyValue = (value?: number | null) => value == null ? 'all' : String(value);

const scopeLabel = (
    group: Pick<RuleSetGroup, 'targetDepartmentId' | 'targetPositionId'>,
    getDepartmentName: (id?: number | null) => string,
    getPositionName: (id?: number | null) => string,
) => {
    const department = group.targetDepartmentId ? getDepartmentName(group.targetDepartmentId) : 'All departments';
    const position = group.targetPositionId ? getPositionName(group.targetPositionId) : 'All positions';
    return `${department} / ${position}`;
};

const formatGroupLevelRange = (group: Pick<RuleSetGroup, 'targetLevelMinRank' | 'targetLevelMaxRank'>) =>
    `L${String(group.targetLevelMinRank).padStart(2, '0')}–L${String(group.targetLevelMaxRank).padStart(2, '0')}`;

const formatRuleSetTitle = (group: Pick<RuleSetGroup, 'targetLevelMinRank' | 'targetLevelMaxRank' | 'targetDepartmentId' | 'targetPositionId'>, getDepartmentName: (id?: number | null) => string, getPositionName: (id?: number | null) => string) =>
    `${formatGroupLevelRange(group)} · ${scopeLabel(group, getDepartmentName, getPositionName)}`;

const buildSuggestedRuleSetName = (form: Pick<RuleSetFormState, 'targetLevelMinRank' | 'targetLevelMaxRank' | 'evaluatorRoles' | 'targetDepartmentId' | 'targetPositionId'>) => {
    const level = `L${String(form.targetLevelMinRank).padStart(2, '0')}–L${String(form.targetLevelMaxRank).padStart(2, '0')}`;
    const roles = form.evaluatorRoles.length === EVALUATOR_ROLE_OPTIONS.length
        ? 'All Roles'
        : form.evaluatorRoles.length > 0
            ? form.evaluatorRoles.map(getRoleLabel).join(' + ')
            : 'Roles';
    const scope = form.targetPositionId ? 'Position Scope' : form.targetDepartmentId ? 'Department Scope' : 'General Scope';
    return `${level} · ${roles} · ${scope}`;
};

const buildRuleSetSignature = (group: Pick<RuleSetGroup, 'targetLevelMinRank' | 'targetLevelMaxRank' | 'targetDepartmentId' | 'targetPositionId' | 'roles' | 'questionIds'>) => [
    group.targetLevelMinRank,
    group.targetLevelMaxRank,
    scopeKeyValue(group.targetDepartmentId),
    scopeKeyValue(group.targetPositionId),
    [...group.roles].sort().join(','),
    [...group.questionIds].sort((a, b) => a - b).join(','),
].join('|');

const buildFormSignature = (form: RuleSetFormState) => buildRuleSetSignature({
    targetLevelMinRank: form.targetLevelMinRank,
    targetLevelMaxRank: form.targetLevelMaxRank,
    targetDepartmentId: toNumberOrNull(form.targetDepartmentId),
    targetPositionId: toNumberOrNull(form.targetPositionId),
    roles: form.evaluatorRoles,
    questionIds: form.questionBankIds,
});

const ruleScopeSpecificityLabel = (rule: Pick<QuestionRuleItem, 'targetPositionId' | 'targetDepartmentId'>) => {
    if (rule.targetPositionId != null) return 'Position-specific';
    if (rule.targetDepartmentId != null) return 'Department-specific';
    return 'General';
};

const questionLabel = (rule: Pick<QuestionRuleItem, 'questionCode' | 'questionBankId' | 'competencyCode'>) =>
    `${rule.questionCode || `Q-${rule.questionBankId}`} · ${getCompetencyLabel(rule.competencyCode || '')}`;

const rangesOverlap = (aMin: number, aMax: number, bMin: number, bMax: number) =>
    aMin <= bMax && bMin <= aMax;

const nullableScopeEquals = (a?: number | null, b?: number | null) =>
    (a == null && b == null) || a === b;

const isRuleEffectivelyActive = (rule: QuestionRuleItem) =>
    Boolean(rule.active)
    && rule.questionBankId != null
    && rule.questionStatus === 'ACTIVE'
    && rule.effectiveActive !== false;

const specificityScore = (rule: Pick<QuestionRuleItem, 'targetPositionId' | 'targetDepartmentId'>) => {
    if (rule.targetPositionId != null) return 3;
    if (rule.targetDepartmentId != null) return 2;
    return 1;
};

const compareRulesByResolverOrder = (a: QuestionRuleItem, b: QuestionRuleItem) => {
    const specificityDiff = specificityScore(b) - specificityScore(a);
    if (specificityDiff !== 0) return specificityDiff;
    const displayDiff = (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999);
    if (displayDiff !== 0) return displayDiff;
    const priorityDiff = (a.rulePriority ?? 9999) - (b.rulePriority ?? 9999);
    if (priorityDiff !== 0) return priorityDiff;
    return (a.id ?? 0) - (b.id ?? 0);
};

const ruleMatchesCriteria = (
    rule: QuestionRuleItem,
    levelRank: number,
    role: RuleRole,
    targetDepartmentId?: number | null,
    targetPositionId?: number | null,
) => {
    if (!isRuleEffectivelyActive(rule)) return false;
    if (rule.evaluatorRelationshipType !== role) return false;
    if (rule.targetLevelMinRank > levelRank || rule.targetLevelMaxRank < levelRank) return false;
    if (rule.targetPositionId != null && rule.targetPositionId !== targetPositionId) return false;
    if (rule.targetDepartmentId != null && rule.targetDepartmentId !== targetDepartmentId) return false;
    return true;
};

const isBroaderRuleScope = (
    rule: Pick<QuestionRuleItem, 'targetDepartmentId' | 'targetPositionId'>,
    targetDepartmentId?: number | null,
    targetPositionId?: number | null,
) => {
    const departmentMatches = rule.targetDepartmentId == null || rule.targetDepartmentId === targetDepartmentId;
    const positionMatches = rule.targetPositionId == null || rule.targetPositionId === targetPositionId;
    const broader = (rule.targetDepartmentId == null && targetDepartmentId != null)
        || (rule.targetPositionId == null && targetPositionId != null);
    return departmentMatches && positionMatches && broader;
};

const ruleSetExactScopeOverlaps = (
    group: RuleSetGroup,
    levelMin: number,
    levelMax: number,
    roles: RuleRole[],
    targetDepartmentId?: number | null,
    targetPositionId?: number | null,
) => group.active
    && nullableScopeEquals(group.targetDepartmentId, targetDepartmentId)
    && nullableScopeEquals(group.targetPositionId, targetPositionId)
    && rangesOverlap(group.targetLevelMinRank, group.targetLevelMaxRank, levelMin, levelMax)
    && group.roles.some(role => roles.includes(role));

const resolveEffectiveQuestionIds = (
    rules: QuestionRuleItem[],
    levelRank: number,
    role: RuleRole,
    targetDepartmentId?: number | null,
    targetPositionId?: number | null,
) => {
    const byQuestion = new Map<number, QuestionRuleItem>();
    rules
        .filter(rule => ruleMatchesCriteria(rule, levelRank, role, targetDepartmentId, targetPositionId))
        .sort(compareRulesByResolverOrder)
        .forEach(rule => {
            if (rule.questionBankId != null && !byQuestion.has(rule.questionBankId)) {
                byQuestion.set(rule.questionBankId, rule);
            }
        });
    return byQuestion;
};

const findConflictIds = (rules: QuestionRuleItem[]) => {
    const conflicts = new Set<number>();
    const activeRules = rules.filter(isRuleEffectivelyActive);

    activeRules.forEach((rule, index) => {
        activeRules.slice(index + 1).forEach(other => {
            const sameRole = rule.evaluatorRelationshipType === other.evaluatorRelationshipType;
            const levelsOverlap = rangesOverlap(
                rule.targetLevelMinRank,
                rule.targetLevelMaxRank,
                other.targetLevelMinRank,
                other.targetLevelMaxRank,
            );
            const sameDepartmentScope = nullableScopeEquals(rule.targetDepartmentId, other.targetDepartmentId);
            const samePositionScope = nullableScopeEquals(rule.targetPositionId, other.targetPositionId);

            if (sameRole && levelsOverlap && sameDepartmentScope && samePositionScope) {
                conflicts.add(rule.id);
                conflicts.add(other.id);
            }
        });
    });

    return conflicts;
};

const buildRuleGroups = (rules: QuestionRuleItem[], conflictIds: Set<number>): RuleSetGroup[] => {
    const groups = new Map<string, RuleSetGroup>();

    rules.forEach(rule => {
        const key = rule.ruleSetId != null
            ? `rule-set-${rule.ruleSetId}`
            : [
                'legacy',
                normalizeRuleSetStatus(rule.ruleSetStatus, rule.active),
                rule.targetLevelMinRank,
                rule.targetLevelMaxRank,
                scopeKeyValue(rule.targetDepartmentId),
                scopeKeyValue(rule.targetPositionId),
            ].join('|');

        const group = groups.get(key) ?? {
            key,
            ruleSetId: rule.ruleSetId,
            ruleSetName: rule.ruleSetName,
            ruleSetDescription: rule.ruleSetDescription,
            rules: [],
            ruleSetStatus: normalizeRuleSetStatus(rule.ruleSetStatus, rule.active),
            ruleSetType: rule.ruleSetType || inferRuleSetType(rule.targetDepartmentId, rule.targetPositionId),
            active: isActiveRuleSetStatus(rule.ruleSetStatus, rule.active),
            targetLevelMinRank: rule.targetLevelMinRank,
            targetLevelMaxRank: rule.targetLevelMaxRank,
            targetDepartmentId: rule.targetDepartmentId,
            targetPositionId: rule.targetPositionId,
            roles: [],
            questionIds: [],
            questions: [],
            conflictCount: 0,
        };

        group.rules.push(rule);
        group.ruleSetStatus = normalizeRuleSetStatus(rule.ruleSetStatus, rule.active);
        group.ruleSetType = rule.ruleSetType || inferRuleSetType(rule.targetDepartmentId, rule.targetPositionId);
        group.active = group.ruleSetStatus === 'ACTIVE';
        if (!group.roles.includes(rule.evaluatorRelationshipType as RuleRole)) {
            group.roles.push(rule.evaluatorRelationshipType as RuleRole);
        }
        if (rule.questionBankId && !group.questionIds.includes(rule.questionBankId)) {
            group.questionIds.push(rule.questionBankId);
            group.questions.push(rule);
        }
        if (conflictIds.has(rule.id)) {
            group.conflictCount += 1;
        }
        groups.set(key, group);
    });

    return [...groups.values()].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        if (a.ruleSetStatus !== b.ruleSetStatus) return a.ruleSetStatus.localeCompare(b.ruleSetStatus);
        if (a.targetLevelMinRank !== b.targetLevelMinRank) return a.targetLevelMinRank - b.targetLevelMinRank;
        if (a.targetLevelMaxRank !== b.targetLevelMaxRank) return a.targetLevelMaxRank - b.targetLevelMaxRank;
        return a.key.localeCompare(b.key);
    });
};

const RuleMetric = ({ label, value, note, tone }: { label: string; value: number; note: string; tone: string }) => (
    <div className={`hfdq-stat-card ${tone}`}>
        <span className="hfdq-stat-icon"><i className="bi bi-diagram-3" /></span>
        <div>
            <small>{label}</small>
            <strong>{value}</strong>
            <em>{note}</em>
        </div>
    </div>
);

type RuleMessageTone = 'error' | 'success' | 'warning' | 'info';

const buildRuleMessage = (tone: RuleMessageTone, message: string) => {
    const normalized = message.toLowerCase();
    if (tone === 'success') {
        return {
            title: 'Rule Set saved',
            detail: message,
            icon: 'bi bi-check-circle-fill',
        };
    }
    if (normalized.includes('redundant add-on') || normalized.includes('inherited from')) {
        return {
            title: 'Question already inherited',
            detail: message,
            icon: 'bi bi-intersect',
        };
    }
    if (normalized.includes('active overlap')) {
        return {
            title: 'Active scope overlap blocked',
            detail: message,
            icon: 'bi bi-shield-exclamation',
        };
    }
    if (normalized.includes('identical to')) {
        return {
            title: 'Duplicate Rule Set blocked',
            detail: message,
            icon: 'bi bi-files',
        };
    }
    if (normalized.includes('another active rule') || normalized.includes('overlap') || normalized.includes('conflict')) {
        return {
            title: 'Rule Set overlap found',
            detail: `${message} This usually means an active Rule Set already uses the same question, evaluator role, overlapping level range, and exact department/position scope. Edit or disable the overlapping active Rule Set first.`,
            icon: 'bi bi-shield-exclamation',
        };
    }
    if (normalized.includes('select at least') || normalized.includes('from level')) {
        return {
            title: 'Complete the required setup',
            detail: message,
            icon: 'bi bi-exclamation-circle-fill',
        };
    }
    return {
        title: tone === 'warning' ? 'Review required' : 'Action could not be completed',
        detail: message,
        icon: tone === 'warning' ? 'bi bi-exclamation-triangle-fill' : 'bi bi-x-octagon-fill',
    };
};

const RuleToast = ({ tone, message, onClose }: { tone: RuleMessageTone; message: string; onClose: () => void }) => {
    const content = buildRuleMessage(tone, message);
    return (
        <div className={`hfdq-toast ${tone}`} role="status" aria-live="polite">
            <span className="hfdq-toast-icon"><i className={content.icon} /></span>
            <div>
                <strong>{content.title}</strong>
                <p>{content.detail}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Dismiss message"><i className="bi bi-x-lg" /></button>
        </div>
    );
};

export default function QuestionRulesTab() {
    const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
    const [rules, setRules] = useState<QuestionRuleItem[]>([]);
    const [departments, setDepartments] = useState<FeedbackDepartmentOption[]>([]);
    const [positions, setPositions] = useState<PositionResponse[]>([]);
    const [targetCandidates, setTargetCandidates] = useState<FeedbackTargetCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [builderOpen, setBuilderOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<RuleSetGroup | null>(null);
    const [form, setForm] = useState<RuleSetFormState>(emptyForm());
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | RuleRole>('ALL');
    const [levelFilter, setLevelFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [matrixDepartmentId, setMatrixDepartmentId] = useState<number | ''>('');
    const [matrixPositionId, setMatrixPositionId] = useState<number | ''>('');
    const [builderQuestionSearch, setBuilderQuestionSearch] = useState('');
    const [builderCompetencyFilter, setBuilderCompetencyFilter] = useState('ALL');
    const [matrixSelection, setMatrixSelection] = useState<MatrixSelection | null>(null);
    const [expandedRuleSetKeys, setExpandedRuleSetKeys] = useState<Set<string>>(new Set());

    const activeQuestions = useMemo(
        () => questions.filter(question => question.status === 'ACTIVE'),
        [questions],
    );

    const conflictIds = useMemo(() => findConflictIds(rules), [rules]);
    const ruleGroups = useMemo(() => buildRuleGroups(rules, conflictIds), [conflictIds, rules]);

    const formDepartmentId = toNumberOrNull(form.targetDepartmentId);
    const formPositionId = toNumberOrNull(form.targetPositionId);

    const activeScopeOverlapGroup = useMemo(() => {
        if (form.ruleSetStatus !== 'ACTIVE' || form.evaluatorRoles.length === 0) return null;
        return ruleGroups.find(group => group.ruleSetId !== editingGroup?.ruleSetId
            && ruleSetExactScopeOverlaps(
                group,
                form.targetLevelMinRank,
                form.targetLevelMaxRank,
                form.evaluatorRoles,
                formDepartmentId,
                formPositionId,
            )) ?? null;
    }, [editingGroup?.ruleSetId, form.evaluatorRoles, form.ruleSetStatus, form.targetLevelMaxRank, form.targetLevelMinRank, formDepartmentId, formPositionId, ruleGroups]);

    const inheritedQuestionInfo = useMemo(() => {
        const map = new Map<number, string>();
        if (formDepartmentId == null && formPositionId == null) return map;
        if (form.evaluatorRoles.length === 0) return map;
        rules
            .filter(isRuleEffectivelyActive)
            .filter(rule => rule.ruleSetId !== editingGroup?.ruleSetId)
            .forEach(rule => {
                if (rule.questionBankId == null) return;
                if (!form.evaluatorRoles.includes(rule.evaluatorRelationshipType as RuleRole)) return;
                if (!rangesOverlap(rule.targetLevelMinRank, rule.targetLevelMaxRank, form.targetLevelMinRank, form.targetLevelMaxRank)) return;
                if (!isBroaderRuleScope(rule, formDepartmentId, formPositionId)) return;
                const source = rule.ruleSetName || `${ruleScopeSpecificityLabel(rule)} Rule Set`;
                if (!map.has(rule.questionBankId)) {
                    map.set(rule.questionBankId, `Already inherited from ${source}`);
                }
            });
        return map;
    }, [editingGroup?.ruleSetId, form.evaluatorRoles, form.targetLevelMaxRank, form.targetLevelMinRank, formDepartmentId, formPositionId, rules]);

    const selectedInheritedQuestions = useMemo(
        () => form.questionBankIds.filter(id => inheritedQuestionInfo.has(id)),
        [form.questionBankIds, inheritedQuestionInfo],
    );

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [loadedQuestions, loadedRules, loadedDepartments, loadedPositions, loadedTargetCandidates] = await Promise.all([
                hrFeedbackApi.getQuestionBank(),
                hrFeedbackApi.getQuestionRules(),
                feedbackCampaignApi.getDepartments().catch(() => []),
                positionService.getPositions().catch(() => []),
                feedbackCampaignApi.getTargetCandidates().catch(() => []),
            ]);
            setQuestions(loadedQuestions);
            setRules(loadedRules);
            setDepartments(loadedDepartments);
            setPositions(loadedPositions);
            setTargetCandidates(loadedTargetCandidates);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load question rules.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    const getDepartmentName = (id?: number | null) => {
        if (!id) return 'All departments';
        return departments.find(department => department.id === id)?.name ?? `Department #${id}`;
    };

    const getPositionName = (id?: number | null) => {
        if (!id) return 'All positions';
        return positions.find(position => position.id === id)?.positionTitle ?? `Position #${id}`;
    };

    const positionIdsByDepartment = useMemo(() => {
        const map = new Map<number, Set<number>>();
        targetCandidates.forEach(candidate => {
            if (candidate.currentDepartmentId != null && candidate.positionId != null) {
                const set = map.get(candidate.currentDepartmentId) ?? new Set<number>();
                set.add(candidate.positionId);
                map.set(candidate.currentDepartmentId, set);
            }
        });
        return map;
    }, [targetCandidates]);

    const getPositionsForDepartment = (departmentId: number | '') => {
        if (departmentId === '') return positions;
        if (targetCandidates.length === 0) return positions;
        const mapped = positionIdsByDepartment.get(Number(departmentId));
        if (!mapped || mapped.size === 0) return [];
        return positions.filter(position => mapped.has(position.id));
    };

    const builderPositions = useMemo(
        () => getPositionsForDepartment(form.targetDepartmentId),
        [form.targetDepartmentId, positionIdsByDepartment, positions, targetCandidates.length],
    );

    const matrixPositions = useMemo(
        () => getPositionsForDepartment(matrixDepartmentId),
        [matrixDepartmentId, positionIdsByDepartment, positions, targetCandidates.length],
    );

    useEffect(() => {
        if (form.targetPositionId !== '' && !builderPositions.some(position => position.id === Number(form.targetPositionId))) {
            setForm(current => ({ ...current, targetPositionId: '' }));
        }
    }, [builderPositions, form.targetPositionId]);

    useEffect(() => {
        if (matrixPositionId !== '' && !matrixPositions.some(position => position.id === Number(matrixPositionId))) {
            setMatrixPositionId('');
        }
    }, [matrixPositions, matrixPositionId]);

    const filteredGroups = useMemo(() => {
        const query = normalizeText(search);
        return ruleGroups.filter(group => {
            const groupText = [
                group.ruleSetName,
                group.ruleSetDescription,
                ruleSetStatusLabel(group.ruleSetStatus),
                ruleSetTypeLabel(group.ruleSetType),
                formatGroupLevelRange(group),
                scopeLabel(group, getDepartmentName, getPositionName),
                ...group.roles.map(getRoleLabel),
                ...group.questions.flatMap(question => [question.questionCode, question.questionText, question.competencyCode]),
            ].join(' ');
            const matchesSearch = !query || normalizeText(groupText).includes(query);
            const matchesRole = roleFilter === 'ALL' || group.roles.includes(roleFilter);
            const matchesLevel = levelFilter === 'ALL' || (group.targetLevelMinRank <= Number(levelFilter) && group.targetLevelMaxRank >= Number(levelFilter));
            const matchesStatus = statusFilter === 'ALL' || group.ruleSetStatus === statusFilter;
            return matchesSearch && matchesRole && matchesLevel && matchesStatus;
        });
    }, [getDepartmentName, getPositionName, levelFilter, roleFilter, ruleGroups, search, statusFilter]);

    const coverageMatrix = useMemo(() => LEVEL_OPTIONS.map(level => {
        const departmentId = toNumberOrNull(matrixDepartmentId);
        const positionId = toNumberOrNull(matrixPositionId);
        const cells = EVALUATOR_ROLE_OPTIONS.map(role => {
            const rawMatches = rules.filter(rule => ruleMatchesCriteria(rule, level.rank, role.value, departmentId, positionId));
            const matchedRules = Array.from(resolveEffectiveQuestionIds(rules, level.rank, role.value, departmentId, positionId).values());
            return { role: role.value, count: matchedRules.length, matchedRules, rawCount: rawMatches.length, duplicatesIgnored: Math.max(0, rawMatches.length - matchedRules.length) };
        });
        return { level, cells };
    }), [matrixDepartmentId, matrixPositionId, rules]);

    const stats = useMemo(() => {
        const effectiveRows = rules.filter(isRuleEffectivelyActive);
        const coveredCombos = coverageMatrix.reduce((total, row) => total + row.cells.filter(cell => cell.count > 0).length, 0);
        return {
            ruleSets: ruleGroups.length,
            activeRules: effectiveRows.length,
            conflicts: conflictIds.size,
            coveredCombos,
        };
    }, [conflictIds.size, coverageMatrix, ruleGroups.length, rules]);

    const ruleSetById = useMemo(() => {
        const map = new Map<number, RuleSetGroup>();
        ruleGroups.forEach(group => {
            if (group.ruleSetId != null) map.set(group.ruleSetId, group);
        });
        return map;
    }, [ruleGroups]);

    const selectedMatrixCell = useMemo(() => {
        if (!matrixSelection) return null;
        const row = coverageMatrix.find(item => item.level.rank === matrixSelection.levelRank);
        const cell = row?.cells.find(item => item.role === matrixSelection.role);
        return row && cell ? { level: row.level, cell } : null;
    }, [coverageMatrix, matrixSelection]);

    const healthItems = useMemo<RuleHealthItem[]>(() => {
        const missingCells = coverageMatrix.reduce((total, row) => total + row.cells.filter(cell => cell.count === 0).length, 0);
        const lowCells = coverageMatrix.reduce((total, row) => total + row.cells.filter(cell => cell.count > 0 && cell.count < 5).length, 0);
        const inactiveRuleSets = ruleGroups.filter(group => group.ruleSetStatus !== 'ACTIVE').length;
        const draftRuleSets = ruleGroups.filter(group => group.ruleSetStatus === 'DRAFT').length;
        const disabledRuleSets = ruleGroups.filter(group => group.ruleSetStatus === 'DISABLED').length;
        const inactiveQuestionRows = rules.filter(rule => rule.active && rule.questionStatus && rule.questionStatus !== 'ACTIVE').length;
        const activeRows = rules.filter(isRuleEffectivelyActive);
        const redundantInheritedRows = activeRows.filter(rule => rule.targetDepartmentId != null || rule.targetPositionId != null).filter(rule =>
            activeRows.some(other => other.id !== rule.id
                && other.questionBankId === rule.questionBankId
                && other.evaluatorRelationshipType === rule.evaluatorRelationshipType
                && rangesOverlap(other.targetLevelMinRank, other.targetLevelMaxRank, rule.targetLevelMinRank, rule.targetLevelMaxRank)
                && isBroaderRuleScope(other, rule.targetDepartmentId, rule.targetPositionId))
        ).length;
        const signatureCounts = new Map<string, number>();
        ruleGroups.forEach(group => {
            const signature = buildRuleSetSignature(group);
            signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
        });
        const duplicateRuleSets = Array.from(signatureCounts.values()).reduce((total, count) => total + Math.max(0, count - 1), 0);
        const items: RuleHealthItem[] = [];
        items.push(missingCells > 0
            ? { tone: 'danger', icon: 'bi bi-exclamation-octagon', title: 'Missing coverage', value: missingCells, message: 'Level/role combinations have no active questions for the selected matrix scope.' }
            : { tone: 'success', icon: 'bi bi-check-circle', title: 'Coverage present', value: 0, message: 'Every level/role combination has at least one active question for the selected matrix scope.' });
        if (lowCells > 0) {
            items.push({ tone: 'warning', icon: 'bi bi-speedometer', title: 'Low coverage', value: lowCells, message: 'Some combinations have only 1–4 questions. Review whether that is enough before campaign setup.' });
        }
        if (inactiveRuleSets > 0) {
            items.push({ tone: 'info', icon: 'bi bi-pause-circle', title: 'Non-active sets', value: inactiveRuleSets, message: `${draftRuleSets} draft and ${disabledRuleSets} disabled Rule Set(s) are ignored by Coverage Matrix, Dynamic Preview, and Campaign setup.` });
        }
        if (redundantInheritedRows > 0) {
            items.push({ tone: 'warning', icon: 'bi bi-intersect', title: 'Redundant add-ons', value: redundantInheritedRows, message: 'Some specific active rules repeat questions already inherited from broader active Rule Sets. Edit those add-ons so they only add extra questions.' });
        }
        if (duplicateRuleSets > 0) {
            items.push({ tone: 'warning', icon: 'bi bi-files', title: 'Duplicate saved sets', value: duplicateRuleSets, message: 'Some saved Rule Sets have the same level, scope, roles, and selected questions. Edit or archive duplicates to reduce clutter.' });
        }
        if (inactiveQuestionRows > 0) {
            items.push({ tone: 'warning', icon: 'bi bi-archive', title: 'Inactive questions referenced', value: inactiveQuestionRows, message: 'Some active rules point to questions that are not active. They are ignored by preview and coverage.' });
        }
        if (conflictIds.size > 0) {
            items.push({ tone: 'danger', icon: 'bi bi-shield-exclamation', title: 'Conflicts detected', value: conflictIds.size, message: 'Exact-scope active Rule Sets overlap and should be resolved.' });
        }
        return items;
    }, [conflictIds.size, coverageMatrix, ruleGroups, rules]);

    const visibleMatrixHealthItems = useMemo(
        () => healthItems.filter(item => item.tone !== 'success').slice(0, 3),
        [healthItems],
    );

    const patchForm = (patch: Partial<RuleSetFormState>) => setForm(current => {
        const next = { ...current, ...patch };
        if (patch.ruleSetStatus) {
            next.active = patch.ruleSetStatus === 'ACTIVE';
        }
        return next;
    });

    const openBuilder = () => {
        setError('');
        setSuccess('');
        setEditingGroup(null);
        setForm(emptyForm());
        setBuilderQuestionSearch('');
        setBuilderCompetencyFilter('ALL');
        setBuilderOpen(true);
    };

    const closeBuilder = () => {
        if (busy) return;
        setBuilderOpen(false);
        setEditingGroup(null);
        setForm(emptyForm());
        setBuilderQuestionSearch('');
        setBuilderCompetencyFilter('ALL');
    };

    const toggleQuestion = (questionBankId: number) => {
        patchForm({
            questionBankIds: form.questionBankIds.includes(questionBankId)
                ? form.questionBankIds.filter(id => id !== questionBankId)
                : [...form.questionBankIds, questionBankId],
        });
    };

    const toggleRole = (role: RuleRole) => {
        patchForm({
            evaluatorRoles: form.evaluatorRoles.includes(role)
                ? form.evaluatorRoles.filter(item => item !== role)
                : [...form.evaluatorRoles, role],
        });
    };

    const selectAllRoles = () => {
        patchForm({
            evaluatorRoles: form.evaluatorRoles.length === EVALUATOR_ROLE_OPTIONS.length
                ? []
                : EVALUATOR_ROLE_OPTIONS.map(option => option.value),
        });
    };

    const selectQuestionsByCompetency = (competencyCode: string) => {
        const ids = activeQuestions
            .filter(question => question.competencyCode === competencyCode)
            .filter(question => !inheritedQuestionInfo.has(question.id))
            .map(question => question.id);
        const merged = Array.from(new Set([...form.questionBankIds, ...ids]));
        patchForm({ questionBankIds: merged });
    };

    const submitRuleSet = async () => {
        setError('');
        setSuccess('');
        if (form.questionBankIds.length === 0) {
            setError('Select at least one question.');
            return;
        }
        if (form.evaluatorRoles.length === 0) {
            setError('Select at least one evaluator role.');
            return;
        }
        if (form.targetLevelMinRank > form.targetLevelMaxRank) {
            setError('From level cannot be greater than To level.');
            return;
        }

        const duplicate = ruleGroups.find(group => group.ruleSetId !== editingGroup?.ruleSetId && buildRuleSetSignature(group) === buildFormSignature(form));
        if (duplicate) {
            setError(`This Rule Set is identical to "${duplicate.ruleSetName || formatGroupLevelRange(duplicate)}". Change the scope, roles, or selected questions before saving.`);
            return;
        }
        if (form.ruleSetStatus === 'ACTIVE' && activeScopeOverlapGroup) {
            setError(`Active overlap blocked. "${activeScopeOverlapGroup.ruleSetName || formatGroupLevelRange(activeScopeOverlapGroup)}" already covers this level range, exact scope, and one or more selected evaluator roles. Edit that Rule Set instead of creating another active set for the same scope.`);
            return;
        }
        if (selectedInheritedQuestions.length > 0) {
            const firstQuestion = activeQuestions.find(question => question.id === selectedInheritedQuestions[0]);
            setError(`${firstQuestion?.questionCode || 'A selected question'} is already inherited from a broader active Rule Set for this scope. Specific add-on Rule Sets should only add extra questions.`);
            return;
        }

        const payload: QuestionRulePayload = {
            ruleSetName: (form.ruleSetName.trim() || buildSuggestedRuleSetName(form)),
            ruleSetDescription: form.ruleSetDescription.trim() || null,
            ruleSetStatus: form.ruleSetStatus,
            questionBankIds: form.questionBankIds,
            targetLevelMinRank: form.targetLevelMinRank,
            targetLevelMaxRank: form.targetLevelMaxRank,
            evaluatorRelationshipTypes: form.evaluatorRoles,
            targetDepartmentId: formDepartmentId,
            targetPositionId: formPositionId,
            displayOrder: 10,
            rulePriority: 100,
            active: form.ruleSetStatus === 'ACTIVE',
        };

        setBusy(true);
        try {
            if (editingGroup?.ruleSetId) {
                await hrFeedbackApi.updateQuestionRuleSet(editingGroup.ruleSetId, payload);
                setSuccess('Rule Set updated. Coverage and preview now use the revised generated rows.');
            } else {
                await hrFeedbackApi.createQuestionRule(payload);
                setSuccess(form.ruleSetStatus === 'ACTIVE'
                    ? 'Rule Set created and activated. Coverage and preview now include it.'
                    : `${ruleSetStatusLabel(form.ruleSetStatus)} Rule Set created. It will not affect coverage until activated.`);
            }
            closeBuilder();
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : editingGroup ? 'Failed to update rule set.' : 'Failed to create rule set.');
        } finally {
            setBusy(false);
        }
    };

    const setRuleSetActive = async (group: RuleSetGroup, active: boolean) => {
        setBusy(true);
        setError('');
        setSuccess('');
        try {
            for (const rule of group.rules) {
                if (active && !rule.active) {
                    await hrFeedbackApi.activateQuestionRule(rule.id);
                } else if (!active && rule.active) {
                    await hrFeedbackApi.deactivateQuestionRule(rule.id);
                }
            }
            setSuccess(active ? 'Rule set activated.' : 'Rule set disabled.');
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update rule set.');
        } finally {
            setBusy(false);
        }
    };

    const changeRuleSetStatus = async (group: RuleSetGroup, status: RuleSetStatus) => {
        if (!group.ruleSetId) return;
        setBusy(true);
        setError('');
        setSuccess('');
        try {
            await hrFeedbackApi.updateQuestionRuleSet(group.ruleSetId, {
                ruleSetName: group.ruleSetName || buildSuggestedRuleSetName({
                    targetLevelMinRank: group.targetLevelMinRank,
                    targetLevelMaxRank: group.targetLevelMaxRank,
                    evaluatorRoles: group.roles,
                    targetDepartmentId: group.targetDepartmentId ?? '',
                    targetPositionId: group.targetPositionId ?? '',
                }),
                ruleSetDescription: group.ruleSetDescription || null,
                ruleSetStatus: status,
                questionBankIds: group.questionIds,
                targetLevelMinRank: group.targetLevelMinRank,
                targetLevelMaxRank: group.targetLevelMaxRank,
                evaluatorRelationshipTypes: group.roles,
                targetDepartmentId: group.targetDepartmentId ?? null,
                targetPositionId: group.targetPositionId ?? null,
                displayOrder: 10,
                rulePriority: 100,
                active: status === 'ACTIVE',
            });
            setSuccess(`Rule Set moved to ${ruleSetStatusLabel(status)}.`);
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update Rule Set status.');
        } finally {
            setBusy(false);
        }
    };

    const editRuleSet = (group: RuleSetGroup) => {
        setError('');
        setSuccess('');
        setEditingGroup(group);
        setForm({
            ruleSetName: group.ruleSetName || formatGroupLevelRange(group),
            ruleSetDescription: group.ruleSetDescription || '',
            questionBankIds: group.questionIds,
            evaluatorRoles: group.roles,
            targetLevelMinRank: group.targetLevelMinRank,
            targetLevelMaxRank: group.targetLevelMaxRank,
            targetDepartmentId: group.targetDepartmentId ?? '',
            targetPositionId: group.targetPositionId ?? '',
            ruleSetStatus: group.ruleSetStatus,
            active: group.ruleSetStatus === 'ACTIVE',
        });
        setBuilderQuestionSearch('');
        setBuilderCompetencyFilter('ALL');
        setBuilderOpen(true);
    };

    const duplicateRuleSet = (group: RuleSetGroup) => {
        setError('');
        setSuccess('');
        setEditingGroup(null);
        setForm({
            ruleSetName: `Copy of ${group.ruleSetName || formatGroupLevelRange(group)}`,
            ruleSetDescription: group.ruleSetDescription || '',
            questionBankIds: group.questionIds,
            evaluatorRoles: group.roles,
            targetLevelMinRank: group.targetLevelMinRank,
            targetLevelMaxRank: group.targetLevelMaxRank,
            targetDepartmentId: group.targetDepartmentId ?? '',
            targetPositionId: group.targetPositionId ?? '',
            ruleSetStatus: 'DRAFT',
            active: false,
        });
        setBuilderQuestionSearch('');
        setBuilderCompetencyFilter('ALL');
        setBuilderOpen(true);
    };

    const clearFilters = () => {
        setSearch('');
        setRoleFilter('ALL');
        setLevelFilter('ALL');
        setStatusFilter('ALL');
    };

    const competencyBuckets = useMemo(() => {
        const buckets = new Map<string, QuestionBankItem[]>();
        activeQuestions.forEach(question => {
            const code = question.competencyCode || 'UNCATEGORIZED';
            buckets.set(code, [...(buckets.get(code) ?? []), question]);
        });
        return [...buckets.entries()].sort((a, b) => getCompetencyLabel(a[0]).localeCompare(getCompetencyLabel(b[0])));
    }, [activeQuestions]);

    const filteredCompetencyBuckets = useMemo(() => {
        const query = normalizeText(builderQuestionSearch);
        return competencyBuckets
            .filter(([competencyCode]) => builderCompetencyFilter === 'ALL' || competencyCode === builderCompetencyFilter)
            .map(([competencyCode, bucket]) => [
                competencyCode,
                bucket.filter(question => !query
                    || normalizeText(question.questionText).includes(query)
                    || normalizeText(question.questionCode).includes(query)
                    || normalizeText(getCompetencyLabel(question.competencyCode)).includes(query)),
            ] as [string, QuestionBankItem[]])
            .filter(([, bucket]) => bucket.length > 0);
    }, [builderCompetencyFilter, builderQuestionSearch, competencyBuckets]);

    const selectedQuestions = useMemo(() => activeQuestions.filter(question => form.questionBankIds.includes(question.id)), [activeQuestions, form.questionBankIds]);

    const clearSelectedQuestions = () => patchForm({ questionBankIds: [] });

    const toggleRuleSetExpanded = (groupKey: string) => {
        setExpandedRuleSetKeys(current => {
            const next = new Set(current);
            if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey);
            return next;
        });
    };

    const matrixScopeLabel = `${matrixDepartmentId ? getDepartmentName(Number(matrixDepartmentId)) : 'All departments'} / ${matrixPositionId ? getPositionName(Number(matrixPositionId)) : 'All positions'}`;

    return (
        <div className="hfdq-page hfdq-rule-set-page">
            <div className="hfdq-page-head">
                <div>
                    <p className="hfdq-breadcrumb"><i className="bi bi-house" /> 360 Feedback / Rule Sets</p>
                    <h2>Rule Sets</h2>
                    <p>Decide which competency questions appear for each employee level, evaluator relationship, department, and position.</p>
                </div>
                <div className="hfdq-actions">
                    <button className="hfd-btn hfd-btn-secondary" onClick={loadAll} disabled={loading || busy}><i className="bi bi-arrow-clockwise" /> Refresh</button>
                    <button className="hfd-btn hfd-btn-primary" onClick={openBuilder}><i className="bi bi-plus-lg" /> New Rule Set</button>
                </div>
            </div>

            {(error || success) && (
                <div className="hfdq-message-stack">
                    {error && <RuleToast tone="error" message={error} onClose={() => setError('')} />}
                    {success && <RuleToast tone="success" message={success} onClose={() => setSuccess('')} />}
                </div>
            )}

            <div className="hfdq-stats-grid">
                <RuleMetric label="Rule Sets" value={stats.ruleSets} note="Saved groups" tone="blue" />
                <RuleMetric label="Active Rules" value={stats.activeRules} note="Used by preview" tone="purple" />
                <RuleMetric label="Covered Cells" value={stats.coveredCombos} note="Level + relationship" tone="green" />
                <RuleMetric label="Conflicts" value={stats.conflicts} note={stats.conflicts ? 'Needs review' : 'No conflicts'} tone="orange" />
            </div>

            {conflictIds.size > 0 && (
                <div className="hfd-alert hfd-alert-warning">
                    <i className="bi bi-exclamation-triangle" />
                    Some active Rule Sets overlap the same evaluator role, level range, and exact department/position scope. Edit or disable the overlapping Rule Set instead of creating another active set for the same scope.
                </div>
            )}

            <section className="hfdq-rule-workspace">
                <div className="hfdq-rule-toolbar">
                    <input className="hfd-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rule sets by question, competency, role, or scope..." />
                    <select className="hfd-input" value={roleFilter} onChange={e => setRoleFilter(e.target.value as 'ALL' | RuleRole)}>
                        <option value="ALL">All roles</option>
                        {EVALUATOR_ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                    <select className="hfd-input" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                        <option value="ALL">All levels</option>
                        {LEVEL_OPTIONS.map(level => <option key={level.code} value={level.rank}>{level.label}</option>)}
                    </select>
                    <select className="hfd-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
                        <option value="ALL">All statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="DRAFT">Draft</option>
                        <option value="DISABLED">Disabled</option>
                        <option value="ARCHIVED">Archived</option>
                    </select>
                    <button className="hfd-btn hfd-btn-secondary" onClick={clearFilters}>Clear</button>
                </div>

                <div className="hfdq-rule-layout hfdq-rule-layout-normal">
                    <div className="hfdq-rule-main">
                        <div className="hfdq-rule-section-head">
                            <div>
                                <span>Rule Sets</span>
                                <strong>{filteredGroups.length} groups</strong>
                            </div>
                            <small>Rule Sets define which rating questions appear for each evaluator relationship and target employee group.</small>
                        </div>

                        {loading ? (
                            <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading question rules...</div>
                        ) : filteredGroups.length === 0 ? (
                            <div className="hfdq-empty-state">No rule sets found. Create a rule set to begin coverage.</div>
                        ) : (
                            <div className="hfdq-rule-set-list">
                                {filteredGroups.map(group => {
                                    const primaryQuestions = group.questions.slice(0, 4);
                                    return (
                                        <article key={group.key} className={`hfdq-rule-set-card ${group.active ? 'active' : 'inactive'} ${group.ruleSetStatus.toLowerCase()}`}>
                                            <div className="hfdq-rule-set-top">
                                                <div>
                                                    <h3>{group.ruleSetName || formatRuleSetTitle(group, getDepartmentName, getPositionName)}</h3>
                                                    <p>{formatRuleSetTitle(group, getDepartmentName, getPositionName)}</p>
                                                    {group.ruleSetDescription && <small className="hfdq-rule-purpose">{group.ruleSetDescription}</small>}
                                                    <small className="hfdq-rule-debug"><b>{ruleSetTypeLabel(group.ruleSetType)}</b> · {group.questionIds.length} final question{group.questionIds.length === 1 ? '' : 's'} · {group.roles.length} evaluator role{group.roles.length === 1 ? '' : 's'} · {group.rules.length} generated row{group.rules.length === 1 ? '' : 's'}</small>
                                                </div>
                                                <span className={`hfdq-status-pill ${group.ruleSetStatus.toLowerCase()}`}>{ruleSetStatusLabel(group.ruleSetStatus)}</span>
                                            </div>
                                            <div className="hfdq-rule-role-row">
                                                {EVALUATOR_ROLE_OPTIONS.map(role => (
                                                    <span key={role.value} className={group.roles.includes(role.value) ? 'selected' : ''}>{role.label}</span>
                                                ))}
                                            </div>
                                            <div className="hfdq-rule-question-list">
                                                {primaryQuestions.map(question => (
                                                    <span key={question.questionBankId}>{questionLabel(question)}</span>
                                                ))}
                                                {group.questions.length > primaryQuestions.length && <em>+{group.questions.length - primaryQuestions.length} more</em>}
                                            </div>
                                            {expandedRuleSetKeys.has(group.key) && (
                                                <div className="hfdq-rule-set-details">
                                                    <div>
                                                        <strong>Competency questions</strong>
                                                        {group.questions.map(question => <span key={question.questionBankId}>{question.questionCode || `Q-${question.questionBankId}`} · {question.questionText}</span>)}
                                                    </div>
                                                    <div>
                                                        <strong>Trace</strong>
                                                        <span>{group.rules.length} generated row{group.rules.length === 1 ? '' : 's'} · {group.active ? 'used in preview' : `ignored while ${ruleSetStatusLabel(group.ruleSetStatus).toLowerCase()}`}</span>
                                                        <span>{ruleScopeSpecificityLabel(group.rules[0])} scope · {formatRuleSetTitle(group, getDepartmentName, getPositionName)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="hfdq-rule-set-footer">
                                                {group.conflictCount > 0 ? <span className="hfdq-warning-chip"><i className="bi bi-exclamation-triangle" /> {group.conflictCount} overlaps</span> : <span className="hfdq-muted-chip">No conflicts</span>}
                                                <div>
                                                    <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => toggleRuleSetExpanded(group.key)} disabled={busy}>{expandedRuleSetKeys.has(group.key) ? 'Hide details' : 'Details'}</button>
                                                    <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => editRuleSet(group)} disabled={busy}>Edit</button>
                                                    <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => duplicateRuleSet(group)} disabled={busy}>Duplicate</button>
                                                    {group.ruleSetStatus === 'ARCHIVED' ? (
                                                        <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => changeRuleSetStatus(group, 'DRAFT')} disabled={busy}>Restore Draft</button>
                                                    ) : group.active ? (
                                                        <button className="hfd-btn hfd-btn-danger hfd-btn-sm" onClick={() => setRuleSetActive(group, false)} disabled={busy}>Disable</button>
                                                    ) : (
                                                        <button className="hfd-btn hfd-btn-primary hfd-btn-sm" onClick={() => setRuleSetActive(group, true)} disabled={busy}>Activate</button>
                                                    )}
                                                    {group.ruleSetStatus !== 'ARCHIVED' && (
                                                        <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => changeRuleSetStatus(group, 'ARCHIVED')} disabled={busy}>Archive</button>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <aside className="hfdq-coverage-card">
                        <div className="hfdq-rule-section-head compact hfdq-matrix-headbar">
                            <div>
                                <span>Coverage Matrix</span>
                                <strong>Questions by level and relationship</strong>
                            </div>
                        </div>
                        {visibleMatrixHealthItems.length > 0 && (
                            <div className="hfdq-matrix-health-strip" aria-label="Rule health summary">
                                {visibleMatrixHealthItems.map(item => (
                                    <span key={item.title} className={item.tone} title={item.message}>
                                        <i className={item.icon} />
                                        <b>{item.value}</b>
                                        {item.title}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="hfdq-matrix-scope-filters">
                            <select className="hfd-input" value={matrixDepartmentId} onChange={e => { setMatrixDepartmentId(e.target.value ? Number(e.target.value) : ''); setMatrixPositionId(''); }}>
                                <option value="">General departments</option>
                                {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                            </select>
                            <select className="hfd-input" value={matrixPositionId} onChange={e => setMatrixPositionId(e.target.value ? Number(e.target.value) : '')}>
                                <option value="">General positions</option>
                                {matrixPositions.map(position => <option key={position.id} value={position.id}>{position.positionTitle}</option>)}
                            </select>
                        </div>
                        <div className="hfdq-coverage-legend" aria-label="Coverage legend">
                            <span><b className="missing">0</b> Missing</span>
                            <span><b className="low">1–4</b> Low</span>
                            <span><b className="covered">5+</b> Covered</span>
                        </div>
                        <div className="hfdq-coverage-table">
                            <div className="hfdq-coverage-head">
                                <span>Level</span>
                                {EVALUATOR_ROLE_OPTIONS.map(role => <span key={role.value}>{role.short}</span>)}
                            </div>
                            {coverageMatrix.map(row => (
                                <div key={row.level.code} className="hfdq-coverage-row">
                                    <span>{row.level.code}</span>
                                    {row.cells.map(cell => {
                                        const selected = matrixSelection?.levelRank === row.level.rank && matrixSelection?.role === cell.role;
                                        return (
                                            <button
                                                type="button"
                                                key={cell.role}
                                                className={`${cell.count === 0 ? 'empty' : cell.count < 5 ? 'low' : 'covered'} ${selected ? 'selected' : ''}`}
                                                onClick={() => setMatrixSelection({ levelRank: row.level.rank, levelCode: row.level.code, role: cell.role })}
                                                title={`View coverage trace for ${row.level.code} ${getRoleLabel(cell.role)}`}
                                            >
                                                {cell.count}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        <small className="hfdq-matrix-help compact">Click any cell for a floating trace. Use scope filters to test department or position-specific coverage.</small>
                        {selectedMatrixCell && (
                            <div className={`hfdq-matrix-popover ${selectedMatrixCell.cell.count === 0 ? 'empty' : 'filled'}`} role="dialog" aria-label="Coverage trace">
                                <button type="button" className="hfdq-matrix-popover-close" onClick={() => setMatrixSelection(null)} aria-label="Close coverage trace"><i className="bi bi-x-lg" /></button>
                                <div className="hfdq-matrix-popover-head">
                                    <span>{selectedMatrixCell.level.code}</span>
                                    <strong>{getRoleLabel(selectedMatrixCell.cell.role)}</strong>
                                    <em>{selectedMatrixCell.cell.count} final unique question{selectedMatrixCell.cell.count === 1 ? '' : 's'} · {matrixScopeLabel}</em>
                                </div>
                                {selectedMatrixCell.cell.count === 0 ? (
                                    <div className="hfdq-matrix-popover-empty">
                                        <i className="bi bi-exclamation-octagon" />
                                        <p>No active questions cover this level, evaluator role, and selected scope. Create or activate a matching Rule Set.</p>
                                    </div>
                                ) : (
                                    <>
                                        {selectedMatrixCell.cell.duplicatesIgnored > 0 && (
                                            <div className="hfdq-matrix-dedupe-note">
                                                {selectedMatrixCell.cell.rawCount} matching generated rows were resolved into {selectedMatrixCell.cell.count} final unique questions.
                                            </div>
                                        )}
                                        <ul>
                                            {selectedMatrixCell.cell.matchedRules.map(rule => {
                                                const group = rule.ruleSetId != null ? ruleSetById.get(rule.ruleSetId) : undefined;
                                                return (
                                                    <li key={rule.id}>
                                                        <b>{rule.questionCode || `Q-${rule.questionBankId}`}</b>
                                                        <span>{rule.questionText || 'Untitled question'}</span>
                                                        <em>{group?.ruleSetName || (group ? formatRuleSetTitle(group, getDepartmentName, getPositionName) : `${formatGroupLevelRange(rule)} · ${ruleScopeSpecificityLabel(rule)}`)} · {ruleScopeSpecificityLabel(rule)} · {getRoleLabel(rule.evaluatorRelationshipType as RuleRole)}</em>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </>
                                )}
                            </div>
                        )}
                    </aside>
                </div>
            </section>

            {builderOpen && (
                <div className="hfdq-modal-shell" role="dialog" aria-modal="true">
                    <button className="hfdq-modal-backdrop" aria-label="Close rule set builder" onClick={closeBuilder} />
                    <div className="hfdq-modal hfdq-rule-builder-modal">
                        <div className="hfdq-modal-head">
                            <div>
                                <p>Rule Set Builder</p>
                                <h3>{editingGroup ? 'Edit Question Rule Set' : 'Create Question Rule Set'}</h3>
                            </div>
                            <button className="hfdq-icon-button" onClick={closeBuilder} disabled={busy} aria-label="Close"><i className="bi bi-x-lg" /></button>
                        </div>
                        {error && (
                            <div className="hfdq-modal-message error">
                                <i className={buildRuleMessage('error', error).icon} />
                                <div>
                                    <strong>{buildRuleMessage('error', error).title}</strong>
                                    <p>{buildRuleMessage('error', error).detail}</p>
                                </div>
                            </div>
                        )}
                        <div className="hfdq-rule-builder-body">
                            <div className="hfdq-builder-setup-column">
                                <section className="hfdq-builder-panel hfdq-rule-identity-panel">
                                    <h4>1. Rule Set identity</h4>
                                    <label className="hfd-field">
                                        <span className="hfd-label">Rule Set name</span>
                                        <input
                                            className="hfd-input"
                                            value={form.ruleSetName}
                                            onChange={e => patchForm({ ruleSetName: e.target.value })}
                                            placeholder={buildSuggestedRuleSetName(form)}
                                            maxLength={180}
                                        />
                                        <small>Use a clear name like “Senior Staff Core 360 Questions”. If blank, the suggested name is used.</small>
                                    </label>
                                    <label className="hfd-field">
                                        <span className="hfd-label">Purpose / notes</span>
                                        <textarea
                                            className="hfd-input"
                                            value={form.ruleSetDescription}
                                            onChange={e => patchForm({ ruleSetDescription: e.target.value })}
                                            placeholder="Optional note for HR, for example why this Rule Set exists."
                                            maxLength={500}
                                            rows={2}
                                        />
                                    </label>
                                </section>
                                <section className="hfdq-builder-panel">
                                    <h4>2. Target scope</h4>
                                    <div className="hfd-grid-2">
                                        <label className="hfd-field">
                                            <span className="hfd-label">Levels from</span>
                                            <select className="hfd-input" value={form.targetLevelMinRank} onChange={e => patchForm({ targetLevelMinRank: Number(e.target.value) })}>
                                                {LEVEL_OPTIONS.map(level => <option key={level.code} value={level.rank}>{level.label}</option>)}
                                            </select>
                                        </label>
                                        <label className="hfd-field">
                                            <span className="hfd-label">To</span>
                                            <select className="hfd-input" value={form.targetLevelMaxRank} onChange={e => patchForm({ targetLevelMaxRank: Number(e.target.value) })}>
                                                {LEVEL_OPTIONS.map(level => <option key={level.code} value={level.rank}>{level.label}</option>)}
                                            </select>
                                        </label>
                                    </div>
                                    <div className="hfd-grid-2">
                                        <label className="hfd-field">
                                            <span className="hfd-label">Department</span>
                                            <select className="hfd-input" value={form.targetDepartmentId} onChange={e => patchForm({ targetDepartmentId: e.target.value ? Number(e.target.value) : '', targetPositionId: '' })}>
                                                <option value="">All departments</option>
                                                {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                                            </select>
                                        </label>
                                        <label className="hfd-field">
                                            <span className="hfd-label">Position</span>
                                            <select className="hfd-input" value={form.targetPositionId} onChange={e => patchForm({ targetPositionId: e.target.value ? Number(e.target.value) : '' })}>
                                                <option value="">All positions</option>
                                                {builderPositions.map(position => <option key={position.id} value={position.id}>{position.positionTitle}</option>)}
                                            </select>
                                        </label>
                                    </div>
                                </section>

                                <section className="hfdq-builder-panel">
                                    <h4>3. Evaluator roles</h4>
                                    <button type="button" className="hfdq-select-all" onClick={selectAllRoles}>{form.evaluatorRoles.length === EVALUATOR_ROLE_OPTIONS.length ? 'Clear all roles' : 'All Roles'}</button>
                                    <div className="hfdq-role-panel compact">
                                        {EVALUATOR_ROLE_OPTIONS.map(option => (
                                            <label key={option.value} className="hfdq-role-check" title={option.help}>
                                                <input type="checkbox" checked={form.evaluatorRoles.includes(option.value)} onChange={() => toggleRole(option.value)} />
                                                <span>{option.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </section>

                                <section className="hfdq-builder-panel hfdq-builder-review-panel">
                                    <h4>4. Review before saving</h4>
                                    <div className="hfdq-builder-review-grid">
                                        <span>Level range</span><strong>L{String(form.targetLevelMinRank).padStart(2, '0')}–L{String(form.targetLevelMaxRank).padStart(2, '0')}</strong>
                                        <span>Scope</span><strong>{form.targetPositionId ? getPositionName(Number(form.targetPositionId)) : form.targetDepartmentId ? getDepartmentName(Number(form.targetDepartmentId)) : 'All departments / positions'}</strong>
                                        <span>Roles</span><strong>{form.evaluatorRoles.length || 0}</strong>
                                        <span>Questions</span><strong>{form.questionBankIds.length}</strong>
                                    </div>
                                    <label className="hfd-field hfdq-status-field">
                                        <span className="hfd-label">Status</span>
                                        <select className="hfd-input" value={form.ruleSetStatus} onChange={e => patchForm({ ruleSetStatus: e.target.value as RuleSetStatus })}>
                                            <option value="DRAFT">Draft — save but do not use yet</option>
                                            <option value="ACTIVE">Active — use in coverage, preview, and campaigns</option>
                                            <option value="DISABLED">Disabled — keep but ignore</option>
                                            <option value="ARCHIVED">Archived — hide from normal workflow</option>
                                        </select>
                                    </label>
                                    <span className="hfdq-rule-type-preview">{ruleSetTypeLabel(inferRuleSetType(formDepartmentId, formPositionId))}</span>
                                    {activeScopeOverlapGroup && form.ruleSetStatus === 'ACTIVE' && (
                                        <small className="hfdq-builder-warning">Active overlap: {activeScopeOverlapGroup.ruleSetName || formatGroupLevelRange(activeScopeOverlapGroup)} already covers this exact scope and selected role.</small>
                                    )}
                                    {selectedInheritedQuestions.length > 0 && (
                                        <small className="hfdq-builder-warning">{selectedInheritedQuestions.length} selected question(s) are already inherited from broader active Rule Sets. Remove them before saving.</small>
                                    )}
                                    <small>Active Rule Sets are used by Coverage Matrix, Dynamic Preview, and Campaign question resolution.</small>
                                </section>
                            </div>

                            <section className="hfdq-builder-panel hfdq-question-picker">
                                <div className="hfdq-picker-title-row">
                                    <div>
                                        <h4>5. Select questions</h4>
                                        <p>Choose active Question Bank items. Campaigns will snapshot the exact active versions later.</p>
                                    </div>
                                    <span>{form.questionBankIds.length} selected</span>
                                </div>
                                <div className="hfdq-question-picker-tools">
                                    <input
                                        className="hfd-input"
                                        value={builderQuestionSearch}
                                        onChange={e => setBuilderQuestionSearch(e.target.value)}
                                        placeholder="Search questions, code, or competency..."
                                    />
                                    <select className="hfd-input" value={builderCompetencyFilter} onChange={e => setBuilderCompetencyFilter(e.target.value)}>
                                        <option value="ALL">All competencies</option>
                                        {competencyBuckets.map(([competencyCode]) => <option key={competencyCode} value={competencyCode}>{getCompetencyLabel(competencyCode)}</option>)}
                                    </select>
                                    <button type="button" className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={clearSelectedQuestions} disabled={form.questionBankIds.length === 0}>Clear</button>
                                </div>
                                {selectedQuestions.length > 0 && (
                                    <div className="hfdq-selected-strip">
                                        {selectedQuestions.slice(0, 4).map(question => <span key={question.id}>{question.questionCode || `Q-${question.id}`}</span>)}
                                        {selectedQuestions.length > 4 && <em>+{selectedQuestions.length - 4} more</em>}
                                    </div>
                                )}
                                <div className="hfdq-question-picker-scroll">
                                    {filteredCompetencyBuckets.length === 0 ? (
                                        <div className="hfdq-question-picker-empty">No active questions match the current search/filter.</div>
                                    ) : filteredCompetencyBuckets.map(([competencyCode, bucket]) => (
                                        <div key={competencyCode} className="hfdq-question-bucket">
                                            <div>
                                                <strong>{getCompetencyLabel(competencyCode)} <em>{bucket.length}</em></strong>
                                                <button type="button" onClick={() => selectQuestionsByCompetency(competencyCode)}>Select all</button>
                                            </div>
                                            {bucket.map(question => {
                                                const inheritedReason = inheritedQuestionInfo.get(question.id);
                                                const selected = form.questionBankIds.includes(question.id);
                                                const disabled = Boolean(inheritedReason) && !selected;
                                                return (
                                                    <label key={question.id} className={inheritedReason ? 'inherited' : ''} title={inheritedReason || undefined}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            disabled={disabled}
                                                            onChange={() => toggleQuestion(question.id)}
                                                        />
                                                        <span className="hfdq-question-option-text"><b>{question.questionCode}</b><em>{question.questionText}</em>{inheritedReason && <small>{inheritedReason}</small>}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        <div className="hfdq-modal-actions">
                            <div className="hfdq-builder-summary">
                                {editingGroup ? 'Editing existing rule set · ' : ''}{form.questionBankIds.length} question{form.questionBankIds.length === 1 ? '' : 's'} · {form.evaluatorRoles.length} role{form.evaluatorRoles.length === 1 ? '' : 's'} selected · {ruleSetStatusLabel(form.ruleSetStatus)}
                            </div>
                            <button className="hfd-btn hfd-btn-secondary" onClick={closeBuilder} disabled={busy}>Cancel</button>
                            <button className="hfd-btn hfd-btn-primary" onClick={submitRuleSet} disabled={busy}>{editingGroup ? 'Update Rule Set' : form.ruleSetStatus === 'ACTIVE' ? 'Save & Activate' : `Save as ${ruleSetStatusLabel(form.ruleSetStatus)}`}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

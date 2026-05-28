import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../hr-feedback-dashboard.css';
import { hrFeedbackApi, type DynamicFormPreview, type DynamicPreviewQuestion, type QuestionRuleItem } from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import { positionService } from '../../../services/positionService';
import type { FeedbackDepartmentOption, FeedbackTargetCandidate } from '../../../types/feedbackCampaign';
import type { PositionLevelResponse, PositionResponse } from '../../../types/position';
import {
    EVALUATOR_ROLE_OPTIONS,
    getCompetencyLabel,
    getRoleLabel,
    normalizeText,
    type QuestionRuleRole,
} from './feedbackQuestionConfig.ts';

const LONG_FORM_THRESHOLD = 30;
const RECOMMENDED_MAX = 20;

const FALLBACK_LEVEL_OPTIONS = [
    { code: 'L01', rank: 1, label: 'L01 · Position level 1' },
    { code: 'L02', rank: 2, label: 'L02 · Position level 2' },
    { code: 'L03', rank: 3, label: 'L03 · Position level 3' },
    { code: 'L04', rank: 4, label: 'L04 · Position level 4' },
    { code: 'L05', rank: 5, label: 'L05 · Position level 5' },
    { code: 'L06', rank: 6, label: 'L06 · Position level 6' },
    { code: 'L07', rank: 7, label: 'L07 · Position level 7' },
    { code: 'L08', rank: 8, label: 'L08 · Position level 8' },
    { code: 'L09', rank: 9, label: 'L09 · Position level 9' },
];

type PreviewMode = 'criteria' | 'employee';
type PreviewDisplayMode = 'evaluator' | 'trace';
type LevelOption = { code: string; rank: number; label: string };

const PreviewToast = ({ message, onClose }: { message: string; onClose: () => void }) => (
    <div className="hfdq-message-stack">
        <div className="hfdq-toast error" role="status" aria-live="polite">
            <span className="hfdq-toast-icon"><i className="bi bi-x-octagon-fill" /></span>
            <div>
                <strong>Preview could not be generated</strong>
                <p>{message}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Dismiss message"><i className="bi bi-x-lg" /></button>
        </div>
    </div>
);

const rankFromLevelCode = (levelCode?: string | null) => {
    const cleaned = (levelCode ?? '').toUpperCase().trim();
    const digits = cleaned.match(/\d+/)?.[0];
    if (!digits) return Number.MAX_SAFE_INTEGER;
    return Number(digits);
};

const toLevelCodeFromRank = (rank: number) => `L${String(rank).padStart(2, '0')}`;

const normalizeLevelCode = (levelCode?: string | null) => {
    if (!levelCode) return '';
    const cleaned = levelCode.toUpperCase().trim();
    if (/^L\d{2,}$/.test(cleaned)) return cleaned;
    const digits = cleaned.match(/\d+/)?.[0];
    return digits ? toLevelCodeFromRank(Number(digits)) : '';
};

const formatGeneratedAt = (date: Date | null) => {
    if (!date) return 'Not generated yet';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const buildLevelOptions = (
    positionLevels: PositionLevelResponse[],
    positions: PositionResponse[],
    targetCandidates: FeedbackTargetCandidate[],
    rules: QuestionRuleItem[],
): LevelOption[] => {
    const levelCodes = new Map<string, number>();

    const addLevelCode = (value?: string | null) => {
        const normalized = normalizeLevelCode(value);
        if (!normalized) return;
        levelCodes.set(normalized, rankFromLevelCode(normalized));
    };

    positionLevels
        .filter(level => level.active !== false)
        .forEach(level => addLevelCode(level.levelCode));

    positions.forEach(position => addLevelCode(position.levelCode));
    targetCandidates.forEach(candidate => addLevelCode(candidate.levelCode));
    rules.forEach(rule => {
        addLevelCode(toLevelCodeFromRank(rule.targetLevelMinRank));
        addLevelCode(toLevelCodeFromRank(rule.targetLevelMaxRank));
    });

    const source = levelCodes.size > 0
        ? Array.from(levelCodes.entries()).map(([code, rank]) => ({ code, rank }))
        : FALLBACK_LEVEL_OPTIONS.map(({ code, rank }) => ({ code, rank }));

    return source
        .sort((a, b) => a.rank - b.rank || a.code.localeCompare(b.code))
        .map(level => {
            const relatedPositions = positions
                .filter(position => normalizeLevelCode(position.levelCode) === level.code)
                .map(position => position.positionTitle)
                .filter(Boolean);
            const uniqueTitles = Array.from(new Set(relatedPositions));
            const titlePreview = uniqueTitles.length > 0
                ? `${uniqueTitles.slice(0, 2).join(' / ')}${uniqueTitles.length > 2 ? ` +${uniqueTitles.length - 2}` : ''}`
                : `Position level ${level.rank}`;
            return { ...level, label: `${level.code} · ${titlePreview}` };
        });
};

const ruleSpecificityLabel = (rule: Pick<QuestionRuleItem, 'targetPositionId' | 'targetDepartmentId'>) => {
    if (rule.targetPositionId != null) return 'Position add-on';
    if (rule.targetDepartmentId != null) return 'Department add-on';
    return 'Base rule';
};

const ruleSpecificityScore = (rule: Pick<QuestionRuleItem, 'targetPositionId' | 'targetDepartmentId'>) => {
    if (rule.targetPositionId != null) return 3;
    if (rule.targetDepartmentId != null) return 2;
    return 1;
};

const ruleTypeLabel = (ruleSetType?: string | null) => {
    switch (ruleSetType) {
        case 'BASE': return 'Base Rule Set';
        case 'DEPARTMENT_ADD_ON': return 'Department Add-on';
        case 'POSITION_ADD_ON': return 'Position Add-on';
        case 'DEPARTMENT_POSITION_ADD_ON': return 'Department + Position Add-on';
        default: return 'Rule Set';
    }
};

const previewRuleMatches = (
    rule: QuestionRuleItem,
    levelRank: number,
    role: QuestionRuleRole,
    departmentId?: number | null,
    positionId?: number | null,
) => Boolean(rule.active)
    && rule.ruleSetStatus === 'ACTIVE'
    && rule.effectiveActive !== false
    && rule.questionStatus === 'ACTIVE'
    && rule.questionBankId != null
    && rule.evaluatorRelationshipType === role
    && rule.targetLevelMinRank <= levelRank
    && rule.targetLevelMaxRank >= levelRank
    && (rule.targetDepartmentId == null || rule.targetDepartmentId === departmentId)
    && (rule.targetPositionId == null || rule.targetPositionId === positionId);

const comparePreviewRules = (a: QuestionRuleItem, b: QuestionRuleItem) => {
    const specificity = ruleSpecificityScore(b) - ruleSpecificityScore(a);
    if (specificity !== 0) return specificity;
    const displayOrder = (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999);
    if (displayOrder !== 0) return displayOrder;
    return (a.id ?? 0) - (b.id ?? 0);
};

export default function DynamicFormPreviewTab() {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState<FeedbackDepartmentOption[]>([]);
    const [positions, setPositions] = useState<PositionResponse[]>([]);
    const [positionLevels, setPositionLevels] = useState<PositionLevelResponse[]>([]);
    const [targetCandidates, setTargetCandidates] = useState<FeedbackTargetCandidate[]>([]);
    const [levelCode, setLevelCode] = useState('L06');
    const [relationshipType, setRelationshipType] = useState<QuestionRuleRole>('MANAGER');
    const [targetDepartmentId, setTargetDepartmentId] = useState<number | ''>('');
    const [targetPositionId, setTargetPositionId] = useState<number | ''>('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
    const [previewMode, setPreviewMode] = useState<PreviewMode>('criteria');
    const [displayMode, setDisplayMode] = useState<PreviewDisplayMode>('evaluator');
    const [preview, setPreview] = useState<DynamicFormPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [bootLoading, setBootLoading] = useState(true);
    const [error, setError] = useState('');
    const [previewSearch, setPreviewSearch] = useState('');
    const [rules, setRules] = useState<QuestionRuleItem[]>([]);
    const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
    const [lastGeneratedScenarioKey, setLastGeneratedScenarioKey] = useState('');

    const levelOptions = useMemo(
        () => buildLevelOptions(positionLevels, positions, targetCandidates, rules),
        [positionLevels, positions, targetCandidates, rules],
    );

    const scenarioKey = useMemo(() => JSON.stringify({
        levelCode,
        relationshipType,
        targetDepartmentId: targetDepartmentId === '' ? null : Number(targetDepartmentId),
        targetPositionId: targetPositionId === '' ? null : Number(targetPositionId),
    }), [levelCode, relationshipType, targetDepartmentId, targetPositionId]);

    const loadReferenceData = async () => {
        setBootLoading(true);
        try {
            const [loadedDepartments, loadedPositions, loadedPositionLevels, loadedRules, loadedCandidates] = await Promise.all([
                feedbackCampaignApi.getDepartments().catch(() => []),
                positionService.getPositions().catch(() => []),
                positionService.getPositionLevels().catch(() => []),
                hrFeedbackApi.getQuestionRules().catch(() => []),
                feedbackCampaignApi.getTargetCandidates({ readiness: 'ALL' }).catch(() => []),
            ]);
            const limitedCandidates = loadedCandidates.slice(0, 150);
            const derivedLevels = buildLevelOptions(loadedPositionLevels, loadedPositions, limitedCandidates, loadedRules);

            setDepartments(loadedDepartments);
            setPositions(loadedPositions);
            setPositionLevels(loadedPositionLevels);
            setRules(loadedRules);
            setTargetCandidates(limitedCandidates);
            setLevelCode(current => derivedLevels.some(level => level.code === current)
                ? current
                : derivedLevels.find(level => level.code === 'L06')?.code ?? derivedLevels[0]?.code ?? 'L06');
        } finally {
            setBootLoading(false);
        }
    };

    const generatePreview = async () => {
        if (!levelCode) return;
        setLoading(true);
        setError('');
        try {
            const result = await hrFeedbackApi.previewDynamicForm({
                levelCode,
                relationshipType,
                targetDepartmentId: targetDepartmentId === '' ? null : Number(targetDepartmentId),
                targetPositionId: targetPositionId === '' ? null : Number(targetPositionId),
            });
            setPreview(result);
            setLastGeneratedAt(new Date());
            setLastGeneratedScenarioKey(scenarioKey);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate dynamic form preview.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReferenceData();
    }, []);

    useEffect(() => {
        if (!bootLoading) generatePreview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bootLoading]);

    const selectedEmployee = useMemo(
        () => targetCandidates.find(candidate => candidate.employeeId === Number(selectedEmployeeId)) ?? null,
        [selectedEmployeeId, targetCandidates],
    );

    const normalizeCandidateLevel = (candidateLevelCode?: string | null) => {
        const normalized = normalizeLevelCode(candidateLevelCode);
        return levelOptions.some(level => level.code === normalized) ? normalized : '';
    };

    const applyEmployeeScenario = (employeeId: number | '') => {
        setSelectedEmployeeId(employeeId);
        const employee = targetCandidates.find(candidate => candidate.employeeId === Number(employeeId));
        if (!employee) return;
        const employeeLevel = normalizeCandidateLevel(employee.levelCode);
        if (employeeLevel) setLevelCode(employeeLevel);
        setTargetDepartmentId(employee.currentDepartmentId ?? '');
        setTargetPositionId(employee.positionId ?? '');
    };

    const questions = useMemo(() => preview?.sections.flatMap(section => section.questions) ?? [], [preview]);
    const filteredQuestions = useMemo(() => {
        const search = normalizeText(previewSearch);
        return questions.filter(question => !search
            || normalizeText(question.questionText).includes(search)
            || normalizeText(question.questionCode).includes(search)
            || normalizeText(question.competencyCode).includes(search));
    }, [previewSearch, questions]);

    const groupedQuestions = useMemo(() => {
        const groups = new Map<string, { code: string; label: string; questions: DynamicPreviewQuestion[] }>();
        filteredQuestions.forEach(question => {
            const code = question.competencyCode || 'UNCATEGORIZED';
            const existing = groups.get(code) ?? { code, label: getCompetencyLabel(code), questions: [] };
            existing.questions.push(question);
            groups.set(code, existing);
        });
        return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [filteredQuestions]);

    const metrics = useMemo(() => {
        const estimatedMinutes = questions.length === 0 ? '0 min' : `${Math.max(3, Math.ceil(questions.length * 0.8))} min`;
        const competencyCount = new Set(questions.map(question => question.competencyCode || 'UNCATEGORIZED')).size;
        return { total: questions.length, estimatedMinutes, competencyCount };
    }, [questions]);

    const roleLabel = EVALUATOR_ROLE_OPTIONS.find(option => option.value === relationshipType)?.label ?? relationshipType;
    const selectedLevelLabel = levelOptions.find(level => level.code === levelCode)?.label ?? levelCode;
    const selectedDepartmentName = departments.find(department => department.id === Number(targetDepartmentId))?.name ?? 'All departments';
    const selectedPositionName = positions.find(position => position.id === Number(targetPositionId))?.positionTitle ?? 'All positions';
    const previewIsStale = Boolean(preview) && lastGeneratedScenarioKey !== scenarioKey;

    const scenarioChips = [
        { label: 'Level', value: selectedLevelLabel },
        { label: 'Evaluator', value: roleLabel },
        { label: 'Department', value: selectedDepartmentName },
        { label: 'Position', value: selectedPositionName },
    ];

    const previewSourceByQuestionCode = useMemo(() => {
        const levelRank = rankFromLevelCode(levelCode);
        const departmentId = targetDepartmentId === '' ? null : Number(targetDepartmentId);
        const positionId = targetPositionId === '' ? null : Number(targetPositionId);
        const byQuestion = new Map<number, QuestionRuleItem>();
        rules
            .filter(rule => previewRuleMatches(rule, levelRank, relationshipType, departmentId, positionId))
            .sort(comparePreviewRules)
            .forEach(rule => {
                if (!byQuestion.has(rule.questionBankId)) byQuestion.set(rule.questionBankId, rule);
            });
        const byCode = new Map<string, QuestionRuleItem>();
        byQuestion.forEach(rule => {
            if (rule.questionCode) byCode.set(rule.questionCode, rule);
        });
        return byCode;
    }, [levelCode, relationshipType, rules, targetDepartmentId, targetPositionId]);

    const getPreviewSource = (questionCode: string) => previewSourceByQuestionCode.get(questionCode);

    const getPreviewSourceLine = (questionCode: string) => {
        const rule = getPreviewSource(questionCode);
        if (!rule) {
            return `Resolved from active rules · ${selectedLevelLabel} · ${roleLabel} · ${selectedDepartmentName} · ${selectedPositionName}`;
        }
        const levelRange = `${toLevelCodeFromRank(rule.targetLevelMinRank)}–${toLevelCodeFromRank(rule.targetLevelMaxRank)}`;
        const ruleSet = rule.ruleSetName || (rule.ruleSetId ? `Rule Set #${rule.ruleSetId}` : 'Rule Set');
        return `${ruleSet} · ${ruleSpecificityLabel(rule)} · ${getRoleLabel(rule.evaluatorRelationshipType as QuestionRuleRole)} · ${levelRange}`;
    };

    const warnings = useMemo(() => {
        const items: Array<{ tone: 'warning' | 'danger' | 'info'; icon: string; title: string; message: string }> = [];
        if (previewIsStale) {
            items.push({
                tone: 'info',
                icon: 'bi bi-arrow-repeat',
                title: 'Scenario changed.',
                message: 'Generate again to refresh the preview for the current criteria.',
            });
        }
        if (!preview) return items;
        if (metrics.total === 0) {
            items.push({
                tone: 'danger',
                icon: 'bi bi-exclamation-octagon',
                title: 'No questions matched this scenario.',
                message: 'Check active Rule Sets, active questions, level, evaluator role, department, and position.',
            });
        }
        if (metrics.total > LONG_FORM_THRESHOLD) {
            items.push({
                tone: 'warning',
                icon: 'bi bi-clock-history',
                title: `Long preview: ${metrics.total} questions`,
                message: 'Consider reducing the question set before using it in a campaign.',
            });
        } else if (metrics.total > RECOMMENDED_MAX) {
            items.push({
                tone: 'warning',
                icon: 'bi bi-bar-chart-line',
                title: `${metrics.total} questions included`,
                message: 'A focused 360 form usually works better with 10–20 questions.',
            });
        }
        return items;
    }, [preview, metrics, previewIsStale]);

    const clearPreviewFilters = () => setPreviewSearch('');
    const goToRules = () => navigate('/hr/feedback/rules');

    const renderScenarioChips = () => (
        <div className="hfdq-scenario-chip-row" aria-label="Current preview scenario">
            {scenarioChips.map(chip => (
                <span key={chip.label}>
                    <small>{chip.label}</small>
                    <strong>{chip.value}</strong>
                </span>
            ))}
        </div>
    );

    const renderEvaluatorView = () => {
        let questionNumber = 0;
        return (
            <div className="hfdq-final-form-preview-list">
                {groupedQuestions.map(group => (
                    <section key={group.code} className="hfdq-final-competency-section">
                        <header>
                            <div>
                                <span>{group.questions.length}</span>
                                <h4>{group.label}</h4>
                            </div>
                        </header>
                        <div className="hfdq-final-question-stack">
                            {group.questions.map(question => {
                                questionNumber += 1;
                                return (
                                    <article key={`${question.questionCode}-${questionNumber}`} className="hfdq-final-question-card">
                                        <div className="hfdq-final-question-index">{questionNumber}</div>
                                        <div className="hfdq-final-question-body">
                                            <div className="hfdq-final-question-meta">
                                                <span>{question.questionCode}</span>
                                                <em>Rating 1–5 + required comment</em>
                                            </div>
                                            <div className="hfdq-final-question-copy">
                                                <p>{question.questionText}</p>
                                                {question.helpText?.trim() ? (
                                                    <span className="hfdq-guidance-indicator" title={question.helpText}>
                                                        <i className="bi bi-question-circle" /> Guidance
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="hfdq-final-response-mock" aria-hidden="true">
                                                {[1, 2, 3, 4, 5].map(value => <span key={value}>{value}</span>)}
                                            </div>
                                            <div className="hfdq-final-comment-mock">Evaluator must write the reason for the rating.</div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        );
    };

    const renderTraceView = () => {
        let questionNumber = 0;
        return (
            <div className="hfdq-final-form-preview-list trace-mode">
                {groupedQuestions.map(group => (
                    <section key={group.code} className="hfdq-final-competency-section">
                        <header>
                            <div>
                                <span>{group.questions.length}</span>
                                <h4>{group.label}</h4>
                            </div>
                        </header>
                        <div className="hfdq-final-question-stack">
                            {group.questions.map(question => {
                                questionNumber += 1;
                                const source = getPreviewSource(question.questionCode);
                                return (
                                    <article key={`${question.questionCode}-${questionNumber}`} className="hfdq-final-trace-card">
                                        <div className="hfdq-final-question-index">{questionNumber}</div>
                                        <div className="hfdq-final-question-body">
                                            <div className="hfdq-final-question-meta">
                                                <span>{question.questionCode}</span>
                                                {source && <em>{ruleTypeLabel(source.ruleSetType)}</em>}
                                            </div>
                                            <p>{question.questionText}</p>
                                            <div className="hfdq-preview-source-line"><i className="bi bi-diagram-3" /> {getPreviewSourceLine(question.questionCode)}</div>
                                            {source && <div className="hfdq-source-meta">
                                                <span>{ruleSpecificityLabel(source)}</span>
                                                <span>{getRoleLabel(source.evaluatorRelationshipType as QuestionRuleRole)}</span>
                                            </div>}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        );
    };

    const renderScenarioControls = () => (
        <aside className="hfdq-scenario-card-final">
            <div className="hfdq-scenario-card-head">
                <div>
                    <span className="hfdq-kicker">Preview Scenario</span>
                    <h3>{previewMode === 'employee' ? 'Sample employee' : 'Manual criteria'}</h3>
                </div>
                <div className="hfdq-mode-switch compact" role="tablist" aria-label="Preview mode">
                    <button type="button" className={previewMode === 'criteria' ? 'active' : ''} onClick={() => setPreviewMode('criteria')}>Criteria</button>
                    <button type="button" className={previewMode === 'employee' ? 'active' : ''} onClick={() => setPreviewMode('employee')}>Employee</button>
                </div>
            </div>

            {previewMode === 'employee' ? (
                <>
                    <label className="hfd-field">
                        <span className="hfd-label">Target Employee</span>
                        <select className="hfd-input" value={selectedEmployeeId} onChange={e => applyEmployeeScenario(e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Choose employee...</option>
                            {targetCandidates.map(candidate => (
                                <option key={candidate.employeeId} value={candidate.employeeId}>
                                    {candidate.employeeName} {candidate.levelCode ? `· ${candidate.levelCode}` : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    {selectedEmployee ? (
                        <div className="hfdq-readonly-scenario-grid">
                            <div><span>Level</span><strong>{selectedLevelLabel}</strong></div>
                            <div><span>Department</span><strong>{selectedDepartmentName}</strong></div>
                            <div><span>Position</span><strong>{selectedPositionName}</strong></div>
                        </div>
                    ) : (
                        <div className="hfdq-employee-empty-note">Choose an employee to auto-fill level, department, and position.</div>
                    )}
                    <small className="hfd-field-hint">Employee mode uses employee data for level, department, and position. Switch to Criteria mode to test manually.</small>
                </>
            ) : (
                <div className="hfdq-criteria-grid-final">
                    <label className="hfd-field">
                        <span className="hfd-label">Target Level</span>
                        <select className="hfd-input" value={levelCode} onChange={e => setLevelCode(e.target.value)}>
                            {levelOptions.map(level => <option key={level.code} value={level.code}>{level.label}</option>)}
                        </select>
                    </label>
                    <label className="hfd-field">
                        <span className="hfd-label">Department</span>
                        <select className="hfd-input" value={targetDepartmentId} onChange={e => setTargetDepartmentId(e.target.value ? Number(e.target.value) : '')}>
                            <option value="">All departments</option>
                            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                        </select>
                    </label>
                    <label className="hfd-field">
                        <span className="hfd-label">Position</span>
                        <select className="hfd-input" value={targetPositionId} onChange={e => setTargetPositionId(e.target.value ? Number(e.target.value) : '')}>
                            <option value="">All positions</option>
                            {positions.map(position => <option key={position.id} value={position.id}>{position.positionTitle}</option>)}
                        </select>
                    </label>
                </div>
            )}

            <div className="hfdq-scenario-footer-final">
                <label className="hfd-field">
                    <span className="hfd-label">Evaluator Role</span>
                    <select className="hfd-input" value={relationshipType} onChange={e => setRelationshipType(e.target.value as QuestionRuleRole)}>
                        {EVALUATOR_ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </label>
                <button className="hfd-btn hfd-btn-primary" type="button" onClick={generatePreview} disabled={loading || bootLoading || !levelCode}>
                    <i className="bi bi-lightning-charge" /> {previewIsStale ? 'Update Preview' : 'Generate'}
                </button>
            </div>
        </aside>
    );

    return (
        <div className="hfdq-page hfdq-dynamic-preview-page final-preview-clean">
            <div className="hfdq-page-head compact-preview-head">
                <div>
                    <p className="hfdq-breadcrumb"><i className="bi bi-house" /> 360 Feedback / Dynamic Preview</p>
                    <h2>Dynamic Preview</h2>
                    <p>Check the exact competency questions an evaluator will see before HR launches a campaign.</p>
                </div>
                <div className="hfdq-actions">
                    <button className="hfd-btn hfd-btn-secondary" type="button" onClick={goToRules}><i className="bi bi-sliders" /> Rule Sets</button>
                </div>
            </div>

            {error && <PreviewToast message={error} onClose={() => setError('')} />}

            <section className="hfdq-preview-command-center">
                {renderScenarioControls()}
                <div className="hfdq-preview-summary-final">
                    <div><span>Questions</span><strong>{metrics.total}</strong><small>rating + comment</small></div>
                    <div><span>Competencies</span><strong>{metrics.competencyCount}</strong><small>grouped preview</small></div>
                    <div><span>Estimated Time</span><strong>{metrics.estimatedMinutes}</strong><small>approx. effort</small></div>
                </div>
            </section>

            <section className="hfdq-preview-final-workspace">
                <main className="hfdq-preview-main-stage final-form-stage">
                    <div className="hfdq-preview-stage-toolbar">
                        <div>
                            <span className="hfdq-kicker">Evaluator preview</span>
                            <h3>{roleLabel} view · {levelCode}</h3>
                            <p>{filteredQuestions.length} visible of {metrics.total} final questions · Last generated {formatGeneratedAt(lastGeneratedAt)}</p>
                        </div>
                        <div className="hfdq-mode-switch compact" role="tablist" aria-label="Preview display mode">
                            <button type="button" className={displayMode === 'evaluator' ? 'active' : ''} onClick={() => setDisplayMode('evaluator')}>Evaluator view</button>
                            <button type="button" className={displayMode === 'trace' ? 'active' : ''} onClick={() => setDisplayMode('trace')}>Rule trace</button>
                        </div>
                    </div>

                    {renderScenarioChips()}

                    {(warnings.length > 0 || metrics.total > 0) && (
                        <div className="hfdq-preview-inline-health">
                            {warnings.length === 0 ? (
                                <div className="ok"><i className="bi bi-check-circle" /> Preview is ready for this scenario.</div>
                            ) : warnings.map(item => (
                                <div key={`${item.title}-${item.tone}`} className={item.tone}><i className={item.icon} /> <strong>{item.title}</strong><span>{item.message}</span></div>
                            ))}
                        </div>
                    )}

                    <div className="hfdq-preview-filter-panel final-search-row">
                        <input className="hfd-input" value={previewSearch} onChange={e => setPreviewSearch(e.target.value)} placeholder="Search generated questions, code, or competency..." />
                        <button className="hfdq-clear" type="button" onClick={clearPreviewFilters}>Clear</button>
                    </div>

                    {loading || bootLoading ? (
                        <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Generating preview...</div>
                    ) : !preview || preview.totalQuestions === 0 ? (
                        <div className="hfdq-preview-empty refined final-empty">
                            <i className="bi bi-ui-checks" />
                            <h4>No questions matched this scenario</h4>
                            <p>Check active Rule Sets, active questions, target level, evaluator role, department, and position.</p>
                            <button className="hfd-btn hfd-btn-secondary" type="button" onClick={goToRules}><i className="bi bi-sliders" /> Review Question Rules</button>
                        </div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="hfdq-preview-empty refined final-empty">
                            <i className="bi bi-search" />
                            <h4>No questions match the search</h4>
                            <p>Clear the search value to see the generated questions again.</p>
                            <button className="hfd-btn hfd-btn-secondary" type="button" onClick={clearPreviewFilters}>Clear Search</button>
                        </div>
                    ) : displayMode === 'evaluator' ? renderEvaluatorView() : renderTraceView()}
                </main>
            </section>
        </div>
    );
}

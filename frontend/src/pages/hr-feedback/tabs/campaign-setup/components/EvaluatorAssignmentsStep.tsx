import { useState, type Dispatch, type SetStateAction } from 'react';
import type { FeedbackRelationshipType } from '../../../../../types/feedbackCampaign';


type StateSetter = Dispatch<SetStateAction<any>>;

type RelationshipConfig = {
    key: FeedbackRelationshipType;
    title: string;
    helper: string;
    icon: string;
    enabledKey: string;
    weightDefault: number;
};

const RELATIONSHIP_RULES: RelationshipConfig[] = [
    {
        key: 'SELF',
        title: 'Self Review',
        helper: 'Recipient evaluates their own performance.',
        icon: 'bi-person-check',
        enabledKey: 'includeSelf',
        weightDefault: 10,
    },
    {
        key: 'MANAGER',
        title: 'Manager Review',
        helper: 'Uses eligible manager reviewers.',
        icon: 'bi-person-workspace',
        enabledKey: 'includeManager',
        weightDefault: 30,
    },
    {
        key: 'PEER',
        title: 'Peer Review',
        helper: 'Uses eligible peer reviewers.',
        icon: 'bi-people',
        enabledKey: 'includePeers',
        weightDefault: 40,
    },
    {
        key: 'SUBORDINATE',
        title: 'Subordinate Review',
        helper: 'Uses eligible subordinate reviewers.',
        icon: 'bi-person-lines-fill',
        enabledKey: 'includeSubordinates',
        weightDefault: 20,
    },
];

const MANUAL_RELATIONSHIPS: FeedbackRelationshipType[] = ['MANAGER', 'PEER', 'SUBORDINATE'];

interface Props {
    savedTargetIds: any;
    hasUnsavedTargetChanges: any;
    hasUnavailableSelection: any;
    assignmentPreview: any;
    previewWarningCount: any;
    hasDraftEvaluatorChanges: any;
    hasSavedEvaluatorAssignments: any;
    selectedCampaign: any;
    evaluatorConfig: any;
    setEvaluatorConfig: StateSetter;
    peerReviewerCount: any;
    setPeerReviewerCount: StateSetter;
    canEditEvaluators: any;
    relationshipWeightTotal: any;
    scoringConfig: any;
    updateRelationshipWeight: any;
    setScoringConfig: StateSetter;
    savingScoringConfig: any;
    saveScoringConfig: any;
    previewingAssignments: any;
    generatingAssignments: any;
    previewEvaluatorRules: any;
    hasAssignmentPreview: any;
    generateEvaluatorAssignments: any;
    setActiveStepKey: StateSetter;
    cleanEvaluatorNote: any;
    evaluatorTargets: any;
    previewItemByTarget: any;
    assignmentsByTarget: any;
    assignmentReadinessClass: any;
    activeEvaluatorTargetId: any;
    setSelectedEvaluatorTargetId: StateSetter;
    activeEvaluatorTarget: any;
    activePreviewItem: any;
    activeAssignmentsByRelationship: any;
    relationshipIcon: any;
    relationshipLabel: any;
    initials: any;
    assignmentSourceLabel: any;
    assignmentStatusLabel: any;
    removingAssignmentId: any;
    removeEvaluator: any;
    manualForm: any;
    setManualForm: StateSetter;
    relationshipOptions: any;
    evaluatorSearch: any;
    setEvaluatorSearch: StateSetter;
    evaluatorCandidates: any;
    relationshipCandidatesLoading: any;
    relationshipCandidatesError: any;
    manualCandidateNotice: any;
    manualEvaluatorEligibilityError: any;
    activeTargetSummary: any;
    addingEvaluator: any;
    addEvaluator: any;
}

const clampCount = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? Math.trunc(value) : min));

const comparableConfig = (config: any) => ({
    includeManager: config?.includeManager !== false,
    includePeers: config?.includePeers !== false,
    includeSubordinates: config?.includeSubordinates !== false,
    includeSelf: config?.includeSelf !== false,
    peerMinCount: Number(config?.peerMinCount ?? 2),
    peerMaxCount: Number(config?.peerMaxCount ?? config?.peerCount ?? 3),
    subordinateMinCount: Number(config?.subordinateMinCount ?? 0),
    subordinateMaxCount: Number(config?.subordinateMaxCount ?? 3),
    includeTeamPeers: config?.includeTeamPeers !== false,
    includeDepartmentPeers: config?.includeDepartmentPeers !== false,
    includeProjectPeers: config?.includeProjectPeers === true,
    includeCrossTeamPeers: config?.includeCrossTeamPeers === true,
});

const configsMatch = (left: any, right: any) => JSON.stringify(comparableConfig(left)) === JSON.stringify(comparableConfig(right));

export function EvaluatorAssignmentsStep({
                                             savedTargetIds,
                                             hasUnsavedTargetChanges,
                                             hasUnavailableSelection,
                                             assignmentPreview,
                                             previewWarningCount,
                                             hasDraftEvaluatorChanges,
                                             hasSavedEvaluatorAssignments,
                                             selectedCampaign,
                                             evaluatorConfig,
                                             setEvaluatorConfig,
                                             peerReviewerCount,
                                             setPeerReviewerCount,
                                             canEditEvaluators,
                                             relationshipWeightTotal,
                                             scoringConfig,
                                             updateRelationshipWeight,
                                             setScoringConfig,
                                             savingScoringConfig,
                                             saveScoringConfig,
                                             previewingAssignments,
                                             generatingAssignments,
                                             previewEvaluatorRules,
                                             hasAssignmentPreview,
                                             generateEvaluatorAssignments,
                                             setActiveStepKey,
                                             cleanEvaluatorNote,
                                             evaluatorTargets,
                                             previewItemByTarget,
                                             assignmentsByTarget,
                                             assignmentReadinessClass,
                                             activeEvaluatorTargetId,
                                             setSelectedEvaluatorTargetId,
                                             activeEvaluatorTarget,
                                             activePreviewItem,
                                             activeAssignmentsByRelationship,
                                             relationshipIcon,
                                             relationshipLabel,
                                             initials,
                                             assignmentSourceLabel,
                                             assignmentStatusLabel,
                                             removingAssignmentId,
                                             removeEvaluator,
                                             manualForm,
                                             setManualForm,
                                             relationshipOptions,
                                             evaluatorSearch,
                                             setEvaluatorSearch,
                                             evaluatorCandidates,
                                             relationshipCandidatesLoading,
                                             relationshipCandidatesError,
                                             manualCandidateNotice,
                                             manualEvaluatorEligibilityError,
                                             activeTargetSummary,
                                             addingEvaluator,
                                             addEvaluator,
                                         }: Props) {
    const [manualOpen, setManualOpen] = useState(false);
    const disabled = savedTargetIds.length === 0 || hasUnsavedTargetChanges || hasUnavailableSelection;
    const weightReady = Math.round(Number(relationshipWeightTotal ?? 0) * 100) / 100 === 100;
    const rulePreviewStale = hasAssignmentPreview && assignmentPreview?.evaluatorConfig && !configsMatch(assignmentPreview.evaluatorConfig, evaluatorConfig);
    const saveEvaluatorDisabled = !canEditEvaluators
        || previewingAssignments
        || generatingAssignments
        || !hasAssignmentPreview
        || rulePreviewStale;

    const updateConfig = (updates: Record<string, unknown>) => {
        setEvaluatorConfig((current: any) => ({
            ...current,
            ...updates,
            peerCount: updates.peerMaxCount ?? current.peerMaxCount ?? current.peerCount,
        }));
    };
    const enabledCount = RELATIONSHIP_RULES.filter(rule => evaluatorConfig?.[rule.enabledKey] !== false).length;

    const openManual = (relationshipType: FeedbackRelationshipType) => {
        setManualForm((current: any) => ({
            ...current,
            relationshipType,
            evaluatorEmployeeId: 0,
            reason: '',
        }));
        setEvaluatorSearch('');
        setManualOpen(true);
    };

    const handleAddManual = async () => {
        await addEvaluator();
    };

    return (
        <section className={`hfdq-table-card hfde-card hfde-workbench ${disabled ? 'disabled' : ''}`}>
            <div className="hfdc-card-head hfde-workbench-head">
                <div>
                    <span className="hfdq-kicker">Step 3</span>
                    <h3>Evaluator & Weight Rules</h3>
                    <p>Configure reviewer groups, generate a strict relationship-based preview, then save the evaluator network.</p>
                </div>
                <div className="hfdt-summary-pills">
                    <span><strong>{savedTargetIds.length}</strong> recipients</span>
                    <span><strong>{enabledCount}</strong> groups</span>
                    <span><strong>{assignmentPreview.totalEvaluatorsGenerated}</strong> evaluators</span>
                    <span><strong>{previewWarningCount}</strong> review</span>
                </div>
            </div>

            {!selectedCampaign ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save campaign details first</strong><p>Evaluator rules become available after the campaign draft is saved.</p></div>
            ) : savedTargetIds.length === 0 ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-people" /><strong>Save recipients first</strong><p>Select and save feedback recipients before preparing evaluator rules.</p></div>
            ) : hasUnsavedTargetChanges ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-cloud-arrow-up" /><strong>Save recipient changes</strong><p>Evaluator preview uses saved recipients only. Save or reset changes before continuing.</p></div>
            ) : hasUnavailableSelection ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-slash-circle" /><strong>Remove unavailable recipients</strong><p>Only available recipients can continue to evaluator preparation.</p></div>
            ) : (
                <div className="hfde-workbench-layout">
                    <div className="hfde-rules-panel">
                        <div className="hfde-section-head hfde-v2-section-head">
                            <div>
                                <span className="hfdq-kicker">Rules</span>
                                <h4>Relationship rules</h4>
                                <p>Reviewer groups are generated from eligible reviewers for each recipient. Peer reviewers are not company-wide suggestions.</p>
                            </div>
                            <span className={`hfdcw-total ${weightReady ? 'ready' : 'blocked'}`}>{relationshipWeightTotal}% total</span>
                        </div>

                        <div className="hfde-rule-grid compact-rules">
                            {RELATIONSHIP_RULES.map(rule => {
                                const enabled = evaluatorConfig?.[rule.enabledKey] !== false;
                                const weightItem = scoringConfig.relationshipWeights.find((weight: any) => weight.relationshipType === rule.key);
                                const assignmentCount = Number(weightItem?.assignmentCount ?? 0);
                                return (
                                    <article key={rule.key} className={`hfde-rule-card ${enabled ? 'enabled' : 'disabled-rule'} ${rule.key.toLowerCase()}`}>
                                        <div className="hfde-rule-top">
                                            <span className={`hfde-role-icon ${rule.key.toLowerCase()}`}><i className={`bi ${rule.icon}`} /></span>
                                            <label className="hfde-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={enabled}
                                                    disabled={!canEditEvaluators}
                                                    onChange={(event: any) => updateConfig({ [rule.enabledKey]: event.target.checked })}
                                                />
                                                <span>{enabled ? 'Enabled' : 'Off'}</span>
                                            </label>
                                        </div>
                                        <h5>{rule.title}</h5>
                                        <p>{rule.helper}</p>

                                        {rule.key === 'PEER' && enabled && (
                                            <div className="hfde-count-row">
                                                <label>
                                                    <span>Min</span>
                                                    <input
                                                        className="hfd-input"
                                                        type="number"
                                                        min={0}
                                                        max={10}
                                                        value={Number(evaluatorConfig.peerMinCount ?? 2)}
                                                        disabled={!canEditEvaluators}
                                                        onChange={(event: any) => updateConfig({ peerMinCount: clampCount(Number(event.target.value), 0, Number(evaluatorConfig.peerMaxCount ?? 3)) })}
                                                    />
                                                </label>
                                                <label>
                                                    <span>Max</span>
                                                    <input
                                                        className="hfd-input"
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        value={Number(evaluatorConfig.peerMaxCount ?? peerReviewerCount ?? 3)}
                                                        disabled={!canEditEvaluators}
                                                        onChange={(event: any) => setPeerReviewerCount(clampCount(Number(event.target.value), 1, 10))}
                                                    />
                                                </label>
                                            </div>
                                        )}

                                        {rule.key === 'SUBORDINATE' && enabled && (
                                            <div className="hfde-count-row">
                                                <label>
                                                    <span>Min</span>
                                                    <input
                                                        className="hfd-input"
                                                        type="number"
                                                        min={0}
                                                        max={10}
                                                        value={Number(evaluatorConfig.subordinateMinCount ?? 0)}
                                                        disabled={!canEditEvaluators}
                                                        onChange={(event: any) => updateConfig({ subordinateMinCount: clampCount(Number(event.target.value), 0, Number(evaluatorConfig.subordinateMaxCount ?? 3)) })}
                                                    />
                                                </label>
                                                <label>
                                                    <span>Max</span>
                                                    <input
                                                        className="hfd-input"
                                                        type="number"
                                                        min={0}
                                                        max={10}
                                                        value={Number(evaluatorConfig.subordinateMaxCount ?? 3)}
                                                        disabled={!canEditEvaluators}
                                                        onChange={(event: any) => {
                                                            const max = clampCount(Number(event.target.value), 0, 10);
                                                            updateConfig({ subordinateMaxCount: max, subordinateMinCount: Math.min(Number(evaluatorConfig.subordinateMinCount ?? 0), max) });
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        )}

                                        <div className="hfde-weight-row">
                                            <label>
                                                <span>Weight</span>
                                                <input
                                                    className="hfd-input"
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step={1}
                                                    disabled={selectedCampaign.status !== 'DRAFT'}
                                                    value={Number(weightItem?.weightPercent ?? rule.weightDefault)}
                                                    onChange={(event: any) => updateRelationshipWeight(rule.key, Number(event.target.value))}
                                                />
                                            </label>
                                            <em>%</em>
                                        </div>
                                        <small className="hfde-rule-meta">{assignmentCount} saved assignment{assignmentCount === 1 ? '' : 's'}</small>
                                    </article>
                                );
                            })}
                        </div>

                        <label className="hfdc-toggle-card full hfdcw-redistribute hfde-rebalance-card">
                            <input
                                type="checkbox"
                                checked={scoringConfig.redistributeMissingRelationshipWeight}
                                disabled={selectedCampaign.status !== 'DRAFT'}
                                onChange={(event: any) => setScoringConfig((current: any) => ({ ...current, redistributeMissingRelationshipWeight: event.target.checked }))}
                            />
                            <span>
                                <strong>Redistribute unavailable relationship weight</strong>
                                <small>Use this when a relationship does not exist for a recipient, such as an recipient with no eligible subordinate reviewers. This is not for evaluators who fail to submit.</small>
                            </span>
                        </label>

                        {rulePreviewStale && (
                            <div className="hfdt-response-warnings warning compact">
                                <span><i className="bi bi-arrow-clockwise" /> Rules changed. Refresh the evaluator preview before saving assignments.</span>
                            </div>
                        )}
                        {scoringConfig.warnings.length > 0 && (
                            <div className="hfdt-response-warnings">
                                {scoringConfig.warnings.map((item: any) => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                            </div>
                        )}

                        <div className="hfde-v2-actions sticky-actions">
                            <button className="hfd-btn hfd-btn-secondary" type="button" disabled={selectedCampaign.status !== 'DRAFT' || savingScoringConfig || !weightReady} onClick={() => void saveScoringConfig()}>
                                <i className="bi bi-save2" /> {savingScoringConfig ? 'Saving weights...' : 'Save Weights'}
                            </button>
                            <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!canEditEvaluators || previewingAssignments || generatingAssignments} onClick={() => void previewEvaluatorRules()}>
                                <i className="bi bi-eye" /> {previewingAssignments ? 'Preparing...' : hasAssignmentPreview ? 'Refresh Preview' : 'Preview Evaluators'}
                            </button>
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={saveEvaluatorDisabled} onClick={() => void generateEvaluatorAssignments()}>
                                <i className="bi bi-check2-circle" /> {generatingAssignments ? 'Saving...' : 'Save Evaluators'}
                            </button>
                            <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!hasSavedEvaluatorAssignments || hasDraftEvaluatorChanges || rulePreviewStale} onClick={() => setActiveStepKey('questions')}>
                                Continue
                            </button>
                        </div>
                    </div>

                    <div className="hfde-recipient-panel">
                        <div className="hfde-section-head compact">
                            <div>
                                <span className="hfdq-kicker">Recipients</span>
                                <h4>{hasAssignmentPreview ? `${assignmentPreview.requests.length} previewed` : 'Preview required'}</h4>
                                <p>Select one recipient to review and manually adjust their evaluator network.</p>
                            </div>
                            {hasAssignmentPreview && <span className={`hfdt-badge ${previewWarningCount > 0 ? 'warning' : 'ready'}`}>{previewWarningCount > 0 ? 'Review' : 'Ready'}</span>}
                        </div>
                        {assignmentPreview.warnings.length > 0 && (
                            <div className="hfdt-response-warnings compact">
                                {assignmentPreview.warnings.slice(0, 2).map((item: any) => <span key={item}><i className="bi bi-info-circle" /> {cleanEvaluatorNote(item)}</span>)}
                            </div>
                        )}
                        <div className="hfde-target-list compact-list">
                            {!hasAssignmentPreview ? (
                                <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-eye" /><strong>No preview yet</strong><p>Click Preview Evaluators after confirming rules.</p></div>
                            ) : evaluatorTargets.map((target: any) => {
                                const previewItem = previewItemByTarget.get(target.employeeId);
                                const targetAssignments = assignmentsByTarget.get(target.employeeId) ?? [];
                                const status = previewItem ? assignmentReadinessClass(previewItem) : 'blocked';
                                return (
                                    <button key={target.employeeId} type="button" className={`hfde-v2-target ${activeEvaluatorTargetId === target.employeeId ? 'selected' : ''} ${status}`} onClick={() => setSelectedEvaluatorTargetId(target.employeeId)}>
                                        <span className={`hfdt-readiness-dot ${status}`} />
                                        <span>
                                            <strong>{target.employeeName}</strong>
                                            <small>{target.positionName ?? 'Position not set'} · {target.currentDepartmentName ?? 'Department not set'}</small>
                                        </span>
                                        <em>{previewItem?.totalAssignments ?? targetAssignments.length}</em>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="hfde-selected-panel">
                        <div className="hfdt-selected-head">
                            <div>
                                <span className="hfdq-kicker">Evaluator network</span>
                                <h4>{activeEvaluatorTarget?.employeeName ?? 'Select a recipient'}</h4>
                                <p>{activeEvaluatorTarget ? `${activeEvaluatorTarget.positionName ?? 'Position not set'} · ${activeEvaluatorTarget.currentDepartmentName ?? 'Department not set'}` : 'Assignments will appear here after preview.'}</p>
                            </div>
                            {activePreviewItem && <span className={`hfdt-badge ${assignmentReadinessClass(activePreviewItem)}`}>{assignmentReadinessClass(activePreviewItem) === 'ready' ? 'Ready' : 'Review'}</span>}
                        </div>

                        {activePreviewItem?.warnings?.length ? (
                            <div className="hfdt-response-warnings compact">
                                {activePreviewItem.warnings.slice(0, 3).map((item: any) => <span key={item}><i className="bi bi-info-circle" /> {cleanEvaluatorNote(item)}</span>)}
                            </div>
                        ) : null}

                        <div className="hfde-assignment-groups-workbench">
                            {(['SELF', 'MANAGER', 'PEER', 'SUBORDINATE'] as FeedbackRelationshipType[]).map((type: FeedbackRelationshipType) => {
                                const group = activeAssignmentsByRelationship.get(type) ?? [];
                                const canManualAdd = canEditEvaluators && hasAssignmentPreview && MANUAL_RELATIONSHIPS.includes(type);
                                return (
                                    <section key={type} className="hfde-assignment-group compact workbench-group">
                                        <div className="hfde-assignment-group-head">
                                            <span><i className={`bi ${relationshipIcon(type)}`} /> {relationshipLabel(type)}</span>
                                            <div className="hfde-group-actions">
                                                <em>{group.length}</em>
                                                {canManualAdd && (
                                                    <button className="hfdt-mini-action" type="button" onClick={() => openManual(type)}>
                                                        <i className="bi bi-plus-lg" /> Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {group.length === 0 ? (
                                            <p className="hfde-empty-line">No {relationshipLabel(type).toLowerCase()} evaluator.</p>
                                        ) : group.map((assignment: any) => (
                                            <article key={`${assignment.assignmentId ?? 'planned'}-${assignment.targetEmployeeId}-${assignment.evaluatorEmployeeId}-${assignment.relationshipType}`} className={`hfde-assignment-row compact ${assignment.selectionMethod === 'MANUAL' ? 'manual' : ''}`}>
                                                <span className="hfde-avatar">{initials(assignment.evaluatorEmployeeName)}</span>
                                                <div>
                                                    <strong>{assignment.evaluatorEmployeeName ?? `Employee #${assignment.evaluatorEmployeeId}`}</strong>
                                                    <small>{assignment.selectionReason ?? assignment.evaluatorPositionName ?? assignment.evaluatorEmployeeEmail ?? 'Evaluator'}</small>
                                                    <span>{assignmentSourceLabel(assignment)} · {assignmentStatusLabel(assignment.status)}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="hfdt-icon-button"
                                                    disabled={!canEditEvaluators || assignment.relationshipType === 'SELF' || assignment.status === 'SUBMITTED' || (assignment.assignmentId != null && removingAssignmentId === assignment.assignmentId)}
                                                    onClick={() => void removeEvaluator(assignment)}
                                                    aria-label="Remove evaluator"
                                                >
                                                    <i className="bi bi-x-lg" />
                                                </button>
                                            </article>
                                        ))}
                                    </section>
                                );
                            })}
                        </div>
                    </div>

                    {manualOpen && (
                        <div className="hfde-manual-overlay" role="dialog" aria-modal="true">
                            <div className="hfde-manual-modal">
                                <div className="hfde-manual-head">
                                    <div>
                                        <span className="hfdq-kicker">Manual override</span>
                                        <h4>Add {relationshipLabel(manualForm.relationshipType)}</h4>
                                        <p>{activeTargetSummary}</p>
                                    </div>
                                    <button className="hfdt-icon-button" type="button" onClick={() => setManualOpen(false)} aria-label="Close manual evaluator dialog">
                                        <i className="bi bi-x-lg" />
                                    </button>
                                </div>
                                <div className="hfde-manual-rule-note"><i className="bi bi-shield-check" /> {manualCandidateNotice}</div>
                                <div className="hfde-add-form modal-form">
                                    <label className="hfdc-field">
                                        <span>Relationship</span>
                                        <select
                                            className="hfd-input"
                                            value={manualForm.relationshipType}
                                            disabled={!canEditEvaluators || !hasAssignmentPreview}
                                            onChange={(event: any) => {
                                                setManualForm((current: any) => ({ ...current, relationshipType: event.target.value as FeedbackRelationshipType, evaluatorEmployeeId: 0 }));
                                                setEvaluatorSearch('');
                                            }}
                                        >
                                            {relationshipOptions.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                        </select>
                                    </label>
                                    <label className="hfdc-field">
                                        <span>Find evaluator</span>
                                        <input className="hfd-input" value={evaluatorSearch} disabled={!canEditEvaluators || !hasAssignmentPreview || relationshipCandidatesLoading} onChange={(event: any) => setEvaluatorSearch(event.target.value)} placeholder="Search eligible reviewers" />
                                    </label>
                                </div>
                                <div className="hfde-candidate-list modal-list">
                                    {relationshipCandidatesLoading ? (
                                        <span className="hfde-empty-line">Loading eligible reviewers...</span>
                                    ) : relationshipCandidatesError ? (
                                        <span className="hfde-empty-line">Could not load eligible reviewers. Please try again.</span>
                                    ) : evaluatorCandidates.length === 0 ? (
                                        <span className="hfde-empty-line">No eligible reviewer found for this relationship.</span>
                                    ) : evaluatorCandidates.map((employee: any) => (
                                        <button
                                            key={employee.id}
                                            type="button"
                                            className={`hfde-candidate ${manualForm.evaluatorEmployeeId === employee.id ? 'selected' : ''}`}
                                            onClick={() => setManualForm((current: any) => ({ ...current, evaluatorEmployeeId: employee.id }))}
                                        >
                                            <span className="hfde-avatar">{initials(employee.fullName)}</span>
                                            <span>
                                                <strong>{employee.fullName}</strong>
                                                <small>{[employee.currentDepartment ?? 'Department not set', employee.positionTitle, employee.sourceLabel].filter(Boolean).join(' · ')}</small>
                                            </span>
                                            {manualForm.evaluatorEmployeeId === employee.id && <i className="bi bi-check-circle-fill" />}
                                        </button>
                                    ))}
                                </div>
                                {manualEvaluatorEligibilityError && (
                                    <div className="hfdt-response-warnings blocked compact">
                                        <span><i className="bi bi-x-circle" /> {manualEvaluatorEligibilityError}</span>
                                    </div>
                                )}
                                <label className="hfdc-field full">
                                    <span>Reason</span>
                                    <textarea className="hfd-input hfdc-textarea" rows={2} disabled={!canEditEvaluators || !hasAssignmentPreview} value={manualForm.reason ?? ''} onChange={(event: any) => setManualForm((current: any) => ({ ...current, reason: event.target.value }))} placeholder="Example: Confirmed after reviewing the eligible reviewer list." />
                                </label>
                                <div className="hfde-manual-actions">
                                    <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => setManualOpen(false)}>Cancel</button>
                                    <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canEditEvaluators || !hasAssignmentPreview || relationshipCandidatesLoading || addingEvaluator || !manualForm.evaluatorEmployeeId || Boolean(manualEvaluatorEligibilityError) || !manualForm.reason?.trim()} onClick={() => void handleAddManual()}>
                                        <i className="bi bi-plus-lg" /> {addingEvaluator ? 'Adding...' : 'Add Evaluator'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

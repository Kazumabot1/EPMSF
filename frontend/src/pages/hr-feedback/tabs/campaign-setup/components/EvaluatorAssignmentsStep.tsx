import type { Dispatch, SetStateAction } from 'react';
import type { FeedbackRelationshipType } from '../../../../../types/feedbackCampaign';


type StateSetter = Dispatch<SetStateAction<any>>;

interface Props {
    savedTargetIds: any;
    hasUnsavedTargetChanges: any;
    hasUnavailableSelection: any;
    assignmentPreview: any;
    previewWarningCount: any;
    hasDraftEvaluatorChanges: any;
    hasSavedEvaluatorAssignments: any;
    selectedCampaign: any;
    peerReviewerCount: any;
    setPeerReviewerCount: StateSetter;
    canEditEvaluators: any;
    relationshipWeightTotal: any;
    RELATIONSHIP_ORDER: any;
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
    addingEvaluator: any;
    addEvaluator: any;
}

export function EvaluatorAssignmentsStep({
                                             savedTargetIds,
                                             hasUnsavedTargetChanges,
                                             hasUnavailableSelection,
                                             assignmentPreview,
                                             previewWarningCount,
                                             hasDraftEvaluatorChanges,
                                             hasSavedEvaluatorAssignments,
                                             selectedCampaign,
                                             peerReviewerCount,
                                             setPeerReviewerCount,
                                             canEditEvaluators,
                                             relationshipWeightTotal,
                                             RELATIONSHIP_ORDER,
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
                                             addingEvaluator,
                                             addEvaluator,
                                         }: Props) {
    return (
        <section className={`hfdq-table-card hfde-card hfde-final ${savedTargetIds.length === 0 || hasUnsavedTargetChanges || hasUnavailableSelection ? 'disabled' : ''}`}>
            <div className="hfdc-card-head hfde-head">
                <div>
                    <span className="hfdq-kicker">Step 3</span>
                    <h3>Prepare Evaluators</h3>
                    <p>Review who will provide feedback before saving evaluator assignments.</p>
                </div>
                <div className="hfdt-summary-pills">
                    <span><strong>{savedTargetIds.length}</strong> recipients</span>
                    <span><strong>{assignmentPreview.totalEvaluatorsGenerated}</strong> evaluators</span>
                    <span><strong>{previewWarningCount}</strong> need review</span>
                    <span><strong>{hasDraftEvaluatorChanges ? 'Unsaved changes' : hasSavedEvaluatorAssignments ? 'Saved' : 'Draft'}</strong></span>
                </div>
            </div>

            {!selectedCampaign ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save campaign info first</strong><p>Evaluator preparation becomes available after campaign info and recipients are saved.</p></div>
            ) : savedTargetIds.length === 0 ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-people" /><strong>Save recipients first</strong><p>Select and save feedback recipients before preparing evaluators.</p></div>
            ) : hasUnsavedTargetChanges ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-cloud-arrow-up" /><strong>Save recipient changes</strong><p>Evaluator preview uses saved recipients only. Save or reset changes before continuing.</p></div>
            ) : hasUnavailableSelection ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-slash-circle" /><strong>Remove unavailable recipients</strong><p>Only available recipients can continue to evaluator preparation.</p></div>
            ) : (
                <div className="hfde-final-grid">
                    <div className="hfde-settings-panel">
                        <div className="hfde-section-head">
                            <div>
                                <span className="hfdq-kicker">Reviewer setup</span>
                                <h4>Feedback groups</h4>
                                <p>These groups will be prepared for each saved recipient.</p>
                            </div>
                        </div>

                        <div className="hfde-reviewer-cards">
                            <article className="hfde-reviewer-card self">
                                <span className="hfde-role-icon self"><i className="bi bi-person-check" /></span>
                                <div><strong>Self Review</strong><small>Included for each recipient</small></div>
                            </article>
                            <article className="hfde-reviewer-card manager">
                                <span className="hfde-role-icon manager"><i className="bi bi-person-workspace" /></span>
                                <div><strong>Manager Review</strong><small>Included when available</small></div>
                            </article>
                            <article className="hfde-reviewer-card peer featured">
                                <span className="hfde-role-icon peer"><i className="bi bi-people" /></span>
                                <div><strong>Peer Review</strong><small>{peerReviewerCount} reviewer{peerReviewerCount === 1 ? '' : 's'} per recipient</small></div>
                            </article>
                            <article className="hfde-reviewer-card subordinate">
                                <span className="hfde-role-icon subordinate"><i className="bi bi-person-lines-fill" /></span>
                                <div><strong>Direct Report Review</strong><small>Included when available</small></div>
                            </article>
                        </div>

                        <div className="hfde-peer-control">
                            <div>
                                <span className="hfdq-kicker">Peer reviewers</span>
                                <strong>People per recipient</strong>
                                <small>Choose how many peer reviewers should be suggested for each recipient.</small>
                            </div>
                            <div className="hfde-stepper-control">
                                <button type="button" onClick={() => setPeerReviewerCount(peerReviewerCount - 1)} disabled={!canEditEvaluators || peerReviewerCount <= 1}>−</button>
                                <span>{peerReviewerCount}</span>
                                <button type="button" onClick={() => setPeerReviewerCount(peerReviewerCount + 1)} disabled={!canEditEvaluators || peerReviewerCount >= 8}>+</button>
                            </div>
                        </div>

                        <div className="hfdcw-card">
                            <div className="hfdcw-head">
                                <div>
                                    <span className="hfdq-kicker">Reviewer contribution</span>
                                    <h4>Feedback contribution</h4>
                                    <p>Set how much each feedback group contributes to the final score.</p>
                                </div>
                                <span className={`hfdcw-total ${Math.round(relationshipWeightTotal * 100) / 100 === 100 ? 'ready' : 'blocked'}`}>
                    {relationshipWeightTotal}% total
                  </span>
                            </div>
                            <div className="hfdcw-grid">
                                {RELATIONSHIP_ORDER.map((type: any) => {
                                    const item = scoringConfig.relationshipWeights.find((weight: any) => weight.relationshipType === type);
                                    return (
                                        <label key={type} className="hfdcw-weight-row">
                        <span>
                          <strong>{item?.label ?? type}</strong>
                          <small>{item?.assignmentCount ?? 0} assignment{(item?.assignmentCount ?? 0) === 1 ? '' : 's'} · {(item?.targetCountWithRole ?? 0)} target{(item?.targetCountWithRole ?? 0) === 1 ? '' : 's'} covered</small>
                        </span>
                                            <input
                                                className="hfd-input"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={1}
                                                disabled={selectedCampaign.status !== 'DRAFT'}
                                                value={Number(item?.weightPercent ?? 0)}
                                                onChange={(event: any) => updateRelationshipWeight(type, Number(event.target.value))}
                                            />
                                            <em>%</em>
                                        </label>
                                    );
                                })}
                            </div>
                            <label className="hfdc-toggle-card full hfdcw-redistribute">
                                <input
                                    type="checkbox"
                                    checked={scoringConfig.redistributeMissingRelationshipWeight}
                                    disabled={selectedCampaign.status !== 'DRAFT'}
                                    onChange={(event: any) => setScoringConfig((current: any) => ({ ...current, redistributeMissingRelationshipWeight: event.target.checked }))}
                                />
                                <span>
                    <strong>Rebalance when a group is missing</strong>
                    <small>Use the available feedback groups when one group is not present.</small>
                  </span>
                            </label>
                            {scoringConfig.warnings.length > 0 && (
                                <div className="hfdt-response-warnings">
                                    {scoringConfig.warnings.map((item: any) => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                                </div>
                            )}
                            <div className="hfdcw-actions">
                                <button className="hfd-btn hfd-btn-primary" type="button" disabled={selectedCampaign.status !== 'DRAFT' || savingScoringConfig || Math.round(relationshipWeightTotal * 100) / 100 !== 100} onClick={() => void saveScoringConfig()}>
                                    <i className="bi bi-save2" /> {savingScoringConfig ? 'Saving weights...' : 'Save Contribution'}
                                </button>
                            </div>
                        </div>


                        <div className="hfde-actions hfde-final-actions">
                            <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!canEditEvaluators || previewingAssignments || generatingAssignments} onClick={() => void previewEvaluatorRules()}>
                                <i className="bi bi-eye" /> {previewingAssignments ? 'Preparing...' : hasAssignmentPreview ? 'Refresh Suggestions' : 'Preview Evaluators'}
                            </button>
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canEditEvaluators || previewingAssignments || generatingAssignments || !hasAssignmentPreview} onClick={() => void generateEvaluatorAssignments()}>
                                <i className="bi bi-check2-circle" /> {generatingAssignments ? 'Saving...' : 'Save Evaluators'}
                            </button>
                            <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!hasSavedEvaluatorAssignments || hasDraftEvaluatorChanges} onClick={() => setActiveStepKey('questions')}>
                                Continue
                            </button>
                        </div>
                    </div>

                    <div className="hfde-review-panel">
                        <div className="hfde-section-head compact">
                            <div>
                                <span className="hfdq-kicker">Evaluator preview</span>
                                <h4>{hasAssignmentPreview ? `${assignmentPreview.requests.length} recipient${assignmentPreview.requests.length === 1 ? '' : 's'}` : 'No preview yet'}</h4>
                            </div>
                            {hasAssignmentPreview && <span className={`hfdt-badge ${previewWarningCount > 0 ? 'warning' : 'ready'}`}>{previewWarningCount > 0 ? 'Needs review' : 'Ready'}</span>}
                        </div>

                        {assignmentPreview.warnings.length > 0 && (
                            <div className="hfdt-response-warnings">
                                {assignmentPreview.warnings.slice(0, 4).map((item: any) => <span key={item}><i className="bi bi-info-circle" /> {cleanEvaluatorNote(item)}</span>)}
                            </div>
                        )}

                        <div className="hfde-target-list">
                            {!hasAssignmentPreview ? (
                                <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-eye" /><strong>No evaluators prepared yet</strong><p>Preview evaluators to review the suggested list.</p></div>
                            ) : evaluatorTargets.map((target: any) => {
                                const previewItem = previewItemByTarget.get(target.employeeId);
                                const targetAssignments = assignmentsByTarget.get(target.employeeId) ?? [];
                                const status = previewItem ? assignmentReadinessClass(previewItem) : 'blocked';
                                return (
                                    <button key={target.employeeId} type="button" className={`hfde-target-card ${activeEvaluatorTargetId === target.employeeId ? 'selected' : ''} ${status}`} onClick={() => setSelectedEvaluatorTargetId(target.employeeId)}>
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

                    <aside className="hfde-detail-panel">
                        <div className="hfdt-selected-head">
                            <div>
                                <span className="hfdq-kicker">Recipient</span>
                                <h4>{activeEvaluatorTarget?.employeeName ?? 'Select a recipient'}</h4>
                                <p>{activeEvaluatorTarget ? `${activeEvaluatorTarget.positionName ?? 'Position not set'} · ${activeEvaluatorTarget.currentDepartmentName ?? 'Department not set'}` : 'Evaluator details will appear here.'}</p>
                            </div>
                            {activePreviewItem && <span className={`hfdt-badge ${assignmentReadinessClass(activePreviewItem)}`}>{assignmentReadinessClass(activePreviewItem) === 'ready' ? 'Ready' : 'Needs review'}</span>}
                        </div>

                        {activePreviewItem?.warnings?.length ? (
                            <div className="hfdt-response-warnings">
                                {activePreviewItem.warnings.slice(0, 3).map((item: any) => <span key={item}><i className="bi bi-info-circle" /> {cleanEvaluatorNote(item)}</span>)}
                            </div>
                        ) : null}

                        <div className="hfde-assignment-groups">
                            {(['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'] as FeedbackRelationshipType[]).map((type: any) => {
                                const group = activeAssignmentsByRelationship.get(type) ?? [];
                                return (
                                    <section key={type} className="hfde-assignment-group">
                                        <div className="hfde-assignment-group-head">
                                            <span><i className={`bi ${relationshipIcon(type)}`} /> {relationshipLabel(type)}</span>
                                            <em>{group.length}</em>
                                        </div>
                                        {group.length === 0 ? (
                                            <p className="hfde-empty-line">No evaluator selected.</p>
                                        ) : group.map((assignment: any) => (
                                            <article key={`${assignment.assignmentId ?? 'planned'}-${assignment.targetEmployeeId}-${assignment.evaluatorEmployeeId}-${assignment.relationshipType}`} className={`hfde-assignment-row ${assignment.selectionMethod === 'MANUAL' ? 'manual' : ''}`}>
                                                <span className="hfde-avatar">{initials(assignment.evaluatorEmployeeName)}</span>
                                                <div>
                                                    <strong>{assignment.evaluatorEmployeeName ?? `Employee #${assignment.evaluatorEmployeeId}`}</strong>
                                                    <small>{assignment.evaluatorPositionName ?? assignment.evaluatorEmployeeEmail ?? 'Evaluator'}</small>
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

                        <div className={`hfde-add-panel ${!canEditEvaluators || !hasAssignmentPreview ? 'disabled' : ''}`}>
                            <div className="hfde-add-head">
                                <div>
                                    <span className="hfdq-kicker">Adjust evaluators</span>
                                    <h4>Add evaluator</h4>
                                </div>
                                {!hasAssignmentPreview ? <span>Preview first</span> : hasDraftEvaluatorChanges ? <span>Unsaved changes</span> : null}
                            </div>
                            <div className="hfde-add-form">
                                <label className="hfdc-field">
                                    <span>Relationship</span>
                                    <select className="hfd-input" value={manualForm.relationshipType} disabled={!canEditEvaluators || !hasAssignmentPreview} onChange={(event: any) => setManualForm((current: any) => ({ ...current, relationshipType: event.target.value as FeedbackRelationshipType, evaluatorEmployeeId: 0 }))}>
                                        {relationshipOptions.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                </label>
                                <label className="hfdc-field">
                                    <span>Find evaluator</span>
                                    <input className="hfd-input" value={evaluatorSearch} disabled={!canEditEvaluators || !hasAssignmentPreview} onChange={(event: any) => setEvaluatorSearch(event.target.value)} placeholder="Search by name or department" />
                                </label>
                            </div>
                            {canEditEvaluators && hasAssignmentPreview && (
                                <div className="hfde-candidate-list">
                                    {evaluatorCandidates.length === 0 ? (
                                        <span className="hfde-empty-line">No evaluator found.</span>
                                    ) : evaluatorCandidates.map((employee: any) => (
                                        <button key={employee.id} type="button" className={`hfde-candidate ${manualForm.evaluatorEmployeeId === employee.id ? 'selected' : ''}`} onClick={() => setManualForm((current: any) => ({ ...current, evaluatorEmployeeId: employee.id }))}>
                                            <span className="hfde-avatar">{initials(employee.fullName)}</span>
                                            <span><strong>{employee.fullName}</strong><small>{employee.currentDepartment ?? 'Department not set'}</small></span>
                                            {manualForm.evaluatorEmployeeId === employee.id && <i className="bi bi-check-circle-fill" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <label className="hfdc-field full">
                                <span>Reason</span>
                                <textarea className="hfd-input hfdc-textarea" rows={2} disabled={!canEditEvaluators || !hasAssignmentPreview} value={manualForm.reason ?? ''} onChange={(event: any) => setManualForm((current: any) => ({ ...current, reason: event.target.value }))} placeholder="Example: Confirmed after reviewing the reporting line." />
                            </label>
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canEditEvaluators || !hasAssignmentPreview || addingEvaluator || !manualForm.evaluatorEmployeeId || !manualForm.reason?.trim()} onClick={() => void addEvaluator()}>
                                <i className="bi bi-plus-lg" /> {addingEvaluator ? 'Adding...' : 'Add Evaluator'}
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </section>
    );
}

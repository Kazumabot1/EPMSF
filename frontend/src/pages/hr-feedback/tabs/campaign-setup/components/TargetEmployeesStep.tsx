import type { Dispatch, SetStateAction } from 'react';
import type { ReadinessFilter } from '../types/campaignSetupTypes';


type StateSetter = Dispatch<SetStateAction<any>>;

interface Props {
    selectedCampaign: any;
    targetIdsNormalized: any;
    selectedReadyCount: any;
    selectedReviewCount: any;
    selectedDepartmentCount: any;
    availableCandidateCount: any;
    reviewCandidateCount: any;
    targetSearch: any;
    setTargetSearch: StateSetter;
    currentDepartmentId: any;
    setCurrentDepartmentId: StateSetter;
    departments: any;
    positionFilter: any;
    setPositionFilter: StateSetter;
    positionOptions: any;
    readiness: any;
    setReadiness: StateSetter;
    loadingCandidates: any;
    candidateRows: any;
    readinessClass: any;
    personSubtitle: any;
    readinessLabel: any;
    setRecipientDetails: StateSetter;
    canEditTargets: any;
    toggleTarget: any;
    hasUnsavedTargetChanges: any;
    targetsResponse: any;
    hasUnavailableSelection: any;
    selectedDepartmentSummary: any;
    recipientDetails: any;
    recipientDetailItems: any;
    loadingTargets: any;
    selectedTargets: any;
    removeSelectedTarget: any;
    setSelectedTargetIds: StateSetter;
    savedTargetIds: any;
    savingTargets: any;
    saveTargets: any;
}

export function TargetEmployeesStep({
                                        selectedCampaign,
                                        targetIdsNormalized,
                                        selectedReadyCount,
                                        selectedReviewCount,
                                        selectedDepartmentCount,
                                        availableCandidateCount,
                                        reviewCandidateCount,
                                        targetSearch,
                                        setTargetSearch,
                                        currentDepartmentId,
                                        setCurrentDepartmentId,
                                        departments,
                                        positionFilter,
                                        setPositionFilter,
                                        positionOptions,
                                        readiness,
                                        setReadiness,
                                        loadingCandidates,
                                        candidateRows,
                                        readinessClass,
                                        personSubtitle,
                                        readinessLabel,
                                        setRecipientDetails,
                                        canEditTargets,
                                        toggleTarget,
                                        hasUnsavedTargetChanges,
                                        targetsResponse,
                                        hasUnavailableSelection,
                                        selectedDepartmentSummary,
                                        recipientDetails,
                                        recipientDetailItems,
                                        loadingTargets,
                                        selectedTargets,
                                        removeSelectedTarget,
                                        setSelectedTargetIds,
                                        savedTargetIds,
                                        savingTargets,
                                        saveTargets,
                                    }: Props) {
    return (
        <section className={`hfdq-table-card hfdt-card hfdt-recipient-workspace ${!selectedCampaign ? 'disabled' : ''}`}>
            <div className="hfdc-card-head hfdt-head">
                <div>
                    <span className="hfdq-kicker">Step 2</span>
                    <h3>Select Feedback Recipients</h3>
                    <p>Choose employees for this feedback cycle. Evaluators will be prepared in the next step.</p>
                </div>
                <div className="hfdt-summary-pills">
                    <span><strong>{targetIdsNormalized.length}</strong> selected</span>
                    <span><strong>{selectedReadyCount}</strong> ready</span>
                    <span><strong>{selectedReviewCount}</strong> review</span>
                    <span><strong>{selectedDepartmentCount}</strong> departments</span>
                </div>
            </div>

            {!selectedCampaign ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save campaign info first</strong><p>Recipient selection becomes available after campaign info is saved.</p></div>
            ) : (
                <div className="hfdt-recipient-grid">
                    <div className="hfdt-directory-panel hfdt-recipient-directory">
                        <div className="hfdt-recipient-toolbar">
                            <div>
                                <span className="hfdq-kicker">Recipients</span>
                                <h4>Employee Directory</h4>
                                <p>Search and add employees to this campaign.</p>
                            </div>
                            <div className="hfdt-recipient-counts">
                                <span><strong>{availableCandidateCount}</strong> ready</span>
                                <span><strong>{reviewCandidateCount}</strong> need review</span>
                            </div>
                        </div>

                        <div className="hfdt-recipient-filters">
                            <label className="hfdc-field full search">
                                <span>Search employees</span>
                                <input className="hfd-input" value={targetSearch} onChange={(event: any) => setTargetSearch(event.target.value)} placeholder="Search by name, employee code, email, department, or position" />
                            </label>
                            <label className="hfdc-field">
                                <span>Department</span>
                                <select className="hfd-input" value={currentDepartmentId} onChange={(event: any) => setCurrentDepartmentId(event.target.value ? Number(event.target.value) : '')}>
                                    <option value="">All departments</option>
                                    {departments.map((department: any) => <option key={department.id} value={department.id}>{department.name}</option>)}
                                </select>
                            </label>
                            <label className="hfdc-field">
                                <span>Position</span>
                                <select className="hfd-input" value={positionFilter} onChange={(event: any) => setPositionFilter(event.target.value)}>
                                    <option value="">All positions</option>
                                    {positionOptions.map((position: any) => <option key={position} value={position}>{position}</option>)}
                                </select>
                            </label>
                            <label className="hfdc-field">
                                <span>Status</span>
                                <select className="hfd-input" value={readiness} onChange={(event: any) => setReadiness(event.target.value as ReadinessFilter)}>
                                    <option value="AVAILABLE">Available</option>
                                    <option value="READY">Ready</option>
                                    <option value="WARNINGS">Needs review</option>
                                    <option value="BLOCKED">Not available</option>
                                </select>
                            </label>
                        </div>

                        <div className="hfdt-recipient-table">
                            <div className="hfdt-recipient-table-head">
                                <span>Employee</span>
                                <span>Department</span>
                                <span>Position</span>
                                <span>Manager</span>
                                <span>Status</span>
                                <span />
                            </div>
                            {loadingCandidates ? (
                                <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading employees...</div>
                            ) : candidateRows.length === 0 ? (
                                <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-search" /><strong>No employees found</strong><p>Try another search or adjust the filters.</p></div>
                            ) : candidateRows.map((candidate: any) => {
                                const selected = targetIdsNormalized.includes(candidate.employeeId);
                                const availability = readinessClass(candidate);
                                return (
                                    <article key={candidate.employeeId} className={`hfdt-recipient-row ${selected ? 'selected' : ''} ${availability}`}>
                                        <div className="hfdt-recipient-person">
                                            <span className={`hfdt-readiness-dot ${availability}`} />
                                            <div>
                                                <strong>{candidate.employeeName}</strong>
                                                <small>{personSubtitle(candidate)}</small>
                                            </div>
                                        </div>
                                        <div className="hfdt-recipient-cell">
                                            <strong>{candidate.currentDepartmentName ?? 'Not set'}</strong>
                                            <small>{candidate.parentDepartmentName && candidate.parentDepartmentName !== candidate.currentDepartmentName ? candidate.parentDepartmentName : 'Current department'}</small>
                                        </div>
                                        <div className="hfdt-recipient-cell">
                                            <strong>{candidate.positionName ?? 'Not set'}</strong>
                                            <small>{candidate.employmentStatus ?? 'Employee'}</small>
                                        </div>
                                        <div className="hfdt-recipient-cell">
                                            <strong>{candidate.managerName ?? 'Not set'}</strong>
                                            <small>{candidate.managerName ? 'Reporting manager' : 'Needs review'}</small>
                                        </div>
                                        <div className="hfdt-status-stack">
                                            <span className={`hfdt-badge ${availability}`}>{readinessLabel(candidate)}</span>
                                            <button className="hfdt-text-button" type="button" onClick={() => setRecipientDetails(candidate)}>
                                                View details
                                            </button>
                                        </div>
                                        <div className="hfdt-row-actions">
                                            <button className={`hfd-btn ${selected ? 'hfd-btn-ghost' : 'hfd-btn-secondary'}`} type="button" disabled={!canEditTargets || !candidate.eligible} onClick={() => toggleTarget(candidate)}>
                                                {selected ? <><i className="bi bi-check2" /> Selected</> : <><i className="bi bi-plus-lg" /> Add</>}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>

                    <aside className="hfdt-selected-panel hfdt-recipient-summary">
                        <div className="hfdt-selected-head">
                            <div>
                                <span className="hfdq-kicker">Selected recipients</span>
                                <h4>{targetIdsNormalized.length} employee{targetIdsNormalized.length === 1 ? '' : 's'}</h4>
                                <p>{selectedReadyCount} ready · {selectedReviewCount} need review</p>
                            </div>
                            {hasUnsavedTargetChanges && <span className="hfdt-unsaved"><i className="bi bi-dot" /> Unsaved</span>}
                        </div>

                        {targetsResponse.warnings.length > 0 && (
                            <div className="hfdt-response-warnings">
                                {targetsResponse.warnings.map((item: any) => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                            </div>
                        )}

                        {hasUnavailableSelection && (
                            <div className="hfdt-response-warnings blocked">
                                <span><i className="bi bi-slash-circle" /> Remove unavailable recipients to continue.</span>
                            </div>
                        )}

                        <div className="hfdt-summary-strip">
                            <span><strong>{targetIdsNormalized.length}</strong><small>Total selected</small></span>
                            <span><strong>{selectedDepartmentCount}</strong><small>Departments</small></span>
                            <span><strong>{selectedReviewCount}</strong><small>Need review</small></span>
                        </div>

                        {selectedDepartmentSummary.length > 0 && (
                            <div className="hfdt-department-summary">
                                <strong>Departments selected</strong>
                                <div>
                                    {selectedDepartmentSummary.map(([department, count]: any[]) => <span key={department}>{department} · {count}</span>)}
                                </div>
                            </div>
                        )}

                        {recipientDetails && (
                            <div className={`hfdt-recipient-detail-card ${readinessClass(recipientDetails)}`}>
                                <div className="hfdt-recipient-detail-head">
                                    <div>
                                        <span className="hfdq-kicker">Employee details</span>
                                        <strong>{recipientDetails.employeeName}</strong>
                                        <small>{recipientDetails.positionName ?? 'Position not set'} · {recipientDetails.currentDepartmentName ?? 'Department not set'}</small>
                                    </div>
                                    <button type="button" className="hfdt-icon-button" onClick={() => setRecipientDetails(null)} aria-label="Close details"><i className="bi bi-x-lg" /></button>
                                </div>
                                <div className="hfdt-recipient-detail-grid">
                                    {recipientDetailItems(recipientDetails).map((item: any) => (
                                        <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>
                                    ))}
                                </div>
                                {(recipientDetails.blockReasons.length > 0 || recipientDetails.warnings.length > 0 || recipientDetails.notes.length > 0) && (
                                    <div className="hfdt-recipient-detail-notes">
                                        {recipientDetails.blockReasons.map((reason: any) => <span key={reason} className="blocked"><i className="bi bi-slash-circle" />{reason}</span>)}
                                        {recipientDetails.warnings.map((reason: any) => <span key={reason} className="warning"><i className="bi bi-exclamation-triangle" />{reason}</span>)}
                                        {recipientDetails.notes.map((note: any) => <span key={note} className="note"><i className="bi bi-info-circle" />{note}</span>)}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="hfdt-selected-list">
                            {loadingTargets ? (
                                <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading saved recipients...</div>
                            ) : selectedTargets.length === 0 ? (
                                <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-person-plus" /><strong>No recipients selected</strong><p>Add employees from the directory to continue.</p></div>
                            ) : selectedTargets.map((target: any) => (
                                <div key={target.employeeId} className={`hfdt-selected-card ${readinessClass(target)}`}>
                                    <div>
                                        <strong>{target.employeeName}</strong>
                                        <small>{target.currentDepartmentName ?? 'Department not set'} · {target.positionName ?? 'Position not set'}</small>
                                    </div>
                                    <div className="hfdt-selected-metrics compact">
                                        <span><b>{target.peerCandidateCount}</b> possible peers</span>
                                        <span><b>{target.subordinateCandidateCount}</b> direct reports</span>
                                    </div>
                                    {(target.warnings.length > 0 || target.notes.length > 0) && (
                                        <div className="hfdt-selected-issues">
                                            {target.warnings.slice(0, 1).map((warning: any) => <span key={warning}><i className="bi bi-exclamation-triangle" /> {warning}</span>)}
                                            {target.notes.slice(0, 1).map((note: any) => <span key={note} className="note"><i className="bi bi-info-circle" /> {note}</span>)}
                                        </div>
                                    )}
                                    <button type="button" className="hfd-btn hfd-btn-secondary" onClick={() => setRecipientDetails(target)}>
                                        <i className="bi bi-info-circle" /> Details
                                    </button>
                                    <button type="button" className="hfd-btn hfd-btn-ghost" disabled={!canEditTargets} onClick={() => removeSelectedTarget(target.employeeId)}>
                                        <i className="bi bi-x-lg" /> Remove
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="hfdt-selected-actions">
                            <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!canEditTargets || !hasUnsavedTargetChanges} onClick={() => setSelectedTargetIds(savedTargetIds)}>
                                Reset
                            </button>
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canEditTargets || savingTargets || targetIdsNormalized.length === 0 || !hasUnsavedTargetChanges || hasUnavailableSelection} onClick={() => void saveTargets()}>
                                <i className="bi bi-save2" /> {savingTargets ? 'Saving...' : 'Save Recipients'}
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </section>
    );
}

import type { Dispatch, SetStateAction } from 'react';
import type { ReadinessFilter } from '../types/campaignSetupTypes';


type StateSetter = Dispatch<SetStateAction<any>>;

interface Props {
    selectedCampaign: any;
    targetIdsNormalized: any;
    selectedReadyCount: any;
    selectedReviewCount: any;
    selectedUnavailableCount: any;
    selectedDepartmentCount: any;
    availableCandidateCount: any;
    reviewCandidateCount: any;
    blockedCandidateCount: any;
    filteredCandidateCount: any;
    filteredSelectableCandidateIds: any;
    targetSearch: any;
    setTargetSearch: StateSetter;
    currentDepartmentId: any;
    setCurrentDepartmentId: StateSetter;
    departments: any;
    positionFilter: any;
    setPositionFilter: StateSetter;
    positionOptions: any;
    levelFilter: any;
    setLevelFilter: StateSetter;
    levelOptions: any;
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

const uniqueSortedIds = (ids: number[]) => Array.from(new Set(ids)).sort((left, right) => left - right);

export function TargetEmployeesStep({
                                        selectedCampaign,
                                        targetIdsNormalized,
                                        selectedReadyCount,
                                        selectedReviewCount,
                                        selectedUnavailableCount,
                                        selectedDepartmentCount,
                                        availableCandidateCount,
                                        reviewCandidateCount,
                                        blockedCandidateCount,
                                        filteredCandidateCount,
                                        filteredSelectableCandidateIds,
                                        targetSearch,
                                        setTargetSearch,
                                        currentDepartmentId,
                                        setCurrentDepartmentId,
                                        departments,
                                        positionFilter,
                                        setPositionFilter,
                                        positionOptions,
                                        levelFilter,
                                        setLevelFilter,
                                        levelOptions,
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
    const canUseBulkActions = Boolean(canEditTargets && filteredSelectableCandidateIds.length > 0);
    const selectedTargetMap = new Map<number, any>(selectedTargets.map((target: any) => [Number(target.employeeId), target]));

    const addFilteredRecipients = () => {
        if (!canUseBulkActions) return;
        setSelectedTargetIds((current: number[]) => uniqueSortedIds([...current, ...filteredSelectableCandidateIds]));
    };

    const replaceWithFilteredRecipients = () => {
        if (!canUseBulkActions) return;
        setSelectedTargetIds(uniqueSortedIds(filteredSelectableCandidateIds));
    };

    const removeUnavailableRecipients = () => {
        if (!canEditTargets) return;
        setSelectedTargetIds((current: number[]) => current.filter((employeeId) => {
            const target = selectedTargetMap.get(Number(employeeId));
            return !target || target.eligible;
        }));
    };

    const clearDraftSelection = () => {
        if (!canEditTargets) return;
        setSelectedTargetIds([]);
    };

    return (
        <section className={`hfdq-table-card hfdt-card hfdt-recipient-workspace hfdc-target-redesign ${!selectedCampaign ? 'disabled' : ''}`}>
            <div className="hfdc-card-head hfdt-head hfdc-target-head">
                <div>
                    <span className="hfdq-kicker">Step 2</span>
                    <h3>Recipients</h3>
                    <p>Select the employees who will receive 360 feedback. Evaluator rules are prepared after this list is saved.</p>
                </div>
                <div className="hfdt-summary-pills hfdc-target-summary-pills">
                    <span><strong>{targetIdsNormalized.length}</strong> selected</span>
                    <span><strong>{selectedReadyCount}</strong> ready</span>
                    <span><strong>{selectedReviewCount}</strong> review</span>
                    <span><strong>{selectedUnavailableCount}</strong> unavailable</span>
                </div>
            </div>

            {!selectedCampaign ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save campaign details first</strong><p>Recipient selection opens after the campaign draft is saved.</p></div>
            ) : (
                <div className="hfdt-recipient-grid hfdc-target-grid">
                    <div className="hfdt-directory-panel hfdt-recipient-directory hfdc-recipient-directory">
                        <div className="hfdc-recipient-command-bar">
                            <div>
                                <span className="hfdq-kicker">Recipient pool</span>
                                <h4>Employee Directory</h4>
                                <p>Filter by department, level, position, or readiness before adding employees.</p>
                            </div>
                            <div className="hfdc-recipient-command-actions">
                                <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!canUseBulkActions} onClick={addFilteredRecipients}>
                                    <i className="bi bi-plus-lg" /> Add filtered ready
                                </button>
                                <button className="hfd-btn hfd-btn-ghost" type="button" disabled={!canUseBulkActions} onClick={replaceWithFilteredRecipients}>
                                    Replace selection
                                </button>
                            </div>
                        </div>

                        <div className="hfdc-recipient-filter-card">
                            <label className="hfdc-field search hfdc-recipient-search">
                                <span>Search employees</span>
                                <input className="hfd-input" value={targetSearch} onChange={(event: any) => setTargetSearch(event.target.value)} placeholder="Name, employee code, email, department, position, or level" />
                            </label>
                            <label className="hfdc-field">
                                <span>Department</span>
                                <select className="hfd-input" value={currentDepartmentId} onChange={(event: any) => setCurrentDepartmentId(event.target.value ? Number(event.target.value) : '')}>
                                    <option value="">All departments</option>
                                    {departments.map((department: any) => <option key={department.id} value={department.id}>{department.name}</option>)}
                                </select>
                            </label>
                            <label className="hfdc-field">
                                <span>Level</span>
                                <select className="hfd-input" value={levelFilter} onChange={(event: any) => setLevelFilter(event.target.value)}>
                                    <option value="">All levels</option>
                                    {levelOptions.map((level: any) => <option key={level} value={level}>{level}</option>)}
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
                                <span>Readiness</span>
                                <select className="hfd-input" value={readiness} onChange={(event: any) => setReadiness(event.target.value as ReadinessFilter)}>
                                    <option value="AVAILABLE">Available</option>
                                    <option value="READY">Ready only</option>
                                    <option value="WARNINGS">Needs review</option>
                                    <option value="BLOCKED">Not available</option>
                                </select>
                            </label>
                        </div>

                        <div className="hfdc-recipient-result-strip">
                            <span><strong>{filteredCandidateCount}</strong><small>matched</small></span>
                            <span><strong>{availableCandidateCount}</strong><small>ready</small></span>
                            <span><strong>{reviewCandidateCount}</strong><small>need review</small></span>
                            <span><strong>{blockedCandidateCount}</strong><small>not available</small></span>
                        </div>

                        <div className="hfdt-recipient-table hfdc-recipient-table">
                            <div className="hfdt-recipient-table-head hfdc-recipient-table-head">
                                <span>Employee</span>
                                <span>Department</span>
                                <span>Position / Level</span>
                                <span>Evaluator signals</span>
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
                                    <article key={candidate.employeeId} className={`hfdt-recipient-row hfdc-recipient-row ${selected ? 'selected' : ''} ${availability}`}>
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
                                            <small>{candidate.levelCode ?? 'Level not set'} · {candidate.employmentStatus ?? 'Employee'}</small>
                                        </div>
                                        <div className="hfdt-recipient-cell hfdc-signal-cell">
                                            <strong>{candidate.managerName ?? 'Manager not set'}</strong>
                                            <small>{candidate.peerCandidateCount} peers · {candidate.subordinateCandidateCount} subordinates</small>
                                        </div>
                                        <div className="hfdt-status-stack">
                                            <span className={`hfdt-badge ${availability}`}>{readinessLabel(candidate)}</span>
                                        </div>
                                        <div className="hfdt-row-actions hfdc-directory-row-actions">
                                            <button className="hfdt-icon-button" type="button" onClick={() => setRecipientDetails(candidate)} aria-label={`View ${candidate.employeeName} readiness details`}>
                                                <i className="bi bi-info-circle" />
                                            </button>
                                            <button className={`hfd-btn ${selected ? 'hfd-btn-ghost' : 'hfd-btn-secondary'}`} type="button" disabled={!canEditTargets || !candidate.eligible} onClick={() => toggleTarget(candidate)}>
                                                {selected ? <><i className="bi bi-check2" /> Selected</> : <><i className="bi bi-plus-lg" /> Add</>}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>

                    <aside className="hfdt-selected-panel hfdt-recipient-summary hfdc-recipient-summary">
                        <div className="hfdt-selected-head hfdc-selected-head">
                            <div>
                                <span className="hfdq-kicker">Selected recipients</span>
                                <h4>{targetIdsNormalized.length} employee{targetIdsNormalized.length === 1 ? '' : 's'}</h4>
                                <p>{selectedReadyCount} ready · {selectedReviewCount} need review · {selectedDepartmentCount} department{selectedDepartmentCount === 1 ? '' : 's'}</p>
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
                                <button type="button" className="hfdt-text-button" disabled={!canEditTargets} onClick={removeUnavailableRecipients}>Remove unavailable</button>
                            </div>
                        )}

                        <div className="hfdt-summary-strip hfdc-selected-summary-strip">
                            <span><strong>{targetIdsNormalized.length}</strong><small>Total selected</small></span>
                            <span><strong>{selectedReadyCount}</strong><small>Ready</small></span>
                            <span><strong>{selectedReviewCount}</strong><small>Need review</small></span>
                        </div>

                        {selectedDepartmentSummary.length > 0 && (
                            <div className="hfdt-department-summary">
                                <strong>Department coverage</strong>
                                <div>
                                    {selectedDepartmentSummary.map(([department, count]: any[]) => <span key={department}>{department} · {count}</span>)}
                                </div>
                            </div>
                        )}

                        <div className="hfdt-selected-list hfdc-selected-list hfdc-selected-compact-list">
                            {loadingTargets ? (
                                <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading saved recipients...</div>
                            ) : selectedTargets.length === 0 ? (
                                <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-person-plus" /><strong>No recipients selected</strong><p>Add employees from the directory to continue.</p></div>
                            ) : (
                                <div className="hfdc-selected-table" role="table" aria-label="Selected recipients">
                                    <div className="hfdc-selected-table-head" role="row">
                                        <span>Employee</span>
                                        <span>Signals</span>
                                        <span>Status</span>
                                        <span />
                                    </div>
                                    {selectedTargets.map((target: any) => {
                                        const status = readinessClass(target);
                                        return (
                                            <div key={target.employeeId} className={`hfdc-selected-table-row ${status}`} role="row">
                                                <div className="hfdc-selected-person">
                                                    <strong>{target.employeeName}</strong>
                                                    <small>{target.currentDepartmentName ?? 'Department not set'} · {target.positionName ?? 'Position not set'} · {target.levelCode ?? 'No level'}</small>
                                                </div>
                                                <div className="hfdc-selected-signals">
                                                    <span><b>{target.peerCandidateCount}</b> peers</span>
                                                    <span><b>{target.subordinateCandidateCount}</b> reports</span>
                                                </div>
                                                <div className="hfdc-selected-status">
                                                    <span className={`hfdt-badge ${status}`}>{readinessLabel(target)}</span>
                                                </div>
                                                <div className="hfdc-selected-row-actions">
                                                    <button type="button" className="hfdt-icon-button" onClick={() => setRecipientDetails(target)} aria-label={`View ${target.employeeName} details`}>
                                                        <i className="bi bi-info-circle" />
                                                    </button>
                                                    <button type="button" className="hfdt-icon-button danger" disabled={!canEditTargets} onClick={() => removeSelectedTarget(target.employeeId)} aria-label={`Remove ${target.employeeName}`}>
                                                        <i className="bi bi-x-lg" />
                                                    </button>
                                                </div>
                                                {(target.warnings.length > 0 || target.notes.length > 0) && (
                                                    <div className="hfdc-selected-row-note">
                                                        {target.warnings.slice(0, 1).map((warning: any) => <span key={warning}><i className="bi bi-exclamation-triangle" /> {warning}</span>)}
                                                        {target.notes.length > 0 && target.warnings.length === 0 && target.notes.slice(0, 1).map((note: any) => <span key={note} className="note"><i className="bi bi-info-circle" /> {note}</span>)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="hfdt-selected-actions hfdc-selected-actions">
                            <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!canEditTargets || !hasUnsavedTargetChanges} onClick={() => setSelectedTargetIds(savedTargetIds)}>
                                Reset
                            </button>
                            <button className="hfd-btn hfd-btn-ghost" type="button" disabled={!canEditTargets || targetIdsNormalized.length === 0} onClick={clearDraftSelection}>
                                Clear
                            </button>
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canEditTargets || savingTargets || targetIdsNormalized.length === 0 || !hasUnsavedTargetChanges || hasUnavailableSelection} onClick={() => void saveTargets()}>
                                <i className="bi bi-save2" /> {savingTargets ? 'Saving...' : 'Save Recipients'}
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {recipientDetails && (
                <div className="hfdc-recipient-detail-backdrop" role="presentation" onClick={() => setRecipientDetails(null)}>
                    <aside className={`hfdc-recipient-detail-drawer ${readinessClass(recipientDetails)}`} role="dialog" aria-modal="true" aria-label="Recipient details" onClick={(event: any) => event.stopPropagation()}>
                        <div className="hfdc-detail-drawer-head">
                            <div>
                                <span className="hfdq-kicker">Readiness check</span>
                                <h4>{recipientDetails.employeeName}</h4>
                                <p>{recipientDetails.positionName ?? 'Position not set'} · {recipientDetails.currentDepartmentName ?? 'Department not set'}</p>
                            </div>
                            <button type="button" className="hfdt-icon-button" onClick={() => setRecipientDetails(null)} aria-label="Close details"><i className="bi bi-x-lg" /></button>
                        </div>

                        <div className="hfdt-recipient-detail-grid hfdc-detail-drawer-grid">
                            {recipientDetailItems(recipientDetails).map((item: any) => (
                                <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>
                            ))}
                        </div>

                        {(recipientDetails.blockReasons.length > 0 || recipientDetails.warnings.length > 0 || recipientDetails.notes.length > 0) && (
                            <div className="hfdt-recipient-detail-notes hfdc-detail-drawer-notes">
                                {recipientDetails.blockReasons.map((reason: any) => <span key={reason} className="blocked"><i className="bi bi-slash-circle" />{reason}</span>)}
                                {recipientDetails.warnings.map((reason: any) => <span key={reason} className="warning"><i className="bi bi-exclamation-triangle" />{reason}</span>)}
                                {recipientDetails.notes.map((note: any) => <span key={note} className="note"><i className="bi bi-info-circle" />{note}</span>)}
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </section>
    );
}

import { useEffect, useMemo, useState } from 'react';
import type {
    FeedbackAssignmentDetailItem,
    FeedbackAssignmentGenerationResponse,
    FeedbackCampaign,
    FeedbackRelationshipType,
    FeedbackTargetEmployee,
    ManualAssignmentInput,
} from '../../../types/feedbackCampaign';

type AssignmentPreviewComponentProps = {
    campaign: FeedbackCampaign;
    employees: FeedbackTargetEmployee[];
    preview: FeedbackAssignmentGenerationResponse | null;
    manualSubmitting: boolean;
    removingAssignmentId: number | null;
    onAddManual: (payload: ManualAssignmentInput) => Promise<void> | void;
    onRemoveAssignment: (assignmentId: number) => Promise<void> | void;
};

type ManualFormState = {
    targetEmployeeId: number;
    relationshipType: FeedbackRelationshipType;
    evaluatorEmployeeId: number;
    anonymous: boolean;
    reason: string;
};

const relationshipOptions: FeedbackRelationshipType[] = ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'];

const relationshipLabel = (relationship: FeedbackRelationshipType) => {
    switch (relationship) {
        case 'MANAGER':
            return 'Manager';
        case 'PEER':
            return 'Peer';
        case 'SUBORDINATE':
            return 'Subordinate';
        case 'SELF':
            return 'Self';
        default:
            return relationship;
    }
};

const methodLabel = (method: string) => {
    if (method === 'AUTO_RANKED') return 'Ranked suggestion';
    if (method === 'AUTO_RANDOM') return 'Auto random';
    if (method === 'AUTO_RELATIONSHIP') return 'Auto relationship';
    if (method === 'MANUAL') return 'Manual';
    return method;
};

const AssignmentPreviewComponent = ({
                                        campaign,
                                        employees,
                                        preview,
                                        manualSubmitting,
                                        removingAssignmentId,
                                        onAddManual,
                                        onRemoveAssignment,
                                    }: AssignmentPreviewComponentProps) => {
    const employeeNameById = useMemo(
        () => new Map(employees.map((employee) => [employee.id, employee.fullName])),
        [employees],
    );
    const targetIds = useMemo(() => {
        const fromPreview = preview?.requests.map((request) => request.targetEmployeeId) ?? [];
        return fromPreview.length > 0 ? fromPreview : campaign.targetEmployeeIds;
    }, [campaign.targetEmployeeIds, preview?.requests]);

    const firstTargetId = targetIds[0] ?? 0;
    const [manualSearch, setManualSearch] = useState('');
    const [manualForm, setManualForm] = useState<ManualFormState>({
        targetEmployeeId: firstTargetId,
        relationshipType: 'PEER',
        evaluatorEmployeeId: 0,
        anonymous: true,
        reason: '',
    });

    useEffect(() => {
        if (!manualForm.targetEmployeeId && firstTargetId) {
            setManualForm((current) => ({ ...current, targetEmployeeId: firstTargetId }));
        }
    }, [firstTargetId, manualForm.targetEmployeeId]);

    const assignmentDetails = preview?.assignmentDetails ?? [];
    const assignedEvaluatorIdsForTarget = useMemo(() => {
        const ids = new Set<number>();
        assignmentDetails
            .filter((assignment) => assignment.targetEmployeeId === manualForm.targetEmployeeId)
            .forEach((assignment) => ids.add(assignment.evaluatorEmployeeId));
        return ids;
    }, [assignmentDetails, manualForm.targetEmployeeId]);

    const manualCandidates = useMemo(() => {
        const query = manualSearch.trim().toLowerCase();
        return employees
            .filter((employee) => {
                if (manualForm.relationshipType === 'SELF') {
                    return employee.id === manualForm.targetEmployeeId;
                }
                if (employee.id === manualForm.targetEmployeeId) return false;
                if (assignedEvaluatorIdsForTarget.has(employee.id)) return false;
                if (!query) return true;
                return (
                    employee.fullName.toLowerCase().includes(query) ||
                    (employee.currentDepartment ?? '').toLowerCase().includes(query)
                );
            })
            .slice(0, 30);
    }, [assignedEvaluatorIdsForTarget, employees, manualForm.relationshipType, manualForm.targetEmployeeId, manualSearch]);

    const selectedTargetName = employeeNameById.get(manualForm.targetEmployeeId) ?? `Employee #${manualForm.targetEmployeeId}`;
    const selectedEvaluatorName = employeeNameById.get(manualForm.evaluatorEmployeeId) ?? `Employee #${manualForm.evaluatorEmployeeId}`;
    const reasonReady = manualForm.reason.trim().length >= 5;
    const evaluatorReady = manualForm.relationshipType === 'SELF'
        ? Boolean(manualForm.targetEmployeeId)
        : Boolean(manualForm.evaluatorEmployeeId);
    const canAddManual = Boolean(manualForm.targetEmployeeId) && evaluatorReady && reasonReady && !manualSubmitting;

    const handleAddManual = async () => {
        if (!canAddManual) return;
        await onAddManual({
            targetEmployeeId: manualForm.targetEmployeeId,
            evaluatorEmployeeId: manualForm.relationshipType === 'SELF' ? manualForm.targetEmployeeId : manualForm.evaluatorEmployeeId,
            relationshipType: manualForm.relationshipType,
            anonymous: manualForm.anonymous,
            reason: manualForm.reason.trim(),
        });
        setManualForm((current) => ({
            ...current,
            evaluatorEmployeeId: 0,
            reason: '',
        }));
        setManualSearch('');
    };

    const groupedDetails = assignmentDetails.reduce<Record<number, FeedbackAssignmentDetailItem[]>>((acc, assignment) => {
        const key = assignment.targetEmployeeId;
        acc[key] = acc[key] ?? [];
        acc[key].push(assignment);
        return acc;
    }, {});

    return (
        <section className="feedback-setup-card">
            <div className="feedback-setup-card-header">
                <div>
                    <p className="feedback-setup-eyebrow">Step 4</p>
                    <h2>Assignment review and manual overrides</h2>
                </div>
                <div className="feedback-setup-chip">Campaign #{campaign.id}</div>
            </div>

            {preview ? (
                <div className="feedback-setup-stack">
                    <div className="feedback-setup-metrics">
                        <div className="feedback-setup-metric">
                            <span>Total targets</span>
                            <strong>{preview.totalTargets}</strong>
                        </div>
                        <div className="feedback-setup-metric">
                            <span>Total assignments</span>
                            <strong>{preview.totalEvaluatorsGenerated}</strong>
                        </div>
                        <div className="feedback-setup-metric">
                            <span>Campaign window</span>
                            <strong>
                                {campaign.startDate} to {campaign.endDate}
                            </strong>
                        </div>
                    </div>

                    {preview.warnings.length > 0 ? (
                        <div className="feedback-setup-warning-box">
                            <strong>Assignment warnings</strong>
                            <ul>
                                {preview.warnings.map((warning) => (
                                    <li key={warning}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    <div className="feedback-setup-preview-table">
                        <table>
                            <thead>
                            <tr>
                                <th>Target employee</th>
                                <th>Manager</th>
                                <th>Self</th>
                                <th>Subordinate</th>
                                <th>Peer</th>
                                <th>Auto</th>
                                <th>Manual</th>
                                <th>Total</th>
                            </tr>
                            </thead>
                            <tbody>
                            {preview.requests.map((item) => (
                                <tr key={item.requestId}>
                                    <td>{item.targetEmployeeName ?? employeeNameById.get(item.targetEmployeeId) ?? `Employee #${item.targetEmployeeId}`}</td>
                                    <td>{item.managerAssignments}</td>
                                    <td>{item.selfAssignments ?? 0}</td>
                                    <td>{item.subordinateAssignments ?? 0}</td>
                                    <td>{item.peerAssignments}</td>
                                    <td>{item.autoAssignments}</td>
                                    <td>{item.manualAssignments}</td>
                                    <td>{item.totalAssignments}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="feedback-setup-manual-panel">
                        <div>
                            <p className="feedback-setup-eyebrow">Manual override</p>
                            <h3>Add evaluator manually</h3>
                            <p>
                                Use this when reviewer assignments need HR confirmation. Manual assignments require an audit reason and are preserved when auto assignments are regenerated.
                            </p>
                        </div>

                        <div className="feedback-setup-form-grid">
                            <label className="feedback-setup-field feedback-setup-field-wide">
                                <span>Target employee</span>
                                <select
                                    value={manualForm.targetEmployeeId || ''}
                                    onChange={(event) => setManualForm({
                                        ...manualForm,
                                        targetEmployeeId: Number(event.target.value),
                                        evaluatorEmployeeId: 0,
                                    })}
                                >
                                    {targetIds.map((targetId) => (
                                        <option key={targetId} value={targetId}>
                                            {employeeNameById.get(targetId) ?? `Employee #${targetId}`}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="feedback-setup-field">
                                <span>Relationship</span>
                                <select
                                    value={manualForm.relationshipType}
                                    onChange={(event) => setManualForm({
                                        ...manualForm,
                                        relationshipType: event.target.value as FeedbackRelationshipType,
                                        evaluatorEmployeeId: 0,
                                        anonymous: event.target.value === 'PEER' || event.target.value === 'SUBORDINATE',
                                    })}
                                >
                                    {relationshipOptions.map((relationship) => (
                                        <option key={relationship} value={relationship}>{relationshipLabel(relationship)}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="feedback-setup-field">
                                <span>Anonymous</span>
                                <select
                                    value={manualForm.anonymous ? 'true' : 'false'}
                                    onChange={(event) => setManualForm({ ...manualForm, anonymous: event.target.value === 'true' })}
                                >
                                    <option value="true">Anonymous</option>
                                    <option value="false">Visible</option>
                                </select>
                            </label>

                            <label className="feedback-setup-field feedback-setup-field-wide">
                                <span>Manual reason</span>
                                <textarea
                                    value={manualForm.reason}
                                    onChange={(event) => setManualForm({ ...manualForm, reason: event.target.value })}
                                    placeholder="Example: HR confirms this evaluator is the right reviewer for this recipient."
                                />
                                {!reasonReady ? <small className="feedback-setup-error">Reason must be at least 5 characters.</small> : null}
                            </label>
                        </div>

                        {manualForm.relationshipType === 'SELF' ? (
                            <div className="feedback-setup-selected-evaluator">
                                SELF assignment will use <strong>{selectedTargetName}</strong> as the evaluator.
                            </div>
                        ) : (
                            <>
                                <label className="feedback-setup-field feedback-setup-field-wide">
                                    <span>Search evaluator</span>
                                    <input
                                        type="search"
                                        value={manualSearch}
                                        onChange={(event) => setManualSearch(event.target.value)}
                                        placeholder="Search by name or department"
                                    />
                                </label>

                                <div className="feedback-setup-evaluator-list">
                                    {manualCandidates.length === 0 ? (
                                        <div className="feedback-setup-empty">No available evaluator matches this target and relationship.</div>
                                    ) : (
                                        manualCandidates.map((employee) => (
                                            <button
                                                key={employee.id}
                                                className={`feedback-setup-evaluator-pick ${manualForm.evaluatorEmployeeId === employee.id ? 'selected' : ''}`}
                                                type="button"
                                                onClick={() => setManualForm({ ...manualForm, evaluatorEmployeeId: employee.id })}
                                            >
                                                <strong>{employee.fullName}</strong>
                                                <span>{employee.currentDepartment ?? 'No department assigned'}</span>
                                            </button>
                                        ))
                                    )}
                                </div>

                                {manualForm.evaluatorEmployeeId ? (
                                    <div className="feedback-setup-selected-evaluator">
                                        Selected evaluator: <strong>{selectedEvaluatorName}</strong>
                                    </div>
                                ) : null}
                            </>
                        )}

                        <button className="feedback-setup-primary" type="button" disabled={!canAddManual} onClick={() => void handleAddManual()}>
                            {manualSubmitting ? 'Adding manual evaluator...' : 'Add manual evaluator'}
                        </button>
                    </div>

                    <div className="feedback-setup-preview-table">
                        <h3>Evaluator detail rows</h3>
                        <table>
                            <thead>
                            <tr>
                                <th>Target</th>
                                <th>Evaluator</th>
                                <th>Relationship</th>
                                <th>Method</th>
                                <th>Confidence</th>
                                <th>Reason / warnings</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {assignmentDetails.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>No evaluator detail rows yet.</td>
                                </tr>
                            ) : (
                                Object.entries(groupedDetails).flatMap(([targetId, rows]) =>
                                    rows.map((assignment) => (
                                        <tr key={`${assignment.assignmentId ?? 'preview'}-${assignment.targetEmployeeId}-${assignment.evaluatorEmployeeId}-${assignment.relationshipType}`}>
                                            <td>{assignment.targetEmployeeName ?? employeeNameById.get(Number(targetId)) ?? `Employee #${targetId}`}</td>
                                            <td>
                                                <strong>{assignment.evaluatorEmployeeName ?? employeeNameById.get(assignment.evaluatorEmployeeId) ?? `Employee #${assignment.evaluatorEmployeeId}`}</strong>
                                                <span className="feedback-setup-muted">{assignment.evaluatorPositionName ?? assignment.evaluatorEmployeeEmail ?? ''}</span>
                                            </td>
                                            <td>{relationshipLabel(assignment.relationshipType)}</td>
                                            <td>{methodLabel(assignment.selectionMethod)}</td>
                                            <td>{assignment.confidence ?? '-'}</td>
                                            <td>
                                                {assignment.selectionReason ? <p>{assignment.selectionReason}</p> : null}
                                                {assignment.warnings?.length ? (
                                                    <ul className="feedback-setup-compact-list">
                                                        {assignment.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                                                    </ul>
                                                ) : null}
                                            </td>
                                            <td>
                                                {assignment.assignmentId ? (
                                                    <button
                                                        className="feedback-setup-danger"
                                                        type="button"
                                                        disabled={removingAssignmentId === assignment.assignmentId}
                                                        onClick={() => void onRemoveAssignment(assignment.assignmentId as number)}
                                                    >
                                                        {removingAssignmentId === assignment.assignmentId ? 'Removing...' : 'Remove'}
                                                    </button>
                                                ) : (
                                                    <span className="feedback-setup-muted">Preview</span>
                                                )}
                                            </td>
                                        </tr>
                                    )),
                                )
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="feedback-setup-empty">
                    Preview suggested assignments or save generated assignments to review evaluator names, warnings, and manual override options.
                </div>
            )}
        </section>
    );
};

export default AssignmentPreviewComponent;

import { useEffect, useMemo, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import { DEFAULT_EVALUATOR_CONFIG, getPeerReviewerCount, normalizeEvaluatorConfig } from '../../../types/feedbackCampaign';
import type {
  FeedbackCampaign,
  EvaluatorConfigInput,
  FeedbackAssignmentGenerationResponse,
  FeedbackRelationshipType,
  ManualAssignmentInput,
  FeedbackTargetEmployee,
} from '../../../types/feedbackCampaign';

interface Props {
  campaign: FeedbackCampaign | null;
  targetIds: number[];
  evalConfig: EvaluatorConfigInput;
  onCampaignSelected?: (campaign: FeedbackCampaign) => void;
  onAssignmentsGenerated: (result: FeedbackAssignmentGenerationResponse) => void;
}

const relationshipOptions: FeedbackRelationshipType[] = ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'];

const formatCampaignOption = (campaign: FeedbackCampaign) =>
    `${campaign.name} (${campaign.status})${campaign.targetCount ? ` - ${campaign.targetCount} target(s)` : ''}`;

const initials = (name: string) =>
    name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('') || '?';

const sourceLabel = (source: string) => source.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, char => char.toUpperCase());

const methodLabel = (method: string) => {
  if (method === 'AUTO_RANDOM') return 'Auto random';
  if (method === 'AUTO_RELATIONSHIP') return 'Auto relationship';
  return 'Manual override';
};

const relationshipHelp = (relationship: FeedbackRelationshipType) => {
  switch (relationship) {
    case 'MANAGER':
      return 'Direct reporting manager from employee master data.';
    case 'SUBORDINATE':
      return 'Direct report of the target employee.';
    case 'SELF':
      return 'The target employee evaluates themself.';
    default:
      return 'Peer reviewer, usually from department/team/project scope.';
  }
};

export default function AssignmentPreviewTab({
                                               campaign,
                                               targetIds,
                                               evalConfig,
                                               onCampaignSelected,
                                               onAssignmentsGenerated,
                                             }: Props) {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [employees, setEmployees] = useState<FeedbackTargetEmployee[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | ''>(campaign?.id ?? '');
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [result, setResult] = useState<FeedbackAssignmentGenerationResponse | null>(null);
  const [error, setError] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [manualForm, setManualForm] = useState<ManualAssignmentInput>({
    targetEmployeeId: targetIds[0] ?? 0,
    evaluatorEmployeeId: 0,
    relationshipType: 'PEER',
    anonymous: true,
    reason: '',
  });

  const activeCampaign = useMemo(() => {
    if (campaign?.id) return campaign;
    if (!selectedCampaignId) return null;
    return campaigns.find(item => item.id === selectedCampaignId) ?? null;
  }, [campaign, campaigns, selectedCampaignId]);

  const openCampaigns = useMemo(
      () => campaigns,
      [campaigns],
  );

  const employeeMap = useMemo(() => {
    const map = new Map<number, FeedbackTargetEmployee>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);

  const effectiveConfig = useMemo(
      () => normalizeEvaluatorConfig(result?.evaluatorConfig ?? evalConfig ?? DEFAULT_EVALUATOR_CONFIG),
      [evalConfig, result?.evaluatorConfig],
  );

  const knownTargetIds = useMemo(() => {
    if (targetIds.length > 0) return targetIds;
    if (activeCampaign?.targetEmployeeIds?.length) return activeCampaign.targetEmployeeIds;
    if (result?.requests?.length) return result.requests.map(item => item.targetEmployeeId);
    return [];
  }, [activeCampaign?.targetEmployeeIds, result?.requests, targetIds]);

  const targetEmployees = useMemo(
      () => knownTargetIds.map(id => employeeMap.get(id)).filter((employee): employee is FeedbackTargetEmployee => Boolean(employee)),
      [employeeMap, knownTargetIds],
  );

  const selectedTargetEmployee = employeeMap.get(manualForm.targetEmployeeId) ?? null;
  const selectedEvaluatorEmployee = employeeMap.get(manualForm.evaluatorEmployeeId) ?? null;

  const existingAssignmentsForManualTarget = useMemo(
      () => (result?.assignmentDetails ?? []).filter(item => item.targetEmployeeId === manualForm.targetEmployeeId),
      [manualForm.targetEmployeeId, result?.assignmentDetails],
  );

  const assignedEvaluatorIdsForManualTarget = useMemo(
      () => new Set(existingAssignmentsForManualTarget.map(item => item.evaluatorEmployeeId)),
      [existingAssignmentsForManualTarget],
  );

  const evaluatorCandidates = useMemo(() => {
    const query = manualSearch.trim().toLowerCase();
    return employees
        .filter(employee => {
          if (manualForm.relationshipType === 'SELF' && employee.id !== manualForm.targetEmployeeId) return false;
          if (manualForm.relationshipType !== 'SELF' && employee.id === manualForm.targetEmployeeId) return false;
          if (assignedEvaluatorIdsForManualTarget.has(employee.id)) return false;
          if (!query) return true;
          return [employee.fullName, employee.currentDepartment ?? '', String(employee.id)]
              .some(value => value.toLowerCase().includes(query));
        })
        .slice(0, 12);
  }, [assignedEvaluatorIdsForManualTarget, employees, manualForm.relationshipType, manualForm.targetEmployeeId, manualSearch]);

  useEffect(() => {
    setLoadingCampaigns(true);
    Promise.all([hrFeedbackApi.getAllCampaigns(), feedbackCampaignApi.getEmployees()])
        .then(([campaignList, employeeList]) => {
          setCampaigns(campaignList);
          setEmployees(employeeList);
        })
        .catch(e => setError(e instanceof Error ? e.message : 'Failed to load campaigns and employees.'))
        .finally(() => setLoadingCampaigns(false));
  }, []);

  useEffect(() => {
    if (campaign?.id) {
      setSelectedCampaignId(campaign.id);
    }
  }, [campaign?.id]);

  useEffect(() => {
    if (campaign?.id || selectedCampaignId || campaigns.length === 0) return;
    const defaultCampaign =
        campaigns.find(item => item.status === 'DRAFT' && (item.targetCount ?? 0) > 0) ??
        campaigns.find(item => item.status === 'DRAFT') ??
        campaigns.find(item => item.status === 'ACTIVE') ??
        campaigns[0];

    if (defaultCampaign) {
      setSelectedCampaignId(defaultCampaign.id);
      onCampaignSelected?.(defaultCampaign);
    }
  }, [campaign?.id, campaigns, onCampaignSelected, selectedCampaignId]);

  useEffect(() => {
    setManualForm(current => ({
      ...current,
      targetEmployeeId: knownTargetIds.includes(current.targetEmployeeId)
          ? current.targetEmployeeId
          : knownTargetIds[0] ?? 0,
    }));
  }, [knownTargetIds.join(',')]);

  useEffect(() => {
    if (!activeCampaign) {
      setResult(null);
      return;
    }

    setError('');
    setLoadingPreview(true);
    feedbackCampaignApi.getAssignmentPreview(activeCampaign.id)
        .then(preview => {
          setResult(preview);
          onAssignmentsGenerated(preview);
        })
        .catch(() => {
          setResult(null);
        })
        .finally(() => setLoadingPreview(false));
  }, [activeCampaign?.id]);

  const assignmentsByTarget = useMemo(() => {
    const grouped = new Map<number, NonNullable<FeedbackAssignmentGenerationResponse['assignmentDetails']>>();
    for (const assignment of result?.assignmentDetails ?? []) {
      const group = grouped.get(assignment.targetEmployeeId) ?? [];
      group.push(assignment);
      grouped.set(assignment.targetEmployeeId, group);
    }
    return grouped;
  }, [result]);

  const manualAssignmentsByTarget = useMemo(() => {
    const grouped = new Map<number, NonNullable<FeedbackAssignmentGenerationResponse['assignmentDetails']>>();
    for (const assignment of result?.assignmentDetails ?? []) {
      if (assignment.selectionMethod !== 'MANUAL') continue;
      const group = grouped.get(assignment.targetEmployeeId) ?? [];
      group.push(assignment);
      grouped.set(assignment.targetEmployeeId, group);
    }
    return grouped;
  }, [result]);

  const isDraft = activeCampaign?.status === 'DRAFT';
  const hasTargets = knownTargetIds.length > 0;
  const configLabels = [
    effectiveConfig.includeManager && 'Manager',
    effectiveConfig.includeSelf && 'Self',
    effectiveConfig.includeSubordinates && 'Subordinates',
    effectiveConfig.includePeers && effectiveConfig.includeDepartmentPeers && 'Department Peers',
    effectiveConfig.includePeers && effectiveConfig.includeTeamPeers && 'Team Peers',
    effectiveConfig.includePeers && effectiveConfig.includeProjectPeers && 'Project Peers',
    effectiveConfig.includePeers && effectiveConfig.includeCrossTeamPeers && 'Other-Team Peers',
  ].filter(Boolean).join(', ');

  const peerReviewerCount = getPeerReviewerCount(effectiveConfig);
  const estimatedPerTarget =
      (effectiveConfig.includePeers ? peerReviewerCount : 0) +
      (effectiveConfig.includeManager ? 1 : 0) +
      (effectiveConfig.includeSelf ? 1 : 0) +
      (effectiveConfig.includeSubordinates ? effectiveConfig.subordinateMaxCount : 0);

  const employeeName = (id: number, fallback?: string | null) => fallback ?? employeeMap.get(id)?.fullName ?? `Employee #${id}`;

  const employeeSubline = (id: number) => employeeMap.get(id)?.currentDepartment ?? 'Department not assigned';

  const renderPerson = (id: number, fallback?: string | null, small = false) => {
    const name = employeeName(id, fallback);
    return (
        <div className={small ? 'hfd-person-chip hfd-person-chip-sm' : 'hfd-person-chip'}>
          <div className="hfd-person-avatar">{initials(name)}</div>
          <div>
            <strong>{name}</strong>
            <span>{employeeSubline(id)}</span>
          </div>
        </div>
    );
  };

  const updateResult = (res: FeedbackAssignmentGenerationResponse) => {
    setResult(res);
    onAssignmentsGenerated(res);
  };

  const handleCampaignChange = (value: string) => {
    const nextId = value ? Number(value) : '';
    setSelectedCampaignId(nextId);
    setResult(null);
    setError('');

    if (nextId) {
      const selectedCampaign = campaigns.find(item => item.id === nextId);
      if (selectedCampaign) onCampaignSelected?.(selectedCampaign);
    }
  };

  const refreshSelectedCampaign = async () => {
    if (!activeCampaign) return;
    const latest = await feedbackCampaignApi.getCampaign(activeCampaign.id);
    setCampaigns(prev => prev.map(item => item.id === latest.id ? latest : item));
    onCampaignSelected?.(latest);
  };

  const handleGenerate = async () => {
    if (!activeCampaign) {
      setError('Choose a campaign before generating evaluator assignments.');
      return;
    }
    if (!hasTargets) {
      setError('Select and save target employees in the Target & Evaluators tab first.');
      return;
    }

    setError('');
    setGenerating(true);
    try {
      const res = await feedbackCampaignApi.generateAssignments(activeCampaign.id, effectiveConfig);
      updateResult(res);
      await refreshSelectedCampaign();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate evaluator assignments.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddManual = async () => {
    if (!activeCampaign) return;
    if (!manualForm.targetEmployeeId || !manualForm.evaluatorEmployeeId) {
      setError('Choose a target employee and evaluator.');
      return;
    }
    if (manualForm.relationshipType !== 'SELF' && manualForm.targetEmployeeId === manualForm.evaluatorEmployeeId) {
      setError('A target cannot be manually added as their own evaluator unless the relationship is SELF.');
      return;
    }
    if (manualForm.relationshipType === 'SELF' && manualForm.targetEmployeeId !== manualForm.evaluatorEmployeeId) {
      setError('SELF feedback must use the target employee as the evaluator.');
      return;
    }
    if (assignedEvaluatorIdsForManualTarget.has(manualForm.evaluatorEmployeeId)) {
      setError('This evaluator is already assigned to the selected target employee.');
      return;
    }
    if (!manualForm.reason || manualForm.reason.trim().length < 5) {
      setError('Manual evaluator changes require a reason of at least 5 characters.');
      return;
    }

    setError('');
    try {
      const res = await feedbackCampaignApi.addManualAssignment(activeCampaign.id, manualForm);
      updateResult(res);
      setManualForm(current => ({ ...current, evaluatorEmployeeId: 0, reason: '' }));
      setManualSearch('');
      await refreshSelectedCampaign();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add manual evaluator assignment.');
    }
  };

  const handleRemove = async (assignmentId: number) => {
    if (!activeCampaign) return;
    setError('');
    try {
      const res = await feedbackCampaignApi.removeAssignment(activeCampaign.id, assignmentId);
      updateResult(res);
      await refreshSelectedCampaign();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove evaluator assignment.');
    }
  };

  const renderCampaignSelector = () => (
      <div className="hfd-campaign-select-bar">
        <label className="hfd-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Campaign:</label>
        <select
            className="hfd-select"
            value={activeCampaign?.id ?? selectedCampaignId}
            onChange={event => handleCampaignChange(event.target.value)}
            disabled={loadingCampaigns}
        >
          <option value="">— Choose an existing campaign —</option>
          {openCampaigns.map(item => (
              <option key={item.id} value={item.id}>{formatCampaignOption(item)}</option>
          ))}
        </select>
        {activeCampaign && <span className={`hfd-status-badge ${activeCampaign.status}`}>{activeCampaign.status}</span>}
      </div>
  );

  return (
      <div>
        <div className="hfd-card-header">
          <div className="hfd-card-title">
            <i className="bi bi-clipboard-check" />
            <div>
              <h2>Assignment Preview & Manual Override</h2>
              <p>Review saved targets, evaluator logic, generated assignments, and manual overrides before activation.</p>
            </div>
          </div>
        </div>

        {renderCampaignSelector()}
        {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
        {loadingPreview && <div className="hfd-alert"><i className="bi bi-arrow-repeat" />Loading existing assignment preview...</div>}

        {!activeCampaign && !loadingCampaigns && (
            <div className="hfd-empty">
              <i className="bi bi-folder2-open" />
              <p>No campaign selected. Choose an existing campaign above, or create one in the Campaign Setup tab.</p>
            </div>
        )}

        {activeCampaign && !hasTargets && (
            <div className="hfd-alert hfd-alert-warning">
              <i className="bi bi-exclamation-triangle" />
              This campaign has no saved target employees yet. Open Target & Evaluators, choose this campaign, then save targets.
            </div>
        )}

        {activeCampaign && hasTargets && (
            <>
              <div className="hfd-review-grid">
                <section className="hfd-review-card">
                  <div className="hfd-review-card-title"><i className="bi bi-megaphone" /> Campaign</div>
                  <h3>{activeCampaign.name}</h3>
                  <p>{activeCampaign.startDate} → {activeCampaign.endDate}</p>
                  <span className={`hfd-status-badge ${activeCampaign.status}`}>{activeCampaign.status}</span>
                </section>

                <section className="hfd-review-card">
                  <div className="hfd-review-card-title"><i className="bi bi-people" /> Saved Targets</div>
                  <h3>{knownTargetIds.length}</h3>
                  <p>{targetEmployees.slice(0, 3).map(item => item.fullName).join(', ')}{knownTargetIds.length > 3 ? ` +${knownTargetIds.length - 3} more` : ''}</p>
                </section>

                <section className="hfd-review-card">
                  <div className="hfd-review-card-title"><i className="bi bi-sliders" /> Evaluator Rules</div>
                  <h3>{peerReviewerCount} peer{peerReviewerCount === 1 ? '' : 's'} / target</h3>
                  <p>{configLabels || 'Default evaluator rules'} · est. {estimatedPerTarget} evaluator{estimatedPerTarget === 1 ? '' : 's'} each</p>
                </section>
              </div>

              <div className="hfd-target-chip-list" aria-label="Saved target employees">
                {knownTargetIds.map(id => <div key={id}>{renderPerson(id, null, true)}</div>)}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <button
                    id="btn-generate-assignments"
                    className="hfd-btn hfd-btn-success"
                    onClick={handleGenerate}
                    disabled={generating || !hasTargets || !isDraft}
                >
                  {generating ? <><i className="bi bi-arrow-repeat" /> Regenerating...</> : <><i className="bi bi-lightning-charge-fill" /> Generate / Regenerate Assignments</>}
                </button>
                {!isDraft && <span className="hfd-muted" style={{ alignSelf: 'center' }}>Assignments are locked after activation.</span>}
              </div>
            </>
        )}

        {activeCampaign && result && (
            <>
              <div className="hfd-stat-row">
                <div className="hfd-stat-pill"><div className="val">{result.totalTargets}</div><div className="lbl">Total Targets</div></div>
                <div className="hfd-stat-pill"><div className="val">{result.totalEvaluatorsGenerated}</div><div className="lbl">Current Assignments</div></div>
                <div className="hfd-stat-pill"><div className="val">{result.assignmentDetails?.filter(a => a.selectionMethod === 'MANUAL').length ?? 0}</div><div className="lbl">Manual Assignments</div></div>
              </div>

              {result.warnings.length > 0 && (
                  <div className="hfd-warning-box">
                    <i className="bi bi-exclamation-triangle-fill" />
                    <strong>Warnings:</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
              )}

              {isDraft && (
                  <div className="hfd-manual-panel">
                    <div className="hfd-manual-header">
                      <div>
                        <h4>Add Manual Evaluator</h4>
                        <p>Use this for special reviewers, missing peers, or HR-requested overrides.</p>
                      </div>
                      <span className="hfd-count-pill">{result.assignmentDetails?.filter(a => a.selectionMethod === 'MANUAL').length ?? 0} manual</span>
                    </div>

                    <div className="hfd-grid-2" style={{ gap: 14 }}>
                      <label className="hfd-field">
                        <span className="hfd-label">Target Employee</span>
                        <select
                            className="hfd-select"
                            value={manualForm.targetEmployeeId}
                            onChange={event => setManualForm({ ...manualForm, targetEmployeeId: Number(event.target.value), evaluatorEmployeeId: 0 })}
                        >
                          {knownTargetIds.map(id => <option key={id} value={id}>{employeeName(id)}</option>)}
                        </select>
                        {selectedTargetEmployee && renderPerson(selectedTargetEmployee.id, selectedTargetEmployee.fullName, true)}
                      </label>

                      <label className="hfd-field">
                        <span className="hfd-label">Relationship</span>
                        <select
                            className="hfd-select"
                            value={manualForm.relationshipType}
                            onChange={event => setManualForm({ ...manualForm, relationshipType: event.target.value as FeedbackRelationshipType, evaluatorEmployeeId: 0 })}
                        >
                          {relationshipOptions.map(option => <option key={option} value={option}>{sourceLabel(option)}</option>)}
                        </select>
                        <span className="hfd-field-help">{relationshipHelp(manualForm.relationshipType)}</span>
                      </label>
                    </div>

                    <div className="hfd-manual-search-row">
                      <label className="hfd-field" style={{ flex: 1 }}>
                        <span className="hfd-label">Search Evaluator</span>
                        <input
                            className="hfd-input"
                            value={manualSearch}
                            onChange={event => setManualSearch(event.target.value)}
                            placeholder="Search by name, department, or employee number..."
                        />
                      </label>
                      <label className="hfd-checkbox-label" style={{ paddingTop: 28 }}>
                        <input
                            type="checkbox"
                            checked={manualForm.anonymous ?? false}
                            onChange={event => setManualForm({ ...manualForm, anonymous: event.target.checked })}
                        />
                        Anonymous override
                      </label>
                    </div>

                    <div className="hfd-evaluator-pick-list">
                      {evaluatorCandidates.map(employee => (
                          <button
                              key={employee.id}
                              type="button"
                              className={`hfd-evaluator-pick ${manualForm.evaluatorEmployeeId === employee.id ? 'selected' : ''}`}
                              onClick={() => setManualForm({ ...manualForm, evaluatorEmployeeId: employee.id })}
                          >
                            {renderPerson(employee.id, employee.fullName, true)}
                            {manualForm.evaluatorEmployeeId === employee.id && <i className="bi bi-check-circle-fill" />}
                          </button>
                      ))}
                      {evaluatorCandidates.length === 0 && <div className="hfd-muted">No evaluator matches your search.</div>}
                    </div>

                    {selectedEvaluatorEmployee && (
                        <div className="hfd-selected-evaluator-summary">
                          <span>Selected evaluator</span>
                          {renderPerson(selectedEvaluatorEmployee.id, selectedEvaluatorEmployee.fullName, true)}
                          <strong>{sourceLabel(manualForm.relationshipType)}</strong>
                        </div>
                    )}

                    <label className="hfd-field" style={{ marginTop: 12 }}>
                      <span className="hfd-label">Manual Reason</span>
                      <textarea
                          className="hfd-input"
                          value={manualForm.reason ?? ''}
                          onChange={event => setManualForm({ ...manualForm, reason: event.target.value })}
                          placeholder="Example: Reporting hierarchy missing; HR confirms this evaluator."
                          rows={3}
                      />
                      <span className="hfd-field-help">Required for audit. Minimum 5 characters.</span>
                    </label>

                    {existingAssignmentsForManualTarget.length > 0 && (
                        <div className="hfd-muted" style={{ marginTop: 8 }}>
                          Already assigned for this target: {existingAssignmentsForManualTarget.map(item => employeeName(item.evaluatorEmployeeId, item.evaluatorEmployeeName)).join(', ')}
                        </div>
                    )}

                    <button className="hfd-btn hfd-btn-primary" onClick={handleAddManual} style={{ marginTop: 12 }} disabled={!hasTargets || !manualForm.evaluatorEmployeeId || assignedEvaluatorIdsForManualTarget.has(manualForm.evaluatorEmployeeId) || !manualForm.reason || manualForm.reason.trim().length < 5}>
                      <i className="bi bi-plus-circle" /> Add Evaluator
                    </button>

                    {manualAssignmentsByTarget.size > 0 && (
                        <div className="hfd-manual-summary-list">
                          {[...manualAssignmentsByTarget.entries()].map(([targetId, assignments]) => (
                              <div key={targetId}>
                                <strong>{employeeName(targetId)}</strong>
                                <span>{assignments.map(assignment => `${employeeName(assignment.evaluatorEmployeeId, assignment.evaluatorEmployeeName)} (${sourceLabel(assignment.relationshipType)})`).join(', ')}</span>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>
              )}

              <h4 style={{ margin: '20px 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
                Target Employee Summary
              </h4>
              <div className="hfd-table-wrap">
                <table className="hfd-preview-table">
                  <thead>
                  <tr>
                    <th>Target Employee</th>
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
                  {result.requests.map(r => (
                      <tr key={r.requestId}>
                        <td>{renderPerson(r.targetEmployeeId, r.targetEmployeeName, true)}</td>
                        <td>{r.managerAssignments}</td>
                        <td>{r.selfAssignments ?? 0}</td>
                        <td>{r.subordinateAssignments ?? 0}</td>
                        <td>{r.peerAssignments}</td>
                        <td>{r.autoAssignments ?? 0}</td>
                        <td>{r.manualAssignments ?? 0}</td>
                        <td><strong>{r.totalAssignments}</strong></td>
                      </tr>
                  ))}
                  {(result.requests ?? []).length === 0 && (
                      <tr><td colSpan={8}>No target requests found for this campaign.</td></tr>
                  )}
                  </tbody>
                </table>
              </div>

              <h4 style={{ margin: '20px 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
                Assignment Details
              </h4>
              <div className="hfd-table-wrap">
                <table className="hfd-preview-table">
                  <thead>
                  <tr>
                    <th>Target</th>
                    <th>Evaluator</th>
                    <th>Relationship</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Anonymous</th>
                    <th>Reason / Confidence</th>
                    <th>Action</th>
                  </tr>
                  </thead>
                  <tbody>
                  {(result.assignmentDetails ?? []).map(assignment => (
                      <tr key={assignment.assignmentId}>
                        <td>{renderPerson(assignment.targetEmployeeId, assignment.targetEmployeeName, true)}</td>
                        <td>{renderPerson(assignment.evaluatorEmployeeId, assignment.evaluatorEmployeeName, true)}</td>
                        <td><span className="hfd-count-pill">{sourceLabel(assignment.relationshipType)}</span></td>
                        <td>{methodLabel(assignment.selectionMethod)}</td>
                        <td>{assignment.status}</td>
                        <td>{assignment.anonymous ? 'Yes' : 'No'}</td>
                        <td>
                          {assignment.manualReason || assignment.selectionReason || assignment.confidence || '-'}
                          {assignment.warnings?.length ? <div className="hfd-muted">{assignment.warnings.join(', ')}</div> : null}
                        </td>
                        <td>
                          {assignment.assignmentId ? (
                              <button
                                  className="hfd-btn hfd-btn-outline"
                                  disabled={!isDraft || assignment.status === 'SUBMITTED'}
                                  onClick={() => handleRemove(assignment.assignmentId as number)}
                              >
                                Remove
                              </button>
                          ) : (
                              <span className="hfd-muted">Preview</span>
                          )}
                        </td>
                      </tr>
                  ))}
                  {(result.assignmentDetails ?? []).length === 0 && (
                      <tr><td colSpan={8}>No evaluator assignments yet.</td></tr>
                  )}
                  </tbody>
                </table>
              </div>

              {result.requests.some(request => (assignmentsByTarget.get(request.targetEmployeeId)?.length ?? 0) === 0) ? (
                  <div className="hfd-warning-box" style={{ marginTop: 14 }}>
                    Some targets still have no evaluators. Add manual evaluators or regenerate before activation.
                  </div>
              ) : null}
            </>
        )}

        {activeCampaign && !result && !loadingPreview && (
            <div className="hfd-alert" style={{ marginTop: 16 }}>
              Generate assignments to see target-level counts and evaluator detail rows. HR can then remove wrong evaluators or add manual overrides before activation.
            </div>
        )}
      </div>
  );
}

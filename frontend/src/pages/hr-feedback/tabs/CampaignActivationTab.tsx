import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import { authStorage } from '../../../services/authStorage';
import type { FeedbackCampaign } from '../../../types/feedbackCampaign';
import type { FeedbackCompletionDashboard, FeedbackCompletionItem, FeedbackRelationshipProgress } from '../../../types/feedback';

interface Props {
  activeCampaign: FeedbackCampaign | null;
}

type ProgressFilter = 'ALL' | 'PENDING' | 'OVERDUE' | 'COMPLETE' | 'NO_ASSIGNMENTS';
type MonitorSort = 'ACTION' | 'COMPLETION_ASC' | 'COMPLETION_DESC' | 'DEADLINE_ASC';
const formatPercent = (value?: number | null, digits = 0) => `${Number(value ?? 0).toFixed(digits)}%`;
const sourceCount = (value?: number | null) => Number(value ?? 0);

const formatDateTime = (value?: string | null) => {
  if (!value) return 'No deadline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const daysRemaining = (value?: string | null) => {
  if (!value) return 'No deadline';
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return 'No deadline';
  const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`;
  if (diff === 0) return 'Due today';
  return `${diff} day${diff === 1 ? '' : 's'} remaining`;
};

const deadlineTime = (row: FeedbackCompletionItem) => {
  const raw = row.effectiveDeadline ?? row.dueAt;
  if (!raw) return Number.POSITIVE_INFINITY;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

const rowSearchText = (row: FeedbackCompletionItem) => [
  row.targetEmployeeName,
  row.targetEmployeeEmail,
  row.targetEmployeeId,
  row.statusLabel,
  row.actionNeeded,
].filter(Boolean).join(' ').toLowerCase();

const escapeCsv = (value: string | number | null | undefined) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const normalizeRole = (role: unknown) => String(role ?? '')
    .replace(/^ROLE_/i, '')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

const currentUserCanReviewEarlyClose = () => {
  const user = authStorage.getUser();
  const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
  return roles.map(normalizeRole).some(role => ['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(role));
};

const progressFilterMatches = (row: FeedbackCompletionItem, filter: ProgressFilter) => {
  if (filter === 'ALL') return true;
  if (filter === 'NO_ASSIGNMENTS') return sourceCount(row.totalEvaluators) === 0;
  if (filter === 'COMPLETE') return sourceCount(row.totalEvaluators) > 0 && sourceCount(row.pendingEvaluators) === 0;
  if (filter === 'OVERDUE') return sourceCount(row.overdueEvaluators) > 0;
  if (filter === 'PENDING') return sourceCount(row.pendingEvaluators) > 0;
  return true;
};

const relationshipLabel = (role: string) => {
  if (role === 'MANAGER') return 'Manager';
  if (role === 'PEER') return 'Peer';
  if (role === 'SUBORDINATE') return 'Subordinate reviewer';
  if (role === 'SELF') return 'Self';
  return role;
};

const StatusPill = ({ label, value }: { label: string; value: number | string }) => (
    <div className="hfd-monitor-stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
);

const CompletionDonut = ({ value }: { value: number }) => (
    <div className="hfd-monitor-donut-card">
      <div className="hfd-monitor-donut" style={{ ['--value' as string]: Math.max(0, Math.min(100, value)) }}>
        <div>
          <strong>{formatPercent(value)}</strong>
          <span>complete</span>
        </div>
      </div>
      <div>
        <h3>Overall completion</h3>
        <p>Submitted assignments compared with all active evaluator assignments.</p>
      </div>
    </div>
);

const StackedStatusBar = ({ dashboard }: { dashboard: FeedbackCompletionDashboard }) => {
  const total = Math.max(1, sourceCount(dashboard.totalAssignments));
  const submitted = sourceCount(dashboard.statusBreakdown?.submitted ?? dashboard.submittedAssignments);
  const inProgress = sourceCount(dashboard.statusBreakdown?.inProgress ?? dashboard.inProgressAssignments);
  const notStarted = sourceCount(dashboard.statusBreakdown?.notStarted ?? dashboard.notStartedAssignments);
  const overdue = sourceCount(dashboard.statusBreakdown?.overdue ?? dashboard.overdueAssignments);
  const rows = [
    { key: 'submitted', label: 'Submitted', value: submitted },
    { key: 'in-progress', label: 'In progress', value: inProgress },
    { key: 'not-started', label: 'Not started', value: notStarted },
    { key: 'overdue', label: 'Overdue', value: overdue },
  ];
  return (
      <div className="hfd-monitor-chart-card">
        <div className="hfd-monitor-chart-heading">
          <h3>Assignment status</h3>
          <span>{dashboard.totalAssignments} total</span>
        </div>
        <div className="hfd-monitor-stacked-bar" aria-label="Assignment status breakdown">
          {rows.map(row => row.value > 0 && (
              <span key={row.key} className={`hfd-monitor-stack-segment ${row.key}`} style={{ width: `${(row.value / total) * 100}%` }} />
          ))}
        </div>
        <div className="hfd-monitor-legend">
          {rows.map(row => (
              <span key={row.key}><i className={`hfd-monitor-dot ${row.key}`} />{row.label}: {row.value}</span>
          ))}
        </div>
      </div>
  );
};

const RoleProgressBars = ({ roles }: { roles: FeedbackRelationshipProgress[] }) => (
    <div className="hfd-monitor-chart-card">
      <div className="hfd-monitor-chart-heading">
        <h3>Evaluator role progress</h3>
        <span>Submitted / total</span>
      </div>
      <div className="hfd-monitor-bars">
        {roles.map(role => {
          const total = sourceCount(role.total);
          const percent = total === 0 ? 0 : sourceCount(role.completionPercent);
          return (
              <div className="hfd-monitor-bar-row" key={role.relationshipType}>
                <span>{role.label ?? relationshipLabel(role.relationshipType)}</span>
                <div className="hfd-monitor-bar-track"><div className="hfd-monitor-bar-fill" style={{ width: `${Math.min(100, percent)}%` }} /></div>
                <strong>{sourceCount(role.submitted)} / {total}</strong>
              </div>
          );
        })}
      </div>
    </div>
);

const TargetRiskChart = ({ dashboard }: { dashboard: FeedbackCompletionDashboard }) => {
  const breakdown = dashboard.targetStatusBreakdown ?? {
    completed: dashboard.completedTargets ?? 0,
    pending: dashboard.targetsWithPending ?? 0,
    overdue: dashboard.targetsWithOverdue ?? 0,
    noAssignments: 0,
  };
  const rows = [
    { key: 'completed', label: 'Completed', value: sourceCount(breakdown.completed) },
    { key: 'pending', label: 'Pending', value: sourceCount(breakdown.pending) },
    { key: 'overdue', label: 'Overdue', value: sourceCount(breakdown.overdue) },
    { key: 'no-assignments', label: 'No assignments', value: sourceCount(breakdown.noAssignments) },
  ];
  const max = Math.max(1, ...rows.map(row => row.value));
  return (
      <div className="hfd-monitor-chart-card">
        <div className="hfd-monitor-chart-heading">
          <h3>Target risk view</h3>
          <span>{dashboard.totalTargets ?? dashboard.totalRequests} targets</span>
        </div>
        <div className="hfd-monitor-risk-grid">
          {rows.map(row => (
              <div className={`hfd-monitor-risk-card ${row.key}`} key={row.key}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
                <div className="hfd-monitor-mini-track"><i style={{ width: `${(row.value / max) * 100}%` }} /></div>
              </div>
          ))}
        </div>
      </div>
  );
};

export default function CampaignMonitoringTab({ activeCampaign }: Props) {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>(activeCampaign?.id ?? '');
  const [dashboard, setDashboard] = useState<FeedbackCompletionDashboard | null>(null);
  const [filter, setFilter] = useState<ProgressFilter>('ALL');
  const [sortBy, setSortBy] = useState<MonitorSort>('ACTION');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [earlyCloseRequests, setEarlyCloseRequests] = useState<FeedbackCampaign[]>([]);
  const [earlyCloseLoading, setEarlyCloseLoading] = useState(false);

  const operationalCampaigns = useMemo(
      () => campaigns.filter(c => ['ACTIVE', 'CLOSED', 'PUBLISHED'].includes(String(c.status))),
      [campaigns],
  );
  const selectedCampaign = operationalCampaigns.find(c => c.id === selectedId) ?? campaigns.find(c => c.id === selectedId);
  const status = selectedCampaign?.status ?? dashboard?.campaignStatus;
  const activeStatus = status === 'ACTIVE';
  const closedStatus = status === 'CLOSED' || status === 'PUBLISHED';

  const refreshEarlyCloseRequests = () => {
    if (!currentUserCanReviewEarlyClose()) {
      setEarlyCloseRequests([]);
      setEarlyCloseLoading(false);
      return;
    }
    setEarlyCloseLoading(true);
    hrFeedbackApi.getPendingEarlyCloseRequests()
        .then(setEarlyCloseRequests)
        .catch(() => setEarlyCloseRequests([]))
        .finally(() => setEarlyCloseLoading(false));
  };

  const refreshCampaigns = () => {
    hrFeedbackApi.getAllCampaigns()
        .then(items => {
          setCampaigns(items);
          setSelectedId(current => {
            if (activeCampaign?.id) return activeCampaign.id;
            if (current && items.some(c => c.id === current)) return current;
            const firstOperational = items.find(c => ['ACTIVE', 'CLOSED', 'PUBLISHED'].includes(String(c.status)));
            return firstOperational?.id ?? '';
          });
        })
        .catch(e => setError(e.message));
    refreshEarlyCloseRequests();
  };

  const refreshDashboard = () => {
    if (!selectedId) { setDashboard(null); return; }
    setLoading(true);
    setError('');
    hrFeedbackApi.getCompletionDashboard(selectedId as number)
        .then(setDashboard)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshCampaigns();
  }, []);

  useEffect(() => {
    if (activeCampaign?.id) setSelectedId(activeCampaign.id);
  }, [activeCampaign?.id]);

  useEffect(() => {
    refreshDashboard();
    setFilter('ALL');
    setSearchTerm('');
  }, [selectedId]);

  const updateCampaignInList = (updated: FeedbackCampaign) => {
    setCampaigns(prev => prev.map(item => item.id === updated.id ? updated : item));
    setEarlyCloseRequests(prev => prev.filter(item => item.id !== updated.id));
  };

  const allEvaluatorsSubmitted = Boolean(
      dashboard && dashboard.totalAssignments > 0 && dashboard.submittedAssignments >= dashboard.totalAssignments,
  );
  const isBeforeCampaignDeadline = Boolean(selectedCampaign?.endAt && new Date(selectedCampaign.endAt).getTime() > Date.now());

  const sendReminders = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    setNotice('');
    setError('');
    try {
      const res = await hrFeedbackApi.sendPendingReminders(selectedId as number);
      setNotice(`Pending reminders sent to ${sourceCount(res.notifiedEvaluatorCount)} evaluator(s).`);
      refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reminders.');
    } finally {
      setActionLoading(false);
    }
  };

  const requestEarlyClose = async () => {
    if (!selectedId || !selectedCampaign) return;
    const reason = window.prompt(
        'All evaluators have submitted. Enter a reason to request Admin approval for early campaign close.',
        'All evaluators submitted earlier than the scheduled deadline. Requesting early close to proceed with analytics review.',
    );
    if (!reason?.trim()) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const updated = await hrFeedbackApi.requestEarlyClose(selectedId as number, reason.trim());
      updateCampaignInList(updated);
      setNotice('Early close request sent to Admin. The campaign remains active until approval.');
      refreshDashboard();
      refreshEarlyCloseRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to request early close.');
    } finally {
      setActionLoading(false);
    }
  };

  const reviewEarlyClose = async (campaignId: number, decision: 'approve' | 'reject') => {
    const defaultNote = decision === 'approve'
        ? 'Approved. All evaluators have submitted final feedback.'
        : 'Rejected. Campaign should remain active until the scheduled deadline.';
    const reviewNote = window.prompt(
        decision === 'approve' ? 'Add an Admin approval note before closing this campaign.' : 'Add a rejection reason. The campaign will remain active.',
        defaultNote,
    );
    if (reviewNote === null) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const updated = decision === 'approve'
          ? await hrFeedbackApi.approveEarlyClose(campaignId, reviewNote.trim())
          : await hrFeedbackApi.rejectEarlyClose(campaignId, reviewNote.trim());
      updateCampaignInList(updated);
      setNotice(decision === 'approve' ? 'Early close approved. Campaign is now closed.' : 'Early close request rejected.');
      refreshCampaigns();
      refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${decision} early close request.`);
    } finally {
      setActionLoading(false);
    }
  };

  const closeCampaign = async () => {
    if (!selectedId) return;
    const confirmed = window.confirm('Close this campaign now? Pending feedback will be locked. If only warning-level items remain, the campaign will close with warning acknowledgement.');
    if (!confirmed) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const updated = await hrFeedbackApi.closeCampaign(selectedId as number);
      updateCampaignInList(updated);
      setNotice('Campaign closed. Open Analytics to review scores and publish employee results.');
      refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close campaign.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return (dashboard?.requests ?? [])
        .filter(row => progressFilterMatches(row, filter))
        .filter(row => !normalizedSearch || rowSearchText(row).includes(normalizedSearch))
        .sort((a, b) => {
          if (sortBy === 'COMPLETION_ASC') return sourceCount(a.completionPercent) - sourceCount(b.completionPercent);
          if (sortBy === 'COMPLETION_DESC') return sourceCount(b.completionPercent) - sourceCount(a.completionPercent);
          if (sortBy === 'DEADLINE_ASC') return deadlineTime(a) - deadlineTime(b);
          const aWeight = sourceCount(a.overdueEvaluators) * 1000 + sourceCount(a.pendingEvaluators) * 10 - sourceCount(a.completionPercent);
          const bWeight = sourceCount(b.overdueEvaluators) * 1000 + sourceCount(b.pendingEvaluators) * 10 - sourceCount(b.completionPercent);
          return bWeight - aWeight;
        });
  }, [dashboard?.requests, filter, searchTerm, sortBy]);

  const exportCsv = () => {
    if (!filteredRows.length) return;
    const header = ['Target Employee', 'Target ID', 'Submitted', 'Pending', 'Overdue', 'Completion', 'Deadline', 'Action Needed'];
    const body = filteredRows.map(row => [
      row.targetEmployeeName ?? '',
      row.targetEmployeeId,
      row.submittedEvaluators,
      row.pendingEvaluators,
      row.overdueEvaluators ?? 0,
      row.completionPercent,
      formatDateTime(row.effectiveDeadline ?? row.dueAt),
      row.actionNeeded ?? '',
    ]);
    const csv = [header, ...body].map(line => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-campaign-${selectedId}-monitoring.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderEvaluatorMix = (row: FeedbackCompletionItem) => {
    const parts = [
      ['Manager', row.managerEvaluators],
      ['Peer', row.peerEvaluators],
      ['Subordinate reviewer', row.subordinateEvaluators],
      ['Self', row.selfEvaluators],
    ].filter(([, count]) => sourceCount(count as number) > 0);
    if (!parts.length) return <span className="hfd-muted">No assignments</span>;
    return <div className="hfd-monitor-chip-list">{parts.map(([label, count]) => <span key={label}>{label}: {count}</span>)}</div>;
  };

  return (
      <div className="hfd-monitoring-page">
        <div className="hfd-card-header hfd-monitor-header">
          <div className="hfd-card-title">
            <i className="bi bi-activity" />
            <div>
              <h2>Campaign Monitoring</h2>
              <p>Track feedback collection progress and follow up on pending evaluators. Scores stay hidden until Analytics.</p>
            </div>
          </div>
          <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => { refreshCampaigns(); refreshDashboard(); }} disabled={loading}>
            <i className="bi bi-arrow-repeat" /> Refresh Progress
          </button>
        </div>

        {notice && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{notice}</div>}
        {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}

        {earlyCloseRequests.length > 0 && (
            <div className="hfd-monitor-review-panel">
              <div>
                <strong>Early close requests</strong>
                <p>{earlyCloseLoading ? 'Loading requests…' : `${earlyCloseRequests.length} campaign(s) need Admin review.`}</p>
              </div>
              <div className="hfd-monitor-review-list">
                {earlyCloseRequests.map(request => (
                    <div key={request.id} className="hfd-monitor-review-item">
                      <span>{request.name}</span>
                      <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => reviewEarlyClose(request.id, 'reject')} disabled={actionLoading}>Reject</button>
                      <button className="hfd-btn hfd-btn-primary" type="button" onClick={() => reviewEarlyClose(request.id, 'approve')} disabled={actionLoading}>Approve</button>
                    </div>
                ))}
              </div>
            </div>
        )}

        <div className="hfd-campaign-select-bar">
          <label className="hfd-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Campaign</label>
          <select className="hfd-select" value={selectedId} onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">— Select active or closed campaign —</option>
            {operationalCampaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status}</option>
            ))}
          </select>
        </div>

        {!selectedId && (
            <div className="hfd-empty">
              <i className="bi bi-activity" />
              <p>Select an active or closed campaign to monitor feedback collection.</p>
            </div>
        )}

        {loading && <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading progress…</div>}

        {dashboard && !loading && (
            <>
              <div className="hfd-monitor-status-banner">
                <div>
                  <span className={`hfd-status-chip ${String(status ?? '').toLowerCase()}`}>{status}</span>
                  <h3>{dashboard.healthStatus === 'COMPLETE' ? 'Collection complete' : dashboard.healthStatus === 'OVERDUE' ? 'Attention needed' : 'Collection in progress'}</h3>
                  <p>{dashboard.healthMessage ?? 'Monitor pending evaluators and follow up when needed.'}</p>
                </div>
                <strong>{daysRemaining(dashboard.campaignEndAt)}</strong>
              </div>

              <div className="hfd-monitor-stat-grid">
                <StatusPill label="Submitted" value={sourceCount(dashboard.submittedAssignments)} />
                <StatusPill label="Pending" value={sourceCount(dashboard.pendingAssignments)} />
                <StatusPill label="Overdue" value={sourceCount(dashboard.overdueAssignments)} />
                <StatusPill label="Targets" value={sourceCount(dashboard.totalTargets ?? dashboard.totalRequests)} />
                <StatusPill label="Total assignments" value={sourceCount(dashboard.totalAssignments)} />
              </div>

              <div className="hfd-monitor-grid">
                <CompletionDonut value={sourceCount(dashboard.completionPercent)} />
                <StackedStatusBar dashboard={dashboard} />
                <RoleProgressBars roles={dashboard.relationshipProgress ?? []} />
                <TargetRiskChart dashboard={dashboard} />
              </div>

              <div className="hfd-monitor-actions">
                <div>
                  <h3>Actions</h3>
                  <p>Use reminders and close controls while the campaign is active. Publishing belongs in Analytics after close.</p>
                </div>
                <div className="hfd-monitor-action-buttons">
                  <button className="hfd-btn hfd-btn-secondary" type="button" onClick={sendReminders} disabled={!activeStatus || sourceCount(dashboard.pendingAssignments) === 0 || actionLoading}>
                    <i className="bi bi-send" /> Send Pending Reminders
                  </button>
                  <button className="hfd-btn hfd-btn-secondary" type="button" onClick={requestEarlyClose} disabled={!activeStatus || !allEvaluatorsSubmitted || !isBeforeCampaignDeadline || actionLoading}>
                    <i className="bi bi-flag" /> Request Early Close
                  </button>
                  <button className="hfd-btn hfd-btn-danger" type="button" onClick={closeCampaign} disabled={!activeStatus || actionLoading}>
                    <i className="bi bi-lock" /> Close Campaign
                  </button>
                  {closedStatus && (
                      <Link className="hfd-btn hfd-btn-primary" to="/hr/feedback/analytics">
                        <i className="bi bi-bar-chart-line" /> Open Analytics
                      </Link>
                  )}
                </div>
              </div>

              <div className="hfd-monitor-table-card">
                <div className="hfd-monitor-table-toolbar">
                  <div>
                    <h3>Target progress</h3>
                    <p>Evaluator identities are hidden. Counts show where follow-up is needed.</p>
                  </div>
                  <div className="hfd-monitor-controls">
                    <input className="hfd-input" placeholder="Search target or action…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <select className="hfd-select" value={filter} onChange={e => setFilter(e.target.value as ProgressFilter)}>
                      <option value="ALL">All targets</option>
                      <option value="PENDING">Pending</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="COMPLETE">Complete</option>
                      <option value="NO_ASSIGNMENTS">No assignments</option>
                    </select>
                    <select className="hfd-select" value={sortBy} onChange={e => setSortBy(e.target.value as MonitorSort)}>
                      <option value="ACTION">Action priority</option>
                      <option value="COMPLETION_ASC">Completion low to high</option>
                      <option value="COMPLETION_DESC">Completion high to low</option>
                      <option value="DEADLINE_ASC">Deadline first</option>
                    </select>
                    <button className="hfd-btn hfd-btn-secondary" type="button" onClick={exportCsv} disabled={!filteredRows.length}>Export CSV</button>
                  </div>
                </div>

                <div className="hfd-table-wrap">
                  <table className="hfd-preview-table hfd-monitor-table">
                    <thead>
                    <tr>
                      <th>Target Employee</th>
                      <th>Evaluator Mix</th>
                      <th>Submitted</th>
                      <th>Pending</th>
                      <th>Overdue</th>
                      <th>Completion</th>
                      <th>Deadline</th>
                      <th>Action Needed</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredRows.map(row => (
                        <tr key={row.requestId}>
                          <td>
                            <strong>{row.targetEmployeeName ?? `Employee #${row.targetEmployeeId}`}</strong>
                            <small>ID {row.targetEmployeeId}</small>
                          </td>
                          <td>{renderEvaluatorMix(row)}</td>
                          <td><strong>{sourceCount(row.submittedEvaluators)}</strong></td>
                          <td>{sourceCount(row.pendingEvaluators)}</td>
                          <td><span className={sourceCount(row.overdueEvaluators) > 0 ? 'hfd-danger-text' : ''}>{sourceCount(row.overdueEvaluators)}</span></td>
                          <td>
                            <div className="hfd-monitor-inline-progress"><span style={{ width: `${Math.min(100, sourceCount(row.completionPercent))}%` }} /></div>
                            {formatPercent(row.completionPercent)}
                          </td>
                          <td>{formatDateTime(row.effectiveDeadline ?? row.dueAt)}</td>
                          <td>{row.actionNeeded ?? 'No action needed.'}</td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
        )}
      </div>
  );
}

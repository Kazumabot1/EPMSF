import { useEffect, useMemo, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import { feedbackAnalyticsApi } from '../../../api/feedbackAnalyticsApi';
import type { FeedbackCampaign } from '../../../types/feedbackCampaign';
import type {
  FeedbackCampaignSummary,
  FeedbackCompetencyAverage,
  FeedbackResultItem,
  FeedbackSummaryPublishRequest,
} from '../../../types/feedbackAnalytics';

type PublishFilter = 'ALL' | 'HIDDEN' | 'READY_TO_PUBLISH' | 'PUBLISHED';
type ConfidenceFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
type AnalyticsSort = 'SCORE_ASC' | 'SCORE_DESC' | 'COMPLETION_ASC' | 'COMPLETION_DESC' | 'RESPONSES_DESC';
type PublishStep = 1 | 2;
type PublishScope = 'ALL_READY' | 'SELECTED_EMPLOYEES';

type PublishOptions = {
  scope: PublishScope;
  selectedEmployeeIds: number[];
  includeOverallScore: boolean;
  includeCompetencyBreakdown: boolean;
  includeSelfVsOthers: boolean;
  includeComments: boolean;
  includeScoreExplanation: boolean;
  confirmVisibility: boolean;
};

const defaultPublishOptions = (): PublishOptions => ({
  scope: 'ALL_READY',
  selectedEmployeeIds: [],
  includeOverallScore: true,
  includeCompetencyBreakdown: true,
  includeSelfVsOthers: true,
  includeComments: false,
  includeScoreExplanation: true,
  confirmVisibility: false,
});

const formatScore = (value?: number | null, digits = 1) => value == null ? '—' : `${Number(value).toFixed(digits)}%`;
const sourceCount = (value?: number | null) => Number(value ?? 0);
const visibilityLabel = (status?: string | null) => status === 'PUBLISHED' ? 'Published' : status === 'READY_TO_PUBLISH' ? 'Ready' : 'Hidden';
const confidenceLabel = (item: FeedbackResultItem) => item.insufficientFeedback ? 'Insufficient' : item.confidenceLevel || 'Not calculated';
const isReadyToPublish = (item: FeedbackResultItem) => sourceCount(item.totalResponses) > 0 && !item.insufficientFeedback;

const scoreBand = (score?: number | null) => {
  if (score == null) return 'No score';
  if (score >= 86) return 'Outstanding';
  if (score >= 71) return 'Good';
  if (score >= 60) return 'Meets requirement';
  if (score >= 40) return 'Needs improvement';
  return 'Unsatisfactory';
};

const employeeSearchText = (item: FeedbackResultItem) => [
  item.targetEmployeeName,
  item.targetEmployeeId,
  item.scoreCategory,
  item.confidenceLevel,
  item.visibilityStatus,
  item.scoreCalculationNote,
].filter(Boolean).join(' ').toLowerCase();

const confidenceMatches = (item: FeedbackResultItem, filter: ConfidenceFilter) => {
  if (filter === 'ALL') return true;
  if (filter === 'INSUFFICIENT') return Boolean(item.insufficientFeedback);
  return String(item.confidenceLevel ?? '').toUpperCase() === filter;
};

const relationshipBreakdown = (item: FeedbackResultItem) => [
  { label: 'Manager', count: item.managerResponses, score: item.managerAverageScore, threshold: 1 },
  { label: 'Peer', count: item.peerResponses, score: item.peerAverageScore, threshold: 2 },
  { label: 'Direct Report', count: item.subordinateResponses, score: item.subordinateAverageScore, threshold: 2 },
  { label: 'Self', count: item.selfResponses ?? 0, score: item.selfAverageScore, threshold: 1 },
].filter(row => sourceCount(row.count) > 0);

const escapeCsv = (value: string | number | null | undefined) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const StatCard = ({ label, value, helper }: { label: string; value: string | number; helper?: string }) => (
    <div className="hfd-analytics-stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
      {helper && <small>{helper}</small>}
    </div>
);

const BarList = ({
                   title,
                   subtitle,
                   rows,
                 }: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: number; meta?: string }>;
}) => {
  const max = Math.max(1, ...rows.map(row => row.value));
  return (
      <div className="hfd-analytics-chart-card">
        <div className="hfd-monitor-chart-heading">
          <h3>{title}</h3>
          {subtitle && <span>{subtitle}</span>}
        </div>
        <div className="hfd-analytics-bars">
          {rows.length === 0 ? <p className="hfd-muted">No data yet.</p> : rows.map(row => (
              <div className="hfd-analytics-bar-row" key={row.label}>
                <span>{row.label}</span>
                <div className="hfd-monitor-bar-track"><div className="hfd-monitor-bar-fill" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} /></div>
                <strong>{row.meta ?? row.value}</strong>
              </div>
          ))}
        </div>
      </div>
  );
};

const ScoreDistributionChart = ({ summary }: { summary: FeedbackCampaignSummary }) => {
  const rows = summary.scoreDistribution?.length
      ? summary.scoreDistribution.map(row => ({ label: `${row.band} ${row.label}`, value: sourceCount(row.count), meta: `${row.count}` }))
      : [
        { key: 'Outstanding', min: 86, max: 100 },
        { key: 'Good', min: 71, max: 85 },
        { key: 'Meets requirement', min: 60, max: 70 },
        { key: 'Needs improvement', min: 40, max: 59 },
        { key: 'Unsatisfactory', min: 0, max: 39 },
      ].map(band => ({
        label: band.key,
        value: (summary.items ?? []).filter(item => item.averageScore != null && item.averageScore >= band.min && item.averageScore <= band.max).length,
      }));
  return <BarList title="Score distribution" subtitle="Employees by band" rows={rows} />;
};

const RelationshipAverageChart = ({ summary }: { summary: FeedbackCampaignSummary }) => {
  const rows = summary.relationshipAverages?.length
      ? summary.relationshipAverages.map(row => ({ label: row.label ?? row.relationshipType, value: Number(row.averageScore ?? 0), meta: `${formatScore(row.averageScore)} · ${row.responseCount} responses` }))
      : [
        { label: 'Manager', getScore: (item: FeedbackResultItem) => item.managerAverageScore, getCount: (item: FeedbackResultItem) => item.managerResponses },
        { label: 'Peer', getScore: (item: FeedbackResultItem) => item.peerAverageScore, getCount: (item: FeedbackResultItem) => item.peerResponses },
        { label: 'Direct Report', getScore: (item: FeedbackResultItem) => item.subordinateAverageScore, getCount: (item: FeedbackResultItem) => item.subordinateResponses },
        { label: 'Self', getScore: (item: FeedbackResultItem) => item.selfAverageScore, getCount: (item: FeedbackResultItem) => item.selfResponses ?? 0 },
      ].map(role => {
        const rowsForRole = (summary.items ?? []).filter(item => sourceCount(role.getCount(item)) > 0 && role.getScore(item) != null);
        const average = rowsForRole.length ? rowsForRole.reduce((total, item) => total + Number(role.getScore(item) ?? 0), 0) / rowsForRole.length : 0;
        return { label: role.label, value: average, meta: formatScore(average) };
      });
  return <BarList title="Average by evaluator role" subtitle="Self vs others source data" rows={rows} />;
};

const CompetencyChart = ({ competencies }: { competencies: FeedbackCompetencyAverage[] }) => {
  const top = competencies.slice(0, 5).map(row => ({ label: row.competencyName, value: Number(row.averageScore ?? 0), meta: `${formatScore(row.averageScore)} · ${row.responseCount} ratings` }));
  const needs = [...competencies].sort((a, b) => Number(a.averageScore ?? 999) - Number(b.averageScore ?? 999)).slice(0, 5)
      .map(row => ({ label: row.competencyName, value: Number(row.averageScore ?? 0), meta: `${formatScore(row.averageScore)} · ${row.responseCount} ratings` }));
  return (
      <div className="hfd-analytics-two-col">
        <BarList title="Top competencies" subtitle="Highest average scores" rows={top} />
        <BarList title="Needs attention" subtitle="Lowest average scores" rows={needs} />
      </div>
  );
};

const contentSummary = (options: PublishOptions) => [
  options.includeOverallScore && 'Overall score and rating band',
  options.includeCompetencyBreakdown && 'Competency breakdown',
  options.includeSelfVsOthers && 'Self vs others comparison',
  options.includeComments && 'Anonymous written comments',
  options.includeScoreExplanation && 'Score explanation',
].filter(Boolean).join(', ');

export default function AnalyticsTab() {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [summary, setSummary] = useState<FeedbackCampaignSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('ALL');
  const [sortBy, setSortBy] = useState<AnalyticsSort>('SCORE_DESC');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<PublishStep>(1);
  const [publishOptions, setPublishOptions] = useState<PublishOptions>(defaultPublishOptions);

  const closedCampaigns = useMemo(
      () => campaigns.filter(campaign => campaign.status === 'CLOSED' || campaign.status === 'PUBLISHED'),
      [campaigns],
  );
  const selectedCampaign = closedCampaigns.find(campaign => campaign.id === selectedId);

  useEffect(() => {
    hrFeedbackApi.getAllCampaigns()
        .then(items => {
          setCampaigns(items);
          setSelectedId(current => {
            if (current && items.some(c => c.id === current && (c.status === 'CLOSED' || c.status === 'PUBLISHED'))) return current;
            const firstClosed = items.find(c => c.status === 'CLOSED' || c.status === 'PUBLISHED');
            return firstClosed?.id ?? '';
          });
        })
        .catch(e => setError(e.message));
  }, []);

  const refreshSummary = () => {
    if (!selectedId) { setSummary(null); return; }
    setLoading(true);
    setError('');
    feedbackAnalyticsApi.getCampaignSummary(selectedId as number)
        .then(setSummary)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshSummary();
    setSearchTerm('');
    setPublishFilter('ALL');
    setConfidenceFilter('ALL');
    setExpandedEmployeeId(null);
    setNotice('');
    setPublishOpen(false);
  }, [selectedId]);

  const readyItems = useMemo(() => (summary?.items ?? []).filter(isReadyToPublish), [summary?.items]);
  const blockedItems = useMemo(() => (summary?.items ?? []).filter(item => !isReadyToPublish(item)), [summary?.items]);
  const publishedCount = useMemo(() => (summary?.items ?? []).filter(item => item.visibilityStatus === 'PUBLISHED').length, [summary?.items]);
  const readyCount = readyItems.length;
  const selectedReadyCount = publishOptions.scope === 'ALL_READY'
      ? readyCount
      : readyItems.filter(item => publishOptions.selectedEmployeeIds.includes(item.targetEmployeeId)).length;

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return (summary?.items ?? [])
        .filter(item => !normalizedSearch || employeeSearchText(item).includes(normalizedSearch))
        .filter(item => publishFilter === 'ALL' || String(item.visibilityStatus ?? 'HIDDEN') === publishFilter)
        .filter(item => confidenceMatches(item, confidenceFilter))
        .sort((a, b) => {
          switch (sortBy) {
            case 'SCORE_ASC': return Number(a.averageScore ?? 999) - Number(b.averageScore ?? 999);
            case 'COMPLETION_ASC': return Number(a.completionRate ?? 999) - Number(b.completionRate ?? 999);
            case 'COMPLETION_DESC': return Number(b.completionRate ?? -1) - Number(a.completionRate ?? -1);
            case 'RESPONSES_DESC': return Number(b.totalResponses ?? 0) - Number(a.totalResponses ?? 0);
            case 'SCORE_DESC':
            default: return Number(b.averageScore ?? -1) - Number(a.averageScore ?? -1);
          }
        });
  }, [confidenceFilter, publishFilter, searchTerm, sortBy, summary?.items]);

  const employeeRankingRows = useMemo(
      () => [...(summary?.items ?? [])]
          .sort((a, b) => Number(b.averageScore ?? -1) - Number(a.averageScore ?? -1))
          .slice(0, 10)
          .map(item => ({ label: item.targetEmployeeName, value: Number(item.averageScore ?? 0), meta: formatScore(item.averageScore) })),
      [summary?.items],
  );

  const openPublishPanel = () => {
    setPublishStep(1);
    setPublishOptions(defaultPublishOptions());
    setPublishOpen(true);
  };

  const toggleSelectedEmployee = (employeeId: number) => {
    setPublishOptions(current => ({
      ...current,
      selectedEmployeeIds: current.selectedEmployeeIds.includes(employeeId)
          ? current.selectedEmployeeIds.filter(id => id !== employeeId)
          : [...current.selectedEmployeeIds, employeeId],
    }));
  };

  const selectAllReadyEmployees = () => {
    setPublishOptions(current => ({ ...current, selectedEmployeeIds: readyItems.map(item => item.targetEmployeeId) }));
  };

  const publishPayload = (): FeedbackSummaryPublishRequest => ({
    scope: publishOptions.scope,
    targetEmployeeIds: publishOptions.scope === 'SELECTED_EMPLOYEES' ? publishOptions.selectedEmployeeIds : undefined,
    includeOverallScore: publishOptions.includeOverallScore,
    includeCompetencyBreakdown: publishOptions.includeCompetencyBreakdown,
    includeSelfVsOthers: publishOptions.includeSelfVsOthers,
    includeComments: publishOptions.includeComments,
    includeScoreExplanation: publishOptions.includeScoreExplanation,
    notifyEmployees: true,
  });

  const publishReady = selectedReadyCount > 0
      && publishOptions.confirmVisibility
      && (publishOptions.includeOverallScore
          || publishOptions.includeCompetencyBreakdown
          || publishOptions.includeSelfVsOthers
          || publishOptions.includeComments
          || publishOptions.includeScoreExplanation);

  const runPublish = async () => {
    if (!selectedId || !publishReady) return;
    setActionLoading(true);
    setNotice('');
    setError('');
    try {
      const nextSummary = await feedbackAnalyticsApi.publishCampaignSummary(selectedId as number, publishPayload());
      setSummary(nextSummary);
      setNotice('Results published. Employees with published results have been notified. Results are visible to the employee and HR only.');
      setPublishOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish results.');
    } finally {
      setActionLoading(false);
    }
  };

  const runUnpublish = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    setNotice('');
    setError('');
    try {
      const nextSummary = await feedbackAnalyticsApi.unpublishCampaignSummary(selectedId as number);
      setSummary(nextSummary);
      setNotice('Results unpublished. Employees can no longer view these 360 feedback results.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unpublish results.');
    } finally {
      setActionLoading(false);
    }
  };

  const exportCsv = () => {
    if (!filteredItems.length) return;
    const header = ['Employee', 'Employee ID', 'Average Score', 'Score Band', 'Confidence', 'Completion Rate', 'Assigned', 'Submitted', 'Pending', 'Manager', 'Peer', 'Direct Report', 'Self', 'Publish Status', 'Calculation Note'];
    const body = filteredItems.map(item => [
      item.targetEmployeeName,
      item.targetEmployeeId,
      item.averageScore ?? '',
      scoreBand(item.averageScore),
      confidenceLabel(item),
      item.completionRate ?? '',
      item.assignedEvaluatorCount ?? '',
      item.submittedEvaluatorCount ?? '',
      item.pendingEvaluatorCount ?? '',
      item.managerResponses,
      item.peerResponses,
      item.subordinateResponses,
      item.selfResponses ?? 0,
      visibilityLabel(item.visibilityStatus),
      item.scoreCalculationNote ?? '',
    ]);
    const csv = [header, ...body].map(line => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-campaign-${selectedId}-analytics.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
      <div className="hfd-analytics-page">
        <div className="hfd-card-header hfd-monitor-header">
          <div className="hfd-card-title">
            <i className="bi bi-bar-chart-line" />
            <div>
              <h2>360 Feedback Analytics</h2>
              <p>Review closed-campaign results, compare scores, and publish employee summaries.</p>
            </div>
          </div>
          <button className="hfd-btn hfd-btn-secondary" type="button" onClick={refreshSummary} disabled={!selectedId || loading}>
            <i className="bi bi-arrow-repeat" /> Refresh Analytics
          </button>
        </div>

        <div className="hfd-alert hfd-alert-info">
          <i className="bi bi-shield-lock" /> Published results are visible to employees and HR only. Evaluator names are never shown.
        </div>
        {notice && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{notice}</div>}
        {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}

        <div className="hfd-campaign-select-bar">
          <label className="hfd-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Closed campaign</label>
          <select className="hfd-select" value={selectedId} onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">— Select closed campaign —</option>
            {closedCampaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status}</option>
            ))}
          </select>
        </div>

        {closedCampaigns.length === 0 && (
            <div className="hfd-empty">
              <i className="bi bi-lock" />
              <p>Analytics will be available after a feedback campaign is closed.</p>
            </div>
        )}

        {loading && <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading analytics…</div>}

        {summary && !loading && (
            <>
              <div className="hfd-analytics-summary-banner">
                <div>
                  <span className={`hfd-status-chip ${String(summary.visibilityStatus ?? '').toLowerCase()}`}>{visibilityLabel(summary.visibilityStatus)}</span>
                  <h3>{selectedCampaign?.name ?? summary.campaignName}</h3>
                  <p>{summary.status} campaign · {summary.totalEmployees} employees · {summary.totalResponses} submitted responses</p>
                </div>
                <strong>{formatScore(summary.overallAverageScore)}</strong>
              </div>

              <div className="hfd-analytics-stat-grid">
                <StatCard label="Overall average" value={formatScore(summary.overallAverageScore)} helper={summary.overallScoreCategory} />
                <StatCard label="Employees evaluated" value={summary.totalEmployees} />
                <StatCard label="Ready to publish" value={readyCount} helper={`${blockedItems.length} blocked`} />
                <StatCard label="Completion" value={formatScore(summary.completionRate)} />
                <StatCard label="Insufficient feedback" value={sourceCount(summary.insufficientFeedbackCount)} />
                <StatCard label="Published" value={`${publishedCount}/${summary.totalEmployees}`} />
              </div>

              <div className="hfd-analytics-chart-grid">
                <ScoreDistributionChart summary={summary} />
                <RelationshipAverageChart summary={summary} />
                <BarList title="Employee ranking" subtitle="Top score overview" rows={employeeRankingRows} />
                <BarList title="Confidence" subtitle="Result quality" rows={(summary.confidenceBreakdown ?? []).map(row => ({ label: row.label, value: row.count, meta: `${row.count}` }))} />
              </div>

              <CompetencyChart competencies={summary.competencyAverages ?? []} />

              <div className="hfd-analytics-publish-panel hfd-publish-v1-card">
                <div>
                  <h3>Publish employee results</h3>
                  <p>Release published 360 feedback results to employees. HR keeps access automatically.</p>
                  <div className="hfd-publish-mini-stats">
                    <span>{readyCount} ready</span>
                    <span>{blockedItems.length} blocked</span>
                    <span>{publishedCount} published</span>
                  </div>
                </div>
                <div className="hfd-monitor-action-buttons">
                  <button className="hfd-btn hfd-btn-secondary" type="button" onClick={runUnpublish} disabled={actionLoading || publishedCount === 0}>
                    <i className="bi bi-eye-slash" /> Unpublish
                  </button>
                  <button className="hfd-btn hfd-btn-primary" type="button" onClick={openPublishPanel} disabled={actionLoading || readyCount === 0}>
                    <i className="bi bi-send-check" /> Publish Results
                  </button>
                </div>
              </div>

              <div className="hfd-monitor-table-card">
                <div className="hfd-monitor-table-toolbar">
                  <div>
                    <h3>Employee results</h3>
                    <p>Review score, confidence, completion, self-vs-others readiness, and publish state.</p>
                  </div>
                  <div className="hfd-monitor-controls">
                    <input className="hfd-input" placeholder="Search employee or score note…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <select className="hfd-select" value={publishFilter} onChange={e => setPublishFilter(e.target.value as PublishFilter)}>
                      <option value="ALL">All publish states</option>
                      <option value="HIDDEN">Hidden</option>
                      <option value="READY_TO_PUBLISH">Ready</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                    <select className="hfd-select" value={confidenceFilter} onChange={e => setConfidenceFilter(e.target.value as ConfidenceFilter)}>
                      <option value="ALL">All confidence</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                      <option value="INSUFFICIENT">Insufficient</option>
                    </select>
                    <select className="hfd-select" value={sortBy} onChange={e => setSortBy(e.target.value as AnalyticsSort)}>
                      <option value="SCORE_DESC">Score high to low</option>
                      <option value="SCORE_ASC">Score low to high</option>
                      <option value="COMPLETION_DESC">Completion high to low</option>
                      <option value="COMPLETION_ASC">Completion low to high</option>
                      <option value="RESPONSES_DESC">Responses high to low</option>
                    </select>
                    <button className="hfd-btn hfd-btn-secondary" type="button" onClick={exportCsv} disabled={!filteredItems.length}>Export CSV</button>
                  </div>
                </div>

                <div className="hfd-table-wrap">
                  <table className="hfd-preview-table hfd-monitor-table">
                    <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Score</th>
                      <th>Band</th>
                      <th>Confidence</th>
                      <th>Completion</th>
                      <th>Self vs others</th>
                      <th>Publish state</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredItems.length === 0 && <tr><td colSpan={7}>No employee results match the current filters.</td></tr>}
                    {filteredItems.map(item => (
                        <tr key={`${item.campaignId}-${item.targetEmployeeId}`} onClick={() => setExpandedEmployeeId(current => current === item.targetEmployeeId ? null : item.targetEmployeeId)}>
                          <td><strong>{item.targetEmployeeName}</strong><small>ID {item.targetEmployeeId}</small></td>
                          <td><strong>{formatScore(item.averageScore)}</strong></td>
                          <td>{scoreBand(item.averageScore)}</td>
                          <td><span className={`hfd-confidence-chip ${String(confidenceLabel(item)).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{confidenceLabel(item)}</span></td>
                          <td>{formatScore(item.completionRate)}</td>
                          <td>
                            <div className="hfd-monitor-chip-list">
                              {relationshipBreakdown(item).map(row => (
                                  <span key={row.label}>{row.label}: {sourceCount(row.count) >= row.threshold ? formatScore(row.score, 0) : 'Not enough feedback'}</span>
                              ))}
                            </div>
                          </td>
                          <td><span className={`hfd-status-chip ${String(item.visibilityStatus ?? '').toLowerCase()}`}>{visibilityLabel(item.visibilityStatus)}</span></td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>

                {expandedEmployeeId && (
                    <div className="hfd-monitor-row-detail">
                      {(() => {
                        const item = filteredItems.find(row => row.targetEmployeeId === expandedEmployeeId);
                        if (!item) return null;
                        return (
                            <>
                              <strong>{item.targetEmployeeName}</strong>
                              <span>{item.scoreCalculationNote ?? 'Score is calculated from submitted 360 feedback responses.'}</span>
                              <span>Manager {formatScore(item.managerAverageScore)} · Peer {sourceCount(item.peerResponses) >= 2 ? formatScore(item.peerAverageScore) : 'Not enough feedback'} · Direct Report {sourceCount(item.subordinateResponses) >= 2 ? formatScore(item.subordinateAverageScore) : 'Not enough feedback'} · Self {formatScore(item.selfAverageScore)}</span>
                            </>
                        );
                      })()}
                    </div>
                )}
              </div>
            </>
        )}

        {publishOpen && summary && (
            <div className="hfd-modal-backdrop" role="presentation">
              <div className="hfd-publish-modal" role="dialog" aria-modal="true" aria-label="Publish Results">
                <div className="hfd-publish-modal-head">
                  <div>
                    <h3>Publish Results</h3>
                    <p>Employee-facing results will be visible to the employee and HR only.</p>
                  </div>
                  <button type="button" className="hfd-icon-btn" onClick={() => setPublishOpen(false)} aria-label="Close publish panel">×</button>
                </div>

                <div className="hfd-publish-steps">
                  <span className={publishStep === 1 ? 'active' : ''}>1. Publish setup</span>
                  <span className={publishStep === 2 ? 'active' : ''}>2. Review & publish</span>
                </div>

                {publishStep === 1 ? (
                    <div className="hfd-publish-step-body">
                      <div className="hfd-publish-readiness-grid">
                        <strong>{readyCount} ready employees</strong>
                        <span>{blockedItems.length} blocked because feedback is insufficient.</span>
                      </div>

                      <section className="hfd-publish-section">
                        <h4>Publish results for</h4>
                        <label className="hfd-radio-card">
                          <input type="radio" checked={publishOptions.scope === 'ALL_READY'} onChange={() => setPublishOptions(current => ({ ...current, scope: 'ALL_READY' }))} />
                          <span><strong>All ready employees</strong><small>Publish every employee result that passed scoring and confidentiality checks.</small></span>
                        </label>
                        <label className="hfd-radio-card">
                          <input type="radio" checked={publishOptions.scope === 'SELECTED_EMPLOYEES'} onChange={() => setPublishOptions(current => ({ ...current, scope: 'SELECTED_EMPLOYEES' }))} />
                          <span><strong>Selected employees only</strong><small>Choose specific ready employee results to publish.</small></span>
                        </label>
                        {publishOptions.scope === 'SELECTED_EMPLOYEES' && (
                            <div className="hfd-publish-employee-picker">
                              <button type="button" className="hfd-btn hfd-btn-secondary" onClick={selectAllReadyEmployees}>Select all ready</button>
                              {readyItems.map(item => (
                                  <label key={item.targetEmployeeId}>
                                    <input type="checkbox" checked={publishOptions.selectedEmployeeIds.includes(item.targetEmployeeId)} onChange={() => toggleSelectedEmployee(item.targetEmployeeId)} />
                                    <span>{item.targetEmployeeName}</span>
                                    <small>{formatScore(item.averageScore)} · {scoreBand(item.averageScore)}</small>
                                  </label>
                              ))}
                            </div>
                        )}
                      </section>

                      <section className="hfd-publish-section">
                        <h4>Included in employee result</h4>
                        <label><input type="checkbox" checked={publishOptions.includeOverallScore} onChange={e => setPublishOptions(current => ({ ...current, includeOverallScore: e.target.checked }))} /> Overall score and rating band</label>
                        <label><input type="checkbox" checked={publishOptions.includeCompetencyBreakdown} onChange={e => setPublishOptions(current => ({ ...current, includeCompetencyBreakdown: e.target.checked }))} /> Competency breakdown</label>
                        <label><input type="checkbox" checked={publishOptions.includeSelfVsOthers} onChange={e => setPublishOptions(current => ({ ...current, includeSelfVsOthers: e.target.checked }))} /> Self vs others comparison</label>
                        <label><input type="checkbox" checked={publishOptions.includeComments} onChange={e => setPublishOptions(current => ({ ...current, includeComments: e.target.checked }))} /> Anonymous written comments</label>
                        <label><input type="checkbox" checked={publishOptions.includeScoreExplanation} onChange={e => setPublishOptions(current => ({ ...current, includeScoreExplanation: e.target.checked }))} /> Score explanation</label>
                        {publishOptions.includeComments && (
                            <p className="hfd-publish-helper">Comments are grouped by question and evaluator role. Peer and direct report comments stay hidden when there is not enough feedback.</p>
                        )}
                      </section>

                      <section className="hfd-publish-section hfd-publish-fixed-visibility">
                        <h4>Visible to</h4>
                        <strong>Employee and HR only</strong>
                        <p>Manager and Department Head visibility can be added later if required.</p>
                      </section>
                    </div>
                ) : (
                    <div className="hfd-publish-step-body">
                      <section className="hfd-publish-review-box">
                        <h4>Review before publishing</h4>
                        <dl>
                          <div><dt>Results to publish</dt><dd>{selectedReadyCount} employees</dd></div>
                          <div><dt>Visible to</dt><dd>Employee and HR</dd></div>
                          <div><dt>Notification</dt><dd>Employees will be notified</dd></div>
                          <div><dt>Included</dt><dd>{contentSummary(publishOptions) || 'No content selected'}</dd></div>
                          <div><dt>Comments</dt><dd>{publishOptions.includeComments ? 'Anonymous comments included when confidentiality allows' : 'Not included'}</dd></div>
                        </dl>
                      </section>
                      <div className="hfd-alert hfd-alert-info">
                        <i className="bi bi-shield-lock" /> Some relationship scores or comments may stay hidden when there is not enough feedback to protect confidentiality.
                      </div>
                      <label className="hfd-confirm-check">
                        <input type="checkbox" checked={publishOptions.confirmVisibility} onChange={e => setPublishOptions(current => ({ ...current, confirmVisibility: e.target.checked }))} />
                        <span>I understand that published results will be visible to employees.</span>
                      </label>
                    </div>
                )}

                <div className="hfd-publish-modal-actions">
                  <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => publishStep === 1 ? setPublishOpen(false) : setPublishStep(1)}>
                    {publishStep === 1 ? 'Cancel' : 'Back'}
                  </button>
                  {publishStep === 1 ? (
                      <button className="hfd-btn hfd-btn-primary" type="button" onClick={() => setPublishStep(2)} disabled={selectedReadyCount === 0}>Review</button>
                  ) : (
                      <button className="hfd-btn hfd-btn-primary" type="button" onClick={runPublish} disabled={!publishReady || actionLoading}>
                        {actionLoading ? 'Publishing…' : 'Publish Results'}
                      </button>
                  )}
                </div>
              </div>
            </div>
        )}
      </div>
  );
}

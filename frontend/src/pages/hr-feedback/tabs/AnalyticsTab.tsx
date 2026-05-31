import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import { feedbackAnalyticsApi } from '../../../api/feedbackAnalyticsApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import type {
  FeedbackCampaign,
  FeedbackCampaignScoringConfig,
} from '../../../types/feedbackCampaign';
import type {
  FeedbackCampaignSummary,
  FeedbackCompetencyAverage,
  FeedbackConfidenceBreakdown,
  FeedbackRelationshipPrivacy,
  FeedbackResultItem,
  FeedbackScoreDistribution,
  FeedbackSummaryPublishRequest,
} from '../../../types/feedbackAnalytics';
import './feedback-analytics.css';

type PublishFilter = 'ALL' | 'HIDDEN' | 'READY_TO_PUBLISH' | 'PUBLISHED';
type ConfidenceFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
type AnalyticsSort = 'SCORE_DESC' | 'SCORE_ASC' | 'COMPLETION_DESC' | 'COMPLETION_ASC' | 'RESPONSES_DESC';
type PublishStep = 1 | 2;
type PublishScope = 'ALL_READY' | 'SELECTED_EMPLOYEES';
type Tone = 'good' | 'warning' | 'danger' | 'neutral';

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

type MetricCard = {
  label: string;
  value: string | number;
  helper?: string;
  icon: string;
  tone?: Tone;
};

type BarRow = {
  label: string;
  value: number;
  meta?: string;
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

const numberValue = (value?: number | null) => Number(value ?? 0);
const countValue = (value?: number | null) => Number(value ?? 0);

const formatScore = (value?: number | null, digits = 1) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(digits)}%`;
};

const formatCount = (value?: number | null) => Number(value ?? 0).toLocaleString();

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const visibilityLabel = (status?: string | null) => {
  switch (String(status ?? 'HIDDEN').toUpperCase()) {
    case 'PUBLISHED': return 'Published';
    case 'READY_TO_PUBLISH': return 'Ready';
    default: return 'Hidden';
  }
};

const visibilityClass = (status?: string | null) => {
  switch (String(status ?? 'HIDDEN').toUpperCase()) {
    case 'PUBLISHED': return 'hfa-pill-published';
    case 'READY_TO_PUBLISH': return 'hfa-pill-ready';
    default: return 'hfa-pill-hidden';
  }
};

const confidenceClass = (item: FeedbackResultItem) => {
  if (item.insufficientFeedback) return 'hfa-pill-danger';
  switch (String(item.confidenceLevel ?? '').toUpperCase()) {
    case 'HIGH': return 'hfa-pill-published';
    case 'MEDIUM': return 'hfa-pill-warning';
    case 'LOW': return 'hfa-pill-danger';
    default: return 'hfa-pill-hidden';
  }
};

const confidenceLabel = (item: FeedbackResultItem) => item.insufficientFeedback ? 'Insufficient' : item.confidenceLevel || 'Not calculated';

const scoreBand = (score?: number | null) => {
  if (score == null) return 'No score';
  if (score >= 86) return 'Outstanding';
  if (score >= 71) return 'Good';
  if (score >= 60) return 'Meets requirement';
  if (score >= 40) return 'Needs improvement';
  return 'Unsatisfactory';
};

const relationshipDisplayName = (relationshipType?: string | null) => {
  switch (String(relationshipType ?? '').toUpperCase()) {
    case 'MANAGER': return 'Manager';
    case 'PEER': return 'Peers';
    case 'SUBORDINATE': return 'Direct reports';
    case 'SELF': return 'Self';
    default: return relationshipType || 'Relationship';
  }
};

const fallbackRelationshipPrivacy = (item: FeedbackResultItem): FeedbackRelationshipPrivacy[] => [
  {
    relationshipType: 'MANAGER',
    label: 'Manager',
    responseCount: countValue(item.managerResponses),
    minimumVisibleResponses: 1,
    thresholdRequired: false,
    thresholdMet: countValue(item.managerResponses) >= 1,
    visibleOutsideHr: countValue(item.managerResponses) >= 1,
    hiddenReason: countValue(item.managerResponses) >= 1 ? null : 'No manager response submitted.',
  },
  {
    relationshipType: 'PEER',
    label: 'Peers',
    responseCount: countValue(item.peerResponses),
    minimumVisibleResponses: 2,
    thresholdRequired: true,
    thresholdMet: countValue(item.peerResponses) >= 2,
    visibleOutsideHr: countValue(item.peerResponses) >= 2,
    hiddenReason: countValue(item.peerResponses) >= 2 ? null : 'Peer details are masked until at least 2 peer responses are submitted.',
  },
  {
    relationshipType: 'SUBORDINATE',
    label: 'Direct reports',
    responseCount: countValue(item.subordinateResponses),
    minimumVisibleResponses: 2,
    thresholdRequired: true,
    thresholdMet: countValue(item.subordinateResponses) >= 2,
    visibleOutsideHr: countValue(item.subordinateResponses) >= 2,
    hiddenReason: countValue(item.subordinateResponses) >= 2 ? null : 'Direct report details are masked until at least 2 direct report responses are submitted.',
  },
  {
    relationshipType: 'SELF',
    label: 'Self',
    responseCount: countValue(item.selfResponses),
    minimumVisibleResponses: 1,
    thresholdRequired: false,
    thresholdMet: countValue(item.selfResponses) >= 1,
    visibleOutsideHr: countValue(item.selfResponses) >= 1,
    hiddenReason: countValue(item.selfResponses) >= 1 ? null : 'Self review was not submitted.',
  },
];

const privacyRowsFor = (item: FeedbackResultItem) => {
  const rows = item.relationshipPrivacy?.length ? item.relationshipPrivacy : fallbackRelationshipPrivacy(item);
  return rows.map(row => ({
    ...row,
    label: row.label || relationshipDisplayName(row.relationshipType),
    responseCount: countValue(row.responseCount),
    minimumVisibleResponses: Number(row.minimumVisibleResponses ?? 1),
    thresholdRequired: Boolean(row.thresholdRequired),
    thresholdMet: row.thresholdMet !== false,
    visibleOutsideHr: row.visibleOutsideHr !== false,
  }));
};

const isPublished = (item: FeedbackResultItem) => String(item.visibilityStatus ?? '').toUpperCase() === 'PUBLISHED';
const isReadyToPublish = (item: FeedbackResultItem) => String(item.visibilityStatus ?? '').toUpperCase() === 'READY_TO_PUBLISH'
    || (countValue(item.totalResponses) > 0 && !item.insufficientFeedback && !isPublished(item));

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

const escapeCsv = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const initials = (name?: string | null) => {
  const parts = String(name ?? 'Employee').trim().split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase()).join('') || 'E';
};

const chartRowsFromDistribution = (distribution: FeedbackScoreDistribution[] | undefined, items: FeedbackResultItem[]): BarRow[] => {
  if (distribution?.length) {
    return distribution.map(row => ({
      label: row.label || row.band,
      value: countValue(row.count),
      meta: formatCount(row.count),
    }));
  }

  const bands = [
    { label: 'Outstanding', min: 86, max: 100 },
    { label: 'Good', min: 71, max: 85 },
    { label: 'Meets requirement', min: 60, max: 70 },
    { label: 'Needs improvement', min: 40, max: 59 },
    { label: 'Unsatisfactory', min: 0, max: 39 },
  ];

  return bands.map(band => ({
    label: band.label,
    value: items.filter(item => item.averageScore != null && item.averageScore >= band.min && item.averageScore <= band.max).length,
  }));
};

const contentSummary = (options: PublishOptions) => [
  options.includeOverallScore ? 'overall score' : null,
  options.includeCompetencyBreakdown ? 'competency breakdown' : null,
  options.includeSelfVsOthers ? 'self vs others' : null,
  options.includeComments ? 'anonymous comments' : null,
  options.includeScoreExplanation ? 'score explanation' : null,
].filter(Boolean).join(', ');

const MetricCards = ({ cards }: { cards: MetricCard[] }) => (
    <div className="hfa-metric-grid">
      {cards.map(card => (
          <article key={card.label} className={`hfa-metric-card ${card.tone ?? 'neutral'}`}>
            <div>
              <i className={`bi ${card.icon}`} />
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </div>
            {card.helper && <small>{card.helper}</small>}
          </article>
      ))}
    </div>
);

const HorizontalBarChart = ({ title, subtitle, rows, maxValue = 100 }: { title: string; subtitle?: string; rows: BarRow[]; maxValue?: number }) => {
  const max = maxValue === 100 ? 100 : Math.max(1, ...rows.map(row => row.value));
  return (
      <section className="hfa-chart-card">
        <div className="hfa-chart-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        <div className="hfa-bar-list">
          {rows.length === 0 ? <p className="hfa-muted">No data available yet.</p> : rows.map((row, index) => (
              <div className="hfa-bar-row" key={`${row.label}-${index}`}>
                <span className="hfa-bar-label" title={row.label}>{row.label}</span>
                <div className="hfa-bar-track">
                  <div className="hfa-bar-fill" style={{ width: `${Math.max(3, Math.min(100, (row.value / max) * 100))}%` }} />
                </div>
                <span className="hfa-bar-meta">{row.meta ?? formatScore(row.value)}</span>
              </div>
          ))}
        </div>
      </section>
  );
};

const DonutChart = ({ title, subtitle, rows }: { title: string; subtitle?: string; rows: FeedbackConfidenceBreakdown[] }) => {
  const total = rows.reduce((sum, row) => sum + countValue(row.count), 0);
  const first = total ? (countValue(rows[0]?.count) / total) * 100 : 0;
  const second = first + (total ? (countValue(rows[1]?.count) / total) * 100 : 0);
  const third = second + (total ? (countValue(rows[2]?.count) / total) * 100 : 0);

  return (
      <section className="hfa-chart-card">
        <div className="hfa-chart-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {rows.length === 0 ? <p className="hfa-muted">No confidence data available yet.</p> : (
            <div className="hfa-donut-layout">
              <div
                  className="hfa-donut"
                  style={{
                    '--hfa-donut-a': `${first}%`,
                    '--hfa-donut-b': `${second}%`,
                    '--hfa-donut-c': `${third}%`,
                  } as CSSProperties}
              >
                <div className="hfa-donut-center"><div><strong>{total}</strong><span>results</span></div></div>
              </div>
              <div className="hfa-legend">
                {rows.map((row, index) => (
                    <div className="hfa-legend-row" key={row.level || row.label}>
                      <span className="hfa-legend-left"><i className={`hfa-dot hfa-dot-${index + 1}`} />{row.label || row.level}</span>
                      <strong>{formatCount(row.count)}</strong>
                    </div>
                ))}
              </div>
            </div>
        )}
      </section>
  );
};

const CampaignResultHeader = ({ summary, campaign }: { summary: FeedbackCampaignSummary; campaign?: FeedbackCampaign }) => (
    <section className="hfa-result-header">
      <div>
        <div className="hfa-result-meta">
          <span className="hfa-pill"><i className="bi bi-flag" /> {summary.status}</span>
          <span className={`hfa-pill ${visibilityClass(summary.visibilityStatus)}`}><i className="bi bi-eye" /> {visibilityLabel(summary.visibilityStatus)}</span>
          <span className="hfa-pill"><i className="bi bi-calendar-check" /> Closed {formatDateTime(campaign?.closedAt)}</span>
          <span className="hfa-pill"><i className="bi bi-clock-history" /> Updated {formatDateTime(summary.summarizedAt)}</span>
        </div>
        <h3>{campaign?.name ?? summary.campaignName}</h3>
        <p>Closed-campaign analytics for HR review. Campaign status stays closed; employee visibility is controlled by each result summary.</p>
      </div>
      <div className="hfa-result-score">
        <div>
          <strong>{formatScore(summary.overallAverageScore)}</strong>
          <span>{summary.overallScoreCategory || scoreBand(summary.overallAverageScore)}</span>
        </div>
      </div>
    </section>
);

const QualityPrivacyPanel = ({ summary, readyItems, blockedItems, publishedCount }: {
  summary: FeedbackCampaignSummary;
  readyItems: FeedbackResultItem[];
  blockedItems: FeedbackResultItem[];
  publishedCount: number;
}) => {
  const items = summary.items ?? [];
  const allPrivacyRows = items.flatMap(privacyRowsFor);
  const maskedRows = allPrivacyRows.filter(row => row.thresholdRequired && !row.thresholdMet && row.responseCount > 0);
  const noResponseCount = blockedItems.filter(item => countValue(item.totalResponses) === 0).length;
  const insufficientCount = blockedItems.filter(item => item.insufficientFeedback).length;
  const lowConfidenceCount = items.filter(item => String(item.confidenceLevel ?? '').toUpperCase() === 'LOW').length;

  const readinessRows = [
    { icon: 'bi-check2-circle', title: 'Ready to publish', helper: 'Passed backend confidence and scoring checks.', value: readyItems.length, tone: 'good' },
    { icon: 'bi-eye', title: 'Already published', helper: 'Employee-facing visibility is already enabled.', value: publishedCount, tone: 'neutral' },
    { icon: 'bi-person-dash', title: 'No submitted responses', helper: 'No calculated result is available for these employees.', value: noResponseCount, tone: noResponseCount ? 'danger' : 'good' },
    { icon: 'bi-exclamation-triangle', title: 'Insufficient feedback', helper: 'Blocked by confidence or minimum-feedback rules.', value: insufficientCount, tone: insufficientCount ? 'warning' : 'good' },
    { icon: 'bi-activity', title: 'Low confidence', helper: 'Review carefully before publishing.', value: lowConfidenceCount, tone: lowConfidenceCount ? 'warning' : 'good' },
  ];

  const privacyRows = [
    { icon: 'bi-shield-lock', title: 'Relationship details masked', helper: 'Peer/direct report detail remains hidden outside HR when thresholds are not met.', value: maskedRows.length },
    { icon: 'bi-people', title: 'Peer threshold', helper: 'Uses backend relationship privacy metadata from Patch A.', value: `${allPrivacyRows.find(row => row.relationshipType === 'PEER')?.minimumVisibleResponses ?? 2}+` },
    { icon: 'bi-diagram-3', title: 'Direct report threshold', helper: 'Direct report details use the same privacy visibility rules.', value: `${allPrivacyRows.find(row => row.relationshipType === 'SUBORDINATE')?.minimumVisibleResponses ?? 2}+` },
    { icon: 'bi-incognito', title: 'Evaluator identity', helper: 'Analytics shows result groups only. Evaluator names are not exposed.', value: 'Hidden' },
  ];

  return (
      <section>
        <div className="hfa-section-title">
          <div>
            <span className="hfa-eyebrow">Quality and privacy</span>
            <h3>Release readiness review</h3>
            <p>HR can review internal analytics, while employee-facing details follow backend confidentiality metadata.</p>
          </div>
        </div>
        <div className="hfa-quality-grid">
          <div className="hfa-panel">
            <div className="hfa-panel-head">
              <div>
                <h3>Result quality</h3>
                <p>What can be published safely.</p>
              </div>
            </div>
            <div className="hfa-panel-list">
              {readinessRows.map(row => (
                  <article key={row.title} className="hfa-quality-item">
                    <i className={`bi ${row.icon}`} />
                    <div><strong>{row.title}</strong><small>{row.helper}</small></div>
                    <span className="hfa-quality-value">{row.value}</span>
                  </article>
              ))}
            </div>
          </div>

          <div className="hfa-panel">
            <div className="hfa-panel-head">
              <div>
                <h3>Privacy controls</h3>
                <p>Visibility is controlled by backend relationship thresholds.</p>
              </div>
            </div>
            <div className="hfa-panel-list">
              {privacyRows.map(row => (
                  <article key={row.title} className="hfa-privacy-item">
                    <i className={`bi ${row.icon}`} />
                    <div><strong>{row.title}</strong><small>{row.helper}</small></div>
                    <span className="hfa-quality-value">{row.value}</span>
                  </article>
              ))}
            </div>
          </div>
        </div>
      </section>
  );
};

const AnalyticsCharts = ({ summary }: { summary: FeedbackCampaignSummary }) => {
  const distributionRows = chartRowsFromDistribution(summary.scoreDistribution, summary.items ?? []);
  const relationshipRows = (summary.relationshipAverages ?? []).map(row => ({
    label: row.label || relationshipDisplayName(row.relationshipType),
    value: numberValue(row.averageScore),
    meta: `${formatScore(row.averageScore)} · ${formatCount(row.responseCount)} responses`,
  }));
  const topCompetencies = [...(summary.competencyAverages ?? [])]
      .sort((a, b) => numberValue(b.averageScore) - numberValue(a.averageScore))
      .slice(0, 6)
      .map(row => ({
        label: row.competencyName || row.competencyCode,
        value: numberValue(row.averageScore),
        meta: `${formatScore(row.averageScore)} · ${formatCount(row.responseCount)} ratings`,
      }));
  const developmentCompetencies = [...(summary.competencyAverages ?? [])]
      .filter(row => row.averageScore != null)
      .sort((a, b) => numberValue(a.averageScore) - numberValue(b.averageScore))
      .slice(0, 6)
      .map(row => ({
        label: row.competencyName || row.competencyCode,
        value: numberValue(row.averageScore),
        meta: `${formatScore(row.averageScore)} · ${formatCount(row.responseCount)} ratings`,
      }));

  return (
      <section>
        <div className="hfa-section-title">
          <div>
            <span className="hfa-eyebrow">Analytics charts</span>
            <h3>Campaign performance patterns</h3>
            <p>Charts now use backend summary fields instead of temporary frontend-only calculations.</p>
          </div>
        </div>
        <div className="hfa-chart-grid">
          <HorizontalBarChart title="Score distribution" subtitle="Employees by performance band" rows={distributionRows} maxValue={Math.max(1, ...distributionRows.map(row => row.value))} />
          <HorizontalBarChart title="Relationship averages" subtitle="Average score by evaluator relationship" rows={relationshipRows} />
          <HorizontalBarChart title="Strongest competencies" subtitle="Highest scoring competency areas" rows={topCompetencies} />
          <HorizontalBarChart title="Development focus" subtitle="Lowest scoring competency areas" rows={developmentCompetencies} />
          <DonutChart title="Confidence breakdown" subtitle="Backend result confidence by employee summary" rows={summary.confidenceBreakdown ?? []} />
          <HorizontalBarChart
              title="Top employee results"
              subtitle="Highest overall scores in this campaign"
              rows={[...(summary.items ?? [])]
                  .filter(item => item.averageScore != null)
                  .sort((a, b) => numberValue(b.averageScore) - numberValue(a.averageScore))
                  .slice(0, 8)
                  .map(item => ({ label: item.targetEmployeeName, value: numberValue(item.averageScore), meta: formatScore(item.averageScore) }))}
          />
        </div>
      </section>
  );
};

const RelationshipMini = ({ item }: { item: FeedbackResultItem }) => {
  const rows = privacyRowsFor(item).filter(row => row.responseCount > 0 || ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'].includes(String(row.relationshipType ?? '').toUpperCase()));
  return (
      <div className="hfa-relationship-mini">
        {rows.map(row => (
            <span key={row.relationshipType} className={`hfa-mini-chip ${row.thresholdMet ? 'good' : row.responseCount > 0 ? 'masked' : ''}`} title={row.hiddenReason ?? undefined}>
          {relationshipDisplayName(row.relationshipType)} {row.responseCount}
        </span>
        ))}
      </div>
  );
};

const EmployeeResultsTable = ({
                                items,
                                searchTerm,
                                setSearchTerm,
                                publishFilter,
                                setPublishFilter,
                                confidenceFilter,
                                setConfidenceFilter,
                                sortBy,
                                setSortBy,
                                onOpen,
                                onExport,
                              }: {
  items: FeedbackResultItem[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  publishFilter: PublishFilter;
  setPublishFilter: (value: PublishFilter) => void;
  confidenceFilter: ConfidenceFilter;
  setConfidenceFilter: (value: ConfidenceFilter) => void;
  sortBy: AnalyticsSort;
  setSortBy: (value: AnalyticsSort) => void;
  onOpen: (item: FeedbackResultItem) => void;
  onExport: () => void;
}) => (
    <section className="hfa-table-card">
      <div className="hfa-table-head">
        <div>
          <span className="hfa-eyebrow">Employee result review</span>
          <h3>Review every employee summary before publishing</h3>
          <p>Use the drawer to inspect scoring, privacy, relationship coverage, and employee-facing publish content.</p>
        </div>
        <button className="hfa-btn hfa-btn-secondary" type="button" onClick={onExport} disabled={items.length === 0}>
          <i className="bi bi-download" /> Export CSV
        </button>
      </div>

      <div className="hfa-table-toolbar">
        <input className="hfa-input" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search employee, score band, confidence…" />
        <select className="hfa-select" value={publishFilter} onChange={event => setPublishFilter(event.target.value as PublishFilter)}>
          <option value="ALL">All visibility</option>
          <option value="HIDDEN">Hidden</option>
          <option value="READY_TO_PUBLISH">Ready</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <select className="hfa-select" value={confidenceFilter} onChange={event => setConfidenceFilter(event.target.value as ConfidenceFilter)}>
          <option value="ALL">All confidence</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INSUFFICIENT">Insufficient</option>
        </select>
        <select className="hfa-select" value={sortBy} onChange={event => setSortBy(event.target.value as AnalyticsSort)}>
          <option value="SCORE_DESC">Highest score</option>
          <option value="SCORE_ASC">Lowest score</option>
          <option value="COMPLETION_DESC">Highest completion</option>
          <option value="COMPLETION_ASC">Lowest completion</option>
          <option value="RESPONSES_DESC">Most responses</option>
        </select>
        <span className="hfa-pill">{items.length} results</span>
      </div>

      <div className="hfa-table-wrap">
        <table className="hfa-table">
          <thead>
          <tr>
            <th>Employee</th>
            <th>Score</th>
            <th>Completion</th>
            <th>Responses</th>
            <th>Relationship coverage</th>
            <th>Confidence</th>
            <th>Visibility</th>
            <th />
          </tr>
          </thead>
          <tbody>
          {items.length === 0 ? (
              <tr><td colSpan={8} className="hfa-muted">No employee result matches the current filters.</td></tr>
          ) : items.map(item => (
              <tr key={item.targetEmployeeId}>
                <td>
                  <div className="hfa-employee-cell">
                    <span className="hfa-avatar">{initials(item.targetEmployeeName)}</span>
                    <div><strong>{item.targetEmployeeName}</strong><small>ID {item.targetEmployeeId}</small></div>
                  </div>
                </td>
                <td><div className="hfa-score-cell"><strong>{formatScore(item.averageScore)}</strong><small>{item.scoreCategory || scoreBand(item.averageScore)}</small></div></td>
                <td>
                  <div className="hfa-progress">
                    <div className="hfa-progress-track"><div className="hfa-progress-fill" style={{ width: `${Math.min(100, Math.max(0, numberValue(item.completionRate)))}%` }} /></div>
                    <span>{formatScore(item.completionRate, 0)}</span>
                  </div>
                </td>
                <td>{formatCount(item.submittedEvaluatorCount ?? item.totalResponses)} / {formatCount(item.assignedEvaluatorCount)}</td>
                <td><RelationshipMini item={item} /></td>
                <td><span className={`hfa-pill ${confidenceClass(item)}`}>{confidenceLabel(item)}</span></td>
                <td><span className={`hfa-pill ${visibilityClass(item.visibilityStatus)}`}>{visibilityLabel(item.visibilityStatus)}</span></td>
                <td><button type="button" className="hfa-action-link" onClick={() => onOpen(item)}>Review</button></td>
              </tr>
          ))}
          </tbody>
        </table>
      </div>
    </section>
);

const ResultDetailDrawer = ({
                              item,
                              competencies,
                              onClose,
                            }: {
  item: FeedbackResultItem | null;
  competencies: FeedbackCompetencyAverage[];
  onClose: () => void;
}) => {
  if (!item) return null;
  const privacyRows = privacyRowsFor(item);
  const included = [
    item.includeOverallScore !== false ? 'Overall score' : null,
    item.includeCompetencyBreakdown !== false ? 'Competency breakdown' : null,
    item.includeSelfVsOthers !== false ? 'Self vs others' : null,
    item.includeComments ? 'Anonymous comments' : null,
    item.includeScoreExplanation !== false ? 'Score explanation' : null,
  ].filter(Boolean);

  return (
      <div className="hfa-drawer-backdrop" role="dialog" aria-modal="true">
        <aside className="hfa-drawer">
          <div className="hfa-drawer-header">
            <div className="hfa-drawer-title">
              <span className="hfa-eyebrow">Employee result detail</span>
              <h3>{item.targetEmployeeName}</h3>
              <p>Review final score, relationship coverage, confidence, and employee-facing visibility.</p>
            </div>
            <button type="button" className="hfa-icon-btn" onClick={onClose} aria-label="Close result detail">×</button>
          </div>

          <div className="hfa-drawer-body">
            <div className="hfa-drawer-score-grid">
              <article className="hfa-drawer-score-card"><strong>{formatScore(item.averageScore)}</strong><span>Overall score</span></article>
              <article className="hfa-drawer-score-card"><strong>{formatScore(item.rawAverageScore)}</strong><span>Raw score</span></article>
              <article className="hfa-drawer-score-card"><strong>{formatScore(item.completionRate, 0)}</strong><span>Completion</span></article>
            </div>

            <section className="hfa-drawer-section">
              <h4>Relationship breakdown</h4>
              <div className="hfa-bar-list">
                {[
                  { label: 'Manager', score: item.managerAverageScore, count: item.managerResponses },
                  { label: 'Peers', score: item.peerAverageScore, count: item.peerResponses },
                  { label: 'Direct reports', score: item.subordinateAverageScore, count: item.subordinateResponses },
                  { label: 'Self', score: item.selfAverageScore, count: item.selfResponses },
                ].map(row => (
                    <div className="hfa-bar-row" key={row.label}>
                      <span className="hfa-bar-label">{row.label}</span>
                      <div className="hfa-bar-track"><div className="hfa-bar-fill" style={{ width: `${Math.max(3, Math.min(100, numberValue(row.score)))}%` }} /></div>
                      <span className="hfa-bar-meta">{formatScore(row.score)} · {formatCount(row.count)}</span>
                    </div>
                ))}
              </div>
            </section>

            <section className="hfa-drawer-section">
              <h4>Privacy metadata</h4>
              <div className="hfa-privacy-grid">
                {privacyRows.map(row => (
                    <div className="hfa-privacy-row" key={row.relationshipType}>
                      <strong>{row.label}</strong>
                      <small>{row.hiddenReason || (row.visibleOutsideHr ? 'Visible outside HR when this section is published.' : 'Hidden outside HR.')}</small>
                      <span className={`hfa-pill ${row.thresholdMet ? 'hfa-pill-published' : 'hfa-pill-warning'}`}>
                    {row.responseCount}/{row.minimumVisibleResponses}
                  </span>
                    </div>
                ))}
              </div>
            </section>

            <section className="hfa-drawer-section">
              <h4>Competency snapshot</h4>
              <div className="hfa-bar-list">
                {competencies.length === 0 ? <p className="hfa-muted">No competency averages returned yet.</p> : competencies.slice(0, 6).map(row => (
                    <div className="hfa-bar-row" key={row.competencyCode}>
                      <span className="hfa-bar-label" title={row.competencyName}>{row.competencyName}</span>
                      <div className="hfa-bar-track"><div className="hfa-bar-fill" style={{ width: `${Math.max(3, Math.min(100, numberValue(row.averageScore)))}%` }} /></div>
                      <span className="hfa-bar-meta">{formatScore(row.averageScore)}</span>
                    </div>
                ))}
              </div>
            </section>

            <section className="hfa-drawer-section">
              <h4>Employee-facing preview</h4>
              <div className="hfa-publish-preview">
                <strong>{visibilityLabel(item.visibilityStatus)} result content</strong>
                <ul>
                  {included.length ? included.map(entry => <li key={entry}>{entry}</li>) : <li>No employee-facing content is currently selected.</li>}
                </ul>
              </div>
            </section>

            <section className="hfa-drawer-section">
              <h4>Calculation note</h4>
              <p>{item.scoreCalculationNote || 'Final score uses the configured 360 relationship weights and submitted response data.'}</p>
              <span className={`hfa-pill ${confidenceClass(item)}`}>{confidenceLabel(item)}</span>
            </section>
          </div>
        </aside>
      </div>
  );
};

const PublishResultsModal = ({
                               open,
                               step,
                               setStep,
                               options,
                               setOptions,
                               readyItems,
                               blockedItems,
                               publishedCount,
                               selectedReadyCount,
                               publishReady,
                               actionLoading,
                               onClose,
                               onPublish,
                             }: {
  open: boolean;
  step: PublishStep;
  setStep: (value: PublishStep) => void;
  options: PublishOptions;
  setOptions: (updater: (current: PublishOptions) => PublishOptions) => void;
  readyItems: FeedbackResultItem[];
  blockedItems: FeedbackResultItem[];
  publishedCount: number;
  selectedReadyCount: number;
  publishReady: boolean;
  actionLoading: boolean;
  onClose: () => void;
  onPublish: () => void;
}) => {
  if (!open) return null;

  const toggleEmployee = (employeeId: number) => {
    setOptions(current => ({
      ...current,
      selectedEmployeeIds: current.selectedEmployeeIds.includes(employeeId)
          ? current.selectedEmployeeIds.filter(id => id !== employeeId)
          : [...current.selectedEmployeeIds, employeeId],
    }));
  };

  const selectAllReady = () => setOptions(current => ({ ...current, selectedEmployeeIds: readyItems.map(item => item.targetEmployeeId) }));

  const setBooleanOption = (key: keyof Pick<PublishOptions, 'includeOverallScore' | 'includeCompetencyBreakdown' | 'includeSelfVsOthers' | 'includeComments' | 'includeScoreExplanation' | 'confirmVisibility'>, value: boolean) => {
    setOptions(current => ({ ...current, [key]: value }));
  };

  return (
      <div className="hfa-modal-backdrop" role="dialog" aria-modal="true">
        <div className="hfa-modal">
          <div className="hfa-modal-header">
            <div className="hfa-modal-title">
              <span className="hfa-eyebrow">Publish center</span>
              <h3>Publish employee 360 results</h3>
              <p>Choose who receives results and exactly which sections employees can see.</p>
            </div>
            <button type="button" className="hfa-icon-btn" onClick={onClose} aria-label="Close publish modal">×</button>
          </div>

          <div className="hfa-steps">
            <span className={`hfa-step ${step === 1 ? 'active' : ''}`}>1. Setup</span>
            <span className={`hfa-step ${step === 2 ? 'active' : ''}`}>2. Review & publish</span>
          </div>

          {step === 1 ? (
              <div className="hfa-modal-body">
                <div className="hfa-modal-grid">
                  <section className="hfa-option-panel">
                    <h4>Publish scope</h4>
                    <label className="hfa-option-card">
                      <input type="radio" checked={options.scope === 'ALL_READY'} onChange={() => setOptions(current => ({ ...current, scope: 'ALL_READY' }))} />
                      <span><strong>All ready employees</strong><small>Publish every result marked ready by backend scoring, confidence, and privacy checks.</small></span>
                    </label>
                    <label className="hfa-option-card">
                      <input type="radio" checked={options.scope === 'SELECTED_EMPLOYEES'} onChange={() => setOptions(current => ({ ...current, scope: 'SELECTED_EMPLOYEES' }))} />
                      <span><strong>Selected employees only</strong><small>Choose specific ready employee results to publish now.</small></span>
                    </label>

                    {options.scope === 'SELECTED_EMPLOYEES' && (
                        <div className="hfa-employee-picker">
                          <button className="hfa-btn hfa-btn-secondary" type="button" onClick={selectAllReady}>Select all ready</button>
                          {readyItems.map(item => (
                              <label key={item.targetEmployeeId}>
                                <input type="checkbox" checked={options.selectedEmployeeIds.includes(item.targetEmployeeId)} onChange={() => toggleEmployee(item.targetEmployeeId)} />
                                <span>{item.targetEmployeeName}</span>
                                <small>{formatScore(item.averageScore)}</small>
                              </label>
                          ))}
                        </div>
                    )}
                  </section>

                  <section className="hfa-option-panel">
                    <h4>Employee result content</h4>
                    <div className="hfa-check-list">
                      <label className="hfa-check-row"><input type="checkbox" checked={options.includeOverallScore} onChange={event => setBooleanOption('includeOverallScore', event.target.checked)} /><span><strong>Overall score</strong><small>Final score and score band.</small></span></label>
                      <label className="hfa-check-row"><input type="checkbox" checked={options.includeCompetencyBreakdown} onChange={event => setBooleanOption('includeCompetencyBreakdown', event.target.checked)} /><span><strong>Competency breakdown</strong><small>Strengths and development areas.</small></span></label>
                      <label className="hfa-check-row"><input type="checkbox" checked={options.includeSelfVsOthers} onChange={event => setBooleanOption('includeSelfVsOthers', event.target.checked)} /><span><strong>Self vs others</strong><small>Comparison view when submitted and allowed.</small></span></label>
                      <label className="hfa-check-row"><input type="checkbox" checked={options.includeComments} onChange={event => setBooleanOption('includeComments', event.target.checked)} /><span><strong>Anonymous comments</strong><small>Only visible when confidentiality allows it.</small></span></label>
                      <label className="hfa-check-row"><input type="checkbox" checked={options.includeScoreExplanation} onChange={event => setBooleanOption('includeScoreExplanation', event.target.checked)} /><span><strong>Score explanation</strong><small>Show how the final score was calculated.</small></span></label>
                    </div>
                  </section>
                </div>

                <div className="hfa-alert hfa-alert-info">
                  <i className="bi bi-shield-lock" /> {blockedItems.length} blocked result{blockedItems.length === 1 ? '' : 's'} stay hidden. {publishedCount} result{publishedCount === 1 ? '' : 's'} are already published.
                </div>
              </div>
          ) : (
              <div className="hfa-modal-body">
                <section className="hfa-option-panel">
                  <h4>Review before publishing</h4>
                  <dl className="hfa-review-list">
                    <div className="hfa-review-row"><dt>Results to publish</dt><dd>{selectedReadyCount} employee{selectedReadyCount === 1 ? '' : 's'}</dd></div>
                    <div className="hfa-review-row"><dt>Visible to</dt><dd>Employee and HR</dd></div>
                    <div className="hfa-review-row"><dt>Included sections</dt><dd>{contentSummary(options) || 'No content selected'}</dd></div>
                    <div className="hfa-review-row"><dt>Comments</dt><dd>{options.includeComments ? 'Included only where confidentiality allows' : 'Not included'}</dd></div>
                    <div className="hfa-review-row"><dt>Blocked results</dt><dd>{blockedItems.length} remain hidden</dd></div>
                    <div className="hfa-review-row"><dt>Notification</dt><dd>Employees will be notified by backend publish flow</dd></div>
                  </dl>
                </section>

                <label className="hfa-confirm-box">
                  <input type="checkbox" checked={options.confirmVisibility} onChange={event => setBooleanOption('confirmVisibility', event.target.checked)} />
                  <span>I confirm these published results will be visible to employees, and relationship/comment detail must follow backend privacy rules.</span>
                </label>
              </div>
          )}

          <div className="hfa-modal-footer">
            <button className="hfa-btn hfa-btn-secondary" type="button" onClick={() => step === 1 ? onClose() : setStep(1)}>
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step === 1 ? (
                <button className="hfa-btn hfa-btn-primary" type="button" onClick={() => setStep(2)} disabled={selectedReadyCount === 0}>Review publish</button>
            ) : (
                <button className="hfa-btn hfa-btn-primary" type="button" onClick={onPublish} disabled={!publishReady || actionLoading}>
                  {actionLoading ? 'Publishing…' : 'Publish results'}
                </button>
            )}
          </div>
        </div>
      </div>
  );
};

export default function AnalyticsTab() {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [summary, setSummary] = useState<FeedbackCampaignSummary | null>(null);
  const [scoringConfig, setScoringConfig] = useState<FeedbackCampaignScoringConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('ALL');
  const [sortBy, setSortBy] = useState<AnalyticsSort>('SCORE_DESC');
  const [selectedResult, setSelectedResult] = useState<FeedbackResultItem | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<PublishStep>(1);
  const [publishOptions, setPublishOptions] = useState<PublishOptions>(defaultPublishOptions);

  const closedCampaigns = useMemo(
      () => campaigns.filter(campaign => ['CLOSED', 'PUBLISHED'].includes(String(campaign.status ?? '').toUpperCase())),
      [campaigns],
  );

  const selectedCampaign = closedCampaigns.find(campaign => campaign.id === selectedId);

  useEffect(() => {
    hrFeedbackApi.getAllCampaigns()
        .then(items => {
          setCampaigns(items);
          setSelectedId(current => {
            if (current && items.some(campaign => campaign.id === current && ['CLOSED', 'PUBLISHED'].includes(String(campaign.status ?? '').toUpperCase()))) return current;
            const firstClosed = items.find(campaign => ['CLOSED', 'PUBLISHED'].includes(String(campaign.status ?? '').toUpperCase()));
            return firstClosed?.id ?? '';
          });
        })
        .catch(e => setError(e instanceof Error ? e.message : 'Failed to load campaigns.'));
  }, []);

  const refreshSummary = () => {
    if (!selectedId) {
      setSummary(null);
      setScoringConfig(null);
      return;
    }

    setLoading(true);
    setScoringLoading(true);
    setError('');

    feedbackAnalyticsApi.getCampaignSummary(selectedId)
        .then(setSummary)
        .catch(e => setError(e instanceof Error ? e.message : 'Failed to load analytics.'))
        .finally(() => setLoading(false));

    feedbackCampaignApi.getScoringConfig(selectedId)
        .then(setScoringConfig)
        .catch(() => setScoringConfig(null))
        .finally(() => setScoringLoading(false));
  };

  useEffect(() => {
    refreshSummary();
    setSearchTerm('');
    setPublishFilter('ALL');
    setConfidenceFilter('ALL');
    setSelectedResult(null);
    setNotice('');
    setPublishOpen(false);
  }, [selectedId]);

  const readyItems = useMemo(() => (summary?.items ?? []).filter(item => isReadyToPublish(item) && !isPublished(item)), [summary?.items]);
  const blockedItems = useMemo(() => (summary?.items ?? []).filter(item => !isReadyToPublish(item) && !isPublished(item)), [summary?.items]);
  const publishedCount = useMemo(() => (summary?.items ?? []).filter(isPublished).length, [summary?.items]);

  const selectedReadyCount = publishOptions.scope === 'ALL_READY'
      ? readyItems.length
      : readyItems.filter(item => publishOptions.selectedEmployeeIds.includes(item.targetEmployeeId)).length;

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return [...(summary?.items ?? [])]
        .filter(item => !normalizedSearch || employeeSearchText(item).includes(normalizedSearch))
        .filter(item => publishFilter === 'ALL' || String(item.visibilityStatus ?? 'HIDDEN').toUpperCase() === publishFilter)
        .filter(item => confidenceMatches(item, confidenceFilter))
        .sort((a, b) => {
          switch (sortBy) {
            case 'SCORE_ASC': return numberValue(a.averageScore ?? 999) - numberValue(b.averageScore ?? 999);
            case 'COMPLETION_ASC': return numberValue(a.completionRate ?? 999) - numberValue(b.completionRate ?? 999);
            case 'COMPLETION_DESC': return numberValue(b.completionRate ?? -1) - numberValue(a.completionRate ?? -1);
            case 'RESPONSES_DESC': return countValue(b.totalResponses) - countValue(a.totalResponses);
            case 'SCORE_DESC':
            default: return numberValue(b.averageScore ?? -1) - numberValue(a.averageScore ?? -1);
          }
        });
  }, [confidenceFilter, publishFilter, searchTerm, sortBy, summary?.items]);

  const metricCards: MetricCard[] = useMemo(() => {
    if (!summary) return [];
    const blockedCount = blockedItems.length;
    return [
      { label: 'Overall average', value: formatScore(summary.overallAverageScore), helper: summary.overallScoreCategory || scoreBand(summary.overallAverageScore), icon: 'bi-stars', tone: 'good' },
      { label: 'Employees reviewed', value: formatCount(summary.totalEmployees), helper: `${formatCount(summary.totalResponses)} submitted responses`, icon: 'bi-people' },
      { label: 'Completion', value: formatScore(summary.completionRate, 0), helper: `${formatCount(summary.submittedEvaluatorCount)} / ${formatCount(summary.assignedEvaluatorCount)} evaluators`, icon: 'bi-clipboard-check', tone: numberValue(summary.completionRate) >= 80 ? 'good' : 'warning' },
      { label: 'Ready to publish', value: readyItems.length, helper: `${blockedCount} blocked`, icon: 'bi-send-check', tone: readyItems.length ? 'good' : 'warning' },
      { label: 'Insufficient', value: formatCount(summary.insufficientFeedbackCount), helper: 'Blocked by confidence checks', icon: 'bi-exclamation-diamond', tone: countValue(summary.insufficientFeedbackCount) ? 'danger' : 'good' },
      { label: 'Published', value: `${publishedCount}/${formatCount(summary.totalEmployees)}`, helper: 'Employee-facing visibility', icon: 'bi-eye', tone: publishedCount ? 'good' : 'neutral' },
    ];
  }, [blockedItems.length, publishedCount, readyItems.length, summary]);

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

  const hasPublishContent = publishOptions.includeOverallScore
      || publishOptions.includeCompetencyBreakdown
      || publishOptions.includeSelfVsOthers
      || publishOptions.includeComments
      || publishOptions.includeScoreExplanation;
  const publishReady = selectedReadyCount > 0 && hasPublishContent && publishOptions.confirmVisibility;

  const openPublishModal = () => {
    setPublishOptions(defaultPublishOptions());
    setPublishStep(1);
    setPublishOpen(true);
  };

  const runPublish = async () => {
    if (!selectedId || !publishReady) return;
    setActionLoading(true);
    setNotice('');
    setError('');
    try {
      const nextSummary = await feedbackAnalyticsApi.publishCampaignSummary(selectedId, publishPayload());
      setSummary(nextSummary);
      setPublishOpen(false);
      setNotice('Results published successfully. Employee visibility now follows each saved result summary and publish option.');
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
      const nextSummary = await feedbackAnalyticsApi.unpublishCampaignSummary(selectedId);
      setSummary(nextSummary);
      setNotice('Results unpublished. Employee-facing visibility has been turned off for this campaign.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unpublish results.');
    } finally {
      setActionLoading(false);
    }
  };

  const exportCsv = () => {
    if (!filteredItems.length || !selectedId) return;
    const header = ['Employee', 'Employee ID', 'Average Score', 'Score Band', 'Confidence', 'Completion Rate', 'Assigned', 'Submitted', 'Pending', 'Manager Responses', 'Peer Responses', 'Direct Report Responses', 'Self Responses', 'Visibility', 'Calculation Note'];
    const body = filteredItems.map(item => [
      item.targetEmployeeName,
      item.targetEmployeeId,
      item.averageScore ?? '',
      item.scoreCategory || scoreBand(item.averageScore),
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
      <div className="hfa-page">
        <div className="hfa-topbar">
          <div className="hfa-title-block">
            <span className="hfa-title-icon"><i className="bi bi-graph-up-arrow" /></span>
            <div>
              <h2>360 Feedback Analytics</h2>
              <p>Review closed-campaign results, validate confidence and privacy, then publish employee summaries from one production workspace.</p>
            </div>
          </div>

          <div className="hfa-topbar-actions">
            <label className="hfa-select-wrap">
              <span className="hfa-label">Closed campaign</span>
              <select className="hfa-select" value={selectedId} onChange={event => setSelectedId(event.target.value ? Number(event.target.value) : '')}>
                <option value="">Select campaign</option>
                {closedCampaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status}</option>
                ))}
              </select>
            </label>
            <button className="hfa-btn hfa-btn-secondary" type="button" onClick={refreshSummary} disabled={!selectedId || loading}>
              <i className="bi bi-arrow-repeat" /> Refresh
            </button>
          </div>
        </div>

        <div className="hfa-alert hfa-alert-info">
          <i className="bi bi-shield-lock" /> Campaign lifecycle and result visibility are now separate. Closed campaigns stay closed; published visibility is controlled by saved result summaries.
        </div>
        {notice && <div className="hfa-alert hfa-alert-success"><i className="bi bi-check-circle" /> {notice}</div>}
        {error && <div className="hfa-alert hfa-alert-error"><i className="bi bi-exclamation-triangle" /> {error}</div>}

        {closedCampaigns.length === 0 && !loading && (
            <div className="hfa-empty"><i className="bi bi-lock" />Analytics becomes available after a 360 feedback campaign is closed.</div>
        )}

        {loading && <div className="hfa-loading"><i className="bi bi-arrow-repeat" /> Loading production analytics…</div>}

        {summary && !loading && (
            <>
              <CampaignResultHeader summary={summary} campaign={selectedCampaign} />
              <MetricCards cards={metricCards} />

              <section className="hfa-panel">
                <div className="hfa-panel-head">
                  <div>
                    <span className="hfa-eyebrow">Scoring configuration</span>
                    <h3>Relationship-weighted calculation</h3>
                    <p>
                      {scoringLoading
                          ? 'Loading campaign scoring rules…'
                          : scoringConfig?.relationshipWeightsReady
                              ? 'Scoring weights are ready and backend summaries use submitted relationship data.'
                              : 'Scoring weights should be reviewed in Campaign Setup before publishing.'}
                    </p>
                  </div>
                  <span className={`hfa-pill ${scoringConfig?.relationshipWeightsReady ? 'hfa-pill-published' : 'hfa-pill-warning'}`}>
                {scoringConfig?.relationshipWeightsReady ? 'Weights ready' : 'Review weights'}
              </span>
                </div>
                <div className="hfa-chart-grid">
                  <HorizontalBarChart
                      title="Configured relationship weights"
                      subtitle={scoringConfig?.redistributeMissingRelationshipWeight ? 'Missing relationship weight is redistributed.' : 'Configured relationships are used when available.'}
                      rows={(scoringConfig?.relationshipWeights ?? []).map(row => ({
                        label: relationshipDisplayName(row.relationshipType),
                        value: Number(row.weightPercent ?? 0),
                        meta: `${Number(row.weightPercent ?? 0)}%`,
                      }))}
                  />
                  <HorizontalBarChart
                      title="Submitted relationship averages"
                      subtitle="Backend calculated average score by relationship."
                      rows={(summary.relationshipAverages ?? []).map(row => ({
                        label: row.label || relationshipDisplayName(row.relationshipType),
                        value: numberValue(row.averageScore),
                        meta: `${formatScore(row.averageScore)} · ${formatCount(row.responseCount)}`,
                      }))}
                  />
                </div>
              </section>

              <AnalyticsCharts summary={summary} />
              <QualityPrivacyPanel summary={summary} readyItems={readyItems} blockedItems={blockedItems} publishedCount={publishedCount} />

              <section className="hfa-panel">
                <div className="hfa-panel-head">
                  <div>
                    <span className="hfa-eyebrow">Publish center</span>
                    <h3>Release employee summaries</h3>
                    <p>{readyItems.length} ready, {blockedItems.length} blocked, and {publishedCount} already published.</p>
                  </div>
                  <div className="hfa-topbar-actions">
                    <button className="hfa-btn hfa-btn-danger" type="button" onClick={runUnpublish} disabled={actionLoading || publishedCount === 0}>
                      <i className="bi bi-eye-slash" /> Unpublish
                    </button>
                    <button className="hfa-btn hfa-btn-primary" type="button" onClick={openPublishModal} disabled={actionLoading || readyItems.length === 0}>
                      <i className="bi bi-send-check" /> Publish ready results
                    </button>
                  </div>
                </div>
              </section>

              <EmployeeResultsTable
                  items={filteredItems}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  publishFilter={publishFilter}
                  setPublishFilter={setPublishFilter}
                  confidenceFilter={confidenceFilter}
                  setConfidenceFilter={setConfidenceFilter}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  onOpen={setSelectedResult}
                  onExport={exportCsv}
              />

              <ResultDetailDrawer
                  item={selectedResult}
                  competencies={summary.competencyAverages ?? []}
                  onClose={() => setSelectedResult(null)}
              />

              <PublishResultsModal
                  open={publishOpen}
                  step={publishStep}
                  setStep={setPublishStep}
                  options={publishOptions}
                  setOptions={setPublishOptions}
                  readyItems={readyItems}
                  blockedItems={blockedItems}
                  publishedCount={publishedCount}
                  selectedReadyCount={selectedReadyCount}
                  publishReady={publishReady}
                  actionLoading={actionLoading}
                  onClose={() => setPublishOpen(false)}
                  onPublish={runPublish}
              />
            </>
        )}
      </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import { feedbackAnalyticsApi } from '../../../api/feedbackAnalyticsApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import './feedback-analytics.css';
import type {
  FeedbackCampaign,
  FeedbackCampaignScoringConfig,
} from '../../../types/feedbackCampaign';
import type {
  FeedbackCampaignSummary,
  FeedbackConfidenceBreakdown,
  FeedbackRelationshipPrivacy,
  FeedbackResultItem,
  FeedbackScoreDistribution,
  FeedbackSummaryPublishRequest,
} from '../../../types/feedbackAnalytics';

type PublishFilter = 'ALL' | 'HIDDEN' | 'READY_TO_PUBLISH' | 'PUBLISHED';
type ConfidenceFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
type AnalyticsSort = 'SCORE_DESC' | 'SCORE_ASC' | 'COMPLETION_DESC' | 'COMPLETION_ASC' | 'RESPONSES_DESC';
type PublishStep = 1 | 2;
type PublishScope = 'ALL_READY' | 'SELECTED_EMPLOYEES';
type Tone = 'blue' | 'green' | 'amber' | 'red' | 'slate';

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
  includeScoreExplanation: false,
  confirmVisibility: false,
});

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
const numberValue = (value?: number | null) => Number(value ?? 0);
const countValue = (value?: number | null) => Number(value ?? 0);
const formatCount = (value?: number | null) => Number(value ?? 0).toLocaleString();
const hasNumericScore = (value?: number | null) => value != null && !Number.isNaN(Number(value));

const formatScore = (value?: number | null, digits = 1) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(digits)}%`;
};

const formatShortDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
};

const statusText = (status?: string | null) => {
  switch (String(status ?? 'HIDDEN').toUpperCase()) {
    case 'PUBLISHED': return 'Published';
    case 'READY_TO_PUBLISH': return 'Ready';
    default: return 'Hidden';
  }
};

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
    case 'SUBORDINATE': return 'Subordinates';
    case 'SELF': return 'Self';
    default: return relationshipType || 'Reviewer group';
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
    hiddenReason: countValue(item.managerResponses) >= 1 ? null : 'Not submitted yet.',
  },
  {
    relationshipType: 'PEER',
    label: 'Peers',
    responseCount: countValue(item.peerResponses),
    minimumVisibleResponses: 2,
    thresholdRequired: true,
    thresholdMet: countValue(item.peerResponses) >= 2,
    visibleOutsideHr: countValue(item.peerResponses) >= 2,
    hiddenReason: countValue(item.peerResponses) >= 2 ? null : 'Hidden until the minimum peer response count is met.',
  },
  {
    relationshipType: 'SUBORDINATE',
    label: 'Subordinates',
    responseCount: countValue(item.subordinateResponses),
    minimumVisibleResponses: 2,
    thresholdRequired: true,
    thresholdMet: countValue(item.subordinateResponses) >= 2,
    visibleOutsideHr: countValue(item.subordinateResponses) >= 2,
    hiddenReason: countValue(item.subordinateResponses) >= 2 ? null : 'Hidden until the minimum subordinate response count is met.',
  },
  {
    relationshipType: 'SELF',
    label: 'Self',
    responseCount: countValue(item.selfResponses),
    minimumVisibleResponses: 1,
    thresholdRequired: false,
    thresholdMet: countValue(item.selfResponses) >= 1,
    visibleOutsideHr: countValue(item.selfResponses) >= 1,
    hiddenReason: countValue(item.selfResponses) >= 1 ? null : 'Not submitted yet.',
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

const publishBlockReason = (item: FeedbackResultItem) => {
  if (isPublished(item)) return 'Already visible to employees.';
  if (isReadyToPublish(item)) return 'Ready to publish.';
  if (countValue(item.totalResponses) === 0) return 'No feedback was submitted before this campaign closed.';
  if (item.insufficientFeedback) return 'Reviewer coverage is below the minimum needed for a safe release.';
  if (!hasNumericScore(item.averageScore)) return 'No calculated score is available.';
  return 'This summary did not pass release checks.';
};

const releaseStatusLabel = (item: FeedbackResultItem) => {
  if (isPublished(item)) return 'Published';
  if (isReadyToPublish(item)) return 'Ready';
  return 'Blocked';
};

const confidenceLabel = (item: FeedbackResultItem) => item.insufficientFeedback ? 'Insufficient' : item.confidenceLevel || 'Not ready';

const employeeSearchText = (item: FeedbackResultItem) => [
  item.targetEmployeeName,
  item.targetEmployeeId,
  item.scoreCategory,
  item.confidenceLevel,
  item.visibilityStatus,
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

const metricToneClass: Record<Tone, string> = {
  blue: 'border-blue-100 bg-blue-50/70 text-blue-700',
  green: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
  amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
  red: 'border-rose-100 bg-rose-50/70 text-rose-700',
  slate: 'border-slate-200 bg-white text-slate-700',
};

const badgeClass = (tone: Tone = 'slate') => cx(
    'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
    metricToneClass[tone],
);

const statusTone = (status?: string | null): Tone => {
  switch (String(status ?? '').toUpperCase()) {
    case 'PUBLISHED': return 'green';
    case 'READY_TO_PUBLISH': return 'blue';
    default: return 'slate';
  }
};

const confidenceTone = (item: FeedbackResultItem): Tone => {
  if (item.insufficientFeedback) return 'red';
  switch (String(item.confidenceLevel ?? '').toUpperCase()) {
    case 'HIGH': return 'green';
    case 'MEDIUM': return 'amber';
    case 'LOW': return 'red';
    default: return 'slate';
  }
};

const contentSummary = (options: PublishOptions) => [
  options.includeOverallScore ? 'overall score' : null,
  options.includeCompetencyBreakdown ? 'competency breakdown' : null,
  options.includeSelfVsOthers ? 'self vs others' : null,
  options.includeComments ? 'anonymous comments' : null,
].filter(Boolean).join(', ');

const distributionRows = (distribution: FeedbackScoreDistribution[] | undefined, items: FeedbackResultItem[]): BarRow[] => {
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
    meta: formatCount(items.filter(item => item.averageScore != null && item.averageScore >= band.min && item.averageScore <= band.max).length),
  }));
};

function SectionHeader({ eyebrow, title, helper }: { eyebrow?: string; title: string; helper?: string }) {
  return (
      <div className="mb-3">
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600">{eyebrow}</p> : null}
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {helper ? <p className="mt-0.5 text-xs text-slate-500">{helper}</p> : null}
      </div>
  );
}

function BarList({ rows, maxValue, emptyText = 'No data yet.' }: { rows: BarRow[]; maxValue?: number; emptyText?: string }) {
  const max = Math.max(1, maxValue ?? Math.max(1, ...rows.map(row => row.value)));
  if (!rows.length) return <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400">{emptyText}</p>;

  return (
      <div className="space-y-2.5">
        {rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="grid grid-cols-[minmax(92px,140px)_1fr_auto] items-center gap-2 text-xs">
              <span className="truncate font-semibold text-slate-700" title={row.label}>{row.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-blue-500" style={{ width: `${row.value <= 0 ? 0 : Math.max(4, Math.min(100, (row.value / max) * 100))}%` }} />
          </span>
              <span className="min-w-[46px] text-right font-semibold text-slate-600">{row.meta ?? formatScore(row.value)}</span>
            </div>
        ))}
      </div>
  );
}

function CompactCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cx('w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>{children}</section>;
}

function MetricCards({ cards }: { cards: MetricCard[] }) {
  return (
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
        {cards.map(card => (
            <article key={card.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{card.label}</span>
                <span className={cx('h-1.5 w-1.5 rounded-full', card.tone === 'red' ? 'bg-rose-500' : card.tone === 'amber' ? 'bg-amber-500' : card.tone === 'green' ? 'bg-emerald-500' : 'bg-blue-500')} />
              </div>
              <strong className="mt-1 block text-lg font-bold tracking-tight text-slate-950">{card.value}</strong>
              {card.helper ? <span className="block truncate text-xs text-slate-500">{card.helper}</span> : null}
            </article>
        ))}
      </div>
  );
}

function CampaignSummaryStrip({
                                summary,
                                campaign,
                                cards,
                                selectedId,
                                closedCampaigns,
                                setSelectedId,
                                onRefresh,
                                loading,
                              }: {
  summary: FeedbackCampaignSummary;
  campaign?: FeedbackCampaign;
  cards: MetricCard[];
  selectedId: number | '';
  closedCampaigns: FeedbackCampaign[];
  setSelectedId: (value: number | '') => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
      <CompactCard className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={badgeClass('blue')}>Closed</span>
              <span className={badgeClass(statusTone(summary.visibilityStatus))}>{statusText(summary.visibilityStatus)}</span>
              <span className={badgeClass('slate')}>{formatCount(summary.totalEmployees)} employees</span>
              <span className={badgeClass('slate')}>{formatCount(summary.totalResponses)} responses</span>
            </div>
            <h3 className="mt-3 truncate text-xl font-semibold text-slate-950">{campaign?.name ?? summary.campaignName}</h3>
            <p className="mt-1 text-sm text-slate-500">Review closed campaign results and publish employee summaries.</p>
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-[360px]">
            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Campaign</span>
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={selectedId} onChange={event => setSelectedId(event.target.value ? Number(event.target.value) : '')}>
                <option value="">Select campaign</option>
                {closedCampaigns.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300" type="button" onClick={onRefresh} disabled={!selectedId || loading}>Refresh</button>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <MetricCards cards={cards} />
        </div>
      </CompactCard>
  );
}

function CampaignPickerCard({
                              selectedId,
                              closedCampaigns,
                              setSelectedId,
                              onRefresh,
                              loading,
                            }: {
  selectedId: number | '';
  closedCampaigns: FeedbackCampaign[];
  setSelectedId: (value: number | '') => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
      <CompactCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="w-full lg:max-w-md">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Campaign</span>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={selectedId} onChange={event => setSelectedId(event.target.value ? Number(event.target.value) : '')}>
              <option value="">Select closed campaign</option>
              {closedCampaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
            </select>
          </label>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300" type="button" onClick={onRefresh} disabled={!selectedId || loading}>Refresh</button>
        </div>
      </CompactCard>
  );
}

function ScoringCard({ scoringConfig, scoringLoading, className }: { summary: FeedbackCampaignSummary; scoringConfig: FeedbackCampaignScoringConfig | null; scoringLoading: boolean; className?: string }) {
  const configuredRows = (scoringConfig?.relationshipWeights ?? []).map(row => ({
    label: relationshipDisplayName(row.relationshipType),
    value: Number(row.weightPercent ?? 0),
    meta: `${Number(row.weightPercent ?? 0)}%`,
  }));

  return (
      <CompactCard className={cx('h-full', className)}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-950">Reviewer weights</h4>
            <p className="mt-0.5 text-xs text-slate-500">Campaign scoring mix</p>
          </div>
          <span className={badgeClass(scoringConfig?.relationshipWeightsReady ? 'green' : 'amber')}>{scoringLoading ? 'Loading' : scoringConfig?.relationshipWeightsReady ? 'Ready' : 'Review'}</span>
        </div>
        <div className="space-y-3">
          <BarList rows={configuredRows} maxValue={100} emptyText="No weights configured." />
        </div>
      </CompactCard>
  );
}

function AnalyticsGrid({ summary }: { summary: FeedbackCampaignSummary }) {
  const hasResponses = countValue(summary.totalResponses) > 0;
  const rows = distributionRows(summary.scoreDistribution, summary.items ?? []);
  const relationshipRows = (summary.relationshipAverages ?? []).map(row => ({
    label: row.label || relationshipDisplayName(row.relationshipType),
    value: numberValue(row.averageScore),
    meta: `${formatScore(row.averageScore)} · ${formatCount(row.responseCount)}`,
  }));
  const competencies = [...(summary.competencyAverages ?? [])].filter(row => row.averageScore != null);
  const topCompetencies = [...competencies]
      .sort((a, b) => numberValue(b.averageScore) - numberValue(a.averageScore))
      .slice(0, 4)
      .map(row => ({ label: row.competencyName || row.competencyCode, value: numberValue(row.averageScore), meta: formatScore(row.averageScore) }));
  const focusCompetencies = [...competencies]
      .sort((a, b) => numberValue(a.averageScore) - numberValue(b.averageScore))
      .slice(0, 4)
      .map(row => ({ label: row.competencyName || row.competencyCode, value: numberValue(row.averageScore), meta: formatScore(row.averageScore) }));

  if (!hasResponses && competencies.length === 0) {
    return (
        <CompactCard>
          <SectionHeader eyebrow="Analytics" title="Patterns" helper="Patterns appear when submitted feedback is available." />
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">No feedback was submitted before this campaign closed.</div>
        </CompactCard>
    );
  }

  return (
      <div className="space-y-3">
        <SectionHeader eyebrow="Analytics" title="Patterns" helper="Focus on score bands, reviewer groups, and competency trends." />
        <div className="grid gap-3 lg:grid-cols-2">
          <CompactCard>
            <h4 className="mb-1 text-sm font-semibold text-slate-950">Score distribution</h4>
            <p className="mb-3 text-xs text-slate-500">Employees by score band</p>
            <BarList rows={rows} maxValue={Math.max(1, ...rows.map(row => row.value))} />
          </CompactCard>
          <CompactCard>
            <h4 className="mb-1 text-sm font-semibold text-slate-950">Reviewer groups</h4>
            <p className="mb-3 text-xs text-slate-500">Submitted reviewer averages</p>
            <BarList rows={relationshipRows} maxValue={100} emptyText="No reviewer averages yet." />
          </CompactCard>
          <CompactCard>
            <h4 className="mb-1 text-sm font-semibold text-slate-950">Strongest competencies</h4>
            <p className="mb-3 text-xs text-slate-500">Highest scoring areas</p>
            <BarList rows={topCompetencies} maxValue={100} emptyText="No competency scores yet." />
          </CompactCard>
          <CompactCard>
            <h4 className="mb-1 text-sm font-semibold text-slate-950">Development focus</h4>
            <p className="mb-3 text-xs text-slate-500">Lowest scoring areas</p>
            <BarList rows={focusCompetencies} maxValue={100} emptyText="No competency scores yet." />
          </CompactCard>
        </div>
      </div>
  );
}

function ConfidenceDonut({ rows }: { rows: FeedbackConfidenceBreakdown[] }) {
  const total = rows.reduce((sum, row) => sum + countValue(row.count), 0);
  const palette = ['#2563eb', '#60a5fa', '#f59e0b', '#f43f5e'];
  let cursor = 0;
  const segments = rows.map((row, index) => {
    const count = countValue(row.count);
    const start = total > 0 ? (cursor / total) * 360 : 0;
    cursor += count;
    const end = total > 0 ? (cursor / total) * 360 : 0;
    return `${palette[index % palette.length]} ${start}deg ${end}deg`;
  });
  const background = total > 0 ? `conic-gradient(${segments.join(', ')})` : '#eef2f7';

  return (
      <div className="f360-confidence-donut" style={{ background }} aria-label={`${formatCount(total)} total results`}>
        <div className="f360-confidence-donut-center">
          <strong>{formatCount(total)}</strong>
          <span>results</span>
        </div>
      </div>
  );
}

function ConfidenceCompact({ rows, className }: { rows: FeedbackConfidenceBreakdown[]; className?: string }) {
  const safeRows = rows.length ? rows : [
    { level: 'HIGH', label: 'High confidence', count: 0 },
    { level: 'MEDIUM', label: 'Medium confidence', count: 0 },
    { level: 'LOW', label: 'Low confidence', count: 0 },
    { level: 'INSUFFICIENT', label: 'Insufficient feedback', count: 0 },
  ] as FeedbackConfidenceBreakdown[];

  return (
      <CompactCard className={cx('h-full', className)}>
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-950">Confidence</h4>
          <p className="mt-0.5 text-xs text-slate-500">Result quality by employee</p>
        </div>
        <div className="grid h-full gap-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
          <ConfidenceDonut rows={safeRows} />
          <div className="space-y-2">
            {safeRows.map((row, index) => {
              const level = String(row.level ?? '').toUpperCase();
              const tone: Tone = level.includes('HIGH') ? 'green' : level.includes('MEDIUM') ? 'amber' : level.includes('LOW') ? 'amber' : 'red';
              return (
                  <div key={`${row.level}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <i className={cx('h-1.5 w-1.5 rounded-full not-italic', tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500')} />
                  {row.label || row.level}
                </span>
                    <strong className="text-xs text-slate-950">{formatCount(row.count)}</strong>
                  </div>
              );
            })}
          </div>
        </div>
      </CompactCard>
  );
}

function PublishReadinessPanel({ summary, readyItems, blockedItems, publishedCount, actionLoading, onPublish, onUnpublish }: {
  summary: FeedbackCampaignSummary;
  readyItems: FeedbackResultItem[];
  blockedItems: FeedbackResultItem[];
  publishedCount: number;
  actionLoading: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  const items = summary.items ?? [];
  const allPrivacyRows = items.flatMap(privacyRowsFor);
  const maskedRows = allPrivacyRows.filter(row => row.thresholdRequired && !row.thresholdMet && row.responseCount > 0);
  const noResponseCount = blockedItems.filter(item => countValue(item.totalResponses) === 0).length;
  const insufficientCount = blockedItems.filter(item => item.insufficientFeedback && countValue(item.totalResponses) > 0).length;
  const nextAction = readyItems.length > 0
      ? `${readyItems.length} ${readyItems.length === 1 ? 'summary is' : 'summaries are'} ready to publish.`
      : blockedItems.length > 0
          ? `${blockedItems.length} ${blockedItems.length === 1 ? 'summary is' : 'summaries are'} blocked from publishing.`
          : publishedCount > 0
              ? 'Published summaries are already visible to employees.'
              : 'No employee summaries are available yet.';
  const publishDisabledText = readyItems.length === 0 ? 'No ready summaries to publish.' : '';
  const unpublishDisabledText = publishedCount === 0 ? 'No published summaries to unpublish.' : '';

  return (
      <CompactCard>
        <SectionHeader eyebrow="Publish" title="Release decision" helper={nextAction} />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 px-2 py-2"><strong className="block text-lg text-slate-950">{readyItems.length}</strong><span className="text-[11px] font-medium text-slate-500">Ready</span></div>
          <div className="rounded-xl bg-slate-50 px-2 py-2"><strong className="block text-lg text-slate-950">{blockedItems.length}</strong><span className="text-[11px] font-medium text-slate-500">Blocked</span></div>
          <div className="rounded-xl bg-slate-50 px-2 py-2"><strong className="block text-lg text-slate-950">{publishedCount}</strong><span className="text-[11px] font-medium text-slate-500">Published</span></div>
        </div>

        <div className="mt-3 grid gap-2">
          <button className="rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400" type="button" onClick={onPublish} disabled={actionLoading || readyItems.length === 0}>
            Publish ready summaries
          </button>
          {publishDisabledText ? <p className="text-xs font-medium text-slate-500">{publishDisabledText}</p> : null}
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300" type="button" onClick={onUnpublish} disabled={actionLoading || publishedCount === 0}>
            Unpublish published summaries
          </button>
          {unpublishDisabledText ? <p className="text-xs font-medium text-slate-500">{unpublishDisabledText}</p> : null}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          {[
            ['No feedback submitted', noResponseCount],
            ['Privacy/coverage blocked', insufficientCount],
            ['Masked reviewer groups', maskedRows.length],
          ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">{label}</span>
                <strong className="text-slate-900">{value}</strong>
              </div>
          ))}
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500">Peer threshold</span>
            <strong className="text-slate-900">{allPrivacyRows.find(row => row.relationshipType === 'PEER')?.minimumVisibleResponses ?? 2}+</strong>
          </div>
        </div>
      </CompactCard>
  );
}

function RelationshipChips({ item }: { item: FeedbackResultItem }) {
  return (
      <div className="flex flex-wrap gap-1.5">
        {privacyRowsFor(item).map(row => (
            <span key={row.relationshipType} className={cx('rounded-full px-2 py-1 text-xs font-semibold', row.responseCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500')}>
          {relationshipDisplayName(row.relationshipType)} {row.responseCount}
        </span>
        ))}
      </div>
  );
}

function EmployeeResultsList({ items, searchTerm, setSearchTerm, publishFilter, setPublishFilter, confidenceFilter, setConfidenceFilter, sortBy, setSortBy, onOpen, onExport }: {
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
}) {
  return (
      <CompactCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeader eyebrow="Employee results" title="Review summaries" helper="Review each summary before publishing." />
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300" type="button" onClick={onExport} disabled={items.length === 0}>
            Export CSV
          </button>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_150px_150px_150px_auto]">
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search employee or score band" />
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={publishFilter} onChange={event => setPublishFilter(event.target.value as PublishFilter)}>
            <option value="ALL">All visibility</option>
            <option value="HIDDEN">Hidden</option>
            <option value="READY_TO_PUBLISH">Ready</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={confidenceFilter} onChange={event => setConfidenceFilter(event.target.value as ConfidenceFilter)}>
            <option value="ALL">All confidence</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INSUFFICIENT">Insufficient</option>
          </select>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={sortBy} onChange={event => setSortBy(event.target.value as AnalyticsSort)}>
            <option value="SCORE_DESC">Highest score</option>
            <option value="SCORE_ASC">Lowest score</option>
            <option value="COMPLETION_DESC">Highest completion</option>
            <option value="COMPLETION_ASC">Lowest completion</option>
            <option value="RESPONSES_DESC">Most responses</option>
          </select>
          <span className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-600">{items.length}</span>
        </div>

        <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
          {items.length === 0 ? (
              <div className="bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-400">No summaries match the filters.</div>
          ) : items.map(item => (
              <article key={item.targetEmployeeId} className="bg-white px-4 py-3 transition hover:bg-blue-50/30">
                <div className="grid gap-3 lg:grid-cols-[minmax(170px,1.3fr)_100px_150px_1.4fr_160px_70px] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">{initials(item.targetEmployeeName)}</span>
                    <div className="min-w-0"><strong className="block truncate text-sm text-slate-950">{item.targetEmployeeName}</strong><span className="text-xs text-slate-500">ID {item.targetEmployeeId}</span></div>
                  </div>
                  <div><strong className="block text-base text-slate-950">{formatScore(item.averageScore)}</strong><span className="text-xs text-slate-500">{item.scoreCategory || scoreBand(item.averageScore)}</span></div>
                  <div>
                    <div className="flex items-center gap-2"><span className="h-1.5 flex-1 rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(0, numberValue(item.completionRate)))}%` }} /></span><strong className="text-xs text-slate-700">{formatScore(item.completionRate, 0)}</strong></div>
                    <span className="mt-1 block text-xs text-slate-500">{formatCount(item.submittedEvaluatorCount ?? item.totalResponses)} / {formatCount(item.assignedEvaluatorCount)} responses</span>
                  </div>
                  <RelationshipChips item={item} />
                  <div>
                    <div className="flex flex-wrap gap-1.5"><span className={badgeClass(confidenceTone(item))}>{confidenceLabel(item)}</span><span className={badgeClass(isPublished(item) ? 'green' : isReadyToPublish(item) ? 'blue' : 'slate')}>{releaseStatusLabel(item)}</span></div>
                    {!isPublished(item) && !isReadyToPublish(item) ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{publishBlockReason(item)}</p> : null}
                  </div>
                  <button type="button" className="text-left text-sm font-bold text-blue-700 hover:text-blue-800" onClick={() => onOpen(item)}>Review</button>
                </div>
              </article>
          ))}
        </div>
      </CompactCard>
  );
}

function ResultDrawer({ item, onClose }: { item: FeedbackResultItem | null; onClose: () => void }) {
  if (!item) return null;
  const privacyRows = privacyRowsFor(item);
  const competencyRows = item.competencyBreakdown ?? [];
  const commentRows = item.comments ?? [];
  const relationshipRows = [
    { relationshipType: 'MANAGER', label: 'Manager', score: item.managerAverageScore, count: item.managerResponses },
    { relationshipType: 'PEER', label: 'Peers', score: item.peerAverageScore, count: item.peerResponses },
    { relationshipType: 'SUBORDINATE', label: 'Subordinates', score: item.subordinateAverageScore, count: item.subordinateResponses },
    { relationshipType: 'SELF', label: 'Self', score: item.selfAverageScore, count: item.selfResponses },
  ];
  const publishedSections = [
    item.includeOverallScore !== false ? 'Overall score' : null,
    item.includeCompetencyBreakdown !== false ? 'Competencies' : null,
    item.includeSelfVsOthers !== false ? 'Self vs others' : null,
    item.includeComments ? 'Comments' : null,
  ].filter(Boolean);

  return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" role="dialog" aria-modal="true">
        <aside className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-600">Result review</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">{item.targetEmployeeName}</h3>
                <p className="mt-1 text-sm text-slate-500">Review release status and employee-facing content.</p>
              </div>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl font-semibold text-slate-500 hover:bg-slate-50" onClick={onClose} aria-label="Close result detail">×</button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><strong className="block text-2xl text-slate-950">{formatScore(item.averageScore)}</strong><span className="text-xs font-semibold text-slate-500">Score</span></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><strong className="block text-2xl text-slate-950">{formatScore(item.completionRate, 0)}</strong><span className="text-xs font-semibold text-slate-500">Completion</span></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><strong className="block text-2xl text-slate-950">{formatCount(item.totalResponses)}</strong><span className="text-xs font-semibold text-slate-500">Responses</span></div>
            </div>

            <div className={cx('rounded-2xl border px-4 py-3', isPublished(item) ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : isReadyToPublish(item) ? 'border-blue-100 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="block text-sm">{releaseStatusLabel(item)}</strong>
                  <p className="mt-0.5 text-xs">{publishBlockReason(item)}</p>
                </div>
                <span className={badgeClass(isPublished(item) ? 'green' : isReadyToPublish(item) ? 'blue' : 'slate')}>{statusText(item.visibilityStatus)}</span>
              </div>
            </div>

            <CompactCard>
              <h4 className="mb-3 text-base font-semibold text-slate-950">Reviewer groups</h4>
              <BarList rows={relationshipRows.map(row => ({ label: row.label, value: numberValue(row.score), meta: `${formatScore(row.score)} · ${formatCount(row.count)}` }))} maxValue={100} emptyText="No reviewer scores yet." />
            </CompactCard>

            <CompactCard>
              <h4 className="mb-3 text-base font-semibold text-slate-950">Employee-facing content</h4>
              {publishedSections.length ? (
                  <div className="flex flex-wrap gap-2">{publishedSections.map(section => <span key={String(section)} className={badgeClass('blue')}>{section}</span>)}</div>
              ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500">No sections are currently selected for employees.</p>
              )}
            </CompactCard>

            <CompactCard>
              <h4 className="mb-3 text-base font-semibold text-slate-950">Privacy checks</h4>
              <div className="space-y-2">
                {privacyRows.map(row => (
                    <div key={row.relationshipType} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
                      <span><strong className="block text-sm text-slate-800">{row.label}</strong><small className="text-slate-500">{row.visibleOutsideHr ? 'Can be shown if this section is published.' : row.hiddenReason || 'Hidden outside HR.'}</small></span>
                      <span className={badgeClass(row.thresholdMet ? 'green' : 'amber')}>{row.responseCount}/{row.minimumVisibleResponses}</span>
                    </div>
                ))}
              </div>
            </CompactCard>

            <CompactCard>
              <h4 className="mb-3 text-base font-semibold text-slate-950">Competencies</h4>
              <BarList rows={competencyRows.slice(0, 8).map(row => ({ label: row.competencyName || row.competencyCode, value: numberValue(row.averageScore), meta: formatScore(row.averageScore) }))} maxValue={100} emptyText="No competency scores yet." />
            </CompactCard>

            {item.includeComments && commentRows.length ? (
                <CompactCard>
                  <h4 className="mb-3 text-base font-semibold text-slate-950">Published comments</h4>
                  <div className="space-y-3">
                    {commentRows.slice(0, 6).map((comment, index) => (
                        <blockquote key={`${comment.relationshipType}-${comment.questionCode}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-blue-600">{comment.competencyName || comment.label || relationshipDisplayName(comment.relationshipType)}</span>
                          {comment.comment}
                        </blockquote>
                    ))}
                  </div>
                </CompactCard>
            ) : null}
          </div>
        </aside>
      </div>
  );
}

function PublishModal({ open, step, setStep, options, setOptions, readyItems, blockedItems, publishedCount, selectedReadyCount, publishReady, actionLoading, onClose, onPublish }: {
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
}) {
  if (!open) return null;

  const canOpenConfirm = selectedReadyCount > 0;

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
      <div className="f360-publish-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-600">Publish summaries</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">Employee 360 results</h3>
              <p className="mt-1 text-sm text-slate-500">Configure what employees will see before publishing.</p>
            </div>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl font-semibold text-slate-500 hover:bg-slate-50" onClick={onClose} aria-label="Close publish modal">×</button>
          </div>

          <div className="flex gap-2 border-b border-slate-100 px-6 py-3">
            <button
                type="button"
                className={cx('f360-publish-step rounded-full px-3 py-1 text-xs font-bold transition', step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                onClick={() => setStep(1)}
            >
              Configure
            </button>
            <button
                type="button"
                className={cx('f360-publish-step rounded-full px-3 py-1 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50', step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                onClick={() => canOpenConfirm && setStep(2)}
                disabled={!canOpenConfirm}
            >
              Confirm
            </button>
          </div>

          <div className="max-h-[62vh] overflow-y-auto p-6">
            {step === 1 ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  <CompactCard>
                    <h4 className="text-base font-semibold text-slate-950">Publish scope</h4>
                    <div className="mt-4 space-y-3">
                      <label className={cx('f360-publish-option flex cursor-pointer gap-3 rounded-2xl border p-4 transition', options.scope === 'ALL_READY' ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40')}><input type="radio" checked={options.scope === 'ALL_READY'} onChange={() => setOptions(current => ({ ...current, scope: 'ALL_READY' }))} /><span><strong className="block text-sm text-slate-950">All ready employees</strong><small className="text-slate-500">Publish every result that passed checks.</small></span></label>
                      <label className={cx('f360-publish-option flex cursor-pointer gap-3 rounded-2xl border p-4 transition', options.scope === 'SELECTED_EMPLOYEES' ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40')}><input type="radio" checked={options.scope === 'SELECTED_EMPLOYEES'} onChange={() => setOptions(current => ({ ...current, scope: 'SELECTED_EMPLOYEES' }))} /><span><strong className="block text-sm text-slate-950">Selected employees</strong><small className="text-slate-500">Choose specific ready results.</small></span></label>
                    </div>
                    {options.scope === 'SELECTED_EMPLOYEES' ? (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                          <button className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" type="button" onClick={selectAllReady}>Select all ready</button>
                          <div className="max-h-52 space-y-2 overflow-auto">
                            {readyItems.map(item => <label key={item.targetEmployeeId} className="f360-publish-option flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm"><span><input className="mr-2" type="checkbox" checked={options.selectedEmployeeIds.includes(item.targetEmployeeId)} onChange={() => toggleEmployee(item.targetEmployeeId)} />{item.targetEmployeeName}</span><strong>{formatScore(item.averageScore)}</strong></label>)}
                          </div>
                        </div>
                    ) : null}
                  </CompactCard>

                  <CompactCard>
                    <h4 className="text-base font-semibold text-slate-950">Visible sections</h4>
                    <div className="mt-4 space-y-3">
                      {[
                        ['includeOverallScore', 'Overall score', 'Final score and band.'],
                        ['includeCompetencyBreakdown', 'Competency breakdown', 'Strength and development areas.'],
                        ['includeSelfVsOthers', 'Self vs others', 'Reviewer group comparison.'],
                        ['includeComments', 'Anonymous comments', 'Only where confidentiality allows.'],
                      ].map(([key, title, helper]) => (
                          <label key={key} className={cx('f360-publish-option flex cursor-pointer gap-3 rounded-2xl border p-4 transition', Boolean(options[key as keyof PublishOptions]) ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40')}>
                            <input type="checkbox" checked={Boolean(options[key as keyof PublishOptions])} onChange={event => setBooleanOption(key as keyof Pick<PublishOptions, 'includeOverallScore' | 'includeCompetencyBreakdown' | 'includeSelfVsOthers' | 'includeComments'>, event.target.checked)} />
                            <span><strong className="block text-sm text-slate-950">{title}</strong><small className="text-slate-500">{helper}</small></span>
                          </label>
                      ))}
                    </div>
                  </CompactCard>
                </div>
            ) : (
                <div className="space-y-4">
                  <CompactCard>
                    <h4 className="text-base font-semibold text-slate-950">Confirm publishing</h4>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Results</span><strong>{selectedReadyCount} employees</strong></div>
                      <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Included</span><strong>{contentSummary(options) || 'No sections selected'}</strong></div>
                      <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Already published</span><strong>{publishedCount}</strong></div>
                      <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Blocked</span><strong>{blockedItems.length}</strong></div>
                    </div>
                  </CompactCard>
                  <label className={cx('f360-publish-option flex gap-3 rounded-2xl border p-4 text-sm font-medium transition', options.confirmVisibility ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700')}><input type="checkbox" checked={options.confirmVisibility} onChange={event => setBooleanOption('confirmVisibility', event.target.checked)} /><span>I reviewed the selected summaries and confirm these sections can be shown to employees.</span></label>
                </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => step === 1 ? onClose() : setStep(1)}>{step === 1 ? 'Cancel' : 'Back'}</button>
            {step === 1 ? (
                <button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300" type="button" onClick={() => setStep(2)} disabled={selectedReadyCount === 0}>Preview release</button>
            ) : (
                <button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300" type="button" onClick={onPublish} disabled={!publishReady || actionLoading}>{actionLoading ? 'Publishing…' : 'Publish summaries'}</button>
            )}
          </div>
        </div>
      </div>
  );
}


function UnpublishConfirmModal({ open, publishedCount, actionLoading, onClose, onConfirm }: {
  open: boolean;
  publishedCount: number;
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-600">Unpublish results</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Hide published summaries?</h3>
          <p className="mt-2 text-sm text-slate-500">
            {publishedCount} published {publishedCount === 1 ? 'summary is' : 'summaries are'} currently visible to employees. Unpublishing will hide them from employees, but HR can publish them again later.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={onClose} disabled={actionLoading}>Cancel</button>
            <button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300" type="button" onClick={onConfirm} disabled={actionLoading}>{actionLoading ? 'Unpublishing…' : 'Unpublish summaries'}</button>
          </div>
        </div>
      </div>
  );
}

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
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<PublishStep>(1);
  const [publishOptions, setPublishOptions] = useState<PublishOptions>(defaultPublishOptions);

  const closedCampaigns = useMemo(() => campaigns.filter(campaign => ['CLOSED', 'PUBLISHED'].includes(String(campaign.status ?? '').toUpperCase())), [campaigns]);
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
    setUnpublishOpen(false);
  }, [selectedId]);

  const readyItems = useMemo(() => (summary?.items ?? []).filter(item => isReadyToPublish(item) && !isPublished(item)), [summary?.items]);
  const blockedItems = useMemo(() => (summary?.items ?? []).filter(item => !isReadyToPublish(item) && !isPublished(item)), [summary?.items]);
  const publishedCount = useMemo(() => (summary?.items ?? []).filter(isPublished).length, [summary?.items]);
  const selectedReadyCount = publishOptions.scope === 'ALL_READY' ? readyItems.length : readyItems.filter(item => publishOptions.selectedEmployeeIds.includes(item.targetEmployeeId)).length;

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
    return [
      { label: 'Average', value: formatScore(summary.overallAverageScore), helper: summary.overallScoreCategory || scoreBand(summary.overallAverageScore), tone: 'blue' },
      { label: 'Completion', value: formatScore(summary.completionRate, 0), helper: `${formatCount(summary.submittedEvaluatorCount)} of ${formatCount(summary.assignedEvaluatorCount)}`, tone: numberValue(summary.completionRate) >= 80 ? 'green' : 'amber' },
      { label: 'Ready', value: readyItems.length, helper: 'Can publish', tone: readyItems.length ? 'green' : 'slate' },
      { label: 'Blocked', value: formatCount(summary.insufficientFeedbackCount), helper: 'Cannot publish', tone: countValue(summary.insufficientFeedbackCount) ? 'amber' : 'slate' },
      { label: 'Published', value: `${publishedCount}/${formatCount(summary.totalEmployees)}`, helper: 'Visible to employees', tone: publishedCount ? 'green' : 'slate' },
    ];
  }, [publishedCount, readyItems.length, summary]);

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

  const hasPublishContent = publishOptions.includeOverallScore || publishOptions.includeCompetencyBreakdown || publishOptions.includeSelfVsOthers || publishOptions.includeComments;
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
      setNotice('Results published successfully.');
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
      setUnpublishOpen(false);
      setNotice('Published summaries are now hidden from employees.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unpublish results.');
    } finally {
      setActionLoading(false);
    }
  };

  const exportCsv = () => {
    if (!filteredItems.length || !selectedId) return;
    const header = ['Employee', 'Employee ID', 'Average Score', 'Score Band', 'Confidence', 'Completion Rate', 'Assigned', 'Submitted', 'Pending', 'Manager Responses', 'Peer Responses', 'Subordinate Responses', 'Self Responses', 'Visibility'];
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
      statusText(item.visibilityStatus),
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
      <div className="mx-auto w-full max-w-[1180px] space-y-4 overflow-x-hidden px-4 pb-8 text-slate-900">
        {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
        {error ? <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
        {closedCampaigns.length === 0 && !loading ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">Analytics appears after a 360 campaign is closed.</div> : null}
        {closedCampaigns.length > 0 && !summary && !loading ? <CampaignPickerCard selectedId={selectedId} closedCampaigns={closedCampaigns} setSelectedId={setSelectedId} onRefresh={refreshSummary} loading={loading} /> : null}
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">Loading analytics…</div> : null}

        {summary && !loading ? (
            <>
              <CampaignSummaryStrip summary={summary} campaign={selectedCampaign} cards={metricCards} selectedId={selectedId} closedCampaigns={closedCampaigns} setSelectedId={setSelectedId} onRefresh={refreshSummary} loading={loading} />

              <EmployeeResultsList
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

              <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <AnalyticsGrid summary={summary} />
                <PublishReadinessPanel
                    summary={summary}
                    readyItems={readyItems}
                    blockedItems={blockedItems}
                    publishedCount={publishedCount}
                    actionLoading={actionLoading}
                    onPublish={openPublishModal}
                    onUnpublish={() => setUnpublishOpen(true)}
                />
              </div>

              <div className="grid w-full min-w-0 items-stretch gap-4 lg:grid-cols-2">
                <ConfidenceCompact rows={summary.confidenceBreakdown ?? []} />
                <ScoringCard summary={summary} scoringConfig={scoringConfig} scoringLoading={scoringLoading} />
              </div>

              <ResultDrawer item={selectedResult} onClose={() => setSelectedResult(null)} />
              <PublishModal
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
              <UnpublishConfirmModal
                  open={unpublishOpen}
                  publishedCount={publishedCount}
                  actionLoading={actionLoading}
                  onClose={() => setUnpublishOpen(false)}
                  onConfirm={runUnpublish}
              />
            </>
        ) : null}
      </div>
  );
}

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
    useFeedbackAnalyticsCampaigns,
    useFeedbackCampaignSummary,
} from '../../hooks/useFeedbackAnalytics';
import { feedbackAnalyticsApi } from '../../api/feedbackAnalyticsApi';
import type { FeedbackResultItem } from '../../types/feedbackAnalytics';
import './feedback-analytics.css';

type PublishFilter = 'ALL' | 'HIDDEN' | 'READY_TO_PUBLISH' | 'PUBLISHED';
type ConfidenceFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
type AnalyticsSort = 'SCORE_ASC' | 'SCORE_DESC' | 'COMPLETION_ASC' | 'COMPLETION_DESC' | 'RESPONSES_DESC';
type AnalyticsColumn = 'employee' | 'score' | 'confidence' | 'completion' | 'responses' | 'breakdown' | 'publish' | 'summarized';

const ANALYTICS_COLUMNS: Array<{ key: AnalyticsColumn; label: string }> = [
    { key: 'employee', label: 'Employee' },
    { key: 'score', label: 'Score' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'completion', label: 'Completion' },
    { key: 'responses', label: 'Responses' },
    { key: 'breakdown', label: 'Breakdown' },
    { key: 'publish', label: 'Publish state' },
    { key: 'summarized', label: 'Summarized' },
];

const DEFAULT_ANALYTICS_COLUMNS: AnalyticsColumn[] = ['employee', 'score', 'confidence', 'completion', 'responses', 'breakdown', 'publish', 'summarized'];

const formatScore = (value?: number | null) => (value == null ? '—' : `${value.toFixed(1)}%`);

const formatDate = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
    }).format(new Date(value));

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
};

const visibilityLabel = (status?: string | null) => {
    if (status === 'PUBLISHED') return 'Published';
    if (status === 'READY_TO_PUBLISH') return 'Ready to publish';
    return 'Hidden';
};

const confidenceLabel = (item: FeedbackResultItem) => {
    if (item.insufficientFeedback) return 'Insufficient';
    return item.confidenceLevel || 'Not calculated';
};

const confidenceMatches = (item: FeedbackResultItem, filter: ConfidenceFilter) => {
    if (filter === 'ALL') return true;
    if (filter === 'INSUFFICIENT') return Boolean(item.insufficientFeedback);
    return String(item.confidenceLevel ?? '').toUpperCase() === filter;
};

const employeeSearchText = (item: FeedbackResultItem) => [
    item.targetEmployeeName,
    item.targetEmployeeId,
    item.scoreCategory,
    item.confidenceLevel,
    item.visibilityStatus,
    item.scoreCalculationNote,
].filter(Boolean).join(' ').toLowerCase();

const escapeCsv = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
};

const scoreBand = (score?: number | null) => {
    if (score == null) return 'No score';
    if (score >= 86) return '86-100';
    if (score >= 71) return '71-85';
    if (score >= 60) return '60-70';
    if (score >= 40) return '40-59';
    return '0-39';
};

const relationshipBreakdown = (item: FeedbackResultItem) => [
    { label: 'Manager', count: item.managerResponses, score: item.managerAverageScore },
    { label: 'Peer', count: item.peerResponses, score: item.peerAverageScore },
    { label: 'Subordinate', count: item.subordinateResponses, score: item.subordinateAverageScore },
    { label: 'Self', count: item.selfResponses ?? 0, score: item.selfAverageScore },
].filter(row => Number(row.count ?? 0) > 0);

const HrAnalyticsPage = () => {
    const campaignsQuery = useFeedbackAnalyticsCampaigns();
    const closedCampaigns = useMemo(
        () => (campaignsQuery.data ?? []).filter((campaign) => campaign.status === 'CLOSED' || campaign.status === 'PUBLISHED'),
        [campaignsQuery.data],
    );
    const [campaignId, setCampaignId] = useState<number | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState('');
    const [actionError, setActionError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [publishFilter, setPublishFilter] = useState<PublishFilter>('ALL');
    const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('ALL');
    const [sortBy, setSortBy] = useState<AnalyticsSort>('SCORE_DESC');
    const [visibleColumns, setVisibleColumns] = useState<AnalyticsColumn[]>(DEFAULT_ANALYTICS_COLUMNS);
    const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null);
    const [showEmployeePreview, setShowEmployeePreview] = useState(false);

    useEffect(() => {
        if (!closedCampaigns.length) {
            setCampaignId(null);
            return;
        }

        setCampaignId((current) => {
            if (current != null && closedCampaigns.some((campaign) => campaign.id === current)) {
                return current;
            }
            return closedCampaigns[0].id;
        });
    }, [closedCampaigns]);

    useEffect(() => {
        setSearchTerm('');
        setPublishFilter('ALL');
        setConfidenceFilter('ALL');
        setExpandedEmployeeId(null);
        setShowEmployeePreview(false);
        setActionMessage('');
        setActionError('');
    }, [campaignId]);

    const summaryQuery = useFeedbackCampaignSummary(campaignId);
    const summary = summaryQuery.data;

    const visibleColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

    const filteredItems = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return (summary?.items ?? [])
            .filter(item => {
                if (normalizedSearch && !employeeSearchText(item).includes(normalizedSearch)) return false;
                if (publishFilter !== 'ALL' && item.visibilityStatus !== publishFilter) return false;
                if (!confidenceMatches(item, confidenceFilter)) return false;
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'SCORE_ASC') return Number(a.averageScore ?? 999) - Number(b.averageScore ?? 999);
                if (sortBy === 'SCORE_DESC') return Number(b.averageScore ?? -1) - Number(a.averageScore ?? -1);
                if (sortBy === 'COMPLETION_ASC') return Number(a.completionRate ?? 999) - Number(b.completionRate ?? 999);
                if (sortBy === 'COMPLETION_DESC') return Number(b.completionRate ?? -1) - Number(a.completionRate ?? -1);
                return Number(b.totalResponses ?? 0) - Number(a.totalResponses ?? 0);
            });
    }, [confidenceFilter, publishFilter, searchTerm, sortBy, summary?.items]);

    const analyticsInsights = useMemo(() => {
        const items = summary?.items ?? [];
        const insufficient = items.filter(item => item.insufficientFeedback).length;
        const published = items.filter(item => item.visibilityStatus === 'PUBLISHED').length;
        const ready = items.filter(item => item.visibilityStatus === 'READY_TO_PUBLISH').length;
        const bands = items.reduce<Record<string, number>>((acc, item) => {
            const band = scoreBand(item.averageScore);
            acc[band] = (acc[band] ?? 0) + 1;
            return acc;
        }, {});
        const topBand = Object.entries(bands).sort((a, b) => b[1] - a[1])[0];

        return {
            insufficient,
            published,
            ready,
            topBandLabel: topBand ? `${topBand[0]} (${topBand[1]})` : 'No score data',
        };
    }, [summary?.items]);

    const toggleColumn = (key: AnalyticsColumn) => {
        setVisibleColumns(current => {
            if (current.includes(key)) {
                return current.length === 1 ? current : current.filter(item => item !== key);
            }
            return ANALYTICS_COLUMNS.filter(option => current.includes(option.key) || option.key === key).map(option => option.key);
        });
    };

    const runPublishAction = async (action: 'publish' | 'unpublish') => {
        if (campaignId == null) return;
        setActionLoading(true);
        setActionMessage('');
        setActionError('');
        try {
            if (action === 'publish') {
                await feedbackAnalyticsApi.publishCampaignSummary(campaignId);
                setActionMessage('Summary published. Target employees can now view their feedback results.');
            } else {
                await feedbackAnalyticsApi.unpublishCampaignSummary(campaignId);
                setActionMessage('Summary unpublished. Target employees can no longer view these results.');
            }
            await summaryQuery.refetch();
        } catch (error) {
            setActionError(error instanceof Error ? error.message : `Failed to ${action} summary.`);
        } finally {
            setActionLoading(false);
        }
    };

    const exportFilteredCsv = () => {
        if (!filteredItems.length) return;
        const header = ['Employee', 'Employee ID', 'Average Score', 'Category', 'Confidence', 'Completion Rate', 'Assigned', 'Submitted', 'Pending', 'Manager', 'Peer', 'Subordinate', 'Self', 'Publish Status', 'Calculation Note'];
        const body = filteredItems.map(item => [
            item.targetEmployeeName,
            item.targetEmployeeId,
            item.averageScore ?? '',
            item.scoreCategory ?? '',
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
        link.download = `feedback-campaign-${campaignId}-analytics.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const renderBreakdown = (item: FeedbackResultItem) => {
        const rows = relationshipBreakdown(item);
        if (!rows.length) return <span className="feedback-results-muted">No relationship data</span>;
        return (
            <div className="feedback-results-chip-row">
                {rows.map(row => (
                    <span key={row.label}>{row.label}: {row.count} · {formatScore(row.score)}</span>
                ))}
            </div>
        );
    };

    const renderExpandedDetails = (item: FeedbackResultItem) => (
        <div className="feedback-results-detail-panel">
            <div>
                <h4>{item.targetEmployeeName}</h4>
                <p>{item.scoreCalculationNote || 'No calculation note was provided.'}</p>
                <div className="feedback-results-detail-grid">
                    <span><strong>{formatScore(item.rawAverageScore)}</strong> Raw average</span>
                    <span><strong>{item.assignedEvaluatorCount ?? 0}</strong> Assigned evaluators</span>
                    <span><strong>{item.submittedEvaluatorCount ?? item.totalResponses}</strong> Submitted evaluators</span>
                    <span><strong>{item.pendingEvaluatorCount ?? 0}</strong> Pending evaluators</span>
                    <span><strong>{formatScore(item.completionRate)}</strong> Completion rate</span>
                    <span><strong>{confidenceLabel(item)}</strong> Confidence</span>
                </div>
            </div>
            <div className="feedback-results-detail-side">
                <strong>Relationship breakdown</strong>
                {renderBreakdown(item)}
                <small>Use this panel to explain why a score is high, low, or low-confidence before publishing results.</small>
            </div>
        </div>
    );

    return (
        <div className="feedback-results-stack">
            <section className="feedback-results-hero feedback-results-hero-rich">
                <div>
                    <h1>HR feedback analytics</h1>
                    <p>Review closed-campaign analytics, confidence, evaluator mix, publish readiness, and employee-facing visibility from one place.</p>
                </div>
                <div className="feedback-results-hero-guide">
                    <span><strong>1</strong> Filter and inspect summaries</span>
                    <span><strong>2</strong> Preview employee visibility</span>
                    <span><strong>3</strong> Publish when ready</span>
                </div>
            </section>

            <section className="feedback-results-card">
                <div className="feedback-results-card-header">
                    <div>
                        <p className="feedback-results-kicker">Campaign summary</p>
                        <h2>Select a closed campaign</h2>
                    </div>
                </div>

                {campaignsQuery.isLoading ? (
                    <div className="feedback-results-empty">Loading campaign references...</div>
                ) : campaignsQuery.error instanceof Error ? (
                    <div className="feedback-results-banner error">{campaignsQuery.error.message}</div>
                ) : closedCampaigns.length === 0 ? (
                    <div className="feedback-results-empty">No closed feedback campaigns are available yet.</div>
                ) : (
                    <label className="feedback-results-field">
                        <span>Campaign</span>
                        <select
                            value={campaignId ?? ''}
                            onChange={(event) => setCampaignId(event.target.value ? Number(event.target.value) : null)}
                        >
                            {closedCampaigns.map((campaign) => (
                                <option key={campaign.id} value={campaign.id}>
                                    {campaign.name} ({formatDate(campaign.startDate)} - {formatDate(campaign.endDate)})
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </section>

            {campaignId != null ? (
                summaryQuery.isLoading ? (
                    <div className="feedback-results-empty">Loading campaign analytics...</div>
                ) : summaryQuery.error instanceof Error ? (
                    <div className="feedback-results-banner error">{summaryQuery.error.message}</div>
                ) : summary ? (
                    <section className="feedback-results-card">
                        <div className="feedback-results-summary-grid feedback-results-summary-grid-rich">
                            <div className="feedback-results-metric">
                                <span>Campaign</span>
                                <strong>{summary.campaignName}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Overall average</span>
                                <strong>{formatScore(summary.overallAverageScore)}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Score category</span>
                                <strong>{summary.overallScoreCategory ?? '—'}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Total employees</span>
                                <strong>{summary.totalEmployees}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Total responses</span>
                                <strong>{summary.totalResponses}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Top score band</span>
                                <strong>{analyticsInsights.topBandLabel}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Low-confidence</span>
                                <strong>{analyticsInsights.insufficient}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Ready / Published</span>
                                <strong>{analyticsInsights.ready} / {analyticsInsights.published}</strong>
                            </div>
                        </div>

                        <div className="feedback-results-publish-panel feedback-results-publish-panel-rich">
                            <div>
                                <span className={`feedback-results-publish-status ${String(summary.visibilityStatus ?? 'HIDDEN').toLowerCase().replace(/_/g, '-')}`}>
                                    {visibilityLabel(summary.visibilityStatus)}
                                </span>
                                <h3>Employee result visibility</h3>
                                <p>Employees can see their 360 feedback only after this closed campaign summary is published. Use preview before publishing to avoid accidental early disclosure.</p>
                                {showEmployeePreview ? (
                                    <div className="feedback-results-employee-preview">
                                        <strong>Employee-facing preview</strong>
                                        <p>Each employee sees only their published results. Anonymous peer/subordinate identities remain hidden, and HR-only completion/confidence notes stay internal.</p>
                                        <span>{summary.totalEmployees} employee(s)</span>
                                        <span>{summary.totalResponses} response(s)</span>
                                        <span>{formatScore(summary.overallAverageScore)} overall</span>
                                    </div>
                                ) : null}
                                {actionMessage ? <small className="success">{actionMessage}</small> : null}
                                {actionError ? <small className="error">{actionError}</small> : null}
                            </div>
                            <div className="feedback-results-publish-actions">
                                <button type="button" disabled={actionLoading} onClick={() => setShowEmployeePreview(current => !current)}>
                                    {showEmployeePreview ? 'Hide Preview' : 'Preview Employee View'}
                                </button>
                                <button
                                    type="button"
                                    disabled={actionLoading || summary.visibilityStatus === 'PUBLISHED' || summary.totalResponses === 0}
                                    onClick={() => runPublishAction('publish')}
                                >
                                    Publish Summary
                                </button>
                                {summary.visibilityStatus === 'PUBLISHED' ? (
                                    <button
                                        type="button"
                                        disabled={actionLoading}
                                        onClick={() => runPublishAction('unpublish')}
                                    >
                                        Unpublish
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <div className="feedback-results-control-panel">
                            <input
                                type="search"
                                placeholder="Search employee, score category, confidence…"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                            <select value={publishFilter} onChange={(event) => setPublishFilter(event.target.value as PublishFilter)}>
                                <option value="ALL">All publish states</option>
                                <option value="HIDDEN">Hidden</option>
                                <option value="READY_TO_PUBLISH">Ready to publish</option>
                                <option value="PUBLISHED">Published</option>
                            </select>
                            <select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value as ConfidenceFilter)}>
                                <option value="ALL">All confidence levels</option>
                                <option value="HIGH">High confidence</option>
                                <option value="MEDIUM">Medium confidence</option>
                                <option value="LOW">Low confidence</option>
                                <option value="INSUFFICIENT">Insufficient feedback</option>
                            </select>
                            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as AnalyticsSort)}>
                                <option value="SCORE_DESC">Highest score first</option>
                                <option value="SCORE_ASC">Lowest score first</option>
                                <option value="COMPLETION_DESC">Highest completion first</option>
                                <option value="COMPLETION_ASC">Lowest completion first</option>
                                <option value="RESPONSES_DESC">Most responses first</option>
                            </select>
                            <button type="button" disabled={!filteredItems.length} onClick={exportFilteredCsv}>Export CSV</button>
                        </div>

                        <div className="feedback-results-column-panel" aria-label="Choose visible analytics columns">
                            {ANALYTICS_COLUMNS.map(option => (
                                <label key={option.key}>
                                    <input
                                        type="checkbox"
                                        checked={visibleColumnSet.has(option.key)}
                                        onChange={() => toggleColumn(option.key)}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>

                        <div className="feedback-results-table-caption">
                            Showing {filteredItems.length} of {summary.items.length} employee summary item(s).
                        </div>

                        <div className="feedback-results-table-wrap" style={{ marginTop: 12 }}>
                            <table className="feedback-results-table">
                                <thead>
                                <tr>
                                    {visibleColumnSet.has('employee') && <th>Employee</th>}
                                    {visibleColumnSet.has('score') && <th>Average score</th>}
                                    {visibleColumnSet.has('confidence') && <th>Confidence</th>}
                                    {visibleColumnSet.has('completion') && <th>Completion</th>}
                                    {visibleColumnSet.has('responses') && <th>Responses</th>}
                                    {visibleColumnSet.has('breakdown') && <th>Relationship breakdown</th>}
                                    {visibleColumnSet.has('publish') && <th>Publish state</th>}
                                    {visibleColumnSet.has('summarized') && <th>Summarized</th>}
                                </tr>
                                </thead>
                                <tbody>
                                {filteredItems.map((item) => (
                                    <Fragment key={`${item.campaignId}-${item.targetEmployeeId}`}>
                                        <tr>
                                            {visibleColumnSet.has('employee') && (
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="feedback-results-table-title feedback-results-row-button"
                                                        onClick={() => setExpandedEmployeeId(current => current === item.targetEmployeeId ? null : item.targetEmployeeId)}
                                                    >
                                                        <strong>{item.targetEmployeeName}</strong>
                                                        <span>Employee #{item.targetEmployeeId}</span>
                                                    </button>
                                                </td>
                                            )}
                                            {visibleColumnSet.has('score') && <td>{formatScore(item.averageScore)}<br /><span className="feedback-results-muted">{item.scoreCategory ?? '—'}</span></td>}
                                            {visibleColumnSet.has('confidence') && <td><span className={`feedback-results-confidence ${confidenceLabel(item).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{confidenceLabel(item)}</span></td>}
                                            {visibleColumnSet.has('completion') && <td>{formatScore(item.completionRate)}</td>}
                                            {visibleColumnSet.has('responses') && <td>{item.submittedEvaluatorCount ?? item.totalResponses}/{item.assignedEvaluatorCount ?? '—'} submitted</td>}
                                            {visibleColumnSet.has('breakdown') && <td>{renderBreakdown(item)}</td>}
                                            {visibleColumnSet.has('publish') && <td>{visibilityLabel(item.visibilityStatus)}</td>}
                                            {visibleColumnSet.has('summarized') && (
                                                <td>
                                                    <div className="feedback-results-table-title">
                                                        <strong>{formatDateTime(item.summarizedAt)}</strong>
                                                        <span>{item.scoreCalculationMethod ?? 'Calculation'}</span>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                        {expandedEmployeeId === item.targetEmployeeId ? (
                                            <tr className="feedback-results-detail-row">
                                                <td colSpan={visibleColumns.length}>{renderExpandedDetails(item)}</td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ) : null
            ) : null}
        </div>
    );
};

export default HrAnalyticsPage;

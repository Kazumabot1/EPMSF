import { useMemo, useState } from 'react';
import type { FeedbackResultItem } from '../../types/feedbackAnalytics';
import { useFeedbackTeamSummary } from '../../hooks/useFeedbackAnalytics';
import './feedback-analytics.css';

const MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES = 2;
type TeamSummaryFilter = 'ALL' | 'LOW_CONFIDENCE' | 'MASKED' | 'STRONG' | 'NEEDS_ATTENTION';

const formatScore = (value?: number | null) => (value == null ? '—' : `${Number(value).toFixed(1)}%`);
const countOf = (value?: number | null) => Number(value ?? 0);

const scoreBand = (score?: number | null) => {
    if (score == null) return 'Not scored';
    if (score >= 86) return 'Outstanding';
    if (score >= 71) return 'Strong';
    if (score >= 60) return 'Meets expectation';
    if (score >= 40) return 'Needs improvement';
    return 'Critical development area';
};

const confidenceText = (item: FeedbackResultItem) => {
    if (item.insufficientFeedback) return 'Insufficient feedback';
    return item.confidenceLevel || 'Confidence not calculated';
};

const isMasked = (item: FeedbackResultItem) =>
    (countOf(item.peerResponses) > 0 && countOf(item.peerResponses) < MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES)
    || (countOf(item.subordinateResponses) > 0 && countOf(item.subordinateResponses) < MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES);

const filterMatches = (item: FeedbackResultItem, filter: TeamSummaryFilter) => {
    if (filter === 'LOW_CONFIDENCE') return Boolean(item.insufficientFeedback) || String(item.confidenceLevel ?? '').toUpperCase() === 'LOW';
    if (filter === 'MASKED') return isMasked(item);
    if (filter === 'STRONG') return Number(item.averageScore ?? 0) >= 71;
    if (filter === 'NEEDS_ATTENTION') return item.averageScore != null && item.averageScore < 60;
    return true;
};

const relationshipRows = (item: FeedbackResultItem) => [
    { key: 'MANAGER', label: 'Manager', count: countOf(item.managerResponses), score: item.managerAverageScore, threshold: 1 },
    { key: 'PEER', label: 'Peers', count: countOf(item.peerResponses), score: item.peerAverageScore, threshold: MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES },
    { key: 'SUBORDINATE', label: 'Direct reports', count: countOf(item.subordinateResponses), score: item.subordinateAverageScore, threshold: MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES },
    { key: 'SELF', label: 'Self review', count: countOf(item.selfResponses), score: item.selfAverageScore, threshold: 1 },
];

const ManagerRelationshipBreakdown = ({ item }: { item: FeedbackResultItem }) => (
    <div className="feedback-result-manager-relationships">
        {relationshipRows(item).map((row) => {
            const hasResponses = row.count > 0;
            const thresholdMet = row.count >= row.threshold;
            const hiddenForPrivacy = hasResponses && !thresholdMet;
            const canShowScore = hasResponses && thresholdMet && row.score != null;
            return (
                <div className={`feedback-result-mini-relationship ${hiddenForPrivacy ? 'is-masked' : ''}`} key={row.key}>
                    <span>{row.label}</span>
                    <strong>{canShowScore ? formatScore(row.score) : '—'}</strong>
                    <small>{hiddenForPrivacy ? `Hidden · ${row.count}/${row.threshold}` : `${row.count} response${row.count === 1 ? '' : 's'}`}</small>
                </div>
            );
        })}
    </div>
);

const ManagerResultCard = ({ item, departmentView }: { item: FeedbackResultItem; departmentView: boolean }) => (
    <article className={`feedback-result-team-card ${item.insufficientFeedback ? 'is-insufficient' : ''}`}>
        <div className="feedback-result-team-card-header">
            <div>
                <p className="feedback-results-kicker">{departmentView ? 'Department employee' : 'Direct report'}</p>
                <h2>{item.targetEmployeeName}</h2>
                <span>{item.campaignName}</span>
            </div>
            <div className="feedback-result-score-pill">
                <strong>{formatScore(item.averageScore)}</strong>
                <span>{scoreBand(item.averageScore)}</span>
            </div>
        </div>

        <div className="feedback-result-team-flags">
            <span className={item.insufficientFeedback ? 'warning' : 'success'}>{confidenceText(item)}</span>
            <span>{item.totalResponses} total response{item.totalResponses === 1 ? '' : 's'}</span>
            {isMasked(item) && <span className="privacy">Privacy masking applied</span>}
        </div>

        <ManagerRelationshipBreakdown item={item} />

        <div className="feedback-result-manager-note">
            <strong>{departmentView ? 'Department Head guidance' : 'Manager guidance'}</strong>
            <p>
                {item.insufficientFeedback
                    ? 'Use this result carefully. The response count is low, so the score may not represent a full 360 view.'
                    : isMasked(item)
                        ? 'Some relationship-level detail is hidden to protect evaluator confidentiality.'
                        : item.scoreCalculationNote || 'Use the aggregated result as a coaching input, not as an evaluator identity record.'}
            </p>
        </div>
    </article>
);

const ManagerSummaryPage = () => {
    const summaryQuery = useFeedbackTeamSummary();
    const summary = summaryQuery.data;
    const [filter, setFilter] = useState<TeamSummaryFilter>('ALL');

    const items = summary?.items ?? [];
    const departmentView = String(summary?.viewScope ?? '').toUpperCase() === 'DEPARTMENT';
    const filteredItems = useMemo(() => items.filter((item) => filterMatches(item, filter)), [items, filter]);
    const representedEmployees = new Set(items.map((item) => item.targetEmployeeId)).size;
    const scoredItems = items.filter((item) => item.averageScore != null);
    const averageTeamScore = scoredItems.length
        ? scoredItems.reduce((total, item) => total + Number(item.averageScore ?? 0), 0) / scoredItems.length
        : null;
    const privacyMaskedCount = items.filter(isMasked).length;
    const lowConfidenceCount = items.filter((item) => Boolean(item.insufficientFeedback) || String(item.confidenceLevel ?? '').toUpperCase() === 'LOW').length;

    const title = departmentView ? 'Department published 360 summary' : 'Team published feedback summary';
    const description = departmentView
        ? 'Review published 360 results for employees in your department. Relationship details stay aggregated and privacy-safe.'
        : 'Review direct-report results from published closed campaigns. Relationship details stay aggregated and privacy-safe.';
    const emptyTitle = departmentView ? 'No published department results yet' : 'No published team results yet';
    const emptyDescription = departmentView
        ? 'Department 360 results will appear here only after HR closes and publishes a campaign.'
        : 'Direct-report 360 results will appear here only after HR closes and publishes a campaign.';

    return (
        <div className="feedback-results-stack">
            <section className="feedback-results-hero feedback-results-hero-soft">
                <div>
                    <p className="feedback-results-kicker">{departmentView ? 'Department Head 360 Feedback' : '360 Feedback'}</p>
                    <h1>{title}</h1>
                    <p>{description}</p>
                    {departmentView && summary?.departmentName && <p className="feedback-result-muted-on-dark">Department: {summary.departmentName}</p>}
                </div>
                <div className="feedback-result-hero-metrics">
                    <span><strong>{representedEmployees}</strong> employee{representedEmployees === 1 ? '' : 's'}</span>
                    <span><strong>{items.length}</strong> result row{items.length === 1 ? '' : 's'}</span>
                    <span><strong>{privacyMaskedCount}</strong> privacy note{privacyMaskedCount === 1 ? '' : 's'}</span>
                </div>
            </section>

            {summaryQuery.isLoading ? (
                <div className="feedback-results-empty">Loading {departmentView ? 'department' : 'team'} summary...</div>
            ) : summaryQuery.error instanceof Error ? (
                <div className="feedback-results-banner error">{summaryQuery.error.message}</div>
            ) : !summary || items.length === 0 ? (
                <div className="feedback-results-empty feedback-result-empty-state">
                    <strong>{emptyTitle}</strong>
                    <p>{emptyDescription}</p>
                </div>
            ) : (
                <>
                    <section className="feedback-results-card">
                        <div className="feedback-results-card-header">
                            <div>
                                <p className="feedback-results-kicker">{departmentView ? 'Department overview' : 'Team overview'}</p>
                                <h2>Published results summary</h2>
                                <p className="feedback-result-muted">
                                    {departmentView
                                        ? 'Use this view for department-level coaching, evaluator coverage review, and development planning.'
                                        : 'Use this view for coaching conversations and development planning.'}
                                </p>
                            </div>
                            <label className="feedback-result-filter-field">
                                <span>View</span>
                                <select value={filter} onChange={(event) => setFilter(event.target.value as TeamSummaryFilter)}>
                                    <option value="ALL">All published results</option>
                                    <option value="LOW_CONFIDENCE">Low confidence / insufficient</option>
                                    <option value="MASKED">Privacy masking applied</option>
                                    <option value="STRONG">Strong results</option>
                                    <option value="NEEDS_ATTENTION">Needs attention</option>
                                </select>
                            </label>
                        </div>

                        <div className="feedback-results-summary-grid">
                            <div className="feedback-results-metric">
                                <span>{departmentView ? 'Department employees' : 'Direct reports'}</span>
                                <strong>{departmentView ? summary.totalDepartmentEmployees ?? 0 : summary.totalDirectReports}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>{departmentView ? 'Average department score' : 'Average team score'}</span>
                                <strong>{formatScore(Number.isFinite(averageTeamScore) ? averageTeamScore : null)}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Low confidence</span>
                                <strong>{lowConfidenceCount}</strong>
                            </div>
                        </div>
                    </section>

                    {departmentView && (
                        <section className="feedback-results-card feedback-result-policy-card">
                            <p className="feedback-results-kicker">Department Head access rule</p>
                            <h2>Department Head is not a separate evaluator relationship</h2>
                            <p>
                                Relationship types remain simple: Self, Manager, Peer, and Direct Report. A Department Head is treated as Manager only when the employee directly reports to them. Department Heads can review department summaries, but peer and direct-report anonymity rules still apply.
                            </p>
                        </section>
                    )}

                    <section className="feedback-result-team-grid">
                        {filteredItems.length === 0 ? (
                            <div className="feedback-results-empty feedback-result-empty-state">
                                <strong>No results match this view</strong>
                                <p>Try a different filter to review the available published summaries.</p>
                            </div>
                        ) : filteredItems.map((item) => (
                            <ManagerResultCard
                                item={item}
                                departmentView={departmentView}
                                key={`${item.campaignId}-${item.targetEmployeeId}-${item.summarizedAt}`}
                            />
                        ))}
                    </section>

                    <section className="feedback-results-card">
                        <div className="feedback-results-card-header">
                            <div>
                                <p className="feedback-results-kicker">Result table</p>
                                <h2>{departmentView ? 'Department published summaries' : 'Direct-report published summaries'}</h2>
                            </div>
                        </div>
                        <div className="feedback-results-table-wrap">
                            <table className="feedback-results-table">
                                <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Campaign</th>
                                    <th>Average score</th>
                                    <th>Total responses</th>
                                    <th>Confidence</th>
                                    <th>Privacy</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={`table-${item.campaignId}-${item.targetEmployeeId}-${item.summarizedAt}`}>
                                        <td>
                                            <div className="feedback-results-table-title">
                                                <strong>{item.targetEmployeeName}</strong>
                                                <span>Employee #{item.targetEmployeeId}</span>
                                            </div>
                                        </td>
                                        <td>{item.campaignName}</td>
                                        <td>{formatScore(item.averageScore)}</td>
                                        <td>{item.totalResponses}</td>
                                        <td>{confidenceText(item)}</td>
                                        <td>{isMasked(item) ? 'Masked relationship detail' : 'Threshold met'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default ManagerSummaryPage;

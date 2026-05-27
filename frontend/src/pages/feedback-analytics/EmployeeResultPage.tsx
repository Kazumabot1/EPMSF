import type { FeedbackResultItem } from '../../types/feedbackAnalytics';
import { useMyFeedbackResult } from '../../hooks/useFeedbackAnalytics';
import './feedback-analytics.css';

const MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES = 2;

const formatScore = (value?: number | null) => (value == null ? '—' : `${Number(value).toFixed(1)}%`);

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
};

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

const visibilityText = (status?: string | null) => {
    if (status === 'PUBLISHED') return 'Published';
    if (status === 'READY_TO_PUBLISH') return 'Ready to publish';
    return 'Hidden';
};

const relationshipRows = (item: FeedbackResultItem) => [
    {
        key: 'MANAGER',
        label: 'Manager',
        count: countOf(item.managerResponses),
        score: item.managerAverageScore,
        threshold: 1,
        helper: 'Manager feedback is shown when a manager response exists.',
    },
    {
        key: 'PEER',
        label: 'Peers',
        count: countOf(item.peerResponses),
        score: item.peerAverageScore,
        threshold: MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES,
        helper: `Peer feedback is shown only when at least ${MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES} peer responses are submitted.`,
    },
    {
        key: 'SUBORDINATE',
        label: 'Direct reports',
        count: countOf(item.subordinateResponses),
        score: item.subordinateAverageScore,
        threshold: MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES,
        helper: `Direct-report feedback is shown only when at least ${MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES} direct-report responses are submitted.`,
    },
    {
        key: 'SELF',
        label: 'Self review',
        count: countOf(item.selfResponses),
        score: item.selfAverageScore,
        threshold: 1,
        helper: 'Self review is included only when it was configured and submitted.',
    },
];

type RelationshipBreakdownProps = {
    item: FeedbackResultItem;
};

const RelationshipBreakdown = ({ item }: RelationshipBreakdownProps) => (
    <div className="feedback-result-relationship-grid">
        {relationshipRows(item).map((row) => {
            const hasResponses = row.count > 0;
            const thresholdMet = row.count >= row.threshold;
            const hiddenForPrivacy = hasResponses && !thresholdMet;
            const canShowScore = hasResponses && thresholdMet && row.score != null;
            return (
                <article className={`feedback-result-relationship-card ${hiddenForPrivacy ? 'is-masked' : ''}`} key={row.key}>
                    <div className="feedback-result-relationship-topline">
                        <span>{row.label}</span>
                        <strong>{canShowScore ? formatScore(row.score) : '—'}</strong>
                    </div>
                    <p>{row.count} response{row.count === 1 ? '' : 's'}</p>
                    <small>
                        {hiddenForPrivacy
                            ? `Hidden for confidentiality. Minimum required: ${row.threshold}.`
                            : hasResponses
                                ? row.helper
                                : 'No submitted response for this relationship.'}
                    </small>
                </article>
            );
        })}
    </div>
);

type ResultInsightCardProps = {
    item: FeedbackResultItem;
};

const ResultInsightCard = ({ item }: ResultInsightCardProps) => {
    const peerMasked = countOf(item.peerResponses) > 0 && countOf(item.peerResponses) < MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES;
    const subordinateMasked = countOf(item.subordinateResponses) > 0 && countOf(item.subordinateResponses) < MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES;
    const publishedAt = item.publishedAt ?? item.summarizedAt;

    return (
        <article className="feedback-result-detail-card">
            <div className="feedback-result-detail-header">
                <div>
                    <p className="feedback-results-kicker">Published campaign result</p>
                    <h2>{item.campaignName}</h2>
                    <span>Campaign #{item.campaignId}</span>
                </div>
                <div className="feedback-result-score-pill">
                    <strong>{formatScore(item.averageScore)}</strong>
                    <span>{scoreBand(item.averageScore)}</span>
                </div>
            </div>

            <div className="feedback-result-summary-strip">
                <div>
                    <span>Total responses</span>
                    <strong>{item.totalResponses}</strong>
                </div>
                <div>
                    <span>Completion</span>
                    <strong>{formatScore(item.completionRate)}</strong>
                </div>
                <div>
                    <span>Confidence</span>
                    <strong>{confidenceText(item)}</strong>
                </div>
                <div>
                    <span>Published</span>
                    <strong>{formatDateTime(publishedAt)}</strong>
                </div>
            </div>

            <RelationshipBreakdown item={item} />

            <div className="feedback-result-notes-grid">
                <div className="feedback-result-note-card">
                    <span>How to read this result</span>
                    <p>
                        {item.includeScoreExplanation === false
                            ? 'The detailed score explanation was not included when HR published this result.'
                            : item.scoreCalculationNote || 'Your overall score combines submitted evaluator ratings using the campaign scoring configuration.'}
                    </p>
                </div>
                <div className="feedback-result-note-card">
                    <span>Confidentiality</span>
                    <p>
                        {peerMasked || subordinateMasked
                            ? 'Some relationship-level scores are hidden because the minimum confidentiality threshold was not met.'
                            : 'Evaluator identities are not shown. Relationship-level results are displayed only when confidentiality rules are satisfied.'}
                    </p>
                </div>
                {item.publishNote && (
                    <div className="feedback-result-note-card">
                        <span>HR note</span>
                        <p>{item.publishNote}</p>
                    </div>
                )}
            </div>
        </article>
    );
};

const EmployeeResultPage = () => {
    const resultQuery = useMyFeedbackResult();
    const result = resultQuery.data;
    const results = result?.results ?? [];
    const latestResult = results[0];
    const totalResponses = results.reduce((total, item) => total + countOf(item.totalResponses), 0);
    const maskedCount = results.filter((item) =>
        (countOf(item.peerResponses) > 0 && countOf(item.peerResponses) < MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES)
        || (countOf(item.subordinateResponses) > 0 && countOf(item.subordinateResponses) < MIN_CONFIDENTIAL_RELATIONSHIP_RESPONSES),
    ).length;

    return (
        <div className="feedback-results-stack">
            <section className="feedback-results-hero feedback-results-hero-soft">
                <div>
                    <p className="feedback-results-kicker">360 Feedback</p>
                    <h1>My published feedback results</h1>
                    <p>Review closed-campaign results that HR has published for you. Scores are aggregated and evaluator identities are never shown.</p>
                </div>
                <div className="feedback-result-hero-metrics">
                    <span><strong>{results.length}</strong> published result{results.length === 1 ? '' : 's'}</span>
                    <span><strong>{totalResponses}</strong> submitted response{totalResponses === 1 ? '' : 's'}</span>
                    <span><strong>{maskedCount}</strong> privacy-masked result{maskedCount === 1 ? '' : 's'}</span>
                </div>
            </section>

            {resultQuery.isLoading ? (
                <div className="feedback-results-empty">Loading your feedback results...</div>
            ) : resultQuery.error instanceof Error ? (
                <div className="feedback-results-banner error">{resultQuery.error.message}</div>
            ) : !result || results.length === 0 ? (
                <div className="feedback-results-empty feedback-result-empty-state">
                    <strong>No published 360 result yet</strong>
                    <p>Your 360 feedback result will appear here after the campaign is closed, reviewed, and published by HR.</p>
                </div>
            ) : (
                <>
                    <section className="feedback-results-card feedback-result-overview-card">
                        <div className="feedback-results-card-header">
                            <div>
                                <p className="feedback-results-kicker">Employee result overview</p>
                                <h2>{result.employeeName}</h2>
                                <p className="feedback-result-muted">Latest result: {latestResult ? latestResult.campaignName : '—'}</p>
                            </div>
                            {latestResult && (
                                <div className="feedback-result-score-pill large">
                                    <strong>{formatScore(latestResult.averageScore)}</strong>
                                    <span>{scoreBand(latestResult.averageScore)}</span>
                                </div>
                            )}
                        </div>

                        <div className="feedback-results-summary-grid">
                            <div className="feedback-results-metric">
                                <span>Published campaigns</span>
                                <strong>{results.length}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Total responses</span>
                                <strong>{totalResponses}</strong>
                            </div>
                            <div className="feedback-results-metric">
                                <span>Confidentiality notes</span>
                                <strong>{maskedCount}</strong>
                            </div>
                        </div>
                    </section>

                    {results.map((item) => (
                        <ResultInsightCard item={item} key={`${item.campaignId}-${item.targetEmployeeId}-${item.summarizedAt}`} />
                    ))}

                    <section className="feedback-results-card">
                        <div className="feedback-results-card-header">
                            <div>
                                <p className="feedback-results-kicker">Result history</p>
                                <h2>Published campaigns</h2>
                            </div>
                        </div>
                        <div className="feedback-results-table-wrap">
                            <table className="feedback-results-table">
                                <thead>
                                <tr>
                                    <th>Campaign</th>
                                    <th>Average score</th>
                                    <th>Total responses</th>
                                    <th>Confidence</th>
                                    <th>Visibility</th>
                                    <th>Published</th>
                                </tr>
                                </thead>
                                <tbody>
                                {results.map((item) => (
                                    <tr key={`history-${item.campaignId}-${item.targetEmployeeId}-${item.summarizedAt}`}>
                                        <td>
                                            <div className="feedback-results-table-title">
                                                <strong>{item.campaignName}</strong>
                                                <span>Campaign #{item.campaignId}</span>
                                            </div>
                                        </td>
                                        <td>{formatScore(item.averageScore)}</td>
                                        <td>{item.totalResponses}</td>
                                        <td>{confidenceText(item)}</td>
                                        <td>{visibilityText(item.visibilityStatus)}</td>
                                        <td>{formatDateTime(item.publishedAt ?? item.summarizedAt)}</td>
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

export default EmployeeResultPage;

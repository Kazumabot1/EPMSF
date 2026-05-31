import { useMemo, useState } from 'react';
import type {
    FeedbackCompetencyResult,
    FeedbackMyResult,
    FeedbackPublishedComment,
    FeedbackRelationshipPrivacy,
    FeedbackResultItem,
} from '../../types/feedbackAnalytics';
import { useMyFeedbackResult } from '../../hooks/useFeedbackAnalytics';
import './feedback-analytics.css';

type ReviewerGroupKey = 'SELF' | 'MANAGER' | 'PEER' | 'SUBORDINATE';

type ReviewerGroupRow = {
    key: ReviewerGroupKey;
    label: string;
    score: number | null;
    count: number;
    visible: boolean;
    hiddenReason?: string | null;
};

const REVIEWER_GROUPS: Array<{
    key: ReviewerGroupKey;
    label: string;
    scoreKey: keyof Pick<FeedbackResultItem, 'selfAverageScore' | 'managerAverageScore' | 'peerAverageScore' | 'subordinateAverageScore'>;
    countKey: keyof Pick<FeedbackResultItem, 'selfResponses' | 'managerResponses' | 'peerResponses' | 'subordinateResponses'>;
}> = [
    { key: 'SELF', label: 'Self review', scoreKey: 'selfAverageScore', countKey: 'selfResponses' },
    { key: 'MANAGER', label: 'Manager reviewer', scoreKey: 'managerAverageScore', countKey: 'managerResponses' },
    { key: 'PEER', label: 'Peer reviewers', scoreKey: 'peerAverageScore', countKey: 'peerResponses' },
    { key: 'SUBORDINATE', label: 'Subordinate reviewers', scoreKey: 'subordinateAverageScore', countKey: 'subordinateResponses' },
];

const toNumber = (value?: number | null) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const countOf = (value?: number | null) => Math.max(0, Number(value ?? 0));

const formatScore = (value?: number | null, fallback = '—') => {
    const numeric = toNumber(value);
    return numeric == null ? fallback : `${numeric.toFixed(1)}%`;
};

const formatNormalizedAverage = (value?: number | null) => {
    const numeric = toNumber(value);
    return numeric == null ? '—' : `${numeric.toFixed(1)}%`;
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(parsed);
};

const scoreBand = (score?: number | null, explicit?: string | null) => {
    const label = explicit?.trim();
    if (label) return label;
    const numeric = toNumber(score);
    if (numeric == null) return 'Score hidden';
    if (numeric >= 86) return 'Outstanding';
    if (numeric >= 71) return 'Good';
    if (numeric >= 60) return 'Meets requirement';
    if (numeric >= 40) return 'Needs improvement';
    return 'Unsatisfactory';
};

const confidenceText = (item: FeedbackResultItem) => {
    if (item.insufficientFeedback) return 'Insufficient feedback';
    const value = item.confidenceLevel?.trim();
    return value ? value.charAt(0) + value.slice(1).toLowerCase() : 'Confidence not calculated';
};

const visibilityText = (status?: string | null) => {
    if (status === 'PUBLISHED') return 'Published';
    if (status === 'READY_TO_PUBLISH') return 'Ready to publish';
    return 'Hidden';
};

const sectionAllowed = (value?: boolean | null, fallback = true) => value == null ? fallback : value === true;

const privacyFor = (privacy: FeedbackRelationshipPrivacy[] | undefined, type: ReviewerGroupKey) =>
    privacy?.find((item) => String(item.relationshipType).toUpperCase() === type);

const reviewerGroupRows = (item: FeedbackResultItem): ReviewerGroupRow[] => REVIEWER_GROUPS.map((group) => {
    const privacy = privacyFor(item.relationshipPrivacy, group.key);
    const score = toNumber(item[group.scoreKey] as number | null | undefined);
    const count = countOf(item[group.countKey] as number | null | undefined);
    const visible = privacy?.visibleOutsideHr ?? score != null;
    return {
        key: group.key,
        label: privacy?.label || group.label,
        score,
        count,
        visible,
        hiddenReason: privacy?.hiddenReason ?? null,
    };
});

const hasPrivacyProtectedGroup = (item: FeedbackResultItem) =>
    (item.relationshipPrivacy ?? []).some((entry) => entry.visibleOutsideHr === false || entry.thresholdMet === false)
    || reviewerGroupRows(item).some((row) => row.count > 0 && !row.visible);

const groupedComments = (comments: FeedbackPublishedComment[]) => comments.reduce<Record<string, FeedbackPublishedComment[]>>((groups, comment) => {
    const key = comment.competencyName || comment.competencyCode || 'Other feedback';
    return { ...groups, [key]: [...(groups[key] ?? []), comment] };
}, {});

const sortedCompetencies = (items?: FeedbackCompetencyResult[]) => [...(items ?? [])]
    .filter((item) => item.averageScore != null || item.responseCount > 0)
    .sort((left, right) => Number(right.averageScore ?? -1) - Number(left.averageScore ?? -1));

const lowestCompetency = (items: FeedbackCompetencyResult[]) => [...items]
    .filter((item) => item.averageScore != null)
    .sort((left, right) => Number(left.averageScore ?? 0) - Number(right.averageScore ?? 0))[0];

const ResultPrivacyNote = ({ item }: { item: FeedbackResultItem }) => {
    const hidden = (item.relationshipPrivacy ?? []).filter((entry) => entry.visibleOutsideHr === false || entry.thresholdMet === false);
    return (
        <div className="feedback-result-note-card">
            <span>Privacy</span>
            <p>
                {hidden.length > 0
                    ? 'Some reviewer group details are hidden to protect reviewer privacy.'
                    : 'Evaluator names are never shown. Reviewer group details are displayed only when privacy rules are satisfied.'}
            </p>
        </div>
    );
};

const ReviewerGroupBreakdown = ({ item }: { item: FeedbackResultItem }) => {
    if (!sectionAllowed(item.includeSelfVsOthers, true)) {
        return <div className="feedback-results-empty compact">HR did not publish reviewer group comparison for this result.</div>;
    }

    return (
        <div className="feedback-result-relationship-grid">
            {reviewerGroupRows(item).map((row) => {
                const canShowScore = row.visible && row.score != null;
                return (
                    <article className={`feedback-result-relationship-card ${row.visible ? '' : 'is-masked'}`} key={row.key}>
                        <div className="feedback-result-relationship-topline">
                            <span>{row.label}</span>
                            <strong>{canShowScore ? formatScore(row.score) : 'Hidden'}</strong>
                        </div>
                        <p>{row.count} response{row.count === 1 ? '' : 's'}</p>
                        <small>{row.visible ? 'Included in the published reviewer group summary.' : row.hiddenReason || 'Hidden to protect reviewer privacy.'}</small>
                    </article>
                );
            })}
        </div>
    );
};

const CompetencyBreakdown = ({ item }: { item: FeedbackResultItem }) => {
    if (!sectionAllowed(item.includeCompetencyBreakdown, true)) {
        return <div className="feedback-results-empty compact">HR did not publish competency-level details for this result.</div>;
    }

    const competencies = sortedCompetencies(item.competencyBreakdown);
    if (competencies.length === 0) {
        return <div className="feedback-results-empty compact">No competency-level data is available for this result.</div>;
    }

    return (
        <div className="feedback-result-competency-list">
            {competencies.map((competency) => (
                <article className="feedback-result-competency-row" key={competency.competencyCode || competency.competencyName}>
                    <div>
                        <strong>{competency.competencyName || competency.competencyCode || 'Competency'}</strong>
                        <small>{competency.questionCount} question{competency.questionCount === 1 ? '' : 's'} · {competency.responseCount} rating{competency.responseCount === 1 ? '' : 's'}</small>
                    </div>
                    <span>{formatScore(competency.averageScore)}</span>
                    <div className="feedback-result-progress" aria-hidden="true">
                        <i style={{ width: `${Math.max(0, Math.min(100, Number(competency.averageScore ?? 0)))}%` }} />
                    </div>
                </article>
            ))}
        </div>
    );
};

const PublishedComments = ({ item }: { item: FeedbackResultItem }) => {
    if (!sectionAllowed(item.includeComments, false)) {
        return <div className="feedback-results-empty compact">HR did not publish written comments for this result.</div>;
    }

    const comments = item.comments ?? [];
    if (comments.length === 0) {
        return <div className="feedback-results-empty compact">No privacy-safe comments are visible for this result.</div>;
    }

    const groups = groupedComments(comments);
    return (
        <div className="feedback-result-comment-list">
            {Object.entries(groups).map(([competency, grouped]) => (
                <article key={competency}>
                    <h4>{competency}</h4>
                    {grouped.map((comment, index) => (
                        <blockquote key={`${competency}-${comment.relationshipType}-${index}`}>
                            <p>{comment.comment}</p>
                            <footer>{comment.label || comment.relationshipType || 'Anonymous reviewer'}{comment.questionText ? ` · ${comment.questionText}` : ''}</footer>
                        </blockquote>
                    ))}
                </article>
            ))}
        </div>
    );
};

const ResultInsightCard = ({ item }: { item: FeedbackResultItem }) => {
    const publishedAt = item.publishedAt ?? item.summarizedAt;
    const showOverall = sectionAllowed(item.includeOverallScore, true) && item.averageScore != null;
    const competencies = sortedCompetencies(item.competencyBreakdown);
    const focus = lowestCompetency(competencies);

    return (
        <article className="feedback-result-detail-card">
            <div className="feedback-result-detail-header">
                <div>
                    <p className="feedback-results-kicker">Published campaign result</p>
                    <h2>{item.campaignName}</h2>
                    <span>Campaign #{item.campaignId}</span>
                </div>
                <div className="feedback-result-score-pill">
                    <strong>{showOverall ? formatScore(item.averageScore) : 'Hidden'}</strong>
                    <span>{showOverall ? scoreBand(item.averageScore, item.scoreCategory) : 'Not published'}</span>
                </div>
            </div>

            <div className="feedback-result-summary-strip">
                <div>
                    <span>Submitted feedback</span>
                    <strong>{item.submittedEvaluatorCount ?? item.totalResponses}</strong>
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

            <div className="feedback-result-notes-grid">
                <div className="feedback-result-note-card">
                    <span>Report score scale</span>
                    <p>
                        {sectionAllowed(item.includeScoreExplanation, true)
                            ? item.scoreCalculationNote || 'Scores are reported on a 0–100% scale. Each 1–5 rating is converted using rating ÷ 5 × 100.'
                            : 'HR did not publish the calculation explanation for this result.'}
                    </p>
                    {sectionAllowed(item.includeScoreExplanation, true) && item.rawAverageScore != null ? <small>Unweighted normalized average: {formatNormalizedAverage(item.rawAverageScore)}</small> : null}
                </div>
                <ResultPrivacyNote item={item} />
                {focus && sectionAllowed(item.includeCompetencyBreakdown, true) ? (
                    <div className="feedback-result-note-card">
                        <span>Development focus</span>
                        <p>{focus.competencyName || focus.competencyCode} has the lowest published competency score for this campaign.</p>
                    </div>
                ) : null}
            </div>

            <section className="feedback-result-subsection">
                <div className="feedback-results-card-header compact">
                    <div>
                        <p className="feedback-results-kicker">Reviewer groups</p>
                        <h3>Published score comparison</h3>
                    </div>
                </div>
                <ReviewerGroupBreakdown item={item} />
            </section>

            <section className="feedback-result-subsection">
                <div className="feedback-results-card-header compact">
                    <div>
                        <p className="feedback-results-kicker">Competencies</p>
                        <h3>Published competency breakdown</h3>
                    </div>
                </div>
                <CompetencyBreakdown item={item} />
            </section>

            <section className="feedback-result-subsection">
                <div className="feedback-results-card-header compact">
                    <div>
                        <p className="feedback-results-kicker">Comments</p>
                        <h3>Published anonymous comments</h3>
                    </div>
                </div>
                <PublishedComments item={item} />
            </section>
        </article>
    );
};

const sortPublishedResults = (payload?: FeedbackMyResult | null) => [...(payload?.results ?? [])]
    .sort((left, right) => String(right.publishedAt || right.summarizedAt || '').localeCompare(String(left.publishedAt || left.summarizedAt || '')));

const EmployeeResultPage = () => {
    const resultQuery = useMyFeedbackResult();
    const result = resultQuery.data;
    const results = useMemo(() => sortPublishedResults(result), [result]);
    const latestResult = results[0];
    const totalResponses = results.reduce((total, item) => total + countOf(item.totalResponses), 0);
    const protectedCount = results.filter(hasPrivacyProtectedGroup).length;
    const visibleScores = results.filter((item) => sectionAllowed(item.includeOverallScore, true) && item.averageScore != null);
    const averageVisibleScore = visibleScores.length
        ? visibleScores.reduce((total, item) => total + Number(item.averageScore ?? 0), 0) / visibleScores.length
        : null;
    const [expandedCampaignId, setExpandedCampaignId] = useState<number | null>(null);
    const expandedResult = results.find((item) => item.campaignId === expandedCampaignId) ?? latestResult;

    return (
        <div className="feedback-results-stack">
            <section className="feedback-results-hero feedback-results-hero-soft">
                <div>
                    <p className="feedback-results-kicker">360 Feedback</p>
                    <h1>My published feedback results</h1>
                    <p>Review closed-campaign results that HR has published for you. Scores use the 0–100% report scale and evaluator identities are never shown.</p>
                </div>
                <div className="feedback-result-hero-metrics">
                    <span><strong>{results.length}</strong> published result{results.length === 1 ? '' : 's'}</span>
                    <span><strong>{totalResponses}</strong> submitted response{totalResponses === 1 ? '' : 's'}</span>
                    <span><strong>{protectedCount}</strong> privacy-protected result{protectedCount === 1 ? '' : 's'}</span>
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
                            <div className="feedback-result-score-pill large">
                                <strong>{averageVisibleScore == null ? 'Hidden' : formatScore(averageVisibleScore)}</strong>
                                <span>Average visible score</span>
                            </div>
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
                                <span>Privacy notes</span>
                                <strong>{protectedCount}</strong>
                            </div>
                        </div>
                    </section>

                    {results.length > 1 ? (
                        <section className="feedback-results-card feedback-result-campaign-picker">
                            <div className="feedback-results-card-header compact">
                                <div>
                                    <p className="feedback-results-kicker">Result history</p>
                                    <h2>Choose a published campaign</h2>
                                </div>
                            </div>
                            <div className="feedback-result-picker-grid">
                                {results.map((item) => {
                                    const active = (expandedResult?.campaignId ?? latestResult?.campaignId) === item.campaignId;
                                    const showOverall = sectionAllowed(item.includeOverallScore, true) && item.averageScore != null;
                                    return (
                                        <button className={active ? 'active' : ''} key={`${item.campaignId}-${item.targetEmployeeId}-${item.summarizedAt}`} onClick={() => setExpandedCampaignId(item.campaignId)} type="button">
                                            <span>{item.campaignName}</span>
                                            <strong>{showOverall ? formatScore(item.averageScore) : 'Hidden'}</strong>
                                            <small>{formatDateTime(item.publishedAt ?? item.summarizedAt)}</small>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {expandedResult ? <ResultInsightCard item={expandedResult} /> : null}

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
                                    <th>Published score</th>
                                    <th>Raw average</th>
                                    <th>Total responses</th>
                                    <th>Confidence</th>
                                    <th>Visibility</th>
                                    <th>Published</th>
                                </tr>
                                </thead>
                                <tbody>
                                {results.map((item) => {
                                    const showOverall = sectionAllowed(item.includeOverallScore, true) && item.averageScore != null;
                                    return (
                                        <tr key={`history-${item.campaignId}-${item.targetEmployeeId}-${item.summarizedAt}`}>
                                            <td>
                                                <div className="feedback-results-table-title">
                                                    <strong>{item.campaignName}</strong>
                                                    <span>Campaign #{item.campaignId}</span>
                                                </div>
                                            </td>
                                            <td>{showOverall ? formatScore(item.averageScore) : 'Hidden by HR'}</td>
                                            <td>{sectionAllowed(item.includeScoreExplanation, true) ? formatNormalizedAverage(item.rawAverageScore) : 'Hidden'}</td>
                                            <td>{item.totalResponses}</td>
                                            <td>{confidenceText(item)}</td>
                                            <td>{visibilityText(item.visibilityStatus)}</td>
                                            <td>{formatDateTime(item.publishedAt ?? item.summarizedAt)}</td>
                                        </tr>
                                    );
                                })}
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

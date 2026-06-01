import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import type {
    ApiEnvelope,
    FeedbackCompetencyResult,
    FeedbackMyResult,
    FeedbackPublishedComment,
    FeedbackRelationshipPrivacy,
    FeedbackResultItem,
} from '../../types/feedbackAnalytics';
import './feedback-result.css';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type RelationshipKey = 'SELF' | 'MANAGER' | 'PEER' | 'SUBORDINATE';

type RelationshipDisplay = {
    key: RelationshipKey;
    label: string;
    score: number | null;
    count: number;
    visible: boolean;
    hiddenReason?: string | null;
};

const RELATIONSHIP_ORDER: Array<{
    key: RelationshipKey;
    label: string;
    scoreKey: keyof Pick<
        FeedbackResultItem,
        'selfAverageScore' | 'managerAverageScore' | 'peerAverageScore' | 'subordinateAverageScore'
    >;
    countKey: keyof Pick<
        FeedbackResultItem,
        'selfResponses' | 'managerResponses' | 'peerResponses' | 'subordinateResponses'
    >;
}> = [
    { key: 'SELF', label: 'Self', scoreKey: 'selfAverageScore', countKey: 'selfResponses' },
    { key: 'MANAGER', label: 'Manager reviewer', scoreKey: 'managerAverageScore', countKey: 'managerResponses' },
    { key: 'PEER', label: 'Peer reviewers', scoreKey: 'peerAverageScore', countKey: 'peerResponses' },
    { key: 'SUBORDINATE', label: 'Subordinate reviewers', scoreKey: 'subordinateAverageScore', countKey: 'subordinateResponses' },
];

const unwrap = <T,>(payload: ApiEnvelope<T> | T): T => {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as ApiEnvelope<T>).data;
    }
    return payload as T;
};

const resultKey = (result: FeedbackResultItem) => `${result.campaignId}:${result.targetEmployeeId}:${result.publishedAt ?? result.summarizedAt}`;

const formatScore = (value?: number | null) => (typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Hidden');

const formatCount = (value?: number | null) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(parsed);
};

const scoreTone = (score?: number | null) => {
    if (typeof score !== 'number') return 'muted';
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'watch';
    return 'risk';
};

const sectionAllowed = (value?: boolean) => value === true;

const privacyByType = (privacy: FeedbackRelationshipPrivacy[] | undefined, type: string) =>
    privacy?.find((item) => item.relationshipType === type);

const buildRelationshipRows = (result: FeedbackResultItem): RelationshipDisplay[] => RELATIONSHIP_ORDER.map((relationship) => {
    const privacy = privacyByType(result.relationshipPrivacy, relationship.key);
    const score = result[relationship.scoreKey];
    const count = formatCount(result[relationship.countKey] as number | undefined);
    const visible = privacy?.visibleOutsideHr ?? score != null;
    return {
        key: relationship.key,
        label: privacy?.label ?? relationship.label,
        score: typeof score === 'number' ? score : null,
        count,
        visible,
        hiddenReason: privacy?.hiddenReason ?? null,
    };
});

const weightedAverage = (items: RelationshipDisplay[]) => {
    const scored = items.filter((item) => item.visible && item.score != null && item.count > 0);
    const totalCount = scored.reduce((total, item) => total + item.count, 0);
    if (totalCount === 0) return null;
    const totalScore = scored.reduce((total, item) => total + (item.score ?? 0) * item.count, 0);
    return totalScore / totalCount;
};

const sortedCompetencies = (items?: FeedbackCompetencyResult[]) => [...(items ?? [])].sort((left, right) => {
    const leftScore = left.averageScore ?? -1;
    const rightScore = right.averageScore ?? -1;
    return rightScore - leftScore;
});

const groupedComments = (comments: FeedbackPublishedComment[]) => comments.reduce<Record<string, FeedbackPublishedComment[]>>((groups, comment) => {
    const key = comment.competencyName || comment.competencyCode || 'Other feedback';
    return { ...groups, [key]: [...(groups[key] ?? []), comment] };
}, {});

const LockedSection = ({ title, message }: { title: string; message: string }) => (
    <section className="feedback-result-card feedback-result-locked">
        <div className="feedback-result-lock-icon">🔒</div>
        <div>
            <h2>{title}</h2>
            <p>{message}</p>
        </div>
    </section>
);

const EmptySection = ({ title, message }: { title: string; message: string }) => (
    <section className="feedback-result-card feedback-result-empty-section">
        <h2>{title}</h2>
        <p>{message}</p>
    </section>
);

const FeedbackMyResultPage = () => {
    const [payload, setPayload] = useState<FeedbackMyResult | null>(null);
    const [selectedKey, setSelectedKey] = useState<string>('');
    const [state, setState] = useState<LoadState>('idle');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        let active = true;

        const load = async () => {
            setState('loading');
            setError('');
            try {
                const response = await api.get<ApiEnvelope<FeedbackMyResult> | FeedbackMyResult>('/v1/feedback/my-result');
                const data = unwrap<FeedbackMyResult>(response.data);
                if (!active) return;
                setPayload(data);
                setSelectedKey((current) => current || (data.results[0] ? resultKey(data.results[0]) : ''));
                setState('ready');
            } catch (loadError) {
                if (!active) return;
                setError(loadError instanceof Error ? loadError.message : 'Feedback result could not be loaded.');
                setState('error');
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, []);

    const results = useMemo(() => payload?.results ?? [], [payload]);
    const selectedResult = useMemo(
        () => results.find((result) => resultKey(result) === selectedKey) ?? results[0] ?? null,
        [results, selectedKey],
    );
    const relationshipRows = useMemo(
        () => (selectedResult ? buildRelationshipRows(selectedResult) : []),
        [selectedResult],
    );
    const selfRow = relationshipRows.find((row) => row.key === 'SELF');
    const otherRows = relationshipRows.filter((row) => row.key !== 'SELF');
    const othersAverage = weightedAverage(otherRows);
    const competencies = sortedCompetencies(selectedResult?.competencyBreakdown);
    const comments = selectedResult?.comments ?? [];
    const commentsByCompetency = groupedComments(comments);

    if (state === 'loading' || state === 'idle') {
        return (
            <main className="feedback-result-page">
                <section className="feedback-result-loading">Loading your published 360 feedback result...</section>
            </main>
        );
    }

    if (state === 'error') {
        return (
            <main className="feedback-result-page">
                <section className="feedback-result-card feedback-result-error">
                    <h1>360 Feedback Result</h1>
                    <p>{error || 'Feedback result could not be loaded.'}</p>
                </section>
            </main>
        );
    }

    if (!selectedResult) {
        return (
            <main className="feedback-result-page">
                <section className="feedback-result-card feedback-result-empty">
                    <p className="feedback-result-kicker">360 Feedback</p>
                    <h1>No published result yet</h1>
                    <p>Your 360 feedback result will appear here after HR publishes it.</p>
                </section>
            </main>
        );
    }

    return (
        <main className="feedback-result-page">
            <header className="feedback-result-hero">
                <div>
                    <p className="feedback-result-kicker">360 Feedback Result</p>
                    <h1>{selectedResult.campaignName}</h1>
                    <p>
                        Published for {payload?.employeeName || selectedResult.targetEmployeeName}. Only the sections released by HR are shown here.
                    </p>
                </div>

                <div className="feedback-result-published-card">
                    <span>Published</span>
                    <strong>{formatDateTime(selectedResult.publishedAt)}</strong>
                    <small>{selectedResult.visibilityStatus || 'PUBLISHED'}</small>
                </div>
            </header>

            {results.length > 1 && (
                <section className="feedback-result-switcher" aria-label="Published feedback result campaigns">
                    {results.map((result) => (
                        <button
                            className={resultKey(result) === resultKey(selectedResult) ? 'active' : ''}
                            key={resultKey(result)}
                            onClick={() => setSelectedKey(resultKey(result))}
                            type="button"
                        >
                            <span>{result.campaignName}</span>
                            <small>{formatDateTime(result.publishedAt || result.summarizedAt)}</small>
                        </button>
                    ))}
                </section>
            )}

            <section className="feedback-result-grid summary">
                {sectionAllowed(selectedResult.includeOverallScore) ? (
                    <article className={`feedback-result-score-card ${scoreTone(selectedResult.averageScore)}`}>
                        <span>Overall score</span>
                        <strong>{formatScore(selectedResult.averageScore)}</strong>
                        <small>{selectedResult.scoreCategory || 'No score band'}</small>
                        {sectionAllowed(selectedResult.includeScoreExplanation) && selectedResult.rawAverageScore != null ? (
                            <small>Unweighted normalized average: {selectedResult.rawAverageScore.toFixed(1)}%</small>
                        ) : null}
                    </article>
                ) : (
                    <article className="feedback-result-score-card muted">
                        <span>Overall score</span>
                        <strong>Hidden</strong>
                        <small>HR did not publish this section.</small>
                    </article>
                )}

                <article className="feedback-result-score-card">
                    <span>Submitted feedback</span>
                    <strong>{formatCount(selectedResult.submittedEvaluatorCount ?? selectedResult.totalResponses)}</strong>
                    <small>{formatCount(selectedResult.assignedEvaluatorCount)} assigned evaluators</small>
                </article>

                <article className="feedback-result-score-card">
                    <span>Completion</span>
                    <strong>{formatScore(selectedResult.completionRate)}</strong>
                    <small>{selectedResult.confidenceLevel || 'Confidence not calculated'}</small>
                </article>
            </section>

            {sectionAllowed(selectedResult.includeScoreExplanation) ? (
                <section className="feedback-result-card feedback-result-explanation">
                    <div>
                        <p className="feedback-result-kicker">Score explanation</p>
                        <h2>How this result was calculated</h2>
                    </div>
                    <div className="feedback-result-explanation-grid">
                        <div>
                            <span>Method</span>
                            <strong>{selectedResult.scoreCalculationMethod || 'Weighted submitted-response average'}</strong>
                        </div>
                        <div>
                            <span>Confidence</span>
                            <strong>{selectedResult.confidenceLevel || 'Not calculated'}</strong>
                        </div>
                        <div>
                            <span>Pending evaluators</span>
                            <strong>{formatCount(selectedResult.pendingEvaluatorCount)}</strong>
                        </div>
                    </div>
                    {selectedResult.scoreCalculationNote && <p className="feedback-result-note">{selectedResult.scoreCalculationNote}</p>}
                    {selectedResult.publishNote && <p className="feedback-result-note muted-note">{selectedResult.publishNote}</p>}
                </section>
            ) : (
                <LockedSection title="Score explanation" message="HR did not publish the calculation explanation for this result." />
            )}

            {sectionAllowed(selectedResult.includeCompetencyBreakdown) ? (
                competencies.length > 0 ? (
                    <section className="feedback-result-card">
                        <div className="feedback-result-section-head">
                            <div>
                                <p className="feedback-result-kicker">Competencies</p>
                                <h2>Competency breakdown</h2>
                            </div>
                            <span>{competencies.length} areas</span>
                        </div>

                        <div className="feedback-competency-list">
                            {competencies.map((competency) => (
                                <article className="feedback-competency-item" key={competency.competencyCode}>
                                    <div className="feedback-competency-top">
                                        <div>
                                            <h3>{competency.competencyName}</h3>
                                            <p>{competency.questionCount} questions · {competency.responseCount} ratings</p>
                                        </div>
                                        <strong className={scoreTone(competency.averageScore)}>{formatScore(competency.averageScore)}</strong>
                                    </div>
                                    <div className="feedback-result-bar" aria-hidden="true">
                                        <span style={{ width: `${Math.max(0, Math.min(100, competency.averageScore ?? 0))}%` }} />
                                    </div>
                                    {(competency.relationshipBreakdown ?? []).length > 0 && (
                                        <div className="feedback-relationship-mini-grid">
                                            {(competency.relationshipBreakdown ?? []).map((row) => (
                                                <span key={`${competency.competencyCode}-${row.relationshipType}`}>
                          {row.label || row.relationshipType}: {row.visibleOutsideHr === false ? 'Hidden' : formatScore(row.averageScore)}
                        </span>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                ) : (
                    <EmptySection title="Competency breakdown" message="HR published this section, but no competency-level data is available for this result yet." />
                )
            ) : (
                <LockedSection title="Competency breakdown" message="HR did not publish competency-level results for this campaign." />
            )}

            {sectionAllowed(selectedResult.includeSelfVsOthers) ? (
                <section className="feedback-result-card">
                    <div className="feedback-result-section-head">
                        <div>
                            <p className="feedback-result-kicker">Self vs others</p>
                            <h2>Perspective comparison</h2>
                        </div>
                    </div>

                    <div className="feedback-self-others-grid">
                        <article>
                            <span>Self score</span>
                            <strong>{selfRow?.visible === false ? 'Hidden' : formatScore(selfRow?.score)}</strong>
                            <small>{formatCount(selfRow?.count)} response</small>
                        </article>
                        <article>
                            <span>Others score</span>
                            <strong>{formatScore(othersAverage)}</strong>
                            <small>Visible manager, peer, or subordinate reviewer feedback only</small>
                        </article>
                    </div>
                </section>
            ) : (
                <LockedSection title="Self vs others" message="HR did not publish comparison between self feedback and feedback from others." />
            )}

            <section className="feedback-result-card">
                <div className="feedback-result-section-head">
                    <div>
                        <p className="feedback-result-kicker">Reviewer groups</p>
                        <h2>Feedback coverage and privacy</h2>
                    </div>
                    <span>Anonymous reviewer groups</span>
                </div>

                <div className="feedback-relationship-table">
                    {relationshipRows.map((row) => (
                        <article key={row.key} className={row.visible ? '' : 'masked'}>
                            <div>
                                <h3>{row.label}</h3>
                                <p>{row.count} submitted response{row.count === 1 ? '' : 's'}</p>
                            </div>
                            <strong>{sectionAllowed(selectedResult.includeSelfVsOthers) && row.visible ? formatScore(row.score) : 'Protected'}</strong>
                            {!row.visible && <small>{row.hiddenReason || 'Hidden to protect evaluator confidentiality.'}</small>}
                        </article>
                    ))}
                </div>
            </section>

            {sectionAllowed(selectedResult.includeComments) ? (
                comments.length > 0 ? (
                    <section className="feedback-result-card">
                        <div className="feedback-result-section-head">
                            <div>
                                <p className="feedback-result-kicker">Comments</p>
                                <h2>Published anonymous comments</h2>
                            </div>
                            <span>{comments.length} comments</span>
                        </div>

                        <div className="feedback-comments-list">
                            {Object.entries(commentsByCompetency).map(([competency, grouped]) => (
                                <article key={competency}>
                                    <h3>{competency}</h3>
                                    {grouped.map((comment, index) => (
                                        <blockquote key={`${competency}-${comment.relationshipType}-${index}`}>
                                            <p>{comment.comment}</p>
                                            <footer>
                                                {comment.label || comment.relationshipType}
                                                {comment.questionText ? ` · ${comment.questionText}` : ''}
                                            </footer>
                                        </blockquote>
                                    ))}
                                </article>
                            ))}
                        </div>
                    </section>
                ) : (
                    <EmptySection title="Published anonymous comments" message="HR allowed comments, but no privacy-safe comments are available to display." />
                )
            ) : (
                <LockedSection title="Published anonymous comments" message="HR did not publish written comments for this result." />
            )}

            <section className="feedback-result-card feedback-privacy-panel">
                <div>
                    <p className="feedback-result-kicker">Privacy explanation</p>
                    <h2>How anonymity is protected</h2>
                    <p>
                        Peer and subordinate reviewer groups are hidden when the number of responses is below the confidentiality threshold. HR can review full quality checks, but employee results only show privacy-safe information.
                    </p>
                </div>
                <div className="feedback-privacy-grid">
                    {(selectedResult.relationshipPrivacy ?? []).map((item) => {
                        const notApplicable = item.applicable === false;
                        const badge = notApplicable ? 'Not applicable' : item.thresholdRequired ? `${item.responseCount} / ${item.minimumVisibleResponses} minimum` : `${item.responseCount} responses`;
                        return (
                            <article key={item.relationshipType} className={item.visibleOutsideHr ? 'visible' : 'hidden'}>
                                <strong>{item.label || item.relationshipType}</strong>
                                <span>{badge}</span>
                                <small>{notApplicable ? 'Not applicable for this result' : item.visibleOutsideHr ? 'Visible in employee result' : item.hiddenReason || 'Hidden for confidentiality'}</small>
                            </article>
                        );
                    })}
                </div>
            </section>
        </main>
    );
};

export default FeedbackMyResultPage;

import { useEffect, useMemo, useState } from 'react';

import api from '../../services/api';
import type {
    ApiEnvelope,
    FeedbackCompetencyResult,
    FeedbackPublishedComment,
    FeedbackRelationshipPrivacy,
    FeedbackResultItem,
    FeedbackTeamSummary,
} from '../../types/feedbackAnalytics';
import './manager-summary.css';

type ManagerSummaryPageProps = {
    expectedScope?: 'MANAGER_DIRECT_REPORTS' | 'DEPARTMENT' | string;
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type ScoreFilter = 'ALL' | 'NEEDS_COACHING' | 'STABLE' | 'HIGH';
type PrivacyFilter = 'ALL' | 'HAS_MASKING' | 'FULLY_VISIBLE';
type ConfidenceFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' | 'UNKNOWN';

type RelationshipRow = {
    type: string;
    label: string;
    score?: number | null;
    count: number;
    visible: boolean;
    hiddenReason?: string | null;
};

const RELATIONSHIP_ORDER = ['SELF', 'MANAGER', 'PEER', 'SUBORDINATE'];

const unwrap = <T,>(response: { data: ApiEnvelope<T> | T }): T => {
    const payload = response.data as ApiEnvelope<T> | T;
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as ApiEnvelope<T>).data;
    }
    return payload as T;
};

const ManagerSummaryPage = ({ expectedScope = 'MANAGER_DIRECT_REPORTS' }: ManagerSummaryPageProps) => {
    const [summary, setSummary] = useState<FeedbackTeamSummary | null>(null);
    const [status, setStatus] = useState<LoadState>('idle');
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [campaignFilter, setCampaignFilter] = useState('ALL');
    const [employeeFilter, setEmployeeFilter] = useState('ALL');
    const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('ALL');
    const [privacyFilter, setPrivacyFilter] = useState<PrivacyFilter>('ALL');
    const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('ALL');
    const [selectedResult, setSelectedResult] = useState<FeedbackResultItem | null>(null);

    const isDepartmentView = normalize(summary?.viewScope || expectedScope) === 'DEPARTMENT';
    const pageTitle = isDepartmentView ? 'Department 360 Summary' : 'Managed Employee 360 Summary';
    const peopleLabel = isDepartmentView ? 'Department employees' : 'Managed employees';
    const routeMismatch = summary?.viewScope && normalize(summary.viewScope) !== normalize(expectedScope);

    const loadSummary = async () => {
        setStatus('loading');
        setError('');
        try {
            const response = await api.get<ApiEnvelope<FeedbackTeamSummary> | FeedbackTeamSummary>('/v1/feedback/team-summary');
            const data = unwrap<FeedbackTeamSummary>(response);
            setSummary(data);
            setSelectedResult((current) => current ?? firstPublishedResult(data.items));
            setStatus('ready');
        } catch (caught) {
            setSummary(null);
            setSelectedResult(null);
            setStatus('error');
            setError(caught instanceof Error ? caught.message : 'Unable to load 360 feedback summary.');
        }
    };

    useEffect(() => {
        void loadSummary();
    }, []);

    const publishedItems = useMemo(
        () => (summary?.items ?? []).filter((item) => normalize(item.visibilityStatus || 'PUBLISHED') === 'PUBLISHED'),
        [summary?.items],
    );

    const campaignOptions = useMemo(
        () => uniqueOptions(publishedItems.map((item) => ({ value: String(item.campaignId), label: item.campaignName }))),
        [publishedItems],
    );

    const employeeOptions = useMemo(
        () => uniqueOptions(publishedItems.map((item) => ({ value: String(item.targetEmployeeId), label: item.targetEmployeeName }))),
        [publishedItems],
    );

    const filteredItems = useMemo(() => {
        const needle = normalizeSearch(search);
        return publishedItems.filter((item) => {
            if (campaignFilter !== 'ALL' && String(item.campaignId) !== campaignFilter) return false;
            if (employeeFilter !== 'ALL' && String(item.targetEmployeeId) !== employeeFilter) return false;
            if (confidenceFilter !== 'ALL' && confidenceBucket(item) !== confidenceFilter) return false;
            if (privacyFilter === 'HAS_MASKING' && !hasRelationshipMasking(item)) return false;
            if (privacyFilter === 'FULLY_VISIBLE' && hasRelationshipMasking(item)) return false;
            if (scoreFilter !== 'ALL' && scoreBucket(item) !== scoreFilter) return false;
            if (!needle) return true;
            return [item.targetEmployeeName, item.campaignName, item.scoreCategory, item.confidenceLevel]
                .some((value) => normalizeSearch(value).includes(needle));
        });
    }, [campaignFilter, confidenceFilter, employeeFilter, privacyFilter, publishedItems, scoreFilter, search]);

    useEffect(() => {
        if (!filteredItems.length) {
            setSelectedResult(null);
            return;
        }
        setSelectedResult((current) => {
            if (current && filteredItems.some((item) => resultKey(item) === resultKey(current))) return current;
            return filteredItems[0];
        });
    }, [filteredItems]);

    const stats = useMemo(() => buildStats(publishedItems, filteredItems, summary), [filteredItems, publishedItems, summary]);

    return (
        <main className="manager-summary-page">
            <section className="manager-summary-hero">
                <div>
                    <p className="manager-summary-kicker">360 Feedback • Privacy-safe summary</p>
                    <h1>{summary?.accessTitle || pageTitle}</h1>
                    <p>{summary?.accessDescription || defaultAccessDescription(isDepartmentView)}</p>
                    <div className="manager-summary-hero-tags">
                        <span>{isDepartmentView ? summary?.departmentName || 'Current department' : 'Direct reports and active managed teams'}</span>
                        <span>{peopleLabel}: {stats.peopleInScope}</span>
                        <span>Published results only</span>
                    </div>
                </div>
                <div className="manager-summary-hero-card">
                    <span>Published results</span>
                    <strong>{stats.publishedResults}</strong>
                    <small>{stats.visibleScoreCount} with visible overall scores</small>
                    <button type="button" onClick={loadSummary} disabled={status === 'loading'}>
                        {status === 'loading' ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </section>

            {routeMismatch && (
                <div className="manager-summary-alert warning">
                    This page was opened as {expectedScope}, but the backend returned {summary?.viewScope}. The backend scope is being respected.
                </div>
            )}

            {summary?.privacyNotice && (
                <section className="manager-summary-privacy-banner">
                    <i className="bi bi-shield-lock" />
                    <div>
                        <strong>Privacy rule</strong>
                        <p>{summary.privacyNotice}</p>
                    </div>
                </section>
            )}

            {status === 'error' && (
                <div className="manager-summary-alert error">
                    <strong>Could not load summary.</strong>
                    <span>{error}</span>
                    <button type="button" onClick={loadSummary}>Retry</button>
                </div>
            )}

            <section className="manager-summary-metrics">
                <MetricCard label="Published results" value={formatNumber(stats.publishedResults)} detail="Only HR-published employee summaries are counted." icon="bi-check2-circle" />
                <MetricCard label={peopleLabel} value={formatNumber(stats.peopleInScope)} detail={isDepartmentView ? 'Employees in your department scope.' : 'Direct reports and active team members.'} icon="bi-people" />
                <MetricCard label="Visible average" value={stats.visibleAverageText} detail="Uses only results where HR published overall score." icon="bi-graph-up" />
                <MetricCard label="Privacy protected" value={formatNumber(stats.maskedResultCount)} detail="Has at least one masked peer or direct-report group." icon="bi-shield-check" />
                <MetricCard label="Coaching priority" value={formatNumber(stats.coachingPriorityCount)} detail="Lower confidence, lower score, or insufficient feedback." icon="bi-chat-heart" />
            </section>

            <section className="manager-summary-filters">
                <label className="manager-summary-search">
                    <span>Search</span>
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, campaign, confidence..." />
                </label>
                <FilterSelect label="Campaign" value={campaignFilter} onChange={setCampaignFilter} options={[{ value: 'ALL', label: 'All campaigns' }, ...campaignOptions]} />
                <FilterSelect label={isDepartmentView ? 'Department employee' : 'Managed employee'} value={employeeFilter} onChange={setEmployeeFilter} options={[{ value: 'ALL', label: 'All employees' }, ...employeeOptions]} />
                <FilterSelect<ScoreFilter> label="Coaching need" value={scoreFilter} onChange={setScoreFilter} options={[
                    { value: 'ALL', label: 'All results' },
                    { value: 'NEEDS_COACHING', label: 'Needs coaching focus' },
                    { value: 'STABLE', label: 'Stable performance' },
                    { value: 'HIGH', label: 'High strength' },
                ]} />
                <FilterSelect<PrivacyFilter> label="Privacy" value={privacyFilter} onChange={setPrivacyFilter} options={[
                    { value: 'ALL', label: 'All privacy states' },
                    { value: 'HAS_MASKING', label: 'Has masked groups' },
                    { value: 'FULLY_VISIBLE', label: 'No masked groups' },
                ]} />
                <FilterSelect<ConfidenceFilter> label="Confidence" value={confidenceFilter} onChange={setConfidenceFilter} options={[
                    { value: 'ALL', label: 'All confidence levels' },
                    { value: 'HIGH', label: 'High' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'LOW', label: 'Low' },
                    { value: 'INSUFFICIENT', label: 'Insufficient' },
                    { value: 'UNKNOWN', label: 'Unknown' },
                ]} />
            </section>

            <section className="manager-summary-layout">
                <div className="manager-summary-table-card">
                    <div className="manager-summary-card-head">
                        <div>
                            <h2>Published employee summaries</h2>
                            <p>No evaluator names are shown. Relationship groups are masked when backend privacy thresholds are not met.</p>
                        </div>
                        <span>{filteredItems.length} result(s)</span>
                    </div>

                    {status === 'loading' && <EmptyState title="Loading 360 summaries" description="Getting the latest published employee result data." icon="bi-arrow-repeat" />}
                    {status !== 'loading' && publishedItems.length === 0 && (
                        <EmptyState title="No published results yet" description={summary?.emptyStateMessage || 'HR has not published any result summaries for this scope yet.'} icon="bi-inbox" />
                    )}
                    {status !== 'loading' && publishedItems.length > 0 && filteredItems.length === 0 && (
                        <EmptyState title="No results match these filters" description="Try clearing campaign, employee, confidence, score, or privacy filters." icon="bi-funnel" />
                    )}

                    {filteredItems.length > 0 && (
                        <div className="manager-summary-table-wrap">
                            <table className="manager-summary-table">
                                <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Campaign</th>
                                    <th>Score</th>
                                    <th>Confidence</th>
                                    <th>Relationship privacy</th>
                                    <th>Coaching focus</th>
                                    <th />
                                </tr>
                                </thead>
                                <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={resultKey(item)} className={selectedResult && resultKey(item) === resultKey(selectedResult) ? 'selected' : ''}>
                                        <td>
                                            <strong>{item.targetEmployeeName}</strong>
                                            <small>Employee #{item.targetEmployeeId}</small>
                                        </td>
                                        <td>
                                            <span>{item.campaignName}</span>
                                            <small>{formatDateTime(item.publishedAt || item.summarizedAt)}</small>
                                        </td>
                                        <td>{renderPublishedScore(item)}</td>
                                        <td><ConfidenceBadge item={item} /></td>
                                        <td><PrivacyBadge item={item} /></td>
                                        <td><span className="manager-summary-focus-text">{coachingFocus(item)}</span></td>
                                        <td>
                                            <button type="button" onClick={() => setSelectedResult(item)}>
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <ResultDetailPanel item={selectedResult} isDepartmentView={isDepartmentView} />
            </section>
        </main>
    );
};

const ResultDetailPanel = ({ item, isDepartmentView }: { item: FeedbackResultItem | null; isDepartmentView: boolean }) => {
    if (!item) {
        return (
            <aside className="manager-summary-detail-card empty">
                <EmptyState title="Select a result" description="Choose an employee summary to view coaching-safe details." icon="bi-person-lines-fill" />
            </aside>
        );
    }

    const relationshipRows = buildRelationshipRows(item);
    const visibleCommentCount = item.includeComments ? item.comments?.length ?? 0 : 0;

    return (
        <aside className="manager-summary-detail-card">
            <div className="manager-summary-detail-head">
                <div>
                    <p>{isDepartmentView ? 'Department coaching view' : 'Manager coaching view'}</p>
                    <h2>{item.targetEmployeeName}</h2>
                    <span>{item.campaignName}</span>
                </div>
                <ConfidenceBadge item={item} />
            </div>

            <section className="manager-summary-section">
                <h3>Published score</h3>
                {item.includeOverallScore ? (
                    <div className="manager-summary-score-panel">
                        <strong>{formatScore(item.averageScore)}</strong>
                        <span>{item.scoreCategory || scoreCategory(item.averageScore)}</span>
                        <small>{item.includeScoreExplanation ? item.scoreCalculationNote || 'Calculated from submitted relationship-weighted feedback.' : 'Score explanation was not included by HR.'}</small>
                    </div>
                ) : (
                    <ProtectedBlock title="Overall score not published" description="HR did not include the overall score in the published result package." />
                )}
            </section>

            <section className="manager-summary-section">
                <h3>Relationship summary</h3>
                <p className="manager-summary-section-note">Use relationship patterns for coaching. Do not ask the employee to identify who submitted feedback.</p>
                <div className="manager-summary-relationship-list">
                    {relationshipRows.map((row) => (
                        <div className={`manager-summary-relationship-row ${row.visible ? '' : 'protected'}`} key={row.type}>
                            <div>
                                <strong>{row.label}</strong>
                                <small>{row.count} submitted response(s)</small>
                            </div>
                            {item.includeSelfVsOthers && row.visible ? (
                                <span>{formatScore(row.score)}</span>
                            ) : (
                                <em>{row.hiddenReason || 'Protected by HR visibility settings.'}</em>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="manager-summary-section">
                <h3>Competency coaching areas</h3>
                {item.includeCompetencyBreakdown ? (
                    <CompetencyList competencies={item.competencyBreakdown ?? []} />
                ) : (
                    <ProtectedBlock title="Competency breakdown not published" description="HR did not include competency-level details for this result." />
                )}
            </section>

            <section className="manager-summary-section">
                <h3>Published anonymous comments</h3>
                {item.includeComments ? (
                    visibleCommentCount > 0 ? <CommentList comments={item.comments ?? []} /> : <ProtectedBlock title="No publishable comments" description="No comments are available after privacy rules and HR publishing settings were applied." />
                ) : (
                    <ProtectedBlock title="Comments not published" description="HR did not include anonymous comments in this published result." />
                )}
            </section>

            <section className="manager-summary-coaching-box">
                <strong>Coaching guidance</strong>
                <p>{coachingGuidance(item)}</p>
            </section>
        </aside>
    );
};

const CompetencyList = ({ competencies }: { competencies: FeedbackCompetencyResult[] }) => {
    if (!competencies.length) {
        return <ProtectedBlock title="No competency detail" description="Competency scores were not available for this published result." />;
    }
    const sorted = [...competencies].sort((left, right) => safeScore(left.averageScore) - safeScore(right.averageScore));
    return (
        <div className="manager-summary-competency-list">
            {sorted.map((item) => (
                <div key={item.competencyCode || item.competencyName} className="manager-summary-competency-row">
                    <div>
                        <strong>{item.competencyName}</strong>
                        <small>{item.responseCount} rating(s), {item.questionCount} question(s)</small>
                    </div>
                    <span>{formatScore(item.averageScore)}</span>
                </div>
            ))}
        </div>
    );
};

const CommentList = ({ comments }: { comments: FeedbackPublishedComment[] }) => (
    <div className="manager-summary-comment-list">
        {comments.map((comment, index) => (
            <article key={`${comment.relationshipType}-${comment.questionCode ?? index}-${index}`}>
                <div>
                    <span>{relationshipLabel(comment.relationshipType, comment.label)}</span>
                    {comment.competencyName && <small>{comment.competencyName}</small>}
                </div>
                {comment.questionText && <strong>{comment.questionText}</strong>}
                <p>{comment.comment}</p>
            </article>
        ))}
    </div>
);

const ProtectedBlock = ({ title, description }: { title: string; description: string }) => (
    <div className="manager-summary-protected-block">
        <i className="bi bi-lock" />
        <div>
            <strong>{title}</strong>
            <p>{description}</p>
        </div>
    </div>
);

const MetricCard = ({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) => (
    <article className="manager-summary-metric-card">
        <span><i className={`bi ${icon}`} /></span>
        <div>
            <small>{label}</small>
            <strong>{value}</strong>
            <p>{detail}</p>
        </div>
    </article>
);

const FilterSelect = <T extends string = string,>({
                                                      label,
                                                      value,
                                                      onChange,
                                                      options,
                                                  }: {
    label: string;
    value: T;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
}) => (
    <label>
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value as T)}>
            {options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    </label>
);

const EmptyState = ({ title, description, icon }: { title: string; description: string; icon: string }) => (
    <div className="manager-summary-empty-state">
        <i className={`bi ${icon}`} />
        <strong>{title}</strong>
        <p>{description}</p>
    </div>
);

const ConfidenceBadge = ({ item }: { item: FeedbackResultItem }) => {
    const bucket = confidenceBucket(item).toLowerCase();
    return <span className={`manager-summary-badge confidence ${bucket}`}>{formatLabel(item.confidenceLevel || (item.insufficientFeedback ? 'INSUFFICIENT' : 'UNKNOWN'))}</span>;
};

const PrivacyBadge = ({ item }: { item: FeedbackResultItem }) => {
    const masked = hasRelationshipMasking(item);
    return <span className={`manager-summary-badge privacy ${masked ? 'masked' : 'visible'}`}>{masked ? 'Relationship masking applied' : 'Visible groups allowed'}</span>;
};

const renderPublishedScore = (item: FeedbackResultItem) => {
    if (!item.includeOverallScore) {
        return <span className="manager-summary-score-hidden">Not published</span>;
    }
    return (
        <div className="manager-summary-score-cell">
            <strong>{formatScore(item.averageScore)}</strong>
            <small>{item.scoreCategory || scoreCategory(item.averageScore)}</small>
        </div>
    );
};

const buildStats = (publishedItems: FeedbackResultItem[], filteredItems: FeedbackResultItem[], summary: FeedbackTeamSummary | null) => {
    const visibleScores = publishedItems
        .filter((item) => item.includeOverallScore && typeof item.averageScore === 'number')
        .map((item) => Number(item.averageScore));
    const visibleAverage = visibleScores.length
        ? visibleScores.reduce((sum, score) => sum + score, 0) / visibleScores.length
        : null;
    return {
        publishedResults: publishedItems.length,
        filteredResults: filteredItems.length,
        peopleInScope: summary?.viewScope === 'DEPARTMENT'
            ? summary?.totalDepartmentEmployees ?? uniqueEmployeeCount(publishedItems)
            : summary?.totalDirectReports ?? uniqueEmployeeCount(publishedItems),
        visibleScoreCount: visibleScores.length,
        visibleAverageText: visibleAverage == null ? '—' : `${Math.round(visibleAverage)}%`,
        maskedResultCount: publishedItems.filter(hasRelationshipMasking).length,
        coachingPriorityCount: publishedItems.filter((item) => scoreBucket(item) === 'NEEDS_COACHING').length,
    };
};

const firstPublishedResult = (items?: FeedbackResultItem[] | null) =>
    (items ?? []).find((item) => normalize(item.visibilityStatus || 'PUBLISHED') === 'PUBLISHED') ?? null;

const uniqueEmployeeCount = (items: FeedbackResultItem[]) =>
    new Set(items.map((item) => item.targetEmployeeId)).size;

const uniqueOptions = (items: Array<{ value: string; label: string }>) => {
    const map = new Map<string, string>();
    items.forEach((item) => {
        if (!map.has(item.value)) map.set(item.value, item.label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
};

const buildRelationshipRows = (item: FeedbackResultItem): RelationshipRow[] => {
    const privacyByType = new Map<string, FeedbackRelationshipPrivacy>();
    (item.relationshipPrivacy ?? []).forEach((privacy) => privacyByType.set(normalize(privacy.relationshipType), privacy));

    return RELATIONSHIP_ORDER.map((type) => {
        const privacy = privacyByType.get(type);
        return {
            type,
            label: relationshipLabel(type, privacy?.label),
            score: relationshipScore(item, type),
            count: privacy?.responseCount ?? relationshipCount(item, type),
            visible: Boolean(privacy?.visibleOutsideHr ?? true),
            hiddenReason: privacy?.hiddenReason,
        };
    }).filter((row) => row.count > 0 || row.type === 'SELF' || row.type === 'MANAGER');
};

const relationshipScore = (item: FeedbackResultItem, type: string) => {
    switch (type) {
        case 'SELF': return item.selfAverageScore;
        case 'MANAGER': return item.managerAverageScore;
        case 'PEER': return item.peerAverageScore;
        case 'SUBORDINATE': return item.subordinateAverageScore;
        default: return null;
    }
};

const relationshipCount = (item: FeedbackResultItem, type: string) => {
    switch (type) {
        case 'SELF': return item.selfResponses ?? 0;
        case 'MANAGER': return item.managerResponses ?? 0;
        case 'PEER': return item.peerResponses ?? 0;
        case 'SUBORDINATE': return item.subordinateResponses ?? 0;
        default: return 0;
    }
};

const relationshipLabel = (type: string, fallback?: string | null) => {
    if (fallback) return fallback;
    const normalized = normalize(type);
    if (normalized === 'SELF') return 'Self review';
    if (normalized === 'MANAGER') return 'Manager feedback';
    if (normalized === 'PEER') return 'Peer feedback';
    if (normalized === 'SUBORDINATE') return 'Direct-report feedback';
    return formatLabel(type);
};

const hasRelationshipMasking = (item: FeedbackResultItem) =>
    (item.relationshipPrivacy ?? []).some((privacy) => !privacy.visibleOutsideHr);

const confidenceBucket = (item: FeedbackResultItem): ConfidenceFilter => {
    if (item.insufficientFeedback) return 'INSUFFICIENT';
    const normalized = normalize(item.confidenceLevel);
    if (normalized.includes('HIGH')) return 'HIGH';
    if (normalized.includes('MEDIUM') || normalized.includes('MODERATE')) return 'MEDIUM';
    if (normalized.includes('LOW')) return 'LOW';
    if (normalized.includes('INSUFFICIENT')) return 'INSUFFICIENT';
    return 'UNKNOWN';
};

const scoreBucket = (item: FeedbackResultItem): ScoreFilter => {
    if (item.insufficientFeedback || confidenceBucket(item) === 'LOW' || confidenceBucket(item) === 'INSUFFICIENT') return 'NEEDS_COACHING';
    if (!item.includeOverallScore || typeof item.averageScore !== 'number') return 'STABLE';
    if (item.averageScore >= 85) return 'HIGH';
    if (item.averageScore < 72) return 'NEEDS_COACHING';
    return 'STABLE';
};

const coachingFocus = (item: FeedbackResultItem) => {
    if (item.insufficientFeedback) return 'Use as directional input; gather more context before setting actions.';
    if (!item.includeOverallScore || typeof item.averageScore !== 'number') return 'Discuss themes and examples without focusing on a score.';
    if (item.averageScore >= 85) return 'Reinforce strengths and agree stretch opportunities.';
    if (item.averageScore >= 72) return 'Maintain performance and choose one improvement behavior.';
    return 'Create a focused support plan with 1–2 concrete behaviors.';
};

const coachingGuidance = (item: FeedbackResultItem) => {
    if (item.insufficientFeedback) {
        return 'Treat this result as a coaching signal, not a final judgment. Confirm the employee’s context, choose one short-term support action, and avoid naming or guessing evaluators.';
    }
    if (hasRelationshipMasking(item)) {
        return 'Some relationship groups are protected. Discuss broad themes only, avoid asking who gave the feedback, and focus on observable behaviors and next actions.';
    }
    if (scoreBucket(item) === 'HIGH') {
        return 'Start with strengths, ask what helped the employee succeed, then agree how to use those strengths in upcoming work.';
    }
    return 'Use the result to guide a supportive conversation. Pick one behavior to continue, one behavior to improve, and one follow-up date.';
};

const defaultAccessDescription = (departmentView: boolean) => departmentView
    ? 'Department Heads can view privacy-safe published 360 feedback summaries for employees in their department.'
    : 'Managers can view privacy-safe published 360 feedback summaries for direct reports and active team members they manage.';

const scoreCategory = (score?: number | null) => {
    if (typeof score !== 'number') return 'Not scored';
    if (score >= 86) return 'Outstanding';
    if (score >= 71) return 'Good';
    if (score >= 60) return 'Meets requirement';
    if (score >= 40) return 'Needs improvement';
    return 'Unsatisfactory';
};

const safeScore = (value?: number | null) => (typeof value === 'number' ? value : 101);

const formatScore = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return `${Math.round(value)}%`;
};

const formatNumber = (value?: number | null) => new Intl.NumberFormat().format(Number(value ?? 0));

const formatDateTime = (value?: string | null) => {
    if (!value) return 'Not published';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const resultKey = (item: FeedbackResultItem) => `${item.campaignId}:${item.targetEmployeeId}`;

const normalize = (value?: string | null) => String(value ?? '').trim().replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();

const normalizeSearch = (value?: string | number | null) => String(value ?? '').trim().toLowerCase();

const formatLabel = (value?: string | null) => String(value ?? 'Unknown').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default ManagerSummaryPage;

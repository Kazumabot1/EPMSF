import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import './manager-summary.css';

type ScopeType = 'MANAGER_SCOPE' | 'DEPARTMENT_SCOPE' | 'MANAGER_DIRECT_REPORTS' | 'DEPARTMENT_EMPLOYEES' | string;
type ConfidenceFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
type PrivacyFilter = 'ALL' | 'PROTECTED' | 'CLEAR';
type CoachingFilter = 'ALL' | 'PRIORITY' | 'STABLE';

type GenericResponse<T> = {
    success?: boolean;
    message?: string;
    data?: T;
};

type RelationshipPrivacy = {
    relationshipType?: string | null;
    label?: string | null;
    responseCount?: number | null;
    minimumVisibleResponses?: number | null;
    thresholdRequired?: boolean | null;
    thresholdMet?: boolean | null;
    visibleOutsideHr?: boolean | null;
    hiddenReason?: string | null;
};

type RelationshipScore = {
    relationshipType?: string | null;
    label?: string | null;
    averageScore?: number | null;
    responseCount?: number | null;
    weight?: number | null;
    visibleOutsideHr?: boolean | null;
    hiddenReason?: string | null;
};

type CompetencyResult = {
    competencyCode?: string | null;
    competencyName?: string | null;
    averageScore?: number | null;
    responseCount?: number | null;
    questionCount?: number | null;
};

type PublishedComment = {
    competencyCode?: string | null;
    competencyName?: string | null;
    relationshipType?: string | null;
    relationshipLabel?: string | null;
    comment?: string | null;
    visibleOutsideHr?: boolean | null;
    hiddenReason?: string | null;
};

type FeedbackResultItem = {
    campaignId?: number | null;
    campaignName?: string | null;
    targetEmployeeId?: number | null;
    targetEmployeeName?: string | null;
    targetEmployeeCode?: string | null;
    targetPositionName?: string | null;
    positionName?: string | null;
    targetDepartmentName?: string | null;
    departmentName?: string | null;
    targetLevelCode?: string | null;
    overallScore?: number | null;
    score?: number | null;
    scoreCategory?: string | null;
    confidenceLevel?: string | null;
    insufficientFeedback?: boolean | null;
    assignedEvaluatorCount?: number | null;
    submittedEvaluatorCount?: number | null;
    visibilityStatus?: string | null;
    summarizedAt?: string | null;
    publishedAt?: string | null;
    includeOverallScore?: boolean | null;
    includeCompetencyBreakdown?: boolean | null;
    includeSelfVsOthers?: boolean | null;
    includeComments?: boolean | null;
    includeScoreExplanation?: boolean | null;
    relationshipPrivacy?: RelationshipPrivacy[] | null;
    relationshipScores?: RelationshipScore[] | null;
    competencyResults?: CompetencyResult[] | null;
    publishedComments?: PublishedComment[] | null;
    scoreCalculationNote?: string | null;
};


type FeedbackSummaryScope = {
    viewerRole?: string | null;
    scopeType?: ScopeType | null;
    title?: string | null;
    description?: string | null;
    ownerName?: string | null;
    departmentId?: number | null;
    departmentName?: string | null;
    employeeCount?: number | null;
    directReportCount?: number | null;
    managedTeamCount?: number | null;
    departmentTeamCount?: number | null;
    teamNames?: string[] | null;
    privacyNotice?: string | null;
    emptyStateMessage?: string | null;
};

type FeedbackTeamSummary = {
    scope?: FeedbackSummaryScope | null;
    viewerRole?: string | null;
    scopeType?: ScopeType | null;
    viewScope?: ScopeType | null;
    scopeTitle?: string | null;
    scopeDescription?: string | null;
    scopeOwnerName?: string | null;
    departmentName?: string | null;
    scopeDepartmentName?: string | null;
    scopeEmployeeCount?: number | null;
    scopeTeamNames?: string[] | null;
    managerUserId?: number | null;
    ownerUserId?: number | null;
    totalDirectReports?: number | null;
    totalManagedEmployees?: number | null;
    totalManagedTeams?: number | null;
    totalDepartmentTeams?: number | null;
    totalDepartmentEmployees?: number | null;
    totalClosedResults?: number | null;
    publishedResultCount?: number | null;
    visibleOverallScoreCount?: number | null;
    visibleAverageScore?: number | null;
    privacyProtectedCount?: number | null;
    coachingPriorityCount?: number | null;
    accessTitle?: string | null;
    accessDescription?: string | null;
    privacyNotice?: string | null;
    emptyStateMessage?: string | null;
    items?: FeedbackResultItem[] | null;
    results?: FeedbackResultItem[] | null;
};

type ManagerSummaryPageProps = {
    expectedScope?: ScopeType;
};

const unwrap = <T,>(response: { data: GenericResponse<T> | T }): T => {
    const body = response.data as GenericResponse<T>;
    if (body && typeof body === 'object' && 'data' in body) {
        return body.data as T;
    }
    return response.data as T;
};

const normalize = (value?: string | null) => String(value ?? '').trim().toUpperCase();

const asArray = <T,>(value?: T[] | null): T[] => (Array.isArray(value) ? value : []);

const bool = (value: boolean | null | undefined, fallback = true) => (value == null ? fallback : Boolean(value));

const formatScore = (value?: number | null) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    const numeric = Number(value);
    return `${numeric.toFixed(1)} / 5`;
};

const formatShortDate = (value?: string | null) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    }).format(parsed);
};

const getEmployeeName = (item: FeedbackResultItem) => item.targetEmployeeName?.trim() || `Employee #${item.targetEmployeeId ?? '—'}`;

const getPositionName = (item: FeedbackResultItem) => item.targetPositionName || item.positionName || '—';

const getDepartmentName = (item: FeedbackResultItem) => item.targetDepartmentName || item.departmentName || '—';

const visibleScoreValue = (item: FeedbackResultItem) => item.overallScore ?? item.score ?? null;

const canShowOverallScore = (item: FeedbackResultItem) => bool(item.includeOverallScore, true) && visibleScoreValue(item) != null;

const hasPrivacyProtectedGroup = (item: FeedbackResultItem) =>
    asArray(item.relationshipPrivacy).some((entry) => entry.visibleOutsideHr === false || entry.thresholdMet === false);

const confidenceLabel = (item: FeedbackResultItem) => {
    if (item.insufficientFeedback) return 'Insufficient';
    const value = normalize(item.confidenceLevel);
    if (!value) return 'Not calculated';
    return value.charAt(0) + value.slice(1).toLowerCase();
};

const confidenceClass = (item: FeedbackResultItem) => {
    if (item.insufficientFeedback) return 'insufficient';
    const value = normalize(item.confidenceLevel);
    if (value === 'HIGH') return 'high';
    if (value === 'MEDIUM') return 'medium';
    if (value === 'LOW') return 'low';
    return 'neutral';
};

const scoreBand = (item: FeedbackResultItem) => {
    const category = item.scoreCategory?.trim();
    if (category) return category;
    const score = visibleScoreValue(item);
    if (score == null) return 'Score hidden';
    if (score >= 4.2) return 'Strong result';
    if (score >= 3.5) return 'Stable result';
    return 'Development focus';
};

const isCoachingPriority = (item: FeedbackResultItem) => {
    const score = visibleScoreValue(item);
    const confidence = normalize(item.confidenceLevel);
    return Boolean(item.insufficientFeedback || confidence === 'LOW' || score != null && score < 3.5);
};

const sortedCompetencies = (item: FeedbackResultItem, direction: 'desc' | 'asc') =>
    asArray(item.competencyResults)
        .filter((entry) => entry.averageScore != null)
        .slice()
        .sort((a, b) => {
            const left = Number(a.averageScore ?? 0);
            const right = Number(b.averageScore ?? 0);
            return direction === 'desc' ? right - left : left - right;
        });

const firstVisibleRelationshipScore = (item: FeedbackResultItem, relationshipType: string) =>
    asArray(item.relationshipScores).find((entry) => normalize(entry.relationshipType) === relationshipType && entry.visibleOutsideHr !== false);

const relationshipPrivacyFor = (item: FeedbackResultItem, relationshipType?: string | null) =>
    asArray(item.relationshipPrivacy).find((entry) => normalize(entry.relationshipType) === normalize(relationshipType));

const coachingFocusText = (item: FeedbackResultItem) => {
    const low = sortedCompetencies(item, 'asc')[0];
    const high = sortedCompetencies(item, 'desc')[0];

    if (low?.competencyName && high?.competencyName) {
        return `Strength: ${high.competencyName} · Focus: ${low.competencyName}`;
    }
    if (low?.competencyName) return `Focus: ${low.competencyName}`;
    if (high?.competencyName) return `Strength: ${high.competencyName}`;
    if (isCoachingPriority(item)) return 'Review confidence and follow-up needs';
    return 'No specific focus published yet';
};

const uniqueCampaigns = (items: FeedbackResultItem[]) =>
    [...new Set(items.map((item) => item.campaignName).filter((value): value is string => Boolean(value?.trim())))].sort();

const uniqueEmployees = (items: FeedbackResultItem[]) =>
    [...new Set(items.map(getEmployeeName).filter(Boolean))].sort();

const ManagerSummaryPage = ({ expectedScope = 'MANAGER_DIRECT_REPORTS' }: ManagerSummaryPageProps) => {
    const [summary, setSummary] = useState<FeedbackTeamSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<FeedbackResultItem | null>(null);
    const [query, setQuery] = useState('');
    const [campaignFilter, setCampaignFilter] = useState('ALL');
    const [employeeFilter, setEmployeeFilter] = useState('ALL');
    const [coachingFilter, setCoachingFilter] = useState<CoachingFilter>('ALL');
    const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('ALL');
    const [privacyFilter, setPrivacyFilter] = useState<PrivacyFilter>('ALL');

    const loadSummary = async (showRefreshing = false) => {
        try {
            if (showRefreshing) setRefreshing(true);
            if (!summary) setLoading(true);
            setError('');
            const response = await api.get<GenericResponse<FeedbackTeamSummary>>('/v1/feedback/team-summary');
            const data = unwrap<FeedbackTeamSummary>(response);
            setSummary(data || null);
            const rows = asArray(data?.items ?? data?.results);
            setSelected((previous) => {
                if (!previous) return rows[0] ?? null;
                return rows.find((row) => row.campaignId === previous.campaignId && row.targetEmployeeId === previous.targetEmployeeId) ?? rows[0] ?? null;
            });
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Managed employee 360 summary could not be loaded.');
            setSummary(null);
            setSelected(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void loadSummary(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const rawItems = useMemo(() => asArray(summary?.items ?? summary?.results), [summary]);

    const isManagerScope = useMemo(() => {
        const scope = normalize(summary?.scope?.scopeType || summary?.scopeType || summary?.viewScope || expectedScope);
        return scope === 'MANAGER_SCOPE' || scope === 'MANAGER_DIRECT_REPORTS' || scope.includes('MANAGER');
    }, [summary, expectedScope]);

    const campaigns = useMemo(() => uniqueCampaigns(rawItems), [rawItems]);
    const employees = useMemo(() => uniqueEmployees(rawItems), [rawItems]);

    const filteredItems = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rawItems.filter((item) => {
            const searchText = [
                getEmployeeName(item),
                item.targetEmployeeCode,
                item.campaignName,
                getPositionName(item),
                getDepartmentName(item),
                item.scoreCategory,
                item.confidenceLevel,
                coachingFocusText(item),
            ].filter(Boolean).join(' ').toLowerCase();

            if (q && !searchText.includes(q)) return false;
            if (campaignFilter !== 'ALL' && item.campaignName !== campaignFilter) return false;
            if (employeeFilter !== 'ALL' && getEmployeeName(item) !== employeeFilter) return false;
            if (coachingFilter === 'PRIORITY' && !isCoachingPriority(item)) return false;
            if (coachingFilter === 'STABLE' && isCoachingPriority(item)) return false;
            if (confidenceFilter === 'INSUFFICIENT' && !item.insufficientFeedback) return false;
            if (confidenceFilter !== 'ALL' && confidenceFilter !== 'INSUFFICIENT' && normalize(item.confidenceLevel) !== confidenceFilter) return false;
            if (privacyFilter === 'PROTECTED' && !hasPrivacyProtectedGroup(item)) return false;
            if (privacyFilter === 'CLEAR' && hasPrivacyProtectedGroup(item)) return false;
            return true;
        });
    }, [rawItems, query, campaignFilter, employeeFilter, coachingFilter, confidenceFilter, privacyFilter]);

    const metrics = useMemo(() => {
        const published = rawItems.length;
        const visibleScores = rawItems.filter(canShowOverallScore);
        const visibleAverage = visibleScores.length
            ? visibleScores.reduce((sum, item) => sum + Number(visibleScoreValue(item) || 0), 0) / visibleScores.length
            : null;
        return {
            managedEmployees: summary?.scope?.employeeCount ?? summary?.scopeEmployeeCount ?? summary?.totalManagedEmployees ?? summary?.totalDirectReports ?? 0,
            managedTeams: summary?.scope?.managedTeamCount ?? summary?.totalManagedTeams ?? asArray(summary?.scope?.teamNames ?? summary?.scopeTeamNames).length,
            publishedResults: summary?.publishedResultCount ?? summary?.totalClosedResults ?? published,
            visibleScoreCount: summary?.visibleOverallScoreCount ?? visibleScores.length,
            visibleAverage: summary?.visibleAverageScore ?? visibleAverage,
            privacyProtected: summary?.privacyProtectedCount ?? rawItems.filter(hasPrivacyProtectedGroup).length,
            coachingPriority: summary?.coachingPriorityCount ?? rawItems.filter(isCoachingPriority).length,
        };
    }, [rawItems, summary]);

    const priorityItems = useMemo(() => rawItems.filter(isCoachingPriority).slice(0, 4), [rawItems]);
    const recentlyPublished = useMemo(() => rawItems.slice().sort((a, b) => String(b.publishedAt || b.summarizedAt || '').localeCompare(String(a.publishedAt || a.summarizedAt || ''))).slice(0, 4), [rawItems]);

    const scopeTeamNames = asArray(summary?.scope?.teamNames ?? summary?.scopeTeamNames);
    const headerTitle = isManagerScope ? 'Managed Employee 360 Summary' : summary?.scope?.title || summary?.scopeTitle || 'Department 360 Summary';
    const headerDescription = isManagerScope
        ? summary?.scope?.description || 'Review HR-published 360 results for employees in your management scope. Use this page for coaching, follow-up, and development conversations.'
        : summary?.scope?.description || summary?.scopeDescription || 'Review HR-published 360 results with privacy-safe relationship masking.';

    return (
        <div className="manager360-page">
            <section className="manager360-header-card">
                <div className="manager360-header-copy">
                    <span className="manager360-kicker">360 Feedback · Privacy-safe summary</span>
                    <h1>{headerTitle}</h1>
                    <p>{headerDescription}</p>
                    <div className="manager360-chip-row">
                        <span className="manager360-chip">Managed employees: {metrics.managedEmployees}</span>
                        <span className="manager360-chip">Published results only</span>
                        <span className="manager360-chip">No evaluator names</span>
                        {scopeTeamNames.slice(0, 2).map((team) => <span className="manager360-chip" key={team}>Team: {team}</span>)}
                        {scopeTeamNames.length > 2 && <span className="manager360-chip">+{scopeTeamNames.length - 2} more teams</span>}
                    </div>
                </div>
                <div className="manager360-header-actions">
                    <button className="manager360-button primary" type="button" onClick={() => void loadSummary(true)} disabled={refreshing || loading}>
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </section>

            <section className="manager360-privacy-note">
                <span className="manager360-note-icon"><i className="bi bi-shield-check" /></span>
                <div>
                    <h2>Privacy-safe manager view</h2>
                    <p>
                        {summary?.scope?.privacyNotice || summary?.privacyNotice || 'Only HR-published summaries are shown. Evaluator names are never shown. Peer and subordinate reviewer groups may be hidden when confidentiality thresholds are not met.'}
                    </p>
                </div>
            </section>

            {error && <div className="manager360-alert error">{error}</div>}
            {loading && <div className="manager360-loading">Loading managed employee 360 summary…</div>}

            {!loading && (
                <>
                    <section className="manager360-metrics-grid">
                        <MetricCard icon="bi-people" label="Managed employees" value={metrics.managedEmployees} helper="Employees currently in your management scope." />
                        <MetricCard icon="bi-check2-circle" label="Published results" value={metrics.publishedResults} helper="Only HR-published 360 summaries are shown." />
                        <MetricCard icon="bi-chat-heart" label="Coaching priority" value={metrics.coachingPriority} helper="Lower confidence, lower score, or development-focused feedback." tone={metrics.coachingPriority > 0 ? 'warning' : 'neutral'} />
                        <MetricCard icon="bi-shield-lock" label="Privacy protected" value={metrics.privacyProtected} helper="Results with at least one masked relationship group." />
                        <MetricCard icon="bi-graph-up" label="Visible average" value={metrics.visibleAverage == null ? '—' : formatScore(metrics.visibleAverage)} helper="Calculated only from results where HR published overall score." />
                    </section>

                    <section className="manager360-panel manager360-followup-panel">
                        <div className="manager360-panel-header">
                            <div>
                                <h2>Coaching follow-up</h2>
                                <p>Use this area to prioritize supportive one-on-one conversations.</p>
                            </div>
                            <span>{priorityItems.length} priority item(s)</span>
                        </div>
                        {priorityItems.length === 0 ? (
                            <div className="manager360-empty compact">
                                <i className="bi bi-chat-square-heart" />
                                <strong>No coaching follow-up yet</strong>
                                <p>Published 360 results that need manager attention will appear here.</p>
                            </div>
                        ) : (
                            <div className="manager360-priority-list">
                                {priorityItems.map((item) => (
                                    <button key={`${item.campaignId}-${item.targetEmployeeId}`} type="button" onClick={() => setSelected(item)} className="manager360-priority-item">
                    <span>
                      <strong>{getEmployeeName(item)}</strong>
                      <small>{coachingFocusText(item)}</small>
                    </span>
                                        <em>{confidenceLabel(item)}</em>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="manager360-filters manager360-panel">
                        <label className="manager360-filter full">
                            <span>Search</span>
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee, campaign, confidence…" />
                        </label>
                        <label className="manager360-filter">
                            <span>Campaign</span>
                            <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}>
                                <option value="ALL">All campaigns</option>
                                {campaigns.map((campaign) => <option value={campaign} key={campaign}>{campaign}</option>)}
                            </select>
                        </label>
                        <label className="manager360-filter">
                            <span>Managed employee</span>
                            <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
                                <option value="ALL">All employees</option>
                                {employees.map((employee) => <option value={employee} key={employee}>{employee}</option>)}
                            </select>
                        </label>
                        <label className="manager360-filter">
                            <span>Coaching need</span>
                            <select value={coachingFilter} onChange={(event) => setCoachingFilter(event.target.value as CoachingFilter)}>
                                <option value="ALL">All results</option>
                                <option value="PRIORITY">Coaching priority</option>
                                <option value="STABLE">Stable results</option>
                            </select>
                        </label>
                        <label className="manager360-filter">
                            <span>Confidence</span>
                            <select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value as ConfidenceFilter)}>
                                <option value="ALL">All confidence levels</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                                <option value="INSUFFICIENT">Insufficient feedback</option>
                            </select>
                        </label>
                        <label className="manager360-filter">
                            <span>Privacy</span>
                            <select value={privacyFilter} onChange={(event) => setPrivacyFilter(event.target.value as PrivacyFilter)}>
                                <option value="ALL">All privacy states</option>
                                <option value="PROTECTED">Has masked groups</option>
                                <option value="CLEAR">No masked groups</option>
                            </select>
                        </label>
                    </section>

                    <section className="manager360-content-grid">
                        <div className="manager360-panel manager360-results-panel">
                            <div className="manager360-panel-header">
                                <div>
                                    <h2>Published employee summaries</h2>
                                    <p>No evaluator names are shown. Relationship groups are masked when campaign privacy thresholds are not met.</p>
                                </div>
                                <span>{filteredItems.length} result(s)</span>
                            </div>

                            {filteredItems.length === 0 ? (
                                <div className="manager360-empty">
                                    <i className="bi bi-inbox" />
                                    <strong>No published results yet</strong>
                                    <p>{summary?.scope?.emptyStateMessage || summary?.emptyStateMessage || 'You may have managed employees, but HR has not published their 360 summaries yet.'}</p>
                                </div>
                            ) : (
                                <div className="manager360-table-wrap">
                                    <table className="manager360-table">
                                        <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Campaign</th>
                                            <th>Visible score</th>
                                            <th>Confidence</th>
                                            <th>Coaching focus</th>
                                            <th>Privacy</th>
                                            <th />
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {filteredItems.map((item) => {
                                            const active = selected?.campaignId === item.campaignId && selected?.targetEmployeeId === item.targetEmployeeId;
                                            return (
                                                <tr key={`${item.campaignId}-${item.targetEmployeeId}`} className={active ? 'selected' : ''}>
                                                    <td>
                                                        <strong>{getEmployeeName(item)}</strong>
                                                        <small>{getPositionName(item)} · {getDepartmentName(item)}</small>
                                                    </td>
                                                    <td>{item.campaignName || `Campaign #${item.campaignId ?? '—'}`}</td>
                                                    <td>{canShowOverallScore(item) ? formatScore(visibleScoreValue(item)) : 'Hidden by HR'}</td>
                                                    <td><span className={`manager360-status ${confidenceClass(item)}`}>{confidenceLabel(item)}</span></td>
                                                    <td>{coachingFocusText(item)}</td>
                                                    <td>{hasPrivacyProtectedGroup(item) ? <span className="manager360-status protected">Masked groups</span> : <span className="manager360-status clear">Clear</span>}</td>
                                                    <td><button className="manager360-link-button" type="button" onClick={() => setSelected(item)}>View summary</button></td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <EmployeeDetail item={selected} recentlyPublished={recentlyPublished} />
                    </section>
                </>
            )}
        </div>
    );
};

const MetricCard = ({ icon, label, value, helper, tone = 'neutral' }: { icon: string; label: string; value: string | number; helper: string; tone?: 'neutral' | 'warning' }) => (
    <div className={`manager360-metric ${tone}`}>
        <span className="manager360-metric-icon"><i className={`bi ${icon}`} /></span>
        <div>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{helper}</small>
        </div>
    </div>
);

const EmployeeDetail = ({ item, recentlyPublished }: { item: FeedbackResultItem | null; recentlyPublished: FeedbackResultItem[] }) => {
    if (!item) {
        return (
            <aside className="manager360-panel manager360-detail-panel">
                <div className="manager360-empty compact">
                    <i className="bi bi-person-lines-fill" />
                    <strong>Select a result</strong>
                    <p>Choose an employee summary to view coaching-safe details.</p>
                </div>
                {recentlyPublished.length > 0 && (
                    <div className="manager360-side-list">
                        <h3>Recently published</h3>
                        {recentlyPublished.map((row) => <span key={`${row.campaignId}-${row.targetEmployeeId}`}>{getEmployeeName(row)}</span>)}
                    </div>
                )}
            </aside>
        );
    }

    const strengths = sortedCompetencies(item, 'desc').slice(0, 3);
    const development = sortedCompetencies(item, 'asc').slice(0, 3);
    const comments = asArray(item.publishedComments).filter((comment) => comment.visibleOutsideHr !== false && comment.comment?.trim());
    const showCompetencies = bool(item.includeCompetencyBreakdown, true);
    const showSelfVsOthers = bool(item.includeSelfVsOthers, true);
    const showComments = bool(item.includeComments, false);
    const selfScore = firstVisibleRelationshipScore(item, 'SELF');
    const others = asArray(item.relationshipScores).filter((entry) => normalize(entry.relationshipType) !== 'SELF' && entry.visibleOutsideHr !== false && entry.averageScore != null);
    const othersAverage = others.length ? others.reduce((sum, entry) => sum + Number(entry.averageScore || 0), 0) / others.length : null;

    return (
        <aside className="manager360-panel manager360-detail-panel">
            <div className="manager360-detail-header">
                <span>Coaching overview</span>
                <h2>{getEmployeeName(item)}</h2>
                <p>{getPositionName(item)} · {getDepartmentName(item)}</p>
                <div className="manager360-detail-meta">
                    <span>{item.campaignName || `Campaign #${item.campaignId ?? '—'}`}</span>
                    <span>Published {formatShortDate(item.publishedAt || item.summarizedAt)}</span>
                </div>
            </div>

            <div className="manager360-score-box">
                <span>Overall score</span>
                <strong>{canShowOverallScore(item) ? formatScore(visibleScoreValue(item)) : 'Hidden by HR'}</strong>
                <small>{scoreBand(item)} · {confidenceLabel(item)}</small>
            </div>

            <section className="manager360-detail-section">
                <h3>Strengths and development focus</h3>
                {showCompetencies ? (
                    <div className="manager360-two-col">
                        <div>
                            <h4>Top strengths</h4>
                            {strengths.length ? strengths.map((entry) => <ScoreLine key={`strong-${entry.competencyCode || entry.competencyName}`} label={entry.competencyName || entry.competencyCode || 'Competency'} value={entry.averageScore} />) : <p className="manager360-muted">No competency strengths were published.</p>}
                        </div>
                        <div>
                            <h4>Development focus</h4>
                            {development.length ? development.map((entry) => <ScoreLine key={`focus-${entry.competencyCode || entry.competencyName}`} label={entry.competencyName || entry.competencyCode || 'Competency'} value={entry.averageScore} />) : <p className="manager360-muted">No development focus was published.</p>}
                        </div>
                    </div>
                ) : <p className="manager360-muted">Competency breakdown was not included in the published result.</p>}
            </section>

            <section className="manager360-detail-section">
                <h3>Self vs others</h3>
                {showSelfVsOthers ? (
                    <div className="manager360-self-grid">
                        <div><span>Self score</span><strong>{selfScore?.averageScore == null ? '—' : formatScore(selfScore.averageScore)}</strong></div>
                        <div><span>Others average</span><strong>{othersAverage == null ? '—' : formatScore(othersAverage)}</strong></div>
                        <p>Use this as a conversation guide. Avoid interpreting hidden relationship groups directly.</p>
                    </div>
                ) : <p className="manager360-muted">Self vs others comparison was not included in the published result.</p>}
            </section>

            <section className="manager360-detail-section">
                <h3>Relationship summary</h3>
                <div className="manager360-relationship-list">
                    {asArray(item.relationshipScores).length === 0 && asArray(item.relationshipPrivacy).length === 0 && <p className="manager360-muted">No relationship summary was published.</p>}
                    {asArray(item.relationshipScores).map((entry) => {
                        const privacy = relationshipPrivacyFor(item, entry.relationshipType);
                        const visible = entry.visibleOutsideHr !== false && privacy?.visibleOutsideHr !== false;
                        return (
                            <div className="manager360-relationship-row" key={`${entry.relationshipType}-${entry.label}`}>
                                <span>{entry.label || entry.relationshipType || 'Relationship'}</span>
                                <strong>{visible ? formatScore(entry.averageScore) : 'Hidden'}</strong>
                                <small>{visible ? `${entry.responseCount ?? 0} response(s)` : privacy?.hiddenReason || entry.hiddenReason || 'Privacy threshold not met'}</small>
                            </div>
                        );
                    })}
                    {asArray(item.relationshipPrivacy)
                        .filter((privacy) => !asArray(item.relationshipScores).some((score) => normalize(score.relationshipType) === normalize(privacy.relationshipType)))
                        .map((privacy) => (
                            <div className="manager360-relationship-row" key={`privacy-${privacy.relationshipType}`}>
                                <span>{privacy.label || privacy.relationshipType || 'Relationship'}</span>
                                <strong>{privacy.visibleOutsideHr === false ? 'Hidden' : '—'}</strong>
                                <small>{privacy.hiddenReason || `${privacy.responseCount ?? 0} response(s)`}</small>
                            </div>
                        ))}
                </div>
            </section>

            <section className="manager360-detail-section">
                <h3>Anonymous comments</h3>
                {!showComments && <p className="manager360-muted">Comments were not included in the published result.</p>}
                {showComments && comments.length === 0 && <p className="manager360-muted">No privacy-safe comments are visible for this result.</p>}
                {showComments && comments.length > 0 && (
                    <div className="manager360-comment-list">
                        {comments.slice(0, 5).map((comment, index) => (
                            <blockquote key={`${comment.relationshipType}-${index}`}>
                                <span>{comment.competencyName || comment.relationshipLabel || 'Anonymous feedback'}</span>
                                <p>{comment.comment}</p>
                            </blockquote>
                        ))}
                    </div>
                )}
            </section>

            <section className="manager360-detail-section manager360-next-steps">
                <h3>Suggested coaching next steps</h3>
                <ul>
                    <li>Start with one strength to reinforce positive behavior.</li>
                    <li>Choose one development focus for the next one-on-one discussion.</li>
                    <li>Ask what support, resources, or clarity would help the employee improve.</li>
                    <li>Do not reference hidden relationship groups directly.</li>
                </ul>
            </section>
        </aside>
    );
};

const ScoreLine = ({ label, value }: { label: string; value?: number | null }) => {
    const width = value == null ? 0 : Math.max(0, Math.min(100, Number(value) / 5 * 100));
    return (
        <div className="manager360-score-line">
            <div><span>{label}</span><strong>{formatScore(value)}</strong></div>
            <div className="manager360-score-track"><span style={{ width: `${width}%` }} /></div>
        </div>
    );
};

export default ManagerSummaryPage;

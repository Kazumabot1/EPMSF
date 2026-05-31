/*Z*/
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    DashboardChartCard,
    DashboardMetricCard,
    DashboardShell,
    ComparisonColumnChart,
    DonutSummaryChart,
    EmptyChartState,
    HorizontalBarChart,
    InsightCard,
    StatusDistributionChart,
} from '../../components/dashboard';
import { exportToExcel } from '../../utils/exportExcel';
import {
    buildCompletionBars,
    buildScoreBands,
    buildStatusDistribution,
    buildTopValueBars,
    DASHBOARD_CHART_COLORS,
    formatDashboardPercent,
    normalizeDashboardStatus,
    toDashboardNumber,
    withDashboardPercentages,
    type DashboardCompletionDatum,
} from '../../utils/dashboardChartData';
import {
    reportingService,
    type DepartmentPerformanceRow,
    type EmployeePerformanceRow,
    type FeedbackParticipationRow,
    type PipReportRow,
    type RecommendationRow,
    type ReportingDashboard,
} from '../../services/reportingService';
import './reporting-dashboard.css';

const emptyDashboard: ReportingDashboard = {
    access: {},
    summary: {
        totalEmployees: 0,
        activeEmployees: 0,
        totalAssessments: 0,
        submittedAssessments: 0,
        approvedAssessments: 0,
        pendingAssessments: 0,
        activePips: 0,
        completedPips: 0,
        feedbackCampaigns: 0,
        activeFeedbackCampaigns: 0,
        averageAssessmentScore: 0,
        feedbackCompletionRate: 0,
        highPerformers: 0,
        lowPerformers: 0,
    },
    departmentPerformance: [],
    employeePerformance: [],
    assessmentStatusBreakdown: [],
    pipStatusReport: [],
    feedbackParticipation: [],
    promotionRecommendations: [],
};

const errorMessage = (error: any) => {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Unable to load reporting data.'
    );
};

const formatNumber = (value?: number | null) => Number(value ?? 0).toLocaleString();

const formatPercent = (value?: number | null) => `${Number(value ?? 0).toFixed(1)}%`;

const formatDate = (value?: string | null) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }

    return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).replace('T', ' ').slice(0, 16);
    }

    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const cleanStatus = (value?: string | null) => normalizeDashboardStatus(value || 'UNKNOWN');

const scoreClass = (score?: number | null) => {
    const value = Number(score ?? 0);

    if (value >= 86) return 'report-score report-score--great';
    if (value >= 71) return 'report-score report-score--good';
    if (value >= 60) return 'report-score report-score--ok';
    if (value >= 40) return 'report-score report-score--warn';
    return 'report-score report-score--bad';
};

type ReportType = 'employees' | 'departments' | 'pip' | 'feedback' | 'recommendations';

type ReportingDashboardPageProps = {
    reportType?: ReportType;
};

type ReportCopy = {
    title: string;
    description: string;
    exportLabel: string;
    searchPlaceholder: string;
    heroMetricLabel: string;
    heroMetricValue: (dashboard: ReportingDashboard) => string;
    heroMetricDetail: (dashboard: ReportingDashboard) => string;
};

const reportCopy: Record<ReportType, ReportCopy> = {
    employees: {
        title: 'Performance Reports',
        description: 'View submitted appraisal results, scores, review status, and employee performance labels.',
        exportLabel: 'employee-performance-report',
        searchPlaceholder: 'Search employees, department, manager, status...',
        heroMetricLabel: 'Average score',
        heroMetricValue: (dashboard) => hasSubmittedPerformanceData(dashboard) ? formatPercent(dashboard.summary.averageAssessmentScore) : '—',
        heroMetricDetail: (dashboard) => hasSubmittedPerformanceData(dashboard) ? `${formatNumber(dashboard.summary.submittedAssessments)} submitted assessments` : 'No submitted assessments',
    },
    departments: {
        title: 'Department Performance',
        description: 'Compare department-level assessment volume, average score, pending reviews, and active PIP load.',
        exportLabel: 'department-performance-report',
        searchPlaceholder: 'Search departments or performance label...',
        heroMetricLabel: 'Departments tracked',
        heroMetricValue: (dashboard) => formatNumber(dashboard.departmentPerformance.length),
        heroMetricDetail: (dashboard) => `${formatNumber(dashboard.summary.activeEmployees)} active employees`,
    },
    pip: {
        title: 'PIP Status',
        description: 'Track active and completed performance improvement plans by employee, department, and owner.',
        exportLabel: 'pip-status-report',
        searchPlaceholder: 'Search employee, department, goal, owner...',
        heroMetricLabel: 'Active PIPs',
        heroMetricValue: (dashboard) => formatNumber(dashboard.summary.activePips),
        heroMetricDetail: (dashboard) => `${formatNumber(dashboard.summary.completedPips)} completed plans`,
    },
    feedback: {
        title: 'Feedback Completion',
        description: 'Monitor 360 feedback campaign participation, submitted responses, pending responses, and completion rate.',
        exportLabel: 'feedback-participation-report',
        searchPlaceholder: 'Search campaign or status...',
        heroMetricLabel: 'Completion rate',
        heroMetricValue: (dashboard) => {
            const totals = getFeedbackTotals(dashboard);
            return totals.assigned > 0 ? formatPercent(totals.completionRate) : '—';
        },
        heroMetricDetail: (dashboard) => {
            const totals = getFeedbackTotals(dashboard);
            return totals.assigned > 0 ? `${formatNumber(totals.submitted)} of ${formatNumber(totals.assigned)} submitted` : 'No assigned feedback tasks';
        },
    },
    recommendations: {
        title: 'Recommendations',
        description: 'Review promotion, increment, and performance-watch recommendations generated from appraisal scores.',
        exportLabel: 'recommendation-report',
        searchPlaceholder: 'Search employee, department, recommendation...',
        heroMetricLabel: 'Recommendations',
        heroMetricValue: (dashboard) => formatNumber(dashboard.promotionRecommendations.length),
        heroMetricDetail: (dashboard) => `${formatNumber(dashboard.summary.highPerformers)} high performers`,
    },
};

const reportVariant: Record<ReportType, 'slate' | 'emerald' | 'violet' | 'amber'> = {
    employees: 'slate',
    departments: 'slate',
    pip: 'slate',
    feedback: 'slate',
    recommendations: 'slate',
};

const hasSubmittedPerformanceData = (dashboard: ReportingDashboard) =>
    toDashboardNumber(dashboard.summary.submittedAssessments) > 0 ||
    dashboard.employeePerformance.some((row) => toDashboardNumber(row.scorePercent) > 0);

const getFeedbackTotals = (dashboard: ReportingDashboard) => {
    const assigned = dashboard.feedbackParticipation.reduce((sum, row) => sum + toDashboardNumber(row.assignedCount), 0);
    const submitted = dashboard.feedbackParticipation.reduce((sum, row) => sum + toDashboardNumber(row.submittedCount), 0);
    const pending = dashboard.feedbackParticipation.reduce((sum, row) => sum + toDashboardNumber(row.pendingCount), 0);
    const completionRate = assigned > 0 ? (submitted / assigned) * 100 : 0;

    return { assigned, submitted, pending, completionRate };
};


type ReportNavItem = {
    label: string;
    helper: string;
    icon: string;
    path: string;
    type?: ReportType;
};

const resolveReportBasePath = (pathname: string) => {
    if (pathname.startsWith('/manager/reports')) return '/manager/reports';
    if (pathname.startsWith('/department-head/reports')) return '/department-head/reports';
    if (pathname.startsWith('/executive/reports')) return '/executive/reports';
    return '/hr/reports';
};

const buildReportNavItems = (basePath: string): ReportNavItem[] => {
    const isManager = basePath.includes('/manager/');
    const supportsAssessmentScores = basePath.includes('/hr/') || basePath.includes('/department-head/');

    return [
        {
            label: 'Performance',
            helper: 'Employee appraisal results',
            icon: 'bi-graph-up-arrow',
            path: `${basePath}/performance`,
            type: 'employees',
        },
        ...(!isManager
            ? [
                {
                    label: 'Departments',
                    helper: 'Department comparison',
                    icon: 'bi-building',
                    path: `${basePath}/department-performance`,
                    type: 'departments' as ReportType,
                },
            ]
            : []),
        ...(supportsAssessmentScores
            ? [
                {
                    label: 'Assessment Scores',
                    helper: 'Detailed score table',
                    icon: 'bi-table',
                    path: `${basePath}/assessment-scores`,
                },
            ]
            : []),
        {
            label: 'PIP Status',
            helper: 'Improvement plan tracking',
            icon: 'bi-clipboard2-pulse',
            path: `${basePath}/pip-status`,
            type: 'pip',
        },
        {
            label: 'Feedback',
            helper: '360 participation',
            icon: 'bi-chat-square-text',
            path: `${basePath}/feedback-completion`,
            type: 'feedback',
        },
        {
            label: 'Recommendations',
            helper: 'Promotion and watchlist',
            icon: 'bi-stars',
            path: `${basePath}/recommendations`,
            type: 'recommendations',
        },
    ];
};

const ReportingDashboardPage = ({ reportType = 'employees' }: ReportingDashboardPageProps) => {
    const location = useLocation();
    const [dashboard, setDashboard] = useState<ReportingDashboard>(emptyDashboard);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const activeReportType: ReportType = reportCopy[reportType] ? reportType : 'employees';
    const activeCopy = reportCopy[activeReportType];
    const reportBasePath = resolveReportBasePath(location.pathname);
    const reportNavItems = useMemo(() => buildReportNavItems(reportBasePath), [reportBasePath]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await reportingService.getDashboard();
            setDashboard(data);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadDashboard();
    }, []);

    const filteredEmployees = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return dashboard.employeePerformance;

        return dashboard.employeePerformance.filter((row) =>
            [
                row.employeeName,
                row.employeeCode,
                row.departmentName,
                row.position,
                row.managerName,
                row.status,
                row.performanceLabel,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search)),
        );
    }, [dashboard.employeePerformance, query]);

    const filteredDepartments = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return dashboard.departmentPerformance;

        return dashboard.departmentPerformance.filter((row) =>
            [row.departmentName, row.performanceLabel]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search)),
        );
    }, [dashboard.departmentPerformance, query]);

    const filteredPips = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return dashboard.pipStatusReport;

        return dashboard.pipStatusReport.filter((row) =>
            [row.employeeName, row.employeeCode, row.departmentName, row.goal, row.createdByName]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search)),
        );
    }, [dashboard.pipStatusReport, query]);

    const filteredFeedback = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return dashboard.feedbackParticipation;

        return dashboard.feedbackParticipation.filter((row) =>
            [row.campaignName, row.status]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search)),
        );
    }, [dashboard.feedbackParticipation, query]);

    const filteredRecommendations = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return dashboard.promotionRecommendations;

        return dashboard.promotionRecommendations.filter((row) =>
            [row.employeeName, row.employeeCode, row.departmentName, row.recommendationType, row.performanceLabel, row.reason]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search)),
        );
    }, [dashboard.promotionRecommendations, query]);

    const tableRowCount = useMemo(() => {
        if (activeReportType === 'employees') return filteredEmployees.length;
        if (activeReportType === 'departments') return filteredDepartments.length;
        if (activeReportType === 'pip') return filteredPips.length;
        if (activeReportType === 'feedback') return filteredFeedback.length;
        return filteredRecommendations.length;
    }, [activeReportType, filteredDepartments.length, filteredEmployees.length, filteredFeedback.length, filteredPips.length, filteredRecommendations.length]);

    const analytics = useMemo(() => buildReportingAnalytics(dashboard), [dashboard]);
    const reportMetrics = useMemo(() => buildReportMetricCards(activeReportType, dashboard, analytics), [activeReportType, dashboard, analytics]);
    const reportInsights = useMemo(() => buildReportInsightCards(activeReportType, dashboard, analytics), [activeReportType, dashboard, analytics]);

    const exportActiveReport = () => {
        if (activeReportType === 'employees') {
            exportToExcel<EmployeePerformanceRow & Record<string, unknown>>(
                filteredEmployees as (EmployeePerformanceRow & Record<string, unknown>)[],
                [
                    { header: 'Employee', key: 'employeeName' },
                    { header: 'Code', key: 'employeeCode' },
                    { header: 'Department', key: 'departmentName' },
                    { header: 'Position', key: 'position' },
                    { header: 'Manager', key: 'managerName' },
                    { header: 'Form', key: 'formName' },
                    { header: 'Period', key: 'period' },
                    { header: 'Status', key: 'status' },
                    { header: 'Score %', key: 'scorePercent' },
                    { header: 'Label', key: 'performanceLabel' },
                    { header: 'Submitted At', key: 'submittedAt' },
                ],
                activeCopy.exportLabel,
            );
            return;
        }

        if (activeReportType === 'departments') {
            exportToExcel<DepartmentPerformanceRow & Record<string, unknown>>(
                filteredDepartments as (DepartmentPerformanceRow & Record<string, unknown>)[],
                [
                    { header: 'Department', key: 'departmentName' },
                    { header: 'Employees', key: 'employeeCount' },
                    { header: 'Assessments', key: 'assessmentCount' },
                    { header: 'Approved', key: 'approvedCount' },
                    { header: 'Pending', key: 'pendingCount' },
                    { header: 'Active PIPs', key: 'activePipCount' },
                    { header: 'Average Score', key: 'averageScore' },
                    { header: 'Label', key: 'performanceLabel' },
                ],
                activeCopy.exportLabel,
            );
            return;
        }

        if (activeReportType === 'pip') {
            exportToExcel<PipReportRow & Record<string, unknown>>(
                filteredPips as (PipReportRow & Record<string, unknown>)[],
                [
                    { header: 'Employee', key: 'employeeName' },
                    { header: 'Code', key: 'employeeCode' },
                    { header: 'Department', key: 'departmentName' },
                    { header: 'Goal', key: 'goal' },
                    { header: 'Active', key: 'active' },
                    { header: 'Start Date', key: 'startDate' },
                    { header: 'End Date', key: 'endDate' },
                    { header: 'Created By', key: 'createdByName' },
                ],
                activeCopy.exportLabel,
            );
            return;
        }

        if (activeReportType === 'feedback') {
            exportToExcel<FeedbackParticipationRow & Record<string, unknown>>(
                filteredFeedback as (FeedbackParticipationRow & Record<string, unknown>)[],
                [
                    { header: 'Campaign', key: 'campaignName' },
                    { header: 'Status', key: 'status' },
                    { header: 'Start Date', key: 'startDate' },
                    { header: 'End Date', key: 'endDate' },
                    { header: 'Assigned', key: 'assignedCount' },
                    { header: 'Submitted', key: 'submittedCount' },
                    { header: 'Pending', key: 'pendingCount' },
                    { header: 'Completion %', key: 'completionRate' },
                ],
                activeCopy.exportLabel,
            );
            return;
        }

        exportToExcel<RecommendationRow & Record<string, unknown>>(
            filteredRecommendations as (RecommendationRow & Record<string, unknown>)[],
            [
                { header: 'Employee', key: 'employeeName' },
                { header: 'Code', key: 'employeeCode' },
                { header: 'Department', key: 'departmentName' },
                { header: 'Recommendation', key: 'recommendationType' },
                { header: 'Score %', key: 'scorePercent' },
                { header: 'Label', key: 'performanceLabel' },
                { header: 'Reason', key: 'reason' },
            ],
            activeCopy.exportLabel,
        );
    };

    if (loading) {
        return (
            <DashboardShell
                className="reporting-page"
                eyebrow="Reporting & Analytics"
                title="Loading reports"
                description="Preparing the latest reporting dashboard data."
                variant="slate"
            >
                <div className="reporting-loading">Loading reports...</div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell
            className="reporting-page"
            eyebrow="Reporting & Analytics"
            title={activeCopy.title}
            description={activeCopy.description}
            metaLabel={activeCopy.heroMetricLabel}
            metaValue={activeCopy.heroMetricValue(dashboard)}
            metaDetail={activeCopy.heroMetricDetail(dashboard)}
            variant={reportVariant[activeReportType]}
        >
            {error && <div className="reporting-error">{error}</div>}

            <ReportingSubnav items={reportNavItems} activeReportType={activeReportType} pathname={location.pathname} />

            <section className="dashboard-grid dashboard-grid--metrics reporting-metrics-grid" aria-label="Reporting summary metrics">
                {reportMetrics.map((metric) => (
                    <DashboardMetricCard
                        key={metric.title}
                        title={metric.title}
                        value={metric.value}
                        detail={metric.detail}
                        icon={<i className={`bi ${metric.icon}`} />}
                        tone={metric.tone}
                        trend={metric.trend}
                    />
                ))}
            </section>

            <section className="dashboard-grid dashboard-grid--three reporting-insight-grid" aria-label="Reporting insights">
                {reportInsights.map((insight) => (
                    <InsightCard
                        key={insight.title}
                        title={insight.title}
                        description={insight.description}
                        icon={<i className={`bi ${insight.icon}`} />}
                        tone={insight.tone}
                    />
                ))}
            </section>

            <ReportVisuals reportType={activeReportType} analytics={analytics} />

            <section className="reporting-toolbar reporting-toolbar--single">
                <div className="reporting-current-section">
                    <span>Current report</span>
                    <strong>{activeCopy.title}</strong>
                    <small>{formatNumber(tableRowCount)} row(s) ready</small>
                </div>

                <div className="reporting-actions">
                    <label className="reporting-search">
                        <i className="bi bi-search" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={activeCopy.searchPlaceholder}
                        />
                    </label>

                    <button type="button" className="reporting-button reporting-button--ghost" onClick={() => void loadDashboard()}>
                        <i className="bi bi-arrow-clockwise" />
                        Refresh
                    </button>

                    <button type="button" className="reporting-button" onClick={exportActiveReport} disabled={tableRowCount === 0}>
                        <i className="bi bi-file-earmark-excel" />
                        Export Excel
                    </button>
                </div>
            </section>

            <section className="reporting-content-card">
                <div className="reporting-section-title">
                    <div>
                        <h2>{activeCopy.title} Table</h2>
                        <span>Use search and export after reviewing the visual summary above.</span>
                    </div>
                    <strong>{formatNumber(tableRowCount)} row(s)</strong>
                </div>
                {activeReportType === 'employees' && <EmployeePerformanceTable rows={filteredEmployees} />}
                {activeReportType === 'departments' && <DepartmentPerformanceTable rows={filteredDepartments} />}
                {activeReportType === 'pip' && <PipTable rows={filteredPips} />}
                {activeReportType === 'feedback' && <FeedbackTable rows={filteredFeedback} />}
                {activeReportType === 'recommendations' && <RecommendationTable rows={filteredRecommendations} />}
            </section>
        </DashboardShell>
    );
};


type ReportInsightCardConfig = {
    title: string;
    description: string;
    icon: string;
    tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
};

type ReportMetricCardConfig = {
    title: string;
    value: string;
    detail: string;
    icon: string;
    tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'slate';
    trend?: { label: string; direction?: 'up' | 'down' | 'flat' };
};

const buildReportInsightCards = (
    reportType: ReportType,
    dashboard: ReportingDashboard,
    analytics: ReportingAnalytics,
): ReportInsightCardConfig[] => {
    const summary = dashboard.summary;
    const feedbackTotals = getFeedbackTotals(dashboard);
    const hasScores = hasSubmittedPerformanceData(dashboard);

    if (reportType === 'departments') {
        return [
            {
                title: dashboard.departmentPerformance.length > 0 ? 'Department comparison ready' : 'No department scores yet',
                description: dashboard.departmentPerformance.length > 0
                    ? `${formatNumber(dashboard.departmentPerformance.length)} department(s) are available for comparison.`
                    : 'Approved appraisal results are required before department score comparison can be shown.',
                icon: 'bi-building-check',
                tone: dashboard.departmentPerformance.length > 0 ? 'success' : 'neutral',
            },
            {
                title: summary.pendingAssessments > 0 ? 'Department reviews pending' : 'Department review queue is clear',
                description: summary.pendingAssessments > 0
                    ? `${formatNumber(summary.pendingAssessments)} appraisal review item(s) still need completion.`
                    : 'No pending department review count is currently reported.',
                icon: 'bi-hourglass-split',
                tone: summary.pendingAssessments > 0 ? 'warning' : 'success',
            },
            {
                title: summary.activePips > 0 ? 'PIP load by department needs review' : 'No department PIP risk',
                description: summary.activePips > 0
                    ? `${formatNumber(summary.activePips)} active improvement plan(s) are linked to department reporting.`
                    : 'No active department-level improvement plan load is currently reported.',
                icon: 'bi-clipboard2-pulse',
                tone: summary.activePips > 0 ? 'danger' : 'success',
            },
        ];
    }

    if (reportType === 'pip') {
        return [
            {
                title: summary.activePips > 0 ? 'Active PIP monitoring required' : 'No active PIP risk',
                description: summary.activePips > 0
                    ? `${formatNumber(summary.activePips)} active improvement plan(s) should stay visible in review meetings.`
                    : 'No active performance improvement plans are currently reported.',
                icon: 'bi-exclamation-triangle',
                tone: summary.activePips > 0 ? 'danger' : 'success',
            },
            {
                title: summary.completedPips > 0 ? 'Completed PIP history available' : 'No completed PIPs yet',
                description: summary.completedPips > 0
                    ? `${formatNumber(summary.completedPips)} improvement plan(s) are completed.`
                    : 'Closed improvement plans will appear here after HR or managers complete PIP follow-up.',
                icon: 'bi-check2-circle',
                tone: summary.completedPips > 0 ? 'success' : 'neutral',
            },
            {
                title: analytics.activePipsByDepartment.length > 0 ? 'Department ownership visible' : 'No department PIP concentration',
                description: analytics.activePipsByDepartment.length > 0
                    ? `${formatNumber(analytics.activePipsByDepartment.length)} department(s) currently have active PIP rows.`
                    : 'No department has an active PIP concentration in the current report.',
                icon: 'bi-diagram-3',
                tone: analytics.activePipsByDepartment.length > 0 ? 'warning' : 'success',
            },
        ];
    }

    if (reportType === 'feedback') {
        return [
            {
                title: feedbackTotals.assigned > 0 ? 'Feedback assignment coverage found' : 'No feedback assignments yet',
                description: feedbackTotals.assigned > 0
                    ? `${formatNumber(feedbackTotals.assigned)} evaluator task(s) are included in this report.`
                    : 'Feedback completion appears after campaigns assign evaluators.',
                icon: 'bi-chat-square-text',
                tone: feedbackTotals.assigned > 0 ? 'info' : 'neutral',
            },
            {
                title: feedbackTotals.completionRate >= 80 ? 'Feedback completion is healthy' : 'Feedback participation needs follow-up',
                description: feedbackTotals.assigned > 0
                    ? `${formatPercent(feedbackTotals.completionRate)} complete · ${formatNumber(feedbackTotals.submitted)} submitted · ${formatNumber(feedbackTotals.pending)} pending.`
                    : 'No submitted or pending feedback response counts are available yet.',
                icon: 'bi-graph-up-arrow',
                tone: feedbackTotals.assigned === 0 ? 'neutral' : feedbackTotals.completionRate >= 80 ? 'success' : 'warning',
            },
            {
                title: summary.activeFeedbackCampaigns > 0 ? 'Active campaigns in progress' : 'No active feedback campaigns',
                description: summary.activeFeedbackCampaigns > 0
                    ? `${formatNumber(summary.activeFeedbackCampaigns)} active campaign(s) should be monitored for completion.`
                    : 'Start or activate a feedback campaign to monitor participation.',
                icon: 'bi-megaphone',
                tone: summary.activeFeedbackCampaigns > 0 ? 'info' : 'neutral',
            },
        ];
    }

    if (reportType === 'recommendations') {
        return [
            {
                title: dashboard.promotionRecommendations.length > 0 ? 'Recommendation rows ready' : 'No recommendation rows yet',
                description: dashboard.promotionRecommendations.length > 0
                    ? `${formatNumber(dashboard.promotionRecommendations.length)} recommendation row(s) are available for review.`
                    : 'Recommendations appear after finalized appraisal scores meet promotion, increment, or watchlist rules.',
                icon: 'bi-stars',
                tone: dashboard.promotionRecommendations.length > 0 ? 'info' : 'neutral',
            },
            {
                title: summary.highPerformers > 0 ? 'High performers detected' : 'No high performer recommendations yet',
                description: summary.highPerformers > 0
                    ? `${formatNumber(summary.highPerformers)} employee(s) are currently counted as high performers.`
                    : 'High performer recommendations require finalized appraisal scores.',
                icon: 'bi-trophy',
                tone: summary.highPerformers > 0 ? 'success' : 'neutral',
            },
            {
                title: summary.lowPerformers > 0 ? 'Watchlist review required' : 'No low performer watchlist rows',
                description: summary.lowPerformers > 0
                    ? `${formatNumber(summary.lowPerformers)} employee(s) require watchlist or coaching review.`
                    : 'No low performer recommendation count is currently reported.',
                icon: 'bi-person-exclamation',
                tone: summary.lowPerformers > 0 ? 'warning' : 'success',
            },
        ];
    }

    return [
        {
            title: summary.pendingAssessments > 0 ? 'Reviews need attention' : 'Review queue is clear',
            description: summary.pendingAssessments > 0
                ? `${formatNumber(summary.pendingAssessments)} appraisal review item(s) are still pending.`
                : 'No pending appraisal review count is currently reported.',
            icon: 'bi-clipboard-check',
            tone: summary.pendingAssessments > 0 ? 'warning' : 'success',
        },
        {
            title: hasScores ? 'Performance data ready' : 'No finalized performance data',
            description: hasScores
                ? `${formatNumber(analytics.topEmployeeBars.length)} scored employee record(s) are available for ranking.`
                : 'Approved appraisal results are needed before score bands and ranking are available.',
            icon: 'bi-bar-chart-line',
            tone: hasScores ? 'success' : 'neutral',
        },
        {
            title: summary.activePips > 0 ? 'Active PIP monitoring required' : 'No active PIP risk',
            description: summary.activePips > 0
                ? `${formatNumber(summary.activePips)} active improvement plan(s) should stay visible in review meetings.`
                : 'No active performance improvement plans are currently reported.',
            icon: 'bi-exclamation-triangle',
            tone: summary.activePips > 0 ? 'danger' : 'success',
        },
    ];
};

const ReportingSubnav = ({
                             items,
                             activeReportType,
                             pathname,
                         }: {
    items: ReportNavItem[];
    activeReportType: ReportType;
    pathname: string;
}) => (
    <nav className="reporting-subnav" aria-label="Report sections">
        {items.map((item) => {
            const isActive = item.type ? item.type === activeReportType : pathname === item.path;

            return (
                <Link
                    key={item.path}
                    to={item.path}
                    className={`reporting-subnav__item ${isActive ? 'reporting-subnav__item--active' : ''}`}
                >
                    <span className="reporting-subnav__icon"><i className={`bi ${item.icon}`} /></span>
                    <span>
            <strong>{item.label}</strong>
            <small>{item.helper}</small>
          </span>
                </Link>
            );
        })}
    </nav>
);

const buildReportMetricCards = (
    reportType: ReportType,
    dashboard: ReportingDashboard,
    analytics: ReportingAnalytics,
): ReportMetricCardConfig[] => {
    const summary = dashboard.summary;
    const feedbackTotals = getFeedbackTotals(dashboard);
    const departmentsWithActivePips = analytics.activePipsByDepartment.length;
    const departmentsWithRecommendations = analytics.recommendationDepartments.length;

    if (reportType === 'departments') {
        return [
            {
                title: 'Departments Tracked',
                value: formatNumber(dashboard.departmentPerformance.length),
                detail: `${formatNumber(summary.activeEmployees)} active employees`,
                icon: 'bi-building',
                tone: 'blue',
            },
            {
                title: 'Department Average',
                value: summary.submittedAssessments > 0 ? formatPercent(summary.averageAssessmentScore) : '—',
                detail: summary.submittedAssessments > 0 ? 'Across approved appraisal data' : 'No finalized scores yet',
                icon: 'bi-bar-chart-line',
                tone: 'emerald',
                trend: { label: scoreHealthLabel(summary.averageAssessmentScore), direction: summary.averageAssessmentScore >= 70 ? 'up' : summary.averageAssessmentScore > 0 ? 'down' : 'flat' },
            },
            {
                title: 'Pending Reviews',
                value: formatNumber(summary.pendingAssessments),
                detail: 'Remaining appraisal workflow items',
                icon: 'bi-hourglass-split',
                tone: summary.pendingAssessments > 0 ? 'amber' : 'emerald',
            },
            {
                title: 'Active PIP Load',
                value: formatNumber(summary.activePips),
                detail: `${formatNumber(departmentsWithActivePips)} department(s) affected`,
                icon: 'bi-clipboard2-pulse',
                tone: summary.activePips > 0 ? 'rose' : 'emerald',
            },
        ];
    }

    if (reportType === 'pip') {
        return [
            {
                title: 'Active PIPs',
                value: formatNumber(summary.activePips),
                detail: 'Currently open improvement plans',
                icon: 'bi-clipboard2-pulse',
                tone: summary.activePips > 0 ? 'rose' : 'emerald',
            },
            {
                title: 'Completed PIPs',
                value: formatNumber(summary.completedPips),
                detail: 'Closed improvement plans',
                icon: 'bi-check2-circle',
                tone: 'emerald',
            },
            {
                title: 'Departments Affected',
                value: formatNumber(departmentsWithActivePips),
                detail: 'Departments with active PIP rows',
                icon: 'bi-diagram-3',
                tone: departmentsWithActivePips > 0 ? 'amber' : 'slate',
            },
            {
                title: 'PIP Report Rows',
                value: formatNumber(dashboard.pipStatusReport.length),
                detail: 'Rows available for export',
                icon: 'bi-table',
                tone: 'blue',
            },
        ];
    }

    if (reportType === 'feedback') {
        return [
            {
                title: 'Active Campaigns',
                value: formatNumber(summary.activeFeedbackCampaigns),
                detail: `${formatNumber(summary.feedbackCampaigns)} total campaign(s)`,
                icon: 'bi-chat-square-text',
                tone: 'blue',
            },
            {
                title: 'Completion Rate',
                value: feedbackTotals.assigned > 0 ? formatPercent(feedbackTotals.completionRate) : '—',
                detail: feedbackTotals.assigned > 0 ? `${formatNumber(feedbackTotals.submitted)} of ${formatNumber(feedbackTotals.assigned)} submitted` : 'No assigned feedback tasks yet',
                icon: 'bi-graph-up',
                tone: feedbackTotals.assigned > 0 && feedbackTotals.completionRate >= 80 ? 'emerald' : 'amber',
                trend: { label: completionHealthLabel(feedbackTotals.assigned > 0 ? feedbackTotals.completionRate : 0), direction: feedbackTotals.assigned > 0 && feedbackTotals.completionRate >= 80 ? 'up' : feedbackTotals.submitted > 0 ? 'flat' : 'down' },
            },
            {
                title: 'Submitted Responses',
                value: formatNumber(feedbackTotals.submitted),
                detail: 'Completed feedback assignments',
                icon: 'bi-send-check',
                tone: 'emerald',
            },
            {
                title: 'Pending Responses',
                value: formatNumber(feedbackTotals.pending),
                detail: 'Feedback tasks still waiting',
                icon: 'bi-inbox',
                tone: feedbackTotals.pending > 0 ? 'amber' : 'emerald',
            },
        ];
    }

    if (reportType === 'recommendations') {
        return [
            {
                title: 'Recommendations',
                value: formatNumber(dashboard.promotionRecommendations.length),
                detail: 'Promotion, increment, and watchlist rows',
                icon: 'bi-stars',
                tone: 'violet',
            },
            {
                title: 'High Performers',
                value: formatNumber(summary.highPerformers),
                detail: 'Employees above high-performance threshold',
                icon: 'bi-trophy',
                tone: 'emerald',
            },
            {
                title: 'Low Performers',
                value: formatNumber(summary.lowPerformers),
                detail: 'Employees requiring watchlist attention',
                icon: 'bi-exclamation-triangle',
                tone: summary.lowPerformers > 0 ? 'rose' : 'slate',
            },
            {
                title: 'Departments Involved',
                value: formatNumber(departmentsWithRecommendations),
                detail: 'Departments with recommendation rows',
                icon: 'bi-building-check',
                tone: 'blue',
            },
        ];
    }

    return [
        {
            title: 'Submitted Assessments',
            value: formatNumber(summary.submittedAssessments),
            detail: `${formatNumber(summary.totalAssessments)} total assessments`,
            icon: 'bi-file-earmark-check',
            tone: 'blue',
        },
        {
            title: 'Average Score',
            value: summary.submittedAssessments > 0 ? formatPercent(summary.averageAssessmentScore) : '—',
            detail: summary.submittedAssessments > 0 ? 'Latest appraisal reporting average' : 'No finalized results yet',
            icon: 'bi-graph-up-arrow',
            tone: 'emerald',
            trend: { label: scoreHealthLabel(summary.averageAssessmentScore), direction: summary.averageAssessmentScore >= 70 ? 'up' : summary.averageAssessmentScore > 0 ? 'down' : 'flat' },
        },
        {
            title: 'Pending Reviews',
            value: formatNumber(summary.pendingAssessments),
            detail: `${formatNumber(summary.approvedAssessments)} approved assessments`,
            icon: 'bi-hourglass-split',
            tone: summary.pendingAssessments > 0 ? 'amber' : 'emerald',
        },
        {
            title: 'High / Low Performers',
            value: `${formatNumber(summary.highPerformers)} / ${formatNumber(summary.lowPerformers)}`,
            detail: 'Performance watch summary',
            icon: 'bi-person-lines-fill',
            tone: summary.lowPerformers > 0 ? 'amber' : 'violet',
        },
    ];
};

type ReportingAnalytics = ReturnType<typeof buildReportingAnalytics>;

const buildReportingAnalytics = (dashboard: ReportingDashboard) => {
    const departmentAverageBars = buildTopValueBars(
        dashboard.departmentPerformance,
        (row) => row.departmentName,
        (row) => row.averageScore,
        8,
    ).map((item) => ({
        ...item,
        detail: `${formatNumber((item.raw as DepartmentPerformanceRow | undefined)?.employeeCount)} employees`,
    }));

    const departmentPendingBars = buildTopValueBars(
        dashboard.departmentPerformance,
        (row) => row.departmentName,
        (row) => row.pendingCount,
        8,
    );

    const departmentPipBars = buildTopValueBars(
        dashboard.departmentPerformance,
        (row) => row.departmentName,
        (row) => row.activePipCount,
        8,
    );

    const departmentDistributionBars = dashboard.departmentPerformance
        .filter((row) => toDashboardNumber(row.employeeCount) > 0 || toDashboardNumber(row.assessmentCount) > 0)
        .slice(0, 8)
        .map((row, index) => ({
            label: row.departmentName || 'Department',
            value: toDashboardNumber(row.employeeCount),
            compareValue: toDashboardNumber(row.assessmentCount),
            compareLabel: 'Assessments',
            detail: `${formatNumber(row.assessmentCount)} assessment(s)`,
            color: '#7657f4',
            compareColor: index % 2 === 0 ? '#9fd3ff' : '#b7d8ff',
            raw: row,
        }));

    const employeeScoreBands = buildScoreBands(dashboard.employeePerformance, (row) => row.scorePercent);

    const topEmployeeBars = buildTopValueBars(
        dashboard.employeePerformance,
        (row) => row.employeeName,
        (row) => row.scorePercent,
        8,
    ).map((item) => ({
        ...item,
        detail: (item.raw as EmployeePerformanceRow | undefined)?.departmentName || 'No department',
    }));

    const assessmentStatus = dashboard.assessmentStatusBreakdown.length
        ? withDashboardPercentages(
            dashboard.assessmentStatusBreakdown.map((row, index) => ({
                label: cleanStatus(row.status),
                value: row.count,
                percentage: row.percentage,
                color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
            })),
        )
        : buildStatusDistribution(dashboard.employeePerformance, (row) => row.status);

    const pipStatus = withDashboardPercentages([
        { label: 'Active', value: dashboard.summary.activePips, color: '#dc2626' },
        { label: 'Completed', value: dashboard.summary.completedPips, color: '#16a34a' },
    ]);

    const activePipsByDepartment = buildTopValueBars(
        dashboard.pipStatusReport.filter((row) => row.active),
        (row) => row.departmentName,
        () => 1,
        8,
    );

    const feedbackCompletion = buildCompletionBars(
        dashboard.feedbackParticipation,
        (row) => row.campaignName,
        (row) => row.submittedCount,
        (row) => row.assignedCount,
        8,
    );

    const feedbackStatus = buildStatusDistribution(dashboard.feedbackParticipation, (row) => row.status);

    const feedbackPendingBars = buildTopValueBars(
        dashboard.feedbackParticipation,
        (row) => row.campaignName,
        (row) => row.pendingCount,
        8,
    );

    const recommendationTypes = buildStatusDistribution(
        dashboard.promotionRecommendations,
        (row) => row.recommendationType,
    );

    const recommendationDepartments = buildTopValueBars(
        dashboard.promotionRecommendations,
        (row) => row.departmentName,
        () => 1,
        8,
    );

    const recommendationScoreBars = buildTopValueBars(
        dashboard.promotionRecommendations,
        (row) => row.employeeName,
        (row) => row.scorePercent,
        8,
    ).map((item) => ({
        ...item,
        detail: (item.raw as RecommendationRow | undefined)?.recommendationType || 'Recommendation',
    }));

    return {
        departmentAverageBars,
        departmentPendingBars,
        departmentPipBars,
        departmentDistributionBars,
        employeeScoreBands,
        topEmployeeBars,
        assessmentStatus,
        pipStatus,
        activePipsByDepartment,
        feedbackCompletion,
        feedbackStatus,
        feedbackPendingBars,
        recommendationTypes,
        recommendationDepartments,
        recommendationScoreBars,
    };
};

const ReportVisuals = ({ reportType, analytics }: { reportType: ReportType; analytics: ReportingAnalytics }) => {
    if (reportType === 'departments') {
        return (
            <section className="dashboard-grid dashboard-grid--two reporting-visual-grid" aria-label="Department analytics charts">
                <DashboardChartCard
                    title="Department Distribution"
                    subtitle="Employee count grouped by department, compared with assessment volume."
                >
                    <ComparisonColumnChart
                        data={analytics.departmentDistributionBars}
                        height={320}
                        primaryLabel="Employees"
                        comparisonLabel="Assessments"
                        emptyTitle="No department distribution data"
                        emptyDescription="Employee counts grouped by department will appear here after department data is available."
                    />
                </DashboardChartCard>
                <DashboardChartCard title="Department Average Score" subtitle="Top departments by appraisal score.">
                    <HorizontalBarChart
                        data={analytics.departmentAverageBars}
                        emptyTitle="No department score data"
                        emptyDescription="Approved assessment results are needed before department score comparison appears."
                        valueFormatter={(value) => formatDashboardPercent(value)}
                        xAxisSuffix="%"
                    />
                </DashboardChartCard>
                <DashboardChartCard title="Assessment Status" subtitle="Current appraisal workflow distribution.">
                    <DonutSummaryChart data={analytics.assessmentStatus} totalLabel="Assessments" />
                </DashboardChartCard>
                <DashboardChartCard title="Active PIP Load" subtitle="Where improvement plans are concentrated.">
                    <HorizontalBarChart
                        data={analytics.departmentPipBars}
                        emptyTitle="No active PIP load"
                        emptyDescription="No department-level active PIP count is currently reported."
                    />
                </DashboardChartCard>
                <DashboardChartCard title="Pending Reviews by Department" subtitle="Departments with remaining review work.">
                    <HorizontalBarChart
                        data={analytics.departmentPendingBars}
                        emptyTitle="No pending review data"
                        emptyDescription="Pending department review counts will appear here."
                    />
                </DashboardChartCard>
            </section>
        );
    }

    if (reportType === 'pip') {
        return (
            <section className="dashboard-grid dashboard-grid--two reporting-visual-grid" aria-label="PIP analytics charts">
                <DashboardChartCard title="PIP Status" subtitle="Active vs completed improvement plans.">
                    <DonutSummaryChart data={analytics.pipStatus} totalLabel="PIPs" />
                </DashboardChartCard>
                <DashboardChartCard title="Active PIPs by Department" subtitle="Departments with current performance improvement follow-up.">
                    <HorizontalBarChart
                        data={analytics.activePipsByDepartment}
                        emptyTitle="No active PIPs"
                        emptyDescription="Active PIPs by department will appear here once plans are created."
                    />
                </DashboardChartCard>
            </section>
        );
    }

    if (reportType === 'feedback') {
        return (
            <section className="dashboard-grid dashboard-grid--two reporting-visual-grid" aria-label="Feedback analytics charts">
                <DashboardChartCard title="Campaign Completion" subtitle="Submitted vs pending feedback assignments.">
                    <FeedbackCompletionBars data={analytics.feedbackCompletion} />
                </DashboardChartCard>
                <DashboardChartCard title="Campaign Status" subtitle="Feedback campaign lifecycle distribution.">
                    <DonutSummaryChart data={analytics.feedbackStatus} totalLabel="Campaigns" />
                </DashboardChartCard>
                <DashboardChartCard title="Pending Feedback Responses" subtitle="Campaigns that still need completion.">
                    <HorizontalBarChart
                        data={analytics.feedbackPendingBars}
                        emptyTitle="No pending responses"
                        emptyDescription="Pending response counts will appear here when campaigns have assignments."
                    />
                </DashboardChartCard>
                <DashboardChartCard title="Completion Quality" subtitle="Progress markers for active campaign follow-up.">
                    <StatusDistributionChart
                        data={analytics.feedbackCompletion.map((item) => ({
                            label: item.label,
                            value: item.value,
                            color: item.value >= 80 ? '#16a34a' : item.value >= 50 ? '#d97706' : '#dc2626',
                        }))}
                        valueFormatter={(value) => formatDashboardPercent(value)}
                    />
                </DashboardChartCard>
            </section>
        );
    }

    if (reportType === 'recommendations') {
        return (
            <section className="dashboard-grid dashboard-grid--two reporting-visual-grid" aria-label="Recommendation analytics charts">
                <DashboardChartCard title="Recommendation Types" subtitle="Promotion, increment, and watch recommendations.">
                    <DonutSummaryChart data={analytics.recommendationTypes} totalLabel="Recommendations" />
                </DashboardChartCard>
                <DashboardChartCard title="Recommended Employees by Score" subtitle="Highest score records behind recommendations.">
                    <HorizontalBarChart
                        data={analytics.recommendationScoreBars}
                        emptyTitle="No recommendation score data"
                        emptyDescription="Recommendations will appear here once report rows are generated."
                        valueFormatter={(value) => formatDashboardPercent(value)}
                        xAxisSuffix="%"
                    />
                </DashboardChartCard>
                <DashboardChartCard title="Recommendations by Department" subtitle="Where recommendation activity is concentrated.">
                    <HorizontalBarChart
                        data={analytics.recommendationDepartments}
                        emptyTitle="No department recommendation data"
                        emptyDescription="Department recommendation counts will appear here."
                    />
                </DashboardChartCard>
                <DashboardChartCard title="Recommended Score Bands" subtitle="Performance level distribution for recommendation rows.">
                    <StatusDistributionChart data={analytics.employeeScoreBands} />
                </DashboardChartCard>
            </section>
        );
    }

    return (
        <section className="dashboard-grid dashboard-grid--two reporting-visual-grid" aria-label="Performance analytics charts">
            <DashboardChartCard title="Performance Score Bands" subtitle="Employee score distribution from appraisal results.">
                <StatusDistributionChart
                    data={analytics.employeeScoreBands}
                    emptyTitle="No performance scores yet"
                    emptyDescription="Approved appraisal results are required before score bands can be shown."
                />
            </DashboardChartCard>
            <DashboardChartCard title="Top Employee Scores" subtitle="Highest available appraisal score percentages.">
                <HorizontalBarChart
                    data={analytics.topEmployeeBars}
                    emptyTitle="No employee ranking yet"
                    emptyDescription="Approved appraisal scores are required before top employee ranking can be shown."
                    valueFormatter={(value) => formatDashboardPercent(value)}
                    xAxisSuffix="%"
                />
            </DashboardChartCard>
            <DashboardChartCard title="Assessment Status" subtitle="Current appraisal workflow distribution.">
                <DonutSummaryChart
                    data={analytics.assessmentStatus}
                    totalLabel="Assessments"
                    emptyTitle="No assessment workflow data yet"
                    emptyDescription="Start appraisal reviews to show submitted, pending, and approved status distribution."
                />
            </DashboardChartCard>
            <DashboardChartCard title="Department Average Score" subtitle="Quick comparison across departments.">
                <HorizontalBarChart
                    data={analytics.departmentAverageBars}
                    emptyTitle="No department averages yet"
                    emptyDescription="Department comparison appears after approved appraisal scores are available."
                    valueFormatter={(value) => formatDashboardPercent(value)}
                    xAxisSuffix="%"
                />
            </DashboardChartCard>
        </section>
    );
};

const FeedbackCompletionBars = ({ data }: { data: DashboardCompletionDatum[] }) => {
    if (!data.length) {
        return (
            <EmptyChartState
                compact
                title="No feedback completion data"
                description="Feedback assignment and submission data will appear here after campaigns are active."
            />
        );
    }

    return (
        <div className="reporting-completion-list">
            {data.map((item) => {
                const percentage = Math.max(0, Math.min(100, toDashboardNumber(item.percentage)));

                return (
                    <article className="reporting-completion-item" key={item.label}>
                        <div className="reporting-completion-item__top">
                            <div>
                                <strong>{item.label}</strong>
                                <span>{formatNumber(item.completed)} submitted · {formatNumber(item.pending)} pending</span>
                            </div>
                            <b>{formatPercent(percentage)}</b>
                        </div>
                        <div className="reporting-completion-track" aria-hidden="true">
                            <span style={{ width: `${Math.max(percentage, 3)}%` }} />
                        </div>
                        <small>{formatNumber(item.total)} assigned evaluator task(s)</small>
                    </article>
                );
            })}
        </div>
    );
};

const scoreHealthLabel = (score?: number | null) => {
    const value = Number(score ?? 0);
    if (value >= 86) return 'Outstanding range';
    if (value >= 71) return 'Healthy range';
    if (value >= 60) return 'Meets range';
    if (value > 0) return 'Needs review';
    return 'No score yet';
};

const completionHealthLabel = (completionRate?: number | null) => {
    const value = Number(completionRate ?? 0);
    if (value >= 90) return 'Excellent completion';
    if (value >= 80) return 'Healthy completion';
    if (value >= 50) return 'In progress';
    if (value > 0) return 'Low completion';
    return 'No submissions yet';
};

const EmptyRows = ({
                       title = 'No report rows found.',
                       description = 'Approved report data will appear here when it is available.',
                   }: {
    title?: string;
    description?: string;
}) => (
    <div className="reporting-empty">
        <i className="bi bi-inbox" />
        <strong>{title}</strong>
        <span>{description}</span>
    </div>
);

const EmployeePerformanceTable = ({ rows }: { rows: EmployeePerformanceRow[] }) => {
    if (!rows.length) {
        return <EmptyRows description="Approved appraisal results will appear here after reviews are submitted and scored." />;
    }

    return (
        <div className="reporting-table-wrap">
            <table className="reporting-table">
                <thead>
                <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Form / Period</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Submitted</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row, index) => (
                    <tr key={`${row.assessmentId ?? 'row'}-${index}`}>
                        <td>
                            <strong>{row.employeeName || '—'}</strong>
                            <small>{row.employeeCode || row.position || '—'}</small>
                        </td>
                        <td>
                            <span>{row.departmentName || '—'}</span>
                            <small>{row.managerName ? `Manager: ${row.managerName}` : 'No manager'}</small>
                        </td>
                        <td>
                            <span>{row.formName || '—'}</span>
                            <small>{row.period || '—'}</small>
                        </td>
                        <td><span className="report-pill">{cleanStatus(row.status)}</span></td>
                        <td>
                            <span className={scoreClass(row.scorePercent)}>{formatPercent(row.scorePercent)}</span>
                            <small>{row.performanceLabel || 'Not scored'}</small>
                        </td>
                        <td>{formatDateTime(row.submittedAt)}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const DepartmentPerformanceTable = ({ rows }: { rows: DepartmentPerformanceRow[] }) => {
    if (!rows.length) {
        return <EmptyRows description="Department comparison rows will appear after approved appraisal results are available." />;
    }

    return (
        <div className="reporting-table-wrap">
            <table className="reporting-table">
                <thead>
                <tr>
                    <th>Department</th>
                    <th>Employees</th>
                    <th>Assessments</th>
                    <th>Approved / Pending</th>
                    <th>Active PIPs</th>
                    <th>Average</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row) => (
                    <tr key={row.departmentId ?? row.departmentName}>
                        <td><strong>{row.departmentName || '—'}</strong></td>
                        <td>{formatNumber(row.employeeCount)}</td>
                        <td>{formatNumber(row.assessmentCount)}</td>
                        <td>{formatNumber(row.approvedCount)} / {formatNumber(row.pendingCount)}</td>
                        <td>{formatNumber(row.activePipCount)}</td>
                        <td>
                            <span className={scoreClass(row.averageScore)}>{formatPercent(row.averageScore)}</span>
                            <small>{row.performanceLabel || '—'}</small>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const PipTable = ({ rows }: { rows: PipReportRow[] }) => {
    if (!rows.length) {
        return <EmptyRows description="PIP rows will appear after performance improvement plans are created." />;
    }

    return (
        <div className="reporting-table-wrap">
            <table className="reporting-table">
                <thead>
                <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Goal</th>
                    <th>Status</th>
                    <th>Period</th>
                    <th>Created By</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row) => (
                    <tr key={row.pipId}>
                        <td>
                            <strong>{row.employeeName || '—'}</strong>
                            <small>{row.employeeCode || '—'}</small>
                        </td>
                        <td>{row.departmentName || '—'}</td>
                        <td className="reporting-long-text">{row.goal || '—'}</td>
                        <td><span className={`report-pill ${row.active ? 'report-pill--green' : ''}`}>{row.active ? 'Active' : 'Closed'}</span></td>
                        <td>{formatDate(row.startDate)} - {formatDate(row.endDate)}</td>
                        <td>{row.createdByName || '—'}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const FeedbackTable = ({ rows }: { rows: FeedbackParticipationRow[] }) => {
    if (!rows.length) {
        return <EmptyRows description="Feedback participation rows will appear after campaigns have evaluator assignments." />;
    }

    return (
        <div className="reporting-table-wrap">
            <table className="reporting-table">
                <thead>
                <tr>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Period</th>
                    <th>Assigned</th>
                    <th>Submitted</th>
                    <th>Completion</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row) => (
                    <tr key={row.campaignId}>
                        <td><strong>{row.campaignName || '—'}</strong></td>
                        <td><span className="report-pill">{cleanStatus(row.status)}</span></td>
                        <td>{formatDate(row.startDate)} - {formatDate(row.endDate)}</td>
                        <td>{formatNumber(row.assignedCount)}</td>
                        <td>{formatNumber(row.submittedCount)} <small>{formatNumber(row.pendingCount)} pending</small></td>
                        <td><span className={scoreClass(row.completionRate)}>{formatPercent(row.completionRate)}</span></td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const RecommendationTable = ({ rows }: { rows: RecommendationRow[] }) => {
    if (!rows.length) {
        return <EmptyRows description="Recommendation rows will appear after finalized appraisal scores meet promotion, increment, or watchlist rules." />;
    }

    return (
        <div className="reporting-table-wrap">
            <table className="reporting-table">
                <thead>
                <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Recommendation</th>
                    <th>Score</th>
                    <th>Reason</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row, index) => (
                    <tr key={`${row.employeeId ?? row.userId}-${index}`}>
                        <td>
                            <strong>{row.employeeName || '—'}</strong>
                            <small>{row.employeeCode || '—'}</small>
                        </td>
                        <td>{row.departmentName || '—'}</td>
                        <td><span className="report-pill report-pill--purple">{row.recommendationType || 'Recommendation'}</span></td>
                        <td>
                            <span className={scoreClass(row.scorePercent)}>{formatPercent(row.scorePercent)}</span>
                            <small>{row.performanceLabel || '—'}</small>
                        </td>
                        <td>{row.reason || '—'}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default ReportingDashboardPage;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ComparisonColumnChart,
    type ComparisonColumnDatum,
    DashboardChartCard,
    DashboardMetricCard,
    DashboardShell,
    DonutSummaryChart,
    EmptyChartState,
    HorizontalBarChart,
    InsightCard,
    StatusDistributionChart,
} from './dashboard';
import api from '../services/api';
import {
    emptyReportingDashboard,
    reportingService,
    type FeedbackParticipationRow,
    type ReportingDashboard,
} from '../services/reportingService';
import {
    buildScoreBands,
    buildStatusDistribution,
    buildTopValueBars,
    formatDashboardPercent,
    getDashboardStatusColor,
    toDashboardNumber,
    type DashboardChartDatum,
} from '../utils/dashboardChartData';

type DashboardUser = Record<string, unknown> & {
    id?: number | string;
    userId?: number | string;
    fullName?: string;
    name?: string;
    email?: string;
    position?: string;
    employeeCode?: string;
};

type DashboardData = {
    user?: DashboardUser;
    stats?: {
        directReports?: number | string;
        kpisCreated?: number | string;
        activePipsManaged?: number | string;
        unreadNotifications?: number | string;
    };
    recentKpis?: Array<{ id?: number | string; title?: string; weight?: number | string }>;
    recentNotifications?: Array<{ id?: number | string; title?: string; read?: boolean }>;
};

type EmployeeRecord = Record<string, unknown> & {
    id?: number | string;
    active?: boolean;
    status?: string;
    department?: string;
    departmentName?: string;
    currentDepartment?: string;
    position?: string;
    positionName?: string;
    gender?: string;
};

type HrStats = {
    employees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    departments: number;
    kpis: number;
    pips: number;
    notifications: number;
    pendingAssessments: number;
    activeFeedbackCampaigns: number;
    feedbackCompletionRate: number;
    averageScore: number;
    lowPerformers: number;
};

type FeedbackSummary = {
    assigned: number;
    submitted: number;
    pending: number;
    completionRate: number;
};

type LoadNotice = {
    tone: 'info' | 'warning';
    message: string;
};

const numberValue = (value: unknown) => {
    const result = Number(value ?? 0);
    return Number.isFinite(result) ? result : 0;
};

const textValue = (value: unknown, fallback = 'Unknown') => {
    const result = String(value ?? '').trim();
    return result || fallback;
};

const isEmployeeActive = (employee: EmployeeRecord) => {
    const status = String(employee.status ?? '').trim().toUpperCase();

    if (employee.active === false) return false;
    if (['INACTIVE', 'DISABLED', 'ARCHIVED', 'TERMINATED'].includes(status)) return false;

    return true;
};

const getDepartmentName = (employee: EmployeeRecord) =>
    textValue(employee.departmentName ?? employee.currentDepartment ?? employee.department, 'Unassigned Department');

const getPositionName = (employee: EmployeeRecord) =>
    textValue(employee.positionName ?? employee.position, 'Unassigned Position');

const uniqueDepartmentCount = (employees: EmployeeRecord[]) => {
    const names = employees
        .map((employee) => getDepartmentName(employee))
        .filter((name) => name !== 'Unassigned Department');

    return new Set(names.map((name) => name.toLowerCase())).size;
};

const getUserDisplayName = (user?: DashboardUser) => String(user?.fullName ?? user?.name ?? user?.email ?? 'HR User');

const formatNumber = (value?: number | string | null) => numberValue(value).toLocaleString();

const formatPercent = (value?: number | string | null) => `${numberValue(value).toFixed(1)}%`;

const makeRouteButton = (label: string, onClick: () => void, variant: 'primary' | 'light' = 'light') => (
    <button
        type="button"
        onClick={onClick}
        className={`epms-dashboard-button ${variant === 'primary' ? 'epms-dashboard-button--primary' : 'epms-dashboard-button--secondary'}`}
    >
        {label}
        <i className="bi bi-arrow-right-short" aria-hidden="true" />
    </button>
);

const buildPositionBars = (employees: EmployeeRecord[]): DashboardChartDatum[] => {
    const map = new Map<string, number>();

    employees.forEach((employee) => {
        const name = getPositionName(employee);
        map.set(name, (map.get(name) || 0) + 1);
    });

    return Array.from(map.entries())
        .map(([label, value]) => ({
            label,
            value,
            color: label === 'Unassigned Position' ? '#ffbd72' : '#8ec5ff',
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 6);
};


const buildDepartmentComparisonBars = (employees: EmployeeRecord[]): ComparisonColumnDatum[] => {
    const map = new Map<string, { total: number; active: number }>();

    employees.forEach((employee) => {
        const name = getDepartmentName(employee);
        const current = map.get(name) || { total: 0, active: 0 };
        current.total += 1;
        if (isEmployeeActive(employee)) current.active += 1;
        map.set(name, current);
    });

    return Array.from(map.entries())
        .map(([label, value]) => ({
            label,
            value: value.total,
            compareValue: value.active,
            compareLabel: 'Active',
            detail: `${value.active} active of ${value.total}`,
            color: label === 'Unassigned Department' ? '#ffbd72' : '#7c5cff',
            compareColor: label === 'Unassigned Department' ? '#f6d365' : '#8ec5ff',
        }))
        .sort((left, right) => Number(right.value) - Number(left.value))
        .slice(0, 8);
};

const buildEmployeeStatusData = (employees: EmployeeRecord[]): DashboardChartDatum[] => [
    { label: 'Active', value: employees.filter(isEmployeeActive).length, color: '#62cdbb' },
    { label: 'Inactive', value: employees.filter((employee) => !isEmployeeActive(employee)).length, color: '#cbd5e1' },
];

const buildAssessmentStatusData = (dashboard: ReportingDashboard): DashboardChartDatum[] => {
    if (dashboard.assessmentStatusBreakdown.length) {
        return dashboard.assessmentStatusBreakdown.map((row, index) => ({
            label: textValue(row.status, 'Unknown'),
            value: toDashboardNumber(row.count),
            color: getDashboardStatusColor(row.status, index),
        }));
    }

    return [
        { label: 'Submitted', value: dashboard.summary.submittedAssessments, color: '#8ec5ff' },
        { label: 'Approved', value: dashboard.summary.approvedAssessments, color: '#62cdbb' },
        { label: 'Pending', value: dashboard.summary.pendingAssessments, color: '#ffbd72' },
    ];
};

const isActiveFeedbackStatus = (status?: string | null) => {
    const normalized = String(status || '').trim().toLowerCase();
    return ['active', 'in progress', 'in_progress', 'running', 'open', 'started'].includes(normalized);
};

const selectPrimaryFeedbackRow = (rows: FeedbackParticipationRow[]) => {
    const assignedRows = rows.filter((row) => toDashboardNumber(row.assignedCount) > 0);

    if (!assignedRows.length) return null;

    return assignedRows.find((row) => isActiveFeedbackStatus(row.status)) ?? assignedRows[0];
};

const buildFeedbackSummary = (rows: FeedbackParticipationRow[], fallbackRate: number): FeedbackSummary => {
    const row = selectPrimaryFeedbackRow(rows);

    if (!row) {
        return {
            assigned: 0,
            submitted: 0,
            pending: 0,
            completionRate: fallbackRate,
        };
    }

    const assigned = toDashboardNumber(row.assignedCount);
    const submitted = toDashboardNumber(row.submittedCount);
    const pending = toDashboardNumber(row.pendingCount);

    return {
        assigned,
        submitted,
        pending,
        completionRate: assigned > 0 ? (submitted / assigned) * 100 : toDashboardNumber(row.completionRate),
    };
};

const buildFeedbackCompletionData = (rows: FeedbackParticipationRow[]): ComparisonColumnDatum[] =>
    rows
        .map((row) => {
            const assigned = toDashboardNumber(row.assignedCount);
            const submitted = toDashboardNumber(row.submittedCount);
            const pending = toDashboardNumber(row.pendingCount);
            const calculatedRate = assigned > 0 ? (submitted / assigned) * 100 : toDashboardNumber(row.completionRate);

            return {
                label: textValue(row.campaignName, 'Feedback Campaign'),
                value: submitted,
                percentage: calculatedRate,
                detail: `${formatNumber(submitted)} submitted · ${formatNumber(pending)} pending`,
                color: '#7c5cff',
                compareValue: pending,
                compareLabel: 'Pending',
                compareColor: '#8ec5ff',
                raw: row,
            };
        })
        .filter((item) => item.value > 0 || toDashboardNumber((item.raw as FeedbackParticipationRow).assignedCount) > 0)
        .sort((left, right) => {
            const leftRow = left.raw as FeedbackParticipationRow;
            const rightRow = right.raw as FeedbackParticipationRow;

            if (isActiveFeedbackStatus(leftRow.status) !== isActiveFeedbackStatus(rightRow.status)) {
                return isActiveFeedbackStatus(leftRow.status) ? -1 : 1;
            }

            return 0;
        })
        .slice(0, 6);

const hasChartData = (items: DashboardChartDatum[]) => items.some((item) => toDashboardNumber(item.value) > 0);

const Home = () => {
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [reportingDashboard, setReportingDashboard] = useState<ReportingDashboard>(emptyReportingDashboard);
    const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState<LoadNotice | null>(null);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        let mounted = true;

        const loadDashboard = async () => {
            setLoading(true);
            setNotice(null);

            try {
                const [summaryResult, employeeResult, reportingResult] = await Promise.allSettled([
                    api.get('/dashboard/summary'),
                    api.get('/employees'),
                    reportingService.getDashboard(),
                ]);

                if (!mounted) return;

                if (summaryResult.status === 'fulfilled') {
                    setDashboardData(summaryResult.value.data ?? null);
                } else {
                    setDashboardData(null);
                    const status = summaryResult.reason?.response?.status;
                    setNotice({
                        tone: status === 401 || status === 403 ? 'warning' : 'info',
                        message:
                            status === 401 || status === 403
                                ? 'Your session is not authorized for the HR dashboard summary. Other available HR data is still shown.'
                                : 'HR dashboard summary could not be loaded. Available reporting and workforce data is still shown.',
                    });
                }

                if (employeeResult.status === 'fulfilled') {
                    const list = employeeResult.value.data?.data ?? employeeResult.value.data ?? [];
                    setEmployees(Array.isArray(list) ? list : []);
                } else {
                    setEmployees([]);
                }

                if (reportingResult.status === 'fulfilled') {
                    setReportingDashboard(reportingResult.value);
                } else {
                    setReportingDashboard(emptyReportingDashboard);
                    setNotice((current) =>
                            current ?? {
                                tone: 'info',
                                message: 'Reporting analytics could not be loaded yet. Workforce and quick actions are still available.',
                            },
                    );
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void loadDashboard();

        return () => {
            mounted = false;
        };
    }, []);

    const feedbackSummary = useMemo(
        () => buildFeedbackSummary(reportingDashboard.feedbackParticipation, numberValue(reportingDashboard.summary.feedbackCompletionRate)),
        [reportingDashboard.feedbackParticipation, reportingDashboard.summary.feedbackCompletionRate],
    );

    const stats: HrStats = useMemo(() => {
        const activeEmployees = employees.filter(isEmployeeActive).length;
        const inactiveEmployees = employees.length - activeEmployees;

        return {
            employees: employees.length || numberValue(reportingDashboard.summary.totalEmployees),
            activeEmployees: activeEmployees || numberValue(reportingDashboard.summary.activeEmployees),
            inactiveEmployees,
            departments: uniqueDepartmentCount(employees) || reportingDashboard.departmentPerformance.length,
            kpis: numberValue(dashboardData?.stats?.kpisCreated),
            pips: numberValue(reportingDashboard.summary.activePips || dashboardData?.stats?.activePipsManaged),
            notifications: numberValue(dashboardData?.stats?.unreadNotifications),
            pendingAssessments: numberValue(reportingDashboard.summary.pendingAssessments),
            activeFeedbackCampaigns: numberValue(reportingDashboard.summary.activeFeedbackCampaigns),
            feedbackCompletionRate: feedbackSummary.completionRate,
            averageScore: numberValue(reportingDashboard.summary.averageAssessmentScore),
            lowPerformers: numberValue(reportingDashboard.summary.lowPerformers),
        };
    }, [dashboardData?.stats, employees, feedbackSummary.completionRate, reportingDashboard]);

    const userName = getUserDisplayName(dashboardData?.user);
    const firstName = userName.split(' ')[0] || 'HR';
    const recentKpis = dashboardData?.recentKpis ?? [];
    const recentNotifications = dashboardData?.recentNotifications ?? [];

    const workforceStatusData = useMemo(() => buildEmployeeStatusData(employees), [employees]);
    const departmentComparisonBars = useMemo(() => buildDepartmentComparisonBars(employees), [employees]);
    const positionBars = useMemo(() => buildPositionBars(employees), [employees]);
    const assessmentStatusData = useMemo(() => buildAssessmentStatusData(reportingDashboard), [reportingDashboard]);
    const feedbackCompletionData = useMemo(
        () => buildFeedbackCompletionData(reportingDashboard.feedbackParticipation),
        [reportingDashboard.feedbackParticipation],
    );
    const performanceBands = useMemo(
        () => buildScoreBands(reportingDashboard.employeePerformance, (row) => row.scorePercent),
        [reportingDashboard.employeePerformance],
    );
    const departmentScoreBars = useMemo(
        () =>
            buildTopValueBars(
                reportingDashboard.departmentPerformance,
                (row) => row.departmentName || 'Unknown Department',
                (row) => row.averageScore,
                5,
            ),
        [reportingDashboard.departmentPerformance],
    );
    const pipStatusData = useMemo(
        () => [
            { label: 'Active PIPs', value: reportingDashboard.summary.activePips, color: '#f59aaa' },
            { label: 'Completed PIPs', value: reportingDashboard.summary.completedPips, color: '#62cdbb' },
        ],
        [reportingDashboard.summary.activePips, reportingDashboard.summary.completedPips],
    );
    const recommendationData = useMemo(
        () => buildStatusDistribution(reportingDashboard.promotionRecommendations, (row) => row.recommendationType || 'Recommendation'),
        [reportingDashboard.promotionRecommendations],
    );

    const hasFinalizedScores = reportingDashboard.employeePerformance.length > 0 || stats.averageScore > 0;
    const hasAssessmentStatus = hasChartData(assessmentStatusData);
    const hasPerformanceBands = hasChartData(performanceBands);
    const hasDepartmentPerformance = hasChartData(departmentScoreBars);
    const hasPipStatus = hasChartData(pipStatusData);
    const hasRecommendations = hasChartData(recommendationData);
    const hasSecondaryAnalytics = hasAssessmentStatus || hasPerformanceBands || hasDepartmentPerformance || hasPipStatus || hasRecommendations;

    const unassignedPositionCount = employees.filter((employee) => getPositionName(employee) === 'Unassigned Position').length;
    const unassignedDepartmentCount = employees.filter((employee) => getDepartmentName(employee) === 'Unassigned Department').length;
    const positionSetupIncomplete = stats.employees > 0 && unassignedPositionCount >= stats.employees;
    const setupIssueCount = unassignedPositionCount + unassignedDepartmentCount;

    const attentionCount = stats.pendingAssessments + stats.pips + stats.lowPerformers + setupIssueCount;
    const healthTone = attentionCount ? 'warning' : 'success';

    return (
        <DashboardShell
            className="hr-command-dashboard"
            variant="default"
            eyebrow="HR Command Center"
            title={`Welcome back, ${firstName}`}
            description="Monitor workforce setup, reviews, feedback completion, PIP risk, and reporting health from one workspace."
            metaLabel="Today"
            metaValue={attentionCount ? `${formatNumber(attentionCount)} item${attentionCount === 1 ? '' : 's'} need review` : 'Healthy'}
            metaDetail={
                attentionCount
                    ? `${formatNumber(stats.pendingAssessments)} pending reviews · ${formatNumber(setupIssueCount)} setup issues · ${formatNumber(stats.activeFeedbackCampaigns)} active feedback campaigns`
                    : 'No major HR attention items detected'
            }
            actions={
                <>
                    {makeRouteButton('Open Reports', () => navigate('/hr/reports/performance'), 'primary')}
                    {makeRouteButton('Manage Employees', () => navigate('/hr/employee'))}
                </>
            }
        >
            {notice ? (
                <InsightCard
                    tone={notice.tone === 'warning' ? 'warning' : 'info'}
                    icon={<i className="bi bi-info-circle" aria-hidden="true" />}
                    title="Dashboard notice"
                    description={notice.message}
                    className="mb-4"
                />
            ) : null}

            {loading ? (
                <InsightCard
                    tone="info"
                    icon={<i className="bi bi-arrow-repeat" aria-hidden="true" />}
                    title="Loading HR dashboard"
                    description="Preparing workforce analytics, reports, feedback, PIP, and KPI summary."
                    className="mb-4"
                />
            ) : null}

            <section className="dashboard-grid dashboard-grid--metrics hr-metric-strip">
                <DashboardMetricCard
                    title="Active Employees"
                    value={formatNumber(stats.activeEmployees)}
                    detail={`${formatNumber(stats.employees)} total employees`}
                    tone="blue"
                    icon={<i className="bi bi-people" aria-hidden="true" />}
                    trend={{ label: stats.inactiveEmployees ? `${formatNumber(stats.inactiveEmployees)} inactive` : 'All visible employees active' }}
                />
                <DashboardMetricCard
                    title="Average Score"
                    value={hasFinalizedScores ? formatPercent(stats.averageScore) : '—'}
                    detail={hasFinalizedScores ? 'Latest finalized appraisal average' : 'No finalized results yet'}
                    tone={hasFinalizedScores ? 'emerald' : 'slate'}
                    icon={<i className="bi bi-graph-up-arrow" aria-hidden="true" />}
                    trend={{
                        label: hasFinalizedScores
                            ? `${formatNumber(reportingDashboard.employeePerformance.length)} employee results`
                            : 'Waiting for approved appraisals',
                        direction: hasFinalizedScores ? 'flat' : 'flat',
                    }}
                />
                <DashboardMetricCard
                    title="Pending Reviews"
                    value={formatNumber(stats.pendingAssessments)}
                    detail="Assessments waiting in workflow"
                    tone={stats.pendingAssessments ? 'amber' : 'emerald'}
                    icon={<i className="bi bi-clipboard-check" aria-hidden="true" />}
                    trend={{ label: stats.pendingAssessments ? 'Needs HR follow-up' : 'No pending review load', direction: stats.pendingAssessments ? 'up' : 'flat' }}
                />
                <DashboardMetricCard
                    title="Active PIPs"
                    value={formatNumber(stats.pips)}
                    detail="Employees under active improvement plans"
                    tone={stats.pips ? 'rose' : 'emerald'}
                    icon={<i className="bi bi-exclamation-triangle" aria-hidden="true" />}
                    trend={{ label: stats.pips ? 'Review plan status' : 'No active PIP risk', direction: stats.pips ? 'up' : 'flat' }}
                />
            </section>

            <section className="dashboard-grid dashboard-grid--overview mb-4">
                <DashboardChartCard
                    title="Overall Results by Department"
                    subtitle="Employee coverage compared with active headcount."
                    action={makeRouteButton('Departments', () => navigate('/hr/department'))}
                >
                    <ComparisonColumnChart
                        data={departmentComparisonBars}
                        height={370}
                        maxBars={8}
                        primaryLabel="Total Employees"
                        comparisonLabel="Active Employees"
                        emptyTitle="No department distribution yet"
                        emptyDescription="Assign employees to departments to show department coverage."
                    />
                </DashboardChartCard>

                <DashboardChartCard
                    title="HR Attention Queue"
                    subtitle="Operational areas HR should review first."
                    action={makeRouteButton('Reports', () => navigate('/hr/reports/performance'))}
                >
                    <div className="grid gap-2.5">
                        <ActionRow
                            icon="bi-clipboard2-check"
                            title="Pending appraisal reviews"
                            description="Check manager, department head, and HR approval progress."
                            status={`${formatNumber(stats.pendingAssessments)} pending`}
                            tone={stats.pendingAssessments ? 'amber' : 'emerald'}
                            onClick={() => navigate('/hr/appraisal/review-check')}
                        />
                        <ActionRow
                            icon="bi-exclamation-octagon"
                            title="Active performance improvement plans"
                            description="Review current PIP records and follow-up ownership."
                            status={`${formatNumber(stats.pips)} active`}
                            tone={stats.pips ? 'rose' : 'emerald'}
                            onClick={() => navigate('/hr/reports/pip-status')}
                        />
                        <ActionRow
                            icon="bi-chat-dots"
                            title="360 feedback participation"
                            description="Monitor active campaign completion and pending responses."
                            status={feedbackSummary.assigned ? `${formatPercent(stats.feedbackCompletionRate)} complete` : 'No active campaign'}
                            tone={stats.activeFeedbackCampaigns && stats.feedbackCompletionRate < 80 ? 'amber' : 'blue'}
                            onClick={() => navigate('/hr/reports/feedback-completion')}
                        />
                        <ActionRow
                            icon="bi-person-gear"
                            title="Employee setup coverage"
                            description="Review missing department or position assignments."
                            status={`${formatNumber(setupIssueCount)} issues`}
                            tone={setupIssueCount ? 'amber' : 'emerald'}
                            onClick={() => navigate('/hr/employee')}
                        />
                    </div>
                </DashboardChartCard>
            </section>

            <section className="dashboard-grid dashboard-grid--two mb-4">
                <DashboardChartCard
                    title="Workforce Status"
                    subtitle="Active and inactive employee visibility."
                    action={makeRouteButton('Employees', () => navigate('/hr/employee'))}
                    size="compact"
                >
                    <DonutSummaryChart
                        data={workforceStatusData}
                        totalLabel="Employees"
                        height={185}
                        emptyTitle="No employee data"
                        emptyDescription="Employee records will appear after HR creates or imports employees."
                    />
                </DashboardChartCard>

                <DashboardChartCard
                    title="360 Feedback Completion"
                    subtitle="Campaign completion percentage with submitted and pending responses."
                    action={makeRouteButton('Feedback', () => navigate('/hr/feedback/analytics'))}
                    size="compact"
                >
                    <ComparisonColumnChart
                        data={feedbackCompletionData}
                        height={240}
                        maxBars={5}
                        primaryLabel="Submitted"
                        comparisonLabel="Pending"
                        emptyTitle="No campaign completion data"
                        emptyDescription="360 feedback participation will appear after campaign assignments are created."
                    />
                </DashboardChartCard>
            </section>

            <section className="dashboard-grid dashboard-grid--three mb-4">
                <InsightCard
                    tone={healthTone}
                    icon={<i className="bi bi-activity" aria-hidden="true" />}
                    title="Operating Health"
                    description={
                        attentionCount
                            ? 'There are workflow or setup areas HR should review today.'
                            : 'Core HR workflow indicators look healthy right now.'
                    }
                />
                <InsightCard
                    tone={stats.feedbackCompletionRate >= 80 ? 'success' : stats.activeFeedbackCampaigns ? 'warning' : 'neutral'}
                    icon={<i className="bi bi-chat-square-text" aria-hidden="true" />}
                    title="360 Feedback"
                    description={
                        feedbackSummary.assigned
                            ? `${formatPercent(stats.feedbackCompletionRate)} complete · ${formatNumber(feedbackSummary.submitted)} submitted · ${formatNumber(feedbackSummary.pending)} pending.`
                            : 'No active feedback campaign requiring action.'
                    }
                />
                <InsightCard
                    tone={setupIssueCount ? 'warning' : 'success'}
                    icon={<i className="bi bi-person-check" aria-hidden="true" />}
                    title="Setup Coverage"
                    description={
                        setupIssueCount
                            ? `${formatNumber(setupIssueCount)} missing department or position assignment${setupIssueCount === 1 ? '' : 's'} need review.`
                            : 'Departments and positions look assigned for visible employees.'
                    }
                />
            </section>

            {hasSecondaryAnalytics ? (
                <section className="dashboard-grid dashboard-grid--two mb-4">
                    {hasAssessmentStatus ? (
                        <DashboardChartCard
                            title="Appraisal Workflow Status"
                            subtitle="Submitted, approved, and pending assessment state."
                            action={makeRouteButton('Review Queue', () => navigate('/hr/appraisal/review-check'))}
                            size="compact"
                        >
                            <StatusDistributionChart data={assessmentStatusData} />
                        </DashboardChartCard>
                    ) : null}

                    {hasPerformanceBands ? (
                        <DashboardChartCard
                            title="Performance Bands"
                            subtitle="Employee result distribution by performance label thresholds."
                            action={makeRouteButton('Performance Report', () => navigate('/hr/reports/performance'))}
                            size="compact"
                        >
                            <DonutSummaryChart data={performanceBands} totalLabel="Results" height={185} />
                        </DashboardChartCard>
                    ) : null}

                    {hasDepartmentPerformance ? (
                        <DashboardChartCard
                            title="Department Performance Ranking"
                            subtitle="Average appraisal score by department."
                            action={makeRouteButton('Compare', () => navigate('/hr/department-comparison'))}
                            size="compact"
                        >
                            <HorizontalBarChart
                                data={departmentScoreBars}
                                height={210}
                                valueFormatter={(value) => formatDashboardPercent(value)}
                                xAxisSuffix="%"
                                maxBars={5}
                            />
                        </DashboardChartCard>
                    ) : null}

                    {hasPipStatus ? (
                        <DashboardChartCard title="PIP Status" subtitle="Active and completed improvement plans." size="compact">
                            <DonutSummaryChart data={pipStatusData} totalLabel="PIPs" height={185} />
                        </DashboardChartCard>
                    ) : null}

                    {hasRecommendations ? (
                        <DashboardChartCard title="Recommendations" subtitle="Promotion, increment, and watchlist actions." size="compact">
                            <StatusDistributionChart data={recommendationData} />
                        </DashboardChartCard>
                    ) : null}
                </section>
            ) : (
                <section className="dashboard-grid dashboard-grid--two mb-4">
                    <DashboardChartCard title="Appraisal & Performance" subtitle="Analytics will appear after appraisal results are approved." size="compact">
                        <EmptyChartState
                            compact
                            title="No finalized appraisal analytics yet"
                            description="Start or approve appraisal reviews to unlock workflow status, performance bands, and department ranking."
                        />
                    </DashboardChartCard>
                    <DashboardChartCard title="PIP & Recommendations" subtitle="Risk and recommendation analytics will appear when report data is available." size="compact">
                        <EmptyChartState
                            compact
                            title="No performance action data yet"
                            description="PIP status and recommendations will appear after improvement plans or finalized performance results exist."
                        />
                    </DashboardChartCard>
                </section>
            )}

            <section className="dashboard-grid dashboard-grid--two mb-4">
                <DashboardChartCard
                    title="Position Coverage"
                    subtitle="Position assignment health for visible employees."
                    action={makeRouteButton('Positions', () => navigate('/hr/position/table'))}
                    size="compact"
                >
                    {positionSetupIncomplete ? (
                        <SetupWarningBlock
                            icon="bi-person-badge"
                            title="Position setup incomplete"
                            description={`${formatNumber(unassignedPositionCount)} employees do not have a position assigned yet.`}
                            actionLabel="Fix employee records"
                            onClick={() => navigate('/hr/employee')}
                        />
                    ) : (
                        <HorizontalBarChart
                            data={positionBars}
                            height={180}
                            maxBars={6}
                            emptyTitle="No position data"
                            emptyDescription="Assign employees to positions to visualize role coverage."
                        />
                    )}
                </DashboardChartCard>

                <DashboardChartCard
                    title="Recent Activity"
                    subtitle="Latest KPI records and HR-visible notifications."
                    size="compact"
                >
                    <div className="hr-recent-grid">
                        <div>
                            <h3 className="hr-mini-section-title">Recent KPIs</h3>
                            {recentKpis.length ? (
                                <div className="grid gap-2">
                                    {recentKpis.slice(0, 3).map((item, index) => (
                                        <SimpleRecordRow
                                            key={`${item.id ?? 'kpi'}-${index}`}
                                            icon="bi-bullseye"
                                            title={textValue(item.title, 'Untitled KPI')}
                                            detail={`Weight ${textValue(item.weight, '—')}`}
                                            onClick={() => navigate('/hr/kpi-template')}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyChartState compact title="No KPI records yet" description="KPI records will appear after HR configures them." />
                            )}
                        </div>
                        <div>
                            <h3 className="hr-mini-section-title">Recent Notifications</h3>
                            {recentNotifications.length ? (
                                <div className="grid gap-2">
                                    {recentNotifications.slice(0, 3).map((item, index) => (
                                        <SimpleRecordRow
                                            key={`${item.id ?? 'notification'}-${index}`}
                                            icon={item.read ? 'bi-bell' : 'bi-bell-fill'}
                                            title={textValue(item.title, 'Notification')}
                                            detail={item.read ? 'Read' : 'Unread'}
                                            badge={item.read ? 'Read' : 'Unread'}
                                            onClick={() => navigate('/notifications')}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyChartState compact title="No notifications yet" description="Workflow alerts and system updates will appear here." />
                            )}
                        </div>
                    </div>
                </DashboardChartCard>
            </section>

            <DashboardChartCard
                title="Quick Setup"
                subtitle="Common HR configuration shortcuts."
                className="hr-quick-setup-card"
                size="compact"
            >
                <div className="hr-quick-grid">
                    <QuickSetupButton icon="bi-people" title="Employees" onClick={() => navigate('/hr/employee')} />
                    <QuickSetupButton icon="bi-building" title="Departments" onClick={() => navigate('/hr/department')} />
                    <QuickSetupButton icon="bi-diagram-3" title="Teams" onClick={() => navigate('/hr/team')} />
                    <QuickSetupButton icon="bi-clipboard-data" title="Appraisals" onClick={() => navigate('/hr/appraisal')} />
                    <QuickSetupButton icon="bi-bullseye" title="KPI Templates" onClick={() => navigate('/hr/kpi-template')} />
                    <QuickSetupButton icon="bi-chat-square-text" title="360 Feedback" onClick={() => navigate('/hr/feedback/questions')} />
                    <QuickSetupButton icon="bi-graph-up" title="Reports" onClick={() => navigate('/hr/reports/performance')} />
                    <QuickSetupButton icon="bi-stars" title="Recommendations" onClick={() => navigate('/hr/reports/recommendations')} />
                </div>
            </DashboardChartCard>
        </DashboardShell>
    );
};

type ActionRowProps = {
    icon: string;
    title: string;
    description: string;
    status: string;
    tone?: 'blue' | 'emerald' | 'amber' | 'rose';
    onClick: () => void;
};

const actionToneClass: Record<NonNullable<ActionRowProps['tone']>, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
};

const ActionRow = ({ icon, title, description, status, tone = 'blue', onClick }: ActionRowProps) => (
    <button type="button" onClick={onClick} className="hr-action-row group">
    <span className="hr-action-row__icon">
      <i className={`bi ${icon}`} aria-hidden="true" />
    </span>
        <span className="min-w-0 flex-1">
      <span className="block text-sm font-black leading-5 text-slate-950">{title}</span>
      <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-600">{description}</span>
    </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${actionToneClass[tone]}`}>
      {status}
    </span>
        <i className="bi bi-arrow-right-short shrink-0 text-xl text-blue-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
);

type SimpleRecordRowProps = {
    icon: string;
    title: string;
    detail: string;
    badge?: string;
    onClick: () => void;
};

const SimpleRecordRow = ({ icon, title, detail, badge, onClick }: SimpleRecordRowProps) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 text-left transition hover:border-blue-200 hover:bg-blue-50/70"
    >
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
      <i className={`bi ${icon}`} aria-hidden="true" />
    </span>
        <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-black text-slate-950">{title}</span>
      <span className="mt-0.5 block truncate text-xs font-semibold text-slate-600">{detail}</span>
    </span>
        {badge ? (
            <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
                    badge === 'Unread' ? 'bg-rose-50 text-rose-700 ring-rose-100' : 'bg-slate-100 text-slate-600 ring-slate-200'
                }`}
            >
        {badge}
      </span>
        ) : null}
        <i className="bi bi-arrow-right-short shrink-0 text-lg text-blue-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
);

type SetupWarningBlockProps = {
    icon: string;
    title: string;
    description: string;
    actionLabel: string;
    onClick: () => void;
};

const SetupWarningBlock = ({ icon, title, description, actionLabel, onClick }: SetupWarningBlockProps) => (
    <div className="hr-setup-warning">
    <span className="hr-setup-warning__icon">
      <i className={`bi ${icon}`} aria-hidden="true" />
    </span>
        <div>
            <h3>{title}</h3>
            <p>{description}</p>
            <button type="button" onClick={onClick}>
                {actionLabel} <i className="bi bi-arrow-right-short" aria-hidden="true" />
            </button>
        </div>
    </div>
);

type QuickSetupButtonProps = {
    icon: string;
    title: string;
    onClick: () => void;
};

const QuickSetupButton = ({ icon, title, onClick }: QuickSetupButtonProps) => (
    <button type="button" onClick={onClick} className="hr-quick-button group">
    <span>
      <i className={`bi ${icon}`} aria-hidden="true" />
    </span>
        <strong>{title}</strong>
        <i className="bi bi-arrow-right-short text-lg text-blue-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
);

export default Home;

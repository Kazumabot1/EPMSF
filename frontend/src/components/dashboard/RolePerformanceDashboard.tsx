/*Z*/
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { appraisalWorkflowService } from '../../services/appraisalService';
import { feedbackService } from '../../services/feedbackService';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import { notificationService } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import {
  emptyReportingDashboard,
  reportingService,
  type DepartmentPerformanceRow,
  type EmployeePerformanceRow,
  type ReportingDashboard,
} from '../../services/reportingService';
import type { EmployeeAppraisalFormResponse } from '../../types/appraisal';
import type { FeedbackDashboard } from '../../types/feedback';
import type { EmployeeKpiResult } from '../../types/kpiWorkflow';
import type { NotificationDto } from '../../services/notificationService';
import type { UserProfile } from '../../services/profileService';
import {
  buildScoreBands,
  toDashboardNumber,
  type DashboardChartDatum,
} from '../../utils/dashboardChartData';
import ComparisonColumnChart, { type ComparisonColumnDatum } from './ComparisonColumnChart';
import DashboardChartCard from './DashboardChartCard';
import DashboardMetricCard from './DashboardMetricCard';
import DashboardShell from './DashboardShell';
import DonutSummaryChart from './DonutSummaryChart';
import EmptyChartState from './EmptyChartState';
import './dashboard.css';

type RoleDashboardView = 'admin' | 'hr' | 'ceo' | 'departmentHead' | 'manager' | 'employee';

type RolePerformanceDashboardProps = {
  view: RoleDashboardView;
};

type EmployeeSnapshot = {
  profile: UserProfile | null;
  kpiRows: EmployeeKpiResult[];
  appraisalForms: EmployeeAppraisalFormResponse[];
  feedbackDashboard: FeedbackDashboard | null;
  notifications: NotificationDto[];
};

type DashboardRow = {
  employee: string;
  role: string;
  reviewType: string;
  score: string;
  status: string;
  date: string;
};

const emptyEmployeeSnapshot: EmployeeSnapshot = {
  profile: null,
  kpiRows: [],
  appraisalForms: [],
  feedbackDashboard: null,
  notifications: [],
};

const safeLoad = async <T,>(request: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await request;
  } catch {
    return fallback;
  }
};

const numberValue = (value?: number | string | null) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

const formatNumber = (value?: number | string | null) => numberValue(value).toLocaleString();

const formatPercent = (value?: number | string | null) => `${numberValue(value).toFixed(0)}%`;

const formatScoreOutOfFive = (value?: number | string | null) => {
  const raw = numberValue(value);
  const score = raw > 5 ? raw / 20 : raw;
  return score > 0 ? score.toFixed(1) : '—';
};

const cleanStatus = (value?: string | null) => {
  const result = String(value ?? '').trim();
  if (!result) return 'Not Started';
  return result
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const parseDashboardDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
};

const getQuarterRange = () => {
  const now = new Date();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), quarterStartMonth, 1);
  const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
};

const getYearRange = () => {
  const now = new Date();
  return {
    start: toDateInputValue(new Date(now.getFullYear(), 0, 1)),
    end: toDateInputValue(new Date(now.getFullYear(), 11, 31)),
  };
};

const isWithinDashboardRange = (value: Date | null, start?: string, end?: string) => {
  if (!value) return false;
  const startDate = start ? new Date(`${start}T00:00:00`) : null;
  const endDate = end ? new Date(`${end}T23:59:59`) : null;
  if (startDate && value < startDate) return false;
  if (endDate && value > endDate) return false;
  return true;
};

const getEmployeePerformanceDate = (row: EmployeePerformanceRow) =>
  parseDashboardDate(row.approvedAt || row.submittedAt || row.assessmentDate);

const getPipDate = (row: any) => parseDashboardDate(row.finishedAt || row.endDate || row.createdAt || row.startDate);

const getFeedbackDate = (row: any) => parseDashboardDate(row.endDate || row.startDate);

const buildDepartmentRowsFromEmployees = (rows: EmployeePerformanceRow[]): DepartmentPerformanceRow[] => {
  const groups = new Map<string, EmployeePerformanceRow[]>();
  rows.forEach((row) => {
    const key = String(row.departmentId ?? row.departmentName ?? 'unknown');
    groups.set(key, [...(groups.get(key) || []), row]);
  });

  return Array.from(groups.values()).map((items) => {
    const first = items[0];
    const approved = items.filter((item) => String(item.status || '').toUpperCase().includes('APPROVED') || Boolean(item.approvedAt));
    const pending = items.filter((item) => String(item.status || '').toUpperCase().includes('PENDING'));
    const scored = items.map((item) => numberValue(item.scorePercent)).filter((value) => value > 0);
    const employees = new Set(items.map((item) => item.employeeId ?? item.userId ?? item.employeeCode ?? item.employeeName));

    return {
      departmentId: first.departmentId ?? null,
      departmentName: first.departmentName || 'Unknown Department',
      employeeCount: employees.size || items.length,
      assessmentCount: items.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      activePipCount: 0,
      averageScore: average(scored),
      performanceLabel: average(scored) >= 80 ? 'Outstanding' : average(scored) >= 60 ? 'Healthy' : 'Needs Review',
    };
  }).sort((a, b) => numberValue(b.averageScore) - numberValue(a.averageScore));
};

const filterDashboardByDateRange = (source: ReportingDashboard, start?: string, end?: string): ReportingDashboard => {
  if (!start && !end) return source;

  const employeePerformance = source.employeePerformance.filter((row) =>
    isWithinDashboardRange(getEmployeePerformanceDate(row), start, end),
  );
  const departmentPerformance = employeePerformance.length
    ? buildDepartmentRowsFromEmployees(employeePerformance)
    : [];
  const pipStatusReport = source.pipStatusReport.filter((row) => isWithinDashboardRange(getPipDate(row), start, end));
  const feedbackParticipation = source.feedbackParticipation.filter((row) => isWithinDashboardRange(getFeedbackDate(row), start, end));
  const assessmentStatusBreakdown = source.assessmentStatusBreakdown;
  const scored = employeePerformance.map((row) => numberValue(row.scorePercent)).filter((value) => value > 0);
  const approved = employeePerformance.filter((row) => String(row.status || '').toUpperCase().includes('APPROVED') || Boolean(row.approvedAt));
  const pending = employeePerformance.filter((row) => String(row.status || '').toUpperCase().includes('PENDING'));
  const activePips = pipStatusReport.filter((row) => Boolean(row.active)).length;
  const completionAverage = average(feedbackParticipation.map((row) => numberValue(row.completionRate)));

  return {
    ...source,
    summary: {
      ...source.summary,
      totalAssessments: employeePerformance.length,
      submittedAssessments: employeePerformance.length,
      approvedAssessments: approved.length,
      pendingAssessments: pending.length,
      activePips,
      completedPips: pipStatusReport.filter((row) => !row.active).length,
      feedbackCampaigns: feedbackParticipation.length,
      activeFeedbackCampaigns: feedbackParticipation.filter((row) => String(row.status || '').toUpperCase() === 'ACTIVE').length,
      averageAssessmentScore: average(scored),
      feedbackCompletionRate: completionAverage,
      highPerformers: employeePerformance.filter((row) => numberValue(row.scorePercent) >= 80).length,
      lowPerformers: employeePerformance.filter((row) => {
        const score = numberValue(row.scorePercent);
        return score > 0 && score < 60;
      }).length,
    },
    departmentPerformance,
    employeePerformance,
    assessmentStatusBreakdown,
    pipStatusReport,
    feedbackParticipation,
  };
};

const getAppraisalDate = (row: any) => parseDashboardDate(row.hrApprovedAt || row.deptHeadSubmittedAt || row.pmSubmittedAt || row.assessmentDate || row.createdAt);
const getKpiDate = (row: any) => parseDashboardDate(row.finalizedAt || row.updatedAt || row.createdAt);

const filterEmployeeSnapshotByDateRange = (snapshot: EmployeeSnapshot, start?: string, end?: string): EmployeeSnapshot => {
  if (!start && !end) return snapshot;
  return {
    ...snapshot,
    appraisalForms: snapshot.appraisalForms.filter((row) => isWithinDashboardRange(getAppraisalDate(row), start, end)),
    kpiRows: snapshot.kpiRows.filter((row) => isWithinDashboardRange(getKpiDate(row), start, end)),
  };
};


const getFirstName = (name?: string | null) => {
  const result = String(name ?? '').trim();
  return result ? result.split(/\s+/)[0] : 'there';
};

const isEmployeeView = (view: RoleDashboardView) => view === 'employee';


type QuickAction = {
  icon: string;
  title: string;
  description: string;
  to: string;
};

const getQuickActions = (view: RoleDashboardView): QuickAction[] => {
  if (view === 'hr') {
    return [
      { icon: 'bi-people', title: 'Employees', description: 'Manage employee records', to: '/hr/employee' },
      { icon: 'bi-building', title: 'Departments', description: 'Department setup', to: '/hr/department' },
      { icon: 'bi-grid', title: 'Department Comparison', description: 'Department performance', to: '/hr/department-comparison' },
      { icon: 'bi-diagram-3', title: 'View Teams', description: 'Company team structure', to: '/hr/team' },
      { icon: 'bi-clipboard-data', title: 'Appraisals', description: 'Review workflow', to: '/hr/appraisal' },
      { icon: 'bi-bullseye', title: 'KPI Templates', description: 'KPI setup', to: '/hr/kpi-template' },
      { icon: 'bi-chat-square-text', title: '360 Feedback', description: 'Feedback setup', to: '/hr/feedback/questions' },
      { icon: 'bi-graph-up', title: 'Reports', description: 'Performance reports', to: '/hr/reports/performance' },
      { icon: 'bi-stars', title: 'Recommendations', description: 'Promotion insights', to: '/hr/reports/recommendations' },
    ];
  }

  if (view === 'admin') {
    return [
      { icon: 'bi-speedometer2', title: 'Dashboard', description: 'HR Admin performance view', to: '/admin/dashboard' },
      { icon: 'bi-person-gear', title: 'Users', description: 'User accounts', to: '/admin/users' },
      { icon: 'bi-upload', title: 'Import Employees', description: 'Bulk employee import', to: '/admin/employee/import' },
      { icon: 'bi-shield-check', title: 'Permissions', description: 'Position permissions', to: '/position-permissions' },
      { icon: 'bi-ui-checks-grid', title: 'KPI Scoring', description: 'Score assigned KPIs', to: '/admin/kpi-scoring' },
      { icon: 'bi-bullseye', title: 'KPI Approval', description: 'Approve KPI cycles', to: '/admin/approval/kpi' },
      { icon: 'bi-journal-text', title: 'Audit Logs', description: 'System activity', to: '/admin/audit-logs' },
    ];
  }

  if (view === 'ceo') {
    return [
      { icon: 'bi-bar-chart', title: 'Performance Report', description: 'Organization results', to: '/executive/reports/performance' },
      { icon: 'bi-building-check', title: 'Department Performance', description: 'Department comparison', to: '/executive/reports/department-performance' },
      { icon: 'bi-person-check', title: 'People Change Review', description: 'Approve workforce changes', to: '/executive/approval/changes' },
      { icon: 'bi-stars', title: 'Recommendations', description: 'Promotion insights', to: '/executive/reports/recommendations' },
    ];
  }

  if (view === 'departmentHead') {
    return [
      { icon: 'bi-diagram-3', title: 'View Teams', description: 'Department team list', to: '/department-head/teams' },
      { icon: 'bi-clipboard-check', title: 'Assessment Review', description: 'Review scores', to: '/department-head/assessment-review' },
      { icon: 'bi-list-check', title: 'Appraisals', description: 'Department review queue', to: '/department-head/appraisals/review' },
      { icon: 'bi-chat-square-text', title: '360 Feedback', description: 'Department feedback', to: '/department-head/feedback/summary' },
      { icon: 'bi-bullseye', title: 'Department KPIs', description: 'Department KPI results', to: '/department-head/department-kpis' },
      { icon: 'bi-graph-up', title: 'Reports', description: 'Scoped reports', to: '/department-head/reports/performance' },
    ];
  }

  if (view === 'manager') {
    return [
      { icon: 'bi-people', title: 'My Team', description: 'Direct reports', to: '/manager/my-team' },
      { icon: 'bi-clipboard-check', title: 'Assessment Review', description: 'Manager reviews', to: '/manager/assessment-review' },
      { icon: 'bi-list-check', title: 'Appraisals', description: 'Review history', to: '/manager/appraisals' },
      { icon: 'bi-chat-square-text', title: '360 Feedback', description: 'Team feedback summary', to: '/manager/feedback/summary' },
      { icon: 'bi-bullseye', title: 'KPI Scoring', description: 'Score KPIs', to: '/manager/kpi-scoring' },
      { icon: 'bi-graph-up', title: 'Reports', description: 'Manager reports', to: '/manager/reports/performance' },
      { icon: 'bi-exclamation-triangle', title: 'Create PIP', description: 'Improvement plan', to: '/pip/create' },
    ];
  }

  return [
    { icon: 'bi-person-lines-fill', title: 'My Profile', description: 'Profile information', to: '/employee/dashboard' },
    { icon: 'bi-people', title: 'My Team', description: 'Team information', to: '/employee/my-team' },
    { icon: 'bi-pencil-square', title: 'Self Assessment', description: 'Complete self review', to: '/employee/self-assessment' },
    { icon: 'bi-list-check', title: 'My Appraisals', description: 'Review history', to: '/employee/appraisals' },
    { icon: 'bi-chat-square-text', title: '360 Feedback', description: 'Feedback assignments', to: '/employee/feedback' },
    { icon: 'bi-bullseye', title: 'My KPIs', description: 'KPI results', to: '/employee/kpis' },
    { icon: 'bi-exclamation-triangle', title: 'My PIP', description: 'Improvement plans', to: '/employee/pip' },
  ];
};

const getRoleCopy = (view: RoleDashboardView, userName?: string | null) => {
  const firstName = getFirstName(userName);

  if (view === 'employee') {
    return {
      eyebrow: 'My Performance',
      title: `Welcome Back, ${firstName}!`,
      description: 'Here is your personal KPI, appraisal, and feedback snapshot.',
      scope: 'Personal dashboard',
      chartTitle: 'My Overall Results',
      chartSubtitle: 'Your latest appraisal, KPI, and feedback results from available records.',
      distributionTitle: 'My Results Distribution',
      recentTitle: 'Recent Personal Reviews',
    };
  }

  if (view === 'manager') {
    return {
      eyebrow: 'Manager Performance',
      title: `Welcome Back, ${firstName}!`,
      description: 'Track performance, reviews, PIP risk, and feedback completion for employees in your manager scope.',
      scope: 'Manager scope',
      chartTitle: 'Overall Results by Employee / Team',
      chartSubtitle: 'Scoped employee performance from the reporting dashboard.',
      distributionTitle: 'Scoped Results Distribution',
      recentTitle: 'Recent Scoped Reviews',
    };
  }

  if (view === 'departmentHead') {
    return {
      eyebrow: 'Department Performance',
      title: `Welcome Back, ${firstName}!`,
      description: 'Monitor performance, review status, feedback completion, and risk within your department scope.',
      scope: 'Department scope',
      chartTitle: 'Overall Results by Department',
      chartSubtitle: 'Department-scoped performance from the reporting dashboard.',
      distributionTitle: 'Department Results Distribution',
      recentTitle: 'Recent Department Reviews',
    };
  }

  if (view === 'ceo') {
    return {
      eyebrow: 'Executive Performance',
      title: `Welcome Back, ${firstName}!`,
      description: 'Review organization-wide performance, completion health, feedback trends, and people risk.',
      scope: 'Organization view',
      chartTitle: 'Overall Results by Department',
      chartSubtitle: 'Organization performance compared across departments.',
      distributionTitle: 'Results Distribution',
      recentTitle: 'Recent Reviews',
    };
  }

  if (view === 'admin') {
    return {
      eyebrow: 'HR Admin Performance',
      title: `Welcome Back, ${firstName}!`,
      description: 'Monitor organization performance health using the same secured reporting data used by HR.',
      scope: 'HR Admin view',
      chartTitle: 'Overall Results by Department',
      chartSubtitle: 'Organization performance compared across departments.',
      distributionTitle: 'Results Distribution',
      recentTitle: 'Recent Reviews',
    };
  }

  return {
    eyebrow: 'HR Performance',
    title: `Welcome Back, ${firstName}!`,
    description: 'Monitor organization performance, appraisal progress, 360 feedback, and PIP risk from one workspace.',
    scope: 'HR organization view',
    chartTitle: 'Overall Results by Department',
    chartSubtitle: 'Organization performance compared across departments.',
    distributionTitle: 'Results Distribution',
    recentTitle: 'Recent Reviews',
  };
};

const average = (values: number[]) => {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
};

const makeDepartmentComparison = (dashboard: ReportingDashboard, view: RoleDashboardView): ComparisonColumnDatum[] => {
  const rows = dashboard.departmentPerformance.filter((row) => numberValue(row.averageScore) > 0);

  if (rows.length > 0 && view !== 'manager') {
    return rows.slice(0, 8).map((row) => {
      const averageScore = numberValue(row.averageScore);
      const approvedRate = row.assessmentCount > 0 ? (numberValue(row.approvedCount) / numberValue(row.assessmentCount)) * 100 : averageScore;

      return {
        label: row.departmentName || 'Unknown',
        value: averageScore,
        compareValue: approvedRate,
        detail: `${formatNumber(row.employeeCount)} employees`,
        color: '#2563eb',
        compareColor: '#9dccff',
        raw: row,
        percentage: averageScore,
      };
    });
  }

  return dashboard.employeePerformance.slice(0, 8).map((row, index) => ({
    label: row.employeeName || row.employeeCode || `Employee ${index + 1}`,
    value: numberValue(row.scorePercent),
    compareValue: dashboard.summary.averageAssessmentScore || numberValue(row.scorePercent),
    detail: row.departmentName || 'Scoped employee',
    color: '#2563eb',
    compareColor: '#9dccff',
    raw: row,
    percentage: numberValue(row.scorePercent),
  }));
};

const makeOrgDistribution = (dashboard: ReportingDashboard): DashboardChartDatum[] => {
  const bands = buildScoreBands(dashboard.employeePerformance, (row: EmployeePerformanceRow) => row.scorePercent);

  if (bands.some((item) => numberValue(item.value) > 0)) {
    return bands.map((item, index) => ({ ...item, color: ['#2563eb', '#38bdf8', '#2dd4bf', '#f59e0b', '#fb7185'][index] }));
  }

  return [
    { label: 'Approved', value: dashboard.summary.approvedAssessments, color: '#2dd4bf' },
    { label: 'Submitted', value: dashboard.summary.submittedAssessments, color: '#2563eb' },
    { label: 'Pending', value: dashboard.summary.pendingAssessments, color: '#f59e0b' },
    { label: 'Active PIPs', value: dashboard.summary.activePips, color: '#fb7185' },
  ];
};

const makeOrgRows = (dashboard: ReportingDashboard): DashboardRow[] => {
  const rows = dashboard.employeePerformance.slice(0, 6).map((row) => ({
    employee: row.employeeName || row.employeeCode || 'Employee',
    role: row.departmentName || row.position || '—',
    reviewType: row.formName || row.period || 'Performance Review',
    score: row.scorePercent > 0 ? formatPercent(row.scorePercent) : '—',
    status: cleanStatus(row.status),
    date: formatDate(row.approvedAt || row.submittedAt || row.assessmentDate),
  }));

  if (rows.length) return rows;

  return dashboard.departmentPerformance.slice(0, 6).map((row: DepartmentPerformanceRow) => ({
    employee: row.departmentName || 'Department',
    role: `${formatNumber(row.employeeCount)} employees`,
    reviewType: 'Department Summary',
    score: row.averageScore > 0 ? formatPercent(row.averageScore) : '—',
    status: row.pendingCount > 0 ? 'Pending Review' : 'Healthy',
    date: '—',
  }));
};

const makeEmployeeComparison = (snapshot: EmployeeSnapshot): ComparisonColumnDatum[] => {
  const latestAppraisalScore = average(snapshot.appraisalForms.map((row) => numberValue(row.scorePercent)));
  const latestKpiScore = average(snapshot.kpiRows.map((row) => numberValue(row.totalWeightedScore ?? row.totalScore)));
  const feedbackScore = numberValue(snapshot.feedbackDashboard?.averageScore) > 5
    ? numberValue(snapshot.feedbackDashboard?.averageScore)
    : numberValue(snapshot.feedbackDashboard?.averageScore) * 20;
  const responseRate = snapshot.feedbackDashboard?.totalRequests
    ? (numberValue(snapshot.feedbackDashboard.totalResponses) / numberValue(snapshot.feedbackDashboard.totalRequests)) * 100
    : 0;

  return [
    { label: 'Appraisal', value: latestAppraisalScore, compareValue: 70, color: '#2563eb', compareColor: '#9dccff' },
    { label: 'KPI', value: latestKpiScore, compareValue: 70, color: '#2563eb', compareColor: '#9dccff' },
    { label: '360 Feedback', value: feedbackScore, compareValue: responseRate, color: '#2563eb', compareColor: '#9dccff' },
  ].filter((item) => item.value > 0 || item.compareValue > 0);
};

const makeEmployeeDistribution = (snapshot: EmployeeSnapshot): DashboardChartDatum[] => {
  const completedAppraisals = snapshot.appraisalForms.filter((row) => ['COMPLETED', 'APPROVED', 'HR_APPROVED'].includes(String(row.status))).length;
  const pendingAppraisals = Math.max(snapshot.appraisalForms.length - completedAppraisals, 0);
  const pendingFeedback = numberValue(snapshot.feedbackDashboard?.totalPendingAssignments);
  const completedFeedback = numberValue(snapshot.feedbackDashboard?.totalResponses);
  const unreadNotifications = snapshot.notifications.filter((notification: any) => !notification.read).length;

  return [
    { label: 'Completed Reviews', value: completedAppraisals + completedFeedback, color: '#2dd4bf' },
    { label: 'Pending Reviews', value: pendingAppraisals, color: '#f59e0b' },
    { label: 'Feedback Pending', value: pendingFeedback, color: '#2563eb' },
    { label: 'Notifications', value: unreadNotifications, color: '#fb7185' },
  ];
};

const makeEmployeeRows = (snapshot: EmployeeSnapshot): DashboardRow[] => {
  const appraisalRows = snapshot.appraisalForms.slice(0, 4).map((row) => ({
    employee: row.employeeName || snapshot.profile?.fullName || 'Me',
    role: row.departmentName || row.positionName || 'Personal',
    reviewType: row.cycleName || 'Appraisal',
    score: row.scorePercent ? formatPercent(row.scorePercent) : '—',
    status: cleanStatus(row.status),
    date: formatDate(row.hrApprovedAt || row.deptHeadSubmittedAt || row.pmSubmittedAt || row.assessmentDate),
  }));

  const kpiRows = snapshot.kpiRows.slice(0, 3).map((row) => ({
    employee: snapshot.profile?.fullName || 'Me',
    role: row.positionTitle || 'KPI',
    reviewType: row.kpiTitle || 'KPI Result',
    score: row.totalWeightedScore || row.totalScore ? formatPercent(row.totalWeightedScore ?? row.totalScore) : '—',
    status: cleanStatus(row.status),
    date: formatDate(row.finalizedAt),
  }));

  return [...appraisalRows, ...kpiRows].slice(0, 6);
};

const StatusBadge = ({ status }: { status: string }) => {
  const key = status.toLowerCase();
  const tone = key.includes('complete') || key.includes('approved') || key.includes('healthy')
    ? 'success'
    : key.includes('pending') || key.includes('progress')
      ? 'warning'
      : 'neutral';

  return <span className={`role-dashboard-status role-dashboard-status--${tone}`}>{status}</span>;
};

const LoadingState = () => (
  <div className="role-dashboard-loading">
    <span className="role-dashboard-loading__spinner" />
    Loading performance dashboard…
  </div>
);

const RolePerformanceDashboard = ({ view }: RolePerformanceDashboardProps) => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<ReportingDashboard>(emptyReportingDashboard);
  const [employeeSnapshot, setEmployeeSnapshot] = useState<EmployeeSnapshot>(emptyEmployeeSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        if (isEmployeeView(view)) {
          const [profile, kpiRows, appraisalForms, feedbackDashboard, notifications] = await Promise.all([
            safeLoad<UserProfile | null>(profileService.getMyProfile(), null),
            safeLoad<EmployeeKpiResult[]>(kpiWorkflowService.myFinalizedResults(), []),
            safeLoad<EmployeeAppraisalFormResponse[]>(appraisalWorkflowService.getEmployeeForms(), []),
            safeLoad<FeedbackDashboard | null>(feedbackService.getEmployeeDashboard(), null),
            safeLoad<NotificationDto[]>(notificationService.list(), []),
          ]);

          if (!mounted) return;
          setEmployeeSnapshot({ profile, kpiRows, appraisalForms, feedbackDashboard, notifications });
          return;
        }

        const result = await reportingService.getDashboard();
        if (!mounted) return;
        setDashboard(result);
      } catch (err: any) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Unable to load the performance dashboard right now.',
        );
        setDashboard(emptyReportingDashboard);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [view]);

  const copy = getRoleCopy(view, user?.fullName || employeeSnapshot.profile?.fullName);
  const dateFilterActive = Boolean(dateStart || dateEnd);
  const filteredDashboard = useMemo(() => filterDashboardByDateRange(dashboard, dateStart, dateEnd), [dashboard, dateStart, dateEnd]);
  const filteredEmployeeSnapshot = useMemo(() => filterEmployeeSnapshotByDateRange(employeeSnapshot, dateStart, dateEnd), [employeeSnapshot, dateStart, dateEnd]);
  const applyPresetRange = (preset: 'month' | 'quarter' | 'year' | 'all') => {
    if (preset === 'all') {
      setDateStart('');
      setDateEnd('');
      return;
    }
    const range = preset === 'month' ? getMonthRange() : preset === 'quarter' ? getQuarterRange() : getYearRange();
    setDateStart(range.start);
    setDateEnd(range.end);
  };

  const orgMetrics = useMemo(() => {
    const summary = filteredDashboard.summary;
    return [
      {
        title: 'Overall Score',
        value: summary.submittedAssessments > 0 ? formatPercent(summary.averageAssessmentScore) : '—',
        detail: summary.submittedAssessments > 0 ? 'Latest finalized appraisal average' : 'No finalized score yet',
        icon: <i className="bi bi-star" aria-hidden="true" />,
        tone: 'blue' as const,
        trend: { label: summary.averageAssessmentScore >= 70 ? 'Healthy' : summary.averageAssessmentScore > 0 ? 'Needs review' : 'No data', direction: summary.averageAssessmentScore >= 70 ? 'up' as const : 'flat' as const },
      },
      {
        title: 'Participation Rate',
        value: formatPercent(summary.feedbackCompletionRate),
        detail: `${formatNumber(summary.activeFeedbackCampaigns)} active 360 campaign(s)`,
        icon: <i className="bi bi-people" aria-hidden="true" />,
        tone: 'cyan' as const,
        trend: { label: '360 feedback', direction: summary.feedbackCompletionRate >= 70 ? 'up' as const : 'flat' as const },
      },
      {
        title: 'Completed Reviews',
        value: formatNumber(summary.approvedAssessments || summary.submittedAssessments),
        detail: `${formatNumber(summary.totalAssessments)} total assessment(s)`,
        icon: <i className="bi bi-check2-circle" aria-hidden="true" />,
        tone: 'emerald' as const,
        trend: { label: `${formatNumber(summary.pendingAssessments)} pending`, direction: summary.pendingAssessments > 0 ? 'flat' as const : 'up' as const },
      },
      {
        title: 'Pending Actions',
        value: formatNumber(summary.pendingAssessments + summary.activePips + summary.lowPerformers),
        detail: 'Pending reviews, active PIPs, and low performers',
        icon: <i className="bi bi-clock" aria-hidden="true" />,
        tone: summary.pendingAssessments + summary.activePips + summary.lowPerformers > 0 ? 'rose' as const : 'emerald' as const,
        trend: { label: summary.activePips > 0 ? `${formatNumber(summary.activePips)} active PIP` : 'No active PIP', direction: summary.activePips > 0 ? 'down' as const : 'up' as const },
      },
    ];
  }, [filteredDashboard]);

  const employeeMetrics = useMemo(() => {
    const appraisalScore = average(filteredEmployeeSnapshot.appraisalForms.map((row) => numberValue(row.scorePercent)));
    const kpiScore = average(filteredEmployeeSnapshot.kpiRows.map((row) => numberValue(row.totalWeightedScore ?? row.totalScore)));
    const feedback = filteredEmployeeSnapshot.feedbackDashboard;
    const pendingFeedback = numberValue(feedback?.totalPendingAssignments);
    const unread = filteredEmployeeSnapshot.notifications.filter((notification: any) => !notification.read).length;
    const overall = average([appraisalScore, kpiScore, numberValue(feedback?.averageScore) > 5 ? numberValue(feedback?.averageScore) : numberValue(feedback?.averageScore) * 20]);
    const participation = feedback?.totalRequests ? (numberValue(feedback.totalResponses) / numberValue(feedback.totalRequests)) * 100 : 0;

    return [
      { title: 'My Overall Score', value: overall > 0 ? formatPercent(overall) : '—', detail: 'Combined available KPI, appraisal, and feedback score', icon: <i className="bi bi-star" />, tone: 'blue' as const, trend: { label: overall >= 70 ? 'Healthy' : 'Needs review', direction: overall >= 70 ? 'up' as const : 'flat' as const } },
      { title: '360 Participation', value: formatPercent(participation), detail: `${formatNumber(feedback?.totalResponses)} submitted of ${formatNumber(feedback?.totalRequests)} request(s)`, icon: <i className="bi bi-people" />, tone: 'cyan' as const, trend: { label: 'Personal feedback', direction: participation >= 70 ? 'up' as const : 'flat' as const } },
      { title: 'Completed Reviews', value: formatNumber(filteredEmployeeSnapshot.appraisalForms.filter((row) => ['COMPLETED', 'APPROVED', 'HR_APPROVED'].includes(String(row.status))).length), detail: `${formatNumber(filteredEmployeeSnapshot.appraisalForms.length)} appraisal form(s)`, icon: <i className="bi bi-check2-circle" />, tone: 'emerald' as const, trend: { label: `${formatNumber(filteredEmployeeSnapshot.kpiRows.length)} KPI result(s)`, direction: 'flat' as const } },
      { title: 'Pending Actions', value: formatNumber(pendingFeedback + unread), detail: 'Feedback assignments and unread notifications', icon: <i className="bi bi-clock" />, tone: pendingFeedback + unread > 0 ? 'rose' as const : 'emerald' as const, trend: { label: pendingFeedback > 0 ? `${formatNumber(pendingFeedback)} feedback pending` : 'Clear', direction: pendingFeedback > 0 ? 'down' as const : 'up' as const } },
    ];
  }, [filteredEmployeeSnapshot]);

  const comparisonData = useMemo(
    () => (isEmployeeView(view) ? makeEmployeeComparison(filteredEmployeeSnapshot) : makeDepartmentComparison(filteredDashboard, view)),
    [filteredDashboard, filteredEmployeeSnapshot, view],
  );

  const distributionData = useMemo(
    () => (isEmployeeView(view) ? makeEmployeeDistribution(filteredEmployeeSnapshot) : makeOrgDistribution(filteredDashboard)),
    [filteredDashboard, filteredEmployeeSnapshot, view],
  );

  const recentRows = useMemo(
    () => (isEmployeeView(view) ? makeEmployeeRows(filteredEmployeeSnapshot) : makeOrgRows(filteredDashboard)),
    [filteredDashboard, filteredEmployeeSnapshot, view],
  );

  const highlights = useMemo(() => {
    if (isEmployeeView(view)) {
      const bestKpi = [...filteredEmployeeSnapshot.kpiRows].sort((a, b) => numberValue(b.totalWeightedScore ?? b.totalScore) - numberValue(a.totalWeightedScore ?? a.totalScore))[0];
      return [
        { icon: 'bi-hand-thumbs-up', title: 'Best KPI Result', detail: bestKpi?.kpiTitle || 'No finalized KPI result yet', value: bestKpi ? formatPercent(bestKpi.totalWeightedScore ?? bestKpi.totalScore) : '—', tone: 'success' },
        { icon: 'bi-chat-dots', title: '360 Feedback', detail: 'Average feedback score from available feedback records.', value: formatScoreOutOfFive(filteredEmployeeSnapshot.feedbackDashboard?.averageScore), tone: 'info' },
        { icon: 'bi-bell', title: 'Pending Attention', detail: 'Feedback assignments and unread notifications.', value: formatNumber(numberValue(filteredEmployeeSnapshot.feedbackDashboard?.totalPendingAssignments) + filteredEmployeeSnapshot.notifications.filter((item: any) => !item.read).length), tone: 'warning' },
      ];
    }

    const topDepartment = [...filteredDashboard.departmentPerformance].sort((a, b) => numberValue(b.averageScore) - numberValue(a.averageScore))[0];
    return [
      { icon: 'bi-hand-thumbs-up', title: 'Greatest Strength', detail: topDepartment?.departmentName ? `${topDepartment.departmentName} leads the current performance view.` : 'No department score available yet.', value: topDepartment?.averageScore ? formatPercent(topDepartment.averageScore) : '—', tone: 'success' },
      { icon: 'bi-graph-up-arrow', title: 'Improvement Focus', detail: filteredDashboard.summary.lowPerformers > 0 ? 'Low performers require HR/manager attention.' : 'No low performer risk currently reported.', value: formatNumber(filteredDashboard.summary.lowPerformers), tone: filteredDashboard.summary.lowPerformers > 0 ? 'warning' : 'success' },
      { icon: 'bi-clipboard-check', title: 'Review Queue', detail: 'Assessments currently waiting in workflow.', value: formatNumber(filteredDashboard.summary.pendingAssessments), tone: filteredDashboard.summary.pendingAssessments > 0 ? 'warning' : 'success' },
    ];
  }, [filteredDashboard, filteredEmployeeSnapshot, view]);

  const metrics = isEmployeeView(view) ? employeeMetrics : orgMetrics;
  const totalDistribution = distributionData.reduce((sum, item) => sum + toDashboardNumber(item.value), 0);
  const quickActions = getQuickActions(view);

  return (
    <DashboardShell
      className="role-performance-dashboard"
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      metaLabel="Scope"
      metaValue={filteredDashboard.access.scopeLabel || copy.scope}
      metaDetail={isEmployeeView(view) ? 'Only your personal records are shown.' : 'Data is rendered from the secured reporting dashboard response.'}
      actions={
        <div className="role-dashboard-actions">
          <div className="role-dashboard-date-filter" aria-label="Dashboard result date filter">
            <button type="button" onClick={() => applyPresetRange('month')}>Month</button>
            <button type="button" onClick={() => applyPresetRange('quarter')}>Quarter</button>
            <button type="button" onClick={() => applyPresetRange('year')}>Year</button>
            <label>
              <span>From</span>
              <input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />
            </label>
            {dateFilterActive ? <button type="button" className="role-dashboard-date-filter__clear" onClick={() => applyPresetRange('all')}>Clear</button> : null}
          </div>
          {!isEmployeeView(view) ? (
            <Link className="epms-dashboard-button epms-dashboard-button--secondary" to={view === 'hr' ? '/hr/reports/performance' : view === 'admin' ? '/admin/users' : view === 'ceo' ? '/executive/reports/performance' : view === 'manager' ? '/manager/reports/performance' : '/department-head/reports/performance'}>
              <i className="bi bi-bar-chart" aria-hidden="true" />
              View reports
            </Link>
          ) : null}
        </div>
      }
    >
      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="role-dashboard-error">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {!loading ? (
        <>
          <section className="dashboard-grid dashboard-grid--metrics role-dashboard-metrics" aria-label="Performance metrics">
            {metrics.map((metric) => (
              <DashboardMetricCard key={String(metric.title)} {...metric} />
            ))}
          </section>

          <section className="role-dashboard-main-grid">
            <DashboardChartCard
              className="role-dashboard-chart-card role-dashboard-chart-card--comparison"
              title={copy.chartTitle}
              subtitle={dateFilterActive ? `${copy.chartSubtitle} Filtered by selected calendar range.` : copy.chartSubtitle}
              action={<span className="role-dashboard-pill">Score (%)</span>}
            >
              {comparisonData.length ? (
                <ComparisonColumnChart
                  data={comparisonData}
                  height={330}
                  maxBars={8}
                  primaryLabel={isEmployeeView(view) ? 'Current Result' : 'Score'}
                  comparisonLabel={isEmployeeView(view) ? 'Target / Completion' : 'Completion / Average'}
                  showComparison={false}
                  valueFormatter={(value) => formatPercent(value)}
                />
              ) : (
                <EmptyChartState compact title="No performance data yet" description="Results will appear after appraisal, KPI, or feedback records are available." />
              )}
            </DashboardChartCard>

            <DashboardChartCard
              className="role-dashboard-chart-card role-dashboard-chart-card--donut"
              title={copy.distributionTitle}
              subtitle={totalDistribution > 0 ? `${formatNumber(totalDistribution)} record(s) included` : 'No distribution data yet'}
            >
              <DonutSummaryChart
                data={distributionData}
                totalLabel={isEmployeeView(view) ? 'Items' : 'Records'}
                height={255}
              />
            </DashboardChartCard>
          </section>

          <section className="role-dashboard-lower-grid">
            <DashboardChartCard className="role-dashboard-chart-card" title="Feedback Highlights" subtitle="Important signals from the current scope.">
              <div className="role-dashboard-highlights">
                {highlights.map((item) => (
                  <article className={`role-dashboard-highlight role-dashboard-highlight--${item.tone}`} key={item.title}>
                    <span className="role-dashboard-highlight__icon"><i className={`bi ${item.icon}`} aria-hidden="true" /></span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                    </div>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </DashboardChartCard>

            <DashboardChartCard
              className="role-dashboard-chart-card role-dashboard-chart-card--table"
              title={copy.recentTitle}
              subtitle="Latest available records from the current dashboard scope."
              action={<span className="role-dashboard-pill">View only</span>}
            >
              {recentRows.length ? (
                <div className="role-dashboard-table-wrap">
                  <table className="role-dashboard-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Area</th>
                        <th>Review Type</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRows.map((row, index) => (
                        <tr key={`${row.employee}-${row.reviewType}-${index}`}>
                          <td><strong>{row.employee}</strong></td>
                          <td>{row.role}</td>
                          <td>{row.reviewType}</td>
                          <td className="role-dashboard-table__score">{row.score}</td>
                          <td><StatusBadge status={row.status} /></td>
                          <td>{row.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyChartState compact title="No recent records yet" description="Recent reviews will appear once records are available in this scope." />
              )}
            </DashboardChartCard>
          </section>

          <DashboardChartCard
            className="role-dashboard-chart-card role-dashboard-quick-card"
            title="Quick Actions"
            subtitle="Your original dashboard shortcuts are restored here for fast navigation."
          >
            <div className="role-dashboard-quick-grid">
              {quickActions.map((action) => (
                <Link className="role-dashboard-quick-action" to={action.to} key={`${action.title}-${action.to}`}>
                  <span className="role-dashboard-quick-action__icon"><i className={`bi ${action.icon}`} aria-hidden="true" /></span>
                  <span className="role-dashboard-quick-action__body">
                    <strong>{action.title}</strong>
                    <small>{action.description}</small>
                  </span>
                  <i className="bi bi-arrow-right-short role-dashboard-quick-action__arrow" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </DashboardChartCard>
        </>
      ) : null}
    </DashboardShell>
  );
};

export default RolePerformanceDashboard;

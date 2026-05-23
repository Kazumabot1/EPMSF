import { useEffect, useMemo, useState } from 'react';
import { exportToExcel } from '../../utils/exportExcel';
import {
  reportingService,
  type DepartmentPerformanceRow,
  type EmployeePerformanceRow,
  type FeedbackParticipationRow,
  type PipReportRow,
  type RecommendationRow,
  type ReportingDashboard,
  type StatusBreakdownRow,
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

  return date.toLocaleDateString();
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

const cleanStatus = (value?: string | null) => {
  return String(value || 'UNKNOWN')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

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

const reportCopy: Record<ReportType, { title: string; description: string; exportLabel: string; searchPlaceholder: string }> = {
  employees: {
    title: 'Performance Reports',
    description: 'View submitted appraisal results, scores, review status, and employee performance labels.',
    exportLabel: 'employee-performance-report',
    searchPlaceholder: 'Search employees, department, manager, status...',
  },
  departments: {
    title: 'Department Performance',
    description: 'Compare department-level assessment volume, average score, pending reviews, and active PIP load.',
    exportLabel: 'department-performance-report',
    searchPlaceholder: 'Search departments or performance label...',
  },
  pip: {
    title: 'PIP Status',
    description: 'Track active and completed performance improvement plans by employee, department, and owner.',
    exportLabel: 'pip-status-report',
    searchPlaceholder: 'Search employee, department, goal, owner...',
  },
  feedback: {
    title: 'Feedback Completion',
    description: 'Monitor 360 feedback campaign participation, submitted responses, pending responses, and completion rate.',
    exportLabel: 'feedback-participation-report',
    searchPlaceholder: 'Search campaign or status...',
  },
  recommendations: {
    title: 'Recommendations',
    description: 'Review promotion, increment, and performance-watch recommendations generated from appraisal scores.',
    exportLabel: 'recommendation-report',
    searchPlaceholder: 'Search employee, department, recommendation...',
  },
};

const ReportingDashboardPage = ({ reportType = 'employees' }: ReportingDashboardPageProps) => {
  const [dashboard, setDashboard] = useState<ReportingDashboard>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const activeReportType: ReportType = reportCopy[reportType] ? reportType : 'employees';
  const activeCopy = reportCopy[activeReportType];

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

  const summary = dashboard.summary;

  if (loading) {
    return (
      <div className="reporting-page">
        <div className="reporting-loading">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="reporting-page">
      <section className="reporting-hero">
        <div>
          <span className="reporting-eyebrow">Reporting & Analytics</span>
          <h1>{activeCopy.title}</h1>
          <p>{activeCopy.description}</p>
        </div>

        <div className="reporting-hero-card">
          <span>Current Scope</span>
          <strong>{dashboard.access.scopeLabel || 'Organization-wide'}</strong>
          <small>{dashboard.access.role || 'User'} access</small>
        </div>
      </section>

      {error && <div className="reporting-error">{error}</div>}

      <section className="reporting-metrics-grid">
        <Metric title="Active Employees" value={formatNumber(summary.activeEmployees)} detail={`${formatNumber(summary.totalEmployees)} total`} icon="bi-people" />
        <Metric title="Avg. Score" value={formatPercent(summary.averageAssessmentScore)} detail={`${formatNumber(summary.submittedAssessments)} submitted`} icon="bi-graph-up-arrow" />
        <Metric title="Pending Reviews" value={formatNumber(summary.pendingAssessments)} detail={`${formatNumber(summary.approvedAssessments)} approved`} icon="bi-hourglass-split" />
        <Metric title="Feedback Completion" value={formatPercent(summary.feedbackCompletionRate)} detail={`${formatNumber(summary.activeFeedbackCampaigns)} active campaign(s)`} icon="bi-chat-dots" />
        <Metric title="Active PIPs" value={formatNumber(summary.activePips)} detail={`${formatNumber(summary.completedPips)} completed`} icon="bi-clipboard2-pulse" />
        <Metric title="High / Low" value={`${formatNumber(summary.highPerformers)} / ${formatNumber(summary.lowPerformers)}`} detail="Performance watch" icon="bi-stars" />
      </section>

      <section className="reporting-toolbar reporting-toolbar--single">
        <div className="reporting-current-section">
          <span>Current report</span>
          <strong>{activeCopy.title}</strong>
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

          <button type="button" className="reporting-button" onClick={exportActiveReport}>
            <i className="bi bi-file-earmark-excel" />
            Export Excel
          </button>
        </div>
      </section>

      <section className="reporting-content-card">
        {activeReportType === 'employees' && <EmployeePerformanceTable rows={filteredEmployees} />}
        {activeReportType === 'departments' && <DepartmentPerformanceTable rows={filteredDepartments} />}
        {activeReportType === 'pip' && <PipTable rows={filteredPips} />}
        {activeReportType === 'feedback' && <FeedbackTable rows={filteredFeedback} />}
        {activeReportType === 'recommendations' && <RecommendationTable rows={filteredRecommendations} />}
      </section>

      {(activeReportType === 'employees' || activeReportType === 'departments') && (
        <section className="reporting-content-card">
          <div className="reporting-section-title">
            <h2>Assessment Status Breakdown</h2>
            <span>{formatNumber(dashboard.assessmentStatusBreakdown.reduce((sum, row) => sum + row.count, 0))} total</span>
          </div>
          <StatusBreakdown rows={dashboard.assessmentStatusBreakdown} />
        </section>
      )}
    </div>
  );
};

const Metric = ({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: string }) => (
  <article className="reporting-metric-card">
    <div className="reporting-metric-icon">
      <i className={`bi ${icon}`} />
    </div>
    <span>{title}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </article>
);

const EmptyRows = () => (
  <div className="reporting-empty">
    <i className="bi bi-inbox" />
    <strong>No report rows found.</strong>
    <span>Try clearing search or adding more performance data.</span>
  </div>
);

const EmployeePerformanceTable = ({ rows }: { rows: EmployeePerformanceRow[] }) => {
  if (!rows.length) return <EmptyRows />;

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
  if (!rows.length) return <EmptyRows />;

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
  if (!rows.length) return <EmptyRows />;

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
  if (!rows.length) return <EmptyRows />;

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
  if (!rows.length) return <EmptyRows />;

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
              <td><span className="report-pill report-pill--purple">{row.recommendationType}</span></td>
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

const StatusBreakdown = ({ rows }: { rows: StatusBreakdownRow[] }) => {
  if (!rows.length) return <EmptyRows />;

  return (
    <div className="reporting-status-grid">
      {rows.map((row) => (
        <div className="reporting-status-card" key={row.status}>
          <span>{cleanStatus(row.status)}</span>
          <strong>{formatNumber(row.count)}</strong>
          <div className="reporting-progress">
            <span style={{ width: `${Math.min(Math.max(row.percentage, 0), 100)}%` }} />
          </div>
          <small>{formatPercent(row.percentage)}</small>
        </div>
      ))}
    </div>
  );
};

export default ReportingDashboardPage;
import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { authStorage } from '../../services/authStorage';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import type { ManagerKpiAssignment } from '../../types/kpiWorkflow';
import '../../components/hr/kpi-template/kpi-template.css';
import './manager-kpi-history.css';

const normalizeRoleName = (role?: string | null) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const formatWhen = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const formatScore = (value?: number | null, digits = 2) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(digits);
};

const average = (values: Array<number | null | undefined>) => {
  const valid = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const getScopeCopy = () => {
  const user = authStorage.getUser();
  const roles = (user?.roles ?? []).map(normalizeRoleName);
  const dashboard = normalizeRoleName(user?.dashboard);

  const hasRole = (...names: string[]) => names.some((name) => roles.includes(name));
  const hasDashboard = (...names: string[]) => names.includes(dashboard);

  if (hasRole('ADMIN', 'HRADMIN', 'HR_ADMIN') || hasDashboard('ADMIN_DASHBOARD', 'HRADMIN_DASHBOARD', 'HR_ADMIN_DASHBOARD')) {
    return {
      badge: 'HR Admin scope',
      title: 'KPI History',
      description: 'Company-wide finalized KPI scores for every employee record.',
      empty: 'No finalized KPI records are available company-wide yet.',
    };
  }

  if (hasRole('HR') || hasDashboard('HR_DASHBOARD')) {
    return {
      badge: 'HR scope',
      title: 'KPI History',
      description: 'Finalized employee KPI scores available to HR view.',
      empty: 'No finalized employee KPI records are available yet.',
    };
  }

  if (
    hasRole('DEPARTMENT_HEAD', 'DEPARTMENTHEAD', 'DEPT_HEAD', 'HEAD_OF_DEPARTMENT') ||
    hasDashboard('DEPARTMENT_HEAD_DASHBOARD', 'DEPARTMENTHEAD_DASHBOARD', 'DEPT_HEAD_DASHBOARD')
  ) {
    return {
      badge: 'Department scope',
      title: 'Department KPI History',
      description: 'Finalized KPI scores for employees in your department.',
      empty: 'No finalized KPI records are available for your department yet.',
    };
  }

  if (hasRole('MANAGER', 'PROJECT_MANAGER', 'TEAM_MANAGER', 'TEAM_LEADER', 'TEAMLEADER', 'PM') || hasDashboard('MANAGER_DASHBOARD')) {
    return {
      badge: 'Manager scope',
      title: 'KPI History',
      description: 'Finalized KPI scores for your assigned and team employees.',
      empty: 'No finalized KPI records are available for your assigned employees yet.',
    };
  }

  return {
    badge: 'My records',
    title: 'My KPI History',
    description: 'Your finalized KPI score records.',
    empty: 'No finalized KPI records are available for you yet.',
  };
};

const ManagerKpiHistoryPage = () => {
  const [rows, setRows] = useState<ManagerKpiAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const scopeCopy = useMemo(() => getScopeCopy(), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await kpiWorkflowService.roleScopedHistory();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load KPI history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = [...rows].sort((a, b) =>
      `${b.finalizedAt ?? ''}\t${b.employeeName}`.localeCompare(
        `${a.finalizedAt ?? ''}\t${a.employeeName}`,
        undefined,
        { sensitivity: 'base' },
      ),
    );

    if (!needle) return list;
    return list.filter((row) =>
      [row.employeeName, row.departmentName, row.positionTitle, row.kpiTitle, row.earlyFinalizedReason]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [query, rows]);

  const summary = useMemo(() => {
    const departments = new Set(rows.map((row) => row.departmentName).filter(Boolean));
    const weightedAverage = average(rows.map((row) => row.totalWeightedScore));
    const highestScore = rows.reduce<number | null>((best, row) => {
      if (row.totalWeightedScore == null) return best;
      return best == null ? row.totalWeightedScore : Math.max(best, row.totalWeightedScore);
    }, null);

    return {
      total: rows.length,
      departments: departments.size,
      weightedAverage,
      highestScore,
    };
  }, [rows]);

  return (
    <div className="kpi-tpl-page kpi-history-page">
      <div className="kpi-history-shell">
        <section className="kpi-tpl-card--hero kpi-history-hero">
          <div>
            <span className="kpi-history-badge">
              <i className="bi bi-clock-history" aria-hidden />
              {scopeCopy.badge}
            </span>
            <h1>{scopeCopy.title}</h1>
            <p>{scopeCopy.description}</p>
          </div>
          <div className="kpi-history-hero-score">
            <strong>{summary.total}</strong>
            <span>Finalized records</span>
          </div>
        </section>

        <section className="kpi-history-metrics" aria-label="KPI history summary">
          <article className="kpi-tpl-card kpi-history-metric-card">
            <span>Average weighted score</span>
            <strong>{formatScore(summary.weightedAverage)}</strong>
          </article>
          <article className="kpi-tpl-card kpi-history-metric-card">
            <span>Highest weighted score</span>
            <strong>{formatScore(summary.highestScore)}</strong>
          </article>
          <article className="kpi-tpl-card kpi-history-metric-card">
            <span>Departments shown</span>
            <strong>{summary.departments || '—'}</strong>
          </article>
        </section>

        <section className="kpi-tpl-card kpi-history-toolbar" aria-label="KPI history filters">
          <div>
            <h2>Finalized KPI scores</h2>
            <p>Open a row to review KPI line targets, actual values, achievement, and weighted score.</p>
          </div>
          <label className="kpi-history-search" htmlFor="kpi-history-search">
            <i className="bi bi-search" aria-hidden />
            <input
              id="kpi-history-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search employee, department, position, or KPI template"
            />
          </label>
        </section>

        {loading && (
          <div className="kpi-tpl-card kpi-history-empty">
            <span className="kpi-tpl-shimmer">Loading KPI history…</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="kpi-tpl-card kpi-history-empty">
            <i className="bi bi-clipboard-data" aria-hidden />
            <div>
              <strong>{query.trim() ? 'No matching KPI history found.' : scopeCopy.empty}</strong>
              <p>{query.trim() ? 'Clear the search field to show all records in your scope.' : 'Records appear here after KPI scoring is finalized.'}</p>
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <section className="kpi-tpl-card kpi-history-table-card">
            <div className="kpi-tpl-table-wrap">
              <table className="kpi-history-table">
                <thead className="kpi-tpl-thead">
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>KPI template</th>
                    <th className="text-end">Weighted total</th>
                    <th>Finalized</th>
                    <th>Reason</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <Fragment key={row.employeeKpiFormId}>
                      <tr>
                        <td className="kpi-history-employee-cell">
                          <strong>{row.employeeName}</strong>
                          <small>#{row.employeeId}</small>
                        </td>
                        <td>{row.departmentName ?? '—'}</td>
                        <td>{row.positionTitle ?? '—'}</td>
                        <td>
                          <strong>{row.kpiTitle ?? '—'}</strong>
                        </td>
                        <td className="text-end kpi-history-score-cell">{formatScore(row.totalWeightedScore)}</td>
                        <td>{formatWhen(row.finalizedAt)}</td>
                        <td className="kpi-history-reason-cell">
                          {row.earlyFinalizedReason ? <span title={row.earlyFinalizedReason}>{row.earlyFinalizedReason}</span> : '—'}
                        </td>
                        <td>
                          <div className="kpi-history-actions">
                            <button
                              type="button"
                              onClick={() => setExpandedId((prev) => (prev === row.employeeKpiFormId ? null : row.employeeKpiFormId))}
                              className="kpi-tpl-btn-secondary kpi-small-btn"
                            >
                              {expandedId === row.employeeKpiFormId ? 'Hide lines' : 'View lines'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedId === row.employeeKpiFormId && (
                        <tr className="kpi-history-detail-row">
                          <td colSpan={8}>
                            <div className="kpi-history-lines-panel">
                              <div className="kpi-tpl-table-wrap">
                                <table className="kpi-history-lines-table">
                                  <thead>
                                    <tr>
                                      <th>KPI</th>
                                      <th className="text-end">Target</th>
                                      <th className="text-end">Weight %</th>
                                      <th className="text-end">Actual</th>
                                      <th className="text-end">Achievement %</th>
                                      <th className="text-end">Weighted score</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.lines.map((line) => (
                                      <tr key={line.kpiFormItemId}>
                                        <td>{line.kpiLabel ?? '—'}</td>
                                        <td className="text-end kpi-num">{line.target ?? '—'}</td>
                                        <td className="text-end kpi-num">{line.weight ?? '—'}</td>
                                        <td className="text-end kpi-num">{line.actualValue ?? '—'}</td>
                                        <td className="text-end kpi-num">{formatScore(line.score)}</td>
                                        <td className="text-end kpi-num">{formatScore(line.weightedScore, 4)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ManagerKpiHistoryPage;

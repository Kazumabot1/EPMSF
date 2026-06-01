import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { authStorage } from '../../services/authStorage';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import type { ManagerKpiAssignment } from '../../types/kpiWorkflow';

const normalizeRoleName = (role?: string | null) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const missing = '-';

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatWhen = (value: string | null | undefined) => {
  if (!value) return missing;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours24 = date.getHours();
  const minutes = pad2(date.getMinutes());
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = pad2(hours24 % 12 || 12);

  return `${day}-${month}-${year} (${hours12}:${minutes} ${suffix})`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return missing;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
};

const formatPeriod = (row: ManagerKpiAssignment) => {
  if (!row.periodStartDate && !row.periodEndDate) return missing;
  return `${formatDate(row.periodStartDate)} to ${formatDate(row.periodEndDate)}`;
};

const formatPercent = (value?: number | null, digits = 1) => {
  if (value == null || Number.isNaN(Number(value))) return missing;
  return `${Number(value).toFixed(digits)}%`;
};

const average = (values: Array<number | null | undefined>) => {
  const valid = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const totalWeightedScore = (row: ManagerKpiAssignment) => {
  const lineTotal = row.lines
    .map((line) => Number(line.weightedScore))
    .filter((value) => Number.isFinite(value))
    .reduce((sum, value) => sum + value, 0);

  return lineTotal || row.totalWeightedScore;
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
      [
        row.employeeName,
        row.departmentName,
        row.positionTitle,
        row.kpiTitle,
        formatPeriod(row),
        row.earlyFinalizedReason,
      ]
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
    <main className="min-h-[calc(100vh-86px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-white via-blue-50/60 to-slate-50 px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-blue-700 shadow-sm">
                  <i className="bi bi-clock-history" aria-hidden />
                  {scopeCopy.badge}
                </div>
                <h1 className="text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">
                  {scopeCopy.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                  {scopeCopy.description}
                </p>
              </div>

              <div className="min-w-[170px] rounded-2xl bg-[#0b2f6b] p-5 text-center text-white shadow-lg shadow-blue-950/20">
                <strong className="block text-4xl font-black leading-none">{summary.total}</strong>
                <span className="mt-2 block text-xs font-black uppercase tracking-[0.12em] text-blue-100">
                  Finalized records
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Average Weighted Score" value={formatPercent(summary.weightedAverage, 1)} icon="bi-speedometer2" />
              <MetricCard label="Highest Weighted Score" value={formatPercent(summary.highestScore, 1)} icon="bi-graph-up-arrow" />
              <MetricCard label="Departments Shown" value={summary.departments ? String(summary.departments) : missing} icon="bi-building" />
            </div>
          </div>

          <div className="px-5 py-5 sm:px-7">
            <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">Finalized KPI Scores</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Open a row to review KPI line targets, actual values, achievement, and weighted score.
                </p>
              </div>
              <label className="relative w-full lg:max-w-md" htmlFor="kpi-history-search">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  id="kpi-history-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search employee, department, position, KPI title, or period"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </section>

            {loading && <LoadingRows />}

            {!loading && filtered.length === 0 && (
              <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-16 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl text-blue-700 shadow-sm">
                  <i className="bi bi-clipboard-data" aria-hidden />
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-900">
                  {query.trim() ? 'No matching KPI history found.' : scopeCopy.empty}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {query.trim() ? 'Clear the search field to show all records in your scope.' : 'Records appear here after KPI scoring is finalized.'}
                </p>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Employee Name</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Position</th>
                        <th className="px-4 py-3">KPI Title</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3 text-right">Weighted Total</th>
                        <th className="px-4 py-3">Finalized</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((row) => (
                        <Fragment key={row.employeeKpiFormId}>
                          <tr className="align-top transition hover:bg-blue-50/40">
                            <td className="px-4 py-4">
                              <strong className="block font-black text-slate-950">{row.employeeName || missing}</strong>
                              <span className="mt-1 block text-xs font-bold text-slate-400">#{row.employeeId}</span>
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-700">{row.departmentName ?? missing}</td>
                            <td className="px-4 py-4 font-semibold text-slate-700">{row.positionTitle ?? missing}</td>
                            <td className="px-4 py-4">
                              <strong className="font-black text-slate-950">{row.kpiTitle ?? missing}</strong>
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-700">{formatPeriod(row)}</td>
                            <td className="px-4 py-4 text-right font-black tabular-nums text-blue-700">
                              {formatPercent(row.totalWeightedScore, 1)}
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-700">{formatWhen(row.finalizedAt)}</td>
                            <td className="max-w-[240px] px-4 py-4 font-semibold text-slate-600">
                              <span className="block truncate" title={row.earlyFinalizedReason ?? ''}>
                                {row.earlyFinalizedReason || missing}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => setExpandedId((prev) => (prev === row.employeeKpiFormId ? null : row.employeeKpiFormId))}
                                className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                              >
                                <i className={expandedId === row.employeeKpiFormId ? 'bi bi-eye-slash' : 'bi bi-eye'} aria-hidden />
                                {expandedId === row.employeeKpiFormId ? 'Hide lines' : 'View lines'}
                              </button>
                            </td>
                          </tr>

                          {expandedId === row.employeeKpiFormId && (
                            <tr>
                              <td colSpan={9} className="bg-slate-50 px-4 py-5">
                                <KpiLineDetails row={row} />
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
        </section>
      </div>
    </main>
  );
};

const MetricCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <article className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <i className={`bi ${icon} text-blue-700`} aria-hidden />
    </div>
    <strong className="mt-3 block text-3xl font-black text-slate-950">{value}</strong>
  </article>
);

const LoadingRows = () => (
  <div className="grid gap-3">
    {[0, 1, 2].map((item) => (
      <div key={item} className="flex animate-pulse gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="h-12 w-12 rounded-2xl bg-slate-100" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/5 rounded bg-slate-100" />
          <div className="h-4 w-4/5 rounded bg-slate-100" />
          <div className="h-3 w-32 rounded bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

const DetailCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-slate-950">{value || missing}</p>
  </div>
);

const KpiLineDetails = ({ row }: { row: ManagerKpiAssignment }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <DetailCard label="Employee Name" value={row.employeeName || missing} />
      <DetailCard label="Department" value={row.departmentName || missing} />
      <DetailCard label="Position" value={row.positionTitle || missing} />
      <DetailCard label="KPI Title" value={row.kpiTitle || missing} />
      <DetailCard label="Period" value={formatPeriod(row)} />
    </div>

    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[840px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-4 py-3">KPI</th>
            <th className="px-4 py-3 text-right">Target</th>
            <th className="px-4 py-3 text-right">Weight</th>
            <th className="px-4 py-3 text-right">Actual</th>
            <th className="px-4 py-3 text-right">Achievement</th>
            <th className="px-4 py-3 text-right">Weight Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {row.lines.map((line) => (
            <tr key={line.kpiFormItemId} className="transition hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-700">{line.kpiLabel ?? missing}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-700">{formatPercent(line.target, 1)}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-700">{formatPercent(line.weight, 1)}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-700">{formatPercent(line.actualValue, 1)}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-700">{formatPercent(line.score, 1)}</td>
              <td className="px-4 py-3 text-right font-black tabular-nums text-blue-700">{formatPercent(line.weightedScore, 1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-blue-50/70">
            <td colSpan={5} className="px-4 py-4 text-right text-sm font-black uppercase tracking-[0.08em] text-blue-900">
              Total Weight Score
            </td>
            <td className="px-4 py-4 text-right text-base font-black tabular-nums text-blue-900">
              {formatPercent(totalWeightedScore(row), 1)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

export default ManagerKpiHistoryPage;

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { kpiWorkflowService } from '../../../services/kpiWorkflowService';
import { fetchDepartments, type Department } from '../../../services/departmentService';
import type { HrEmployeeKpiRow } from '../../../types/kpiWorkflow';
import HrEmployeeKpiModal from './HrEmployeeKpiModal';
import { exportExcelTable } from '../../../utils/exportExcelTable';

type HrKpiTab = 'finalized' | 'in_progress';

const EMPTY = '-';

const formatWhen = (value: string | null) => {
  if (!value) return EMPTY;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const linesEnteredCount = (r: HrEmployeeKpiRow) =>
  r.lines.filter((l) => l.score != null || l.actualValue != null).length;

const yyyyMmDd = (value?: string | null): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const formatPeriod = (start?: string | null, end?: string | null): string => {
  const s = yyyyMmDd(start);
  const e = yyyyMmDd(end);
  if (!s || !e) return EMPTY;
  return `${s} to ${e}`;
};

const formatPercent = (value?: number | null) =>
  value != null && Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : EMPTY;

const cleanStatus = (value?: string | null) => (value ? value.replace(/_/g, ' ') : EMPTY);

const HrEmployeeKpiListPage = () => {
  const [tab, setTab] = useState<HrKpiTab>('finalized');
  const [rows, setRows] = useState<HrEmployeeKpiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<HrEmployeeKpiRow | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDepartments = async () => {
      try {
        const depts = await fetchDepartments();
        if (!cancelled) setDepartments(depts.filter((d) => d.status !== false));
      } catch {
        // Department filter is helpful but non-blocking.
      }
    };
    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data =
          tab === 'finalized'
            ? await kpiWorkflowService.hrFinalizedResults()
            : await kpiWorkflowService.hrInProgressResults();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const selectedDepartment = useMemo(
    () => departments.find((department) => department.id === selectedDeptId) ?? null,
    [departments, selectedDeptId],
  );

  const sorted = useMemo(() => {
    const filtered =
      selectedDepartment != null
        ? rows.filter((row) => row.departmentName === selectedDepartment.departmentName)
        : rows;

    const copy = [...filtered];
    if (tab === 'finalized') {
      copy.sort((a, b) => (b.finalizedAt ?? '').localeCompare(a.finalizedAt ?? ''));
    } else {
      copy.sort((a, b) =>
        `${a.kpiTitle ?? ''}\t${a.employeeName}`.localeCompare(
          `${b.kpiTitle ?? ''}\t${b.employeeName}`,
          undefined,
          { sensitivity: 'base' },
        ),
      );
    }
    return copy;
  }, [rows, tab, selectedDepartment]);

  const summary = useMemo(() => {
    const finalizedCount = rows.filter((row) => row.status === 'FINALIZED').length;
    const inProgressCount = rows.length - finalizedCount;
    const scores = sorted
      .map((row) => row.totalWeightedScore)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const averageScore =
      scores.length > 0 ? scores.reduce((total, value) => total + value, 0) / scores.length : null;

    return {
      visible: sorted.length,
      finalizedCount,
      inProgressCount,
      averageScore,
    };
  }, [rows, sorted]);

  const canExport = tab === 'finalized' && sorted.length > 0 && !loading;

  const onExport = async () => {
    try {
      const highlightIndexes: number[] = [];
      const numericScores = sorted
        .map((r, idx) => ({ idx, score: r.totalWeightedScore }))
        .filter((x): x is { idx: number; score: number } => typeof x.score === 'number' && Number.isFinite(x.score));

      if (numericScores.length > 0) {
        const max = Math.max(...numericScores.map((x) => x.score));
        for (const x of numericScores) {
          if (x.score === max) highlightIndexes.push(x.idx);
        }
      }

      await exportExcelTable({
        sheetName: 'Finalized KPI Scores',
        tableName: 'FinalizedEmployeeKpiScores',
        filenameBase: 'hr_finalized_employee_kpi_scores',
        columns: [
          { header: 'Employee Name', key: 'employeeName', width: 26 },
          { header: 'Department', key: 'departmentName', width: 22 },
          { header: 'Position', key: 'positionTitle', width: 22 },
          { header: 'KPI Template', key: 'kpiTitle', width: 26 },
          { header: 'KPI Period', key: 'kpiPeriod', width: 24 },
          { header: 'KPI Total Weight Score', key: 'totalWeightedScore', width: 22, numFmt: '0.00' },
        ],
        rows: sorted.map((r) => ({
          employeeName: r.employeeName ?? '-',
          departmentName: r.departmentName ?? '-',
          positionTitle: r.positionTitle ?? '-',
          kpiTitle: r.kpiTitle ?? '-',
          kpiPeriod: formatPeriod(r.periodStartDate, r.periodEndDate),
          totalWeightedScore: typeof r.totalWeightedScore === 'number' ? r.totalWeightedScore : '-',
        })),
        highlightRowIndexes: highlightIndexes,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export Excel.');
    }
  };

  const openDetails = (row: HrEmployeeKpiRow) => setSelectedRow(row);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <div className="mx-auto max-w-7xl px-4 py-6 pb-16">
        <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">KPI Management</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-950">Employee KPI</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Review employee KPI progress, finalized scores, and detailed KPI line performance across departments.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-[320px]" aria-label="Employee KPI summary">
              <article className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <strong className="block text-2xl font-bold leading-none text-slate-950">{summary.visible}</strong>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Visible Records</span>
              </article>
              <article className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <strong className="block text-2xl font-bold leading-none text-blue-700">{formatPercent(summary.averageScore)}</strong>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Weighted</span>
              </article>
            </div>
          </div>
        </header>

        <section
          className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
          aria-label="Employee KPI filters"
        >
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="dept-filter" className="text-sm font-bold text-slate-700">
              Department
            </label>
            <select
              id="dept-filter"
              value={selectedDeptId ?? ''}
              onChange={(event) => setSelectedDeptId(event.target.value ? Number(event.target.value) : null)}
              className="min-h-10 min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.departmentName}
                </option>
              ))}
            </select>
            {selectedDeptId != null && (
              <button
                type="button"
                onClick={() => setSelectedDeptId(null)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Employee KPI status">
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                  tab === 'finalized' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-blue-700'
                }`}
                onClick={() => setTab('finalized')}
                role="tab"
                aria-selected={tab === 'finalized'}
              >
                Finalized
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{summary.finalizedCount}</span>
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                  tab === 'in_progress' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-blue-700'
                }`}
                onClick={() => setTab('in_progress')}
                role="tab"
                aria-selected={tab === 'in_progress'}
              >
                In progress
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{summary.inProgressCount}</span>
              </button>
            </div>

            {tab === 'finalized' && (
              <button
                type="button"
                onClick={() => void onExport()}
                disabled={!canExport}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                title={!canExport ? 'No finalized rows to export.' : 'Export filtered finalized KPI scores.'}
              >
                <i className="bi bi-file-earmark-excel" aria-hidden />
                Export Excel
              </button>
            )}
          </div>
        </section>

        {loading && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            <span className="animate-pulse">Loading employee KPI records...</span>
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-slate-500 shadow-sm">
            <i className="bi bi-clipboard-data grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-xl text-blue-700" aria-hidden />
            <div>
              <strong className="block text-slate-950">
                {tab === 'finalized' ? 'No finalized employee KPI records yet.' : 'No in-progress KPI assignments yet.'}
              </strong>
              <p className="mt-1 text-sm">
                {tab === 'finalized'
                  ? 'Finalized results will appear here after the manager completes the KPI review.'
                  : 'In-progress records appear when managers start entering actual values and scores.'}
              </p>
            </div>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">KPI Template</th>
                      {tab === 'in_progress' && (
                        <>
                          <th className="px-4 py-3">Workflow Status</th>
                          <th className="px-4 py-3 text-right">Lines Entered</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-right">Weighted Total</th>
                      {tab === 'finalized' && <th className="px-4 py-3">Finalized</th>}
                      {tab === 'finalized' && <th className="px-4 py-3">Reason</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sorted.map((row) => (
                      <tr
                        key={row.employeeKpiFormId}
                        tabIndex={0}
                        role="button"
                        onClick={() => openDetails(row)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetails(row);
                          }
                        }}
                        className="cursor-pointer transition hover:bg-blue-50/70 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      >
                        <td className="px-4 py-3">
                          <span className="font-bold text-blue-700">
                            {row.employeeName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.departmentName ?? EMPTY}</td>
                        <td className="px-4 py-3 text-slate-600">{row.positionTitle ?? EMPTY}</td>
                        <td className="px-4 py-3">
                          <strong className="block font-bold text-slate-950">{row.kpiTitle ?? EMPTY}</strong>
                          <small className="mt-1 block text-xs font-semibold text-slate-500">
                            {formatPeriod(row.periodStartDate, row.periodEndDate)}
                          </small>
                        </td>
                        {tab === 'in_progress' && (
                          <>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">
                                {cleanStatus(row.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-700">
                              {linesEnteredCount(row)}/{row.lines.length}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-950">
                          {formatPercent(row.totalWeightedScore)}
                        </td>
                        {tab === 'finalized' && <td className="px-4 py-3 text-slate-600">{formatWhen(row.finalizedAt)}</td>}
                        {tab === 'finalized' && (
                          <td className="max-w-[230px] px-4 py-3 text-slate-600">
                            {row.earlyFinalizedReason ? (
                              <span className="line-clamp-2" title={row.earlyFinalizedReason}>
                                {row.earlyFinalizedReason}
                              </span>
                            ) : (
                              EMPTY
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <HrEmployeeKpiModal open={selectedRow !== null} row={selectedRow} onClose={() => setSelectedRow(null)} />
      </div>
    </div>
  );
};

export default HrEmployeeKpiListPage;

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { kpiWorkflowService } from '../../../services/kpiWorkflowService';
import { fetchDepartments, type Department } from '../../../services/departmentService';
import type { HrEmployeeKpiRow } from '../../../types/kpiWorkflow';
import { exportExcelTable } from '../../../utils/exportExcelTable';
import HrEmployeeKpiModal from './HrEmployeeKpiModal';

type HrKpiTab = 'finalized' | 'in_progress';

const PAGE_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const EMPTY = '-';

const inputClass =
  'min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

const employeeKpiHeroGradient =
  'bg-[radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.45),transparent_14rem),linear-gradient(135deg,#ffffff_0%,#dbeafe_42%,#1e3a8a_100%)]';

const btnExportBase =
  'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed';

const btnExportEnabled = `${btnExportBase} border-blue-600 bg-blue-600 text-white hover:bg-blue-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`;

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

const rowSearchText = (row: HrEmployeeKpiRow) =>
  [
    row.employeeName,
    row.departmentName,
    row.positionTitle,
    row.kpiTitle,
    formatPeriod(row.periodStartDate, row.periodEndDate),
    cleanStatus(row.status),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const HrEmployeeKpiListPage = () => {
  const [tab, setTab] = useState<HrKpiTab>('finalized');
  const [rows, setRows] = useState<HrEmployeeKpiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<HrEmployeeKpiRow | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list =
      selectedDepartment != null
        ? rows.filter((row) => row.departmentName === selectedDepartment.departmentName)
        : rows;

    if (q) {
      list = list.filter((row) => rowSearchText(row).includes(q));
    }

    const copy = [...list];
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
  }, [rows, tab, selectedDepartment, query]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedDeptId, pageSize, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);

  const hasActiveFilters = query.trim() !== '' || selectedDeptId != null;

  const clearFilters = () => {
    setQuery('');
    setSelectedDeptId(null);
  };

  const summary = useMemo(() => {
    const finalizedCount = rows.filter((row) => row.status === 'FINALIZED').length;
    const inProgressCount = rows.length - finalizedCount;
    const scores = filtered
      .map((row) => row.totalWeightedScore)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const averageScore =
      scores.length > 0 ? scores.reduce((total, value) => total + value, 0) / scores.length : null;

    return {
      visible: filtered.length,
      total: rows.length,
      finalizedCount,
      inProgressCount,
      averageScore,
    };
  }, [rows, filtered]);

  const canExport = tab === 'finalized' && filtered.length > 0 && !loading;

  const exportDisabledTitle = (() => {
    if (loading) return 'Loading records…';
    if (tab === 'in_progress') return 'Excel export is available on the Finalized tab only.';
    if (filtered.length === 0) return 'No finalized rows to export.';
    return 'Export filtered finalized KPI scores to Excel.';
  })();

  const onExport = async () => {
    if (!canExport) return;
    try {
      const highlightIndexes: number[] = [];
      const numericScores = filtered
        .map((r, idx) => ({ idx, score: r.totalWeightedScore }))
        .filter(
          (x): x is { idx: number; score: number } =>
            typeof x.score === 'number' && Number.isFinite(x.score),
        );

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
        rows: filtered.map((r) => ({
          employeeName: r.employeeName ?? '-',
          departmentName: r.departmentName ?? '-',
          positionTitle: r.positionTitle ?? '-',
          kpiTitle: r.kpiTitle ?? '-',
          kpiPeriod: formatPeriod(r.periodStartDate, r.periodEndDate),
          totalWeightedScore:
            typeof r.totalWeightedScore === 'number' ? r.totalWeightedScore : '-',
        })),
        highlightRowIndexes: highlightIndexes,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export Excel.');
    }
  };

  const openDetails = (row: HrEmployeeKpiRow) => setSelectedRow(row);

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 pb-16">
        <header
          className={`rounded-xl border border-blue-200/70 px-5 py-4 shadow-sm ${employeeKpiHeroGradient}`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-800 shadow-sm backdrop-blur-sm">
                <i className="bi bi-clipboard-data text-sm" aria-hidden />
                KPI Management
              </span>
              <h1 className="text-2xl font-bold leading-tight text-blue-950">Employee KPI</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
                Review employee KPI progress, finalized scores, and detailed KPI line performance across
                departments.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-[320px]" aria-label="Employee KPI summary">
              <article className="rounded-lg border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                <strong className="block text-2xl font-bold tabular-nums leading-none text-slate-950">
                  {loading ? '—' : summary.visible}
                </strong>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {hasActiveFilters && summary.visible !== summary.total
                    ? `of ${summary.total} records`
                    : 'Visible records'}
                </span>
              </article>
              <article className="rounded-lg border border-blue-100 bg-blue-50/90 px-4 py-3 shadow-sm">
                <strong className="block text-2xl font-bold leading-none text-blue-700">
                  {loading ? '—' : formatPercent(summary.averageScore)}
                </strong>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Avg weighted
                </span>
              </article>
            </div>
          </div>
        </header>

        <section
          className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          aria-label="Employee KPI filters"
        >
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Filters</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-blue-700 underline-offset-2 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>

            <div
              className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1"
              role="tablist"
              aria-label="Employee KPI status"
            >
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
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  {tab === 'finalized' ? rows.length : summary.finalizedCount}
                </span>
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
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  {tab === 'in_progress' ? rows.length : summary.inProgressCount}
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_auto_auto]">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Search
              <div className="relative">
                <i
                  className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Employee, department, template…"
                  className={`${inputClass} w-full pl-9`}
                  aria-label="Search employee KPI records"
                />
              </div>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Department
              <select
                id="dept-filter"
                value={selectedDeptId ?? ''}
                onChange={(event) =>
                  setSelectedDeptId(event.target.value ? Number(event.target.value) : null)
                }
                className={inputClass}
                aria-label="Filter by department"
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.departmentName}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-1">
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className={`${inputClass} w-full lg:min-w-[120px]`}
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <button
                type="button"
                onClick={() => void onExport()}
                disabled={!canExport}
                className={btnExportEnabled}
                title={exportDisabledTitle}
                aria-disabled={!canExport}
              >
                <i className="bi bi-file-earmark-excel" aria-hidden />
                Export Excel
              </button>
            </div>
          </div>
        </section>

        {loading && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            <span className="animate-pulse">Loading employee KPI records…</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <i
              className="bi bi-clipboard-data mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700"
              aria-hidden
            />
            <h2 className="text-xl font-bold text-slate-950">
              {tab === 'finalized'
                ? rows.length === 0
                  ? 'No finalized employee KPI records yet'
                  : 'No matching finalized records'
                : rows.length === 0
                  ? 'No in-progress KPI assignments yet'
                  : 'No matching in-progress records'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {tab === 'finalized'
                ? rows.length === 0
                  ? 'Finalized results appear here after the manager completes the KPI review.'
                  : 'Try adjusting your search or department filter.'
                : rows.length === 0
                  ? 'In-progress records appear when managers start entering actual values and scores.'
                  : 'Try adjusting your search or department filter.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold text-slate-950">
                {tab === 'finalized' ? 'Finalized records' : 'In-progress records'}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Click a row for details · {filtered.length} record{filtered.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-14 px-4 py-3 text-center">No.</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">KPI template</th>
                    {tab === 'in_progress' && (
                      <>
                        <th className="px-4 py-3">Workflow status</th>
                        <th className="px-4 py-3 text-right">Lines entered</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right">Weighted total</th>
                    {tab === 'finalized' && <th className="px-4 py-3">Finalized</th>}
                    {tab === 'finalized' && <th className="px-4 py-3">Reason</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedRows.map((row, index) => (
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
                      className={`cursor-pointer transition hover:bg-blue-50/60 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                        index % 2 === 1 ? 'bg-slate-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                        {rangeStart + index}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-950">{row.employeeName}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.departmentName ?? EMPTY}</td>
                      <td className="px-4 py-3 text-slate-700">{row.positionTitle ?? EMPTY}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-950">{row.kpiTitle ?? EMPTY}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatPeriod(row.periodStartDate, row.periodEndDate)}
                        </p>
                      </td>
                      {tab === 'in_progress' && (
                        <>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-blue-800 ring-1 ring-inset ring-blue-600/15">
                              {cleanStatus(row.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                            {linesEnteredCount(row)}/{row.lines.length}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-950">
                        {formatPercent(row.totalWeightedScore)}
                      </td>
                      {tab === 'finalized' && (
                        <td className="px-4 py-3 text-slate-600">{formatWhen(row.finalizedAt)}</td>
                      )}
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

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing <strong className="text-slate-900">{rangeStart}</strong>–
                <strong className="text-slate-900">{rangeEnd}</strong> of{' '}
                <strong className="text-slate-900">{filtered.length}</strong>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2 text-sm font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
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

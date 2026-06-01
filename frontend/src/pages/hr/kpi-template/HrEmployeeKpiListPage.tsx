import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { kpiWorkflowService } from '../../../services/kpiWorkflowService';
import { fetchDepartments, type Department } from '../../../services/departmentService';
import type { HrEmployeeKpiRow } from '../../../types/kpiWorkflow';
import HrEmployeeKpiModal from './HrEmployeeKpiModal';
import { exportExcelTable } from '../../../utils/exportExcelTable';

type HrKpiTab = 'finalized' | 'in_progress';

const formatWhen = (value: string | null) => {
  if (!value) return '—';
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
  if (!s || !e) return '—';
  return `${s} to ${e}`;
};

const formatScore = (value?: number | null, digits = 2) =>
  value != null && Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';

const cleanStatus = (value?: string | null) => (value ? value.replace(/_/g, ' ') : '—');

const HrEmployeeKpiListPage = () => {
  const [tab, setTab] = useState<HrKpiTab>('finalized');
  const [rows, setRows] = useState<HrEmployeeKpiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
        setExpandedId(null);
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

  const colCount = tab === 'in_progress' ? 8 : 8;

  return (
    <div className="kpi-tpl-page kpi-employee-kpi-page">
      <div className="mx-auto max-w-7xl px-4 py-8 pb-20">
        <header className="kpi-tpl-card--hero relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl gap-5">
              <div className="kpi-tpl-hero-icon" aria-hidden>
                <i className="bi bi-people-fill" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="kpi-tpl-hero-kicker">KPI Management</p>
                <h1>Employee KPI</h1>
                <p>
                  Review KPI assignments across departments. In progress records show saved manager inputs; finalized
                  records are locked and ready for HR review.
                </p>
              </div>
            </div>

            <div className="kpi-employee-hero-stats" aria-label="Employee KPI summary">
              <article>
                <strong>{summary.visible}</strong>
                <span>Visible records</span>
              </article>
              <article>
                <strong>{formatScore(summary.averageScore)}</strong>
                <span>Avg weighted score</span>
              </article>
            </div>
          </div>
        </header>

        <section className="kpi-tpl-card kpi-employee-toolbar" aria-label="Employee KPI filters">
          <div className="kpi-employee-filter">
            <label htmlFor="dept-filter">Department</label>
            <select
              id="dept-filter"
              value={selectedDeptId ?? ''}
              onChange={(event) => setSelectedDeptId(event.target.value ? Number(event.target.value) : null)}
              className="kpi-tpl-input"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.departmentName}
                </option>
              ))}
            </select>
            {selectedDeptId != null && (
              <button type="button" onClick={() => setSelectedDeptId(null)} className="kpi-tpl-btn-secondary kpi-small-btn">
                Clear
              </button>
            )}
          </div>

          <div className="kpi-employee-toolbar-actions">
            <div className="kpi-employee-tabs" role="tablist" aria-label="Employee KPI status">
              <button
                type="button"
                className={tab === 'finalized' ? 'is-active' : ''}
                onClick={() => setTab('finalized')}
                role="tab"
                aria-selected={tab === 'finalized'}
              >
                Finalized
                <span>{summary.finalizedCount}</span>
              </button>
              <button
                type="button"
                className={tab === 'in_progress' ? 'is-active' : ''}
                onClick={() => setTab('in_progress')}
                role="tab"
                aria-selected={tab === 'in_progress'}
              >
                In progress
                <span>{summary.inProgressCount}</span>
              </button>
            </div>

            {tab === 'finalized' && (
              <button
                type="button"
                onClick={() => void onExport()}
                disabled={!canExport}
                className="kpi-tpl-btn-primary kpi-export-btn"
                title={!canExport ? 'No finalized rows to export.' : 'Export filtered finalized KPI scores.'}
              >
                <i className="bi bi-file-earmark-excel" aria-hidden />
                Export Excel
              </button>
            )}
          </div>
        </section>

        {loading && (
          <div className="kpi-tpl-card kpi-employee-empty">
            <span className="kpi-tpl-shimmer">Loading employee KPI records…</span>
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="kpi-tpl-card kpi-employee-empty">
            <i className="bi bi-clipboard-data" aria-hidden />
            <div>
              <strong>{tab === 'finalized' ? 'No finalized employee KPI records yet.' : 'No in-progress KPI assignments yet.'}</strong>
              <p>
                {tab === 'finalized'
                  ? 'Finalized results will appear here after the manager completes the KPI review.'
                  : 'In-progress records appear when managers start entering actual values and scores.'}
              </p>
            </div>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <section className="kpi-tpl-card kpi-employee-table-card">
            <div className="kpi-tpl-table-wrap">
              <div className="overflow-x-auto">
                <table className="kpi-employee-table">
                  <thead className="kpi-tpl-thead">
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Position</th>
                      <th>KPI template</th>
                      {tab === 'in_progress' && (
                        <>
                          <th>Workflow status</th>
                          <th className="text-end">Lines entered</th>
                        </>
                      )}
                      <th className="text-end">Weighted total</th>
                      {tab === 'finalized' && <th>Finalized</th>}
                      {tab === 'finalized' && <th>Reason</th>}
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row) => (
                      <Fragment key={row.employeeKpiFormId}>
                        <tr>
                          <td>
                            <button type="button" onClick={() => setSelectedRow(row)} className="kpi-employee-name-btn">
                              {row.employeeName}
                            </button>
                          </td>
                          <td>{row.departmentName ?? '—'}</td>
                          <td>{row.positionTitle ?? '—'}</td>
                          <td>
                            <strong>{row.kpiTitle ?? '—'}</strong>
                            <small>{formatPeriod(row.periodStartDate, row.periodEndDate)}</small>
                          </td>
                          {tab === 'in_progress' && (
                            <>
                              <td>
                                <span className="kpi-status-pill">{cleanStatus(row.status)}</span>
                              </td>
                              <td className="text-end kpi-num">
                                {linesEnteredCount(row)}/{row.lines.length}
                              </td>
                            </>
                          )}
                          <td className="text-end kpi-num kpi-score-cell">{formatScore(row.totalWeightedScore)}</td>
                          {tab === 'finalized' && <td>{formatWhen(row.finalizedAt)}</td>}
                          {tab === 'finalized' && (
                            <td className="kpi-reason-cell">
                              {row.earlyFinalizedReason ? <span title={row.earlyFinalizedReason}>{row.earlyFinalizedReason}</span> : '—'}
                            </td>
                          )}
                          <td>
                            <div className="kpi-row-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedId((prev) => (prev === row.employeeKpiFormId ? null : row.employeeKpiFormId))
                                }
                                className="kpi-tpl-btn-secondary kpi-small-btn"
                              >
                                {expandedId === row.employeeKpiFormId ? 'Hide' : 'Lines'}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedId === row.employeeKpiFormId && (
                          <tr className="kpi-employee-detail-row">
                            <td colSpan={colCount}>
                              <div className="kpi-employee-lines-panel">
                                {tab === 'in_progress' && (
                                  <p className="kpi-employee-lines-note">
                                    Draft view — totals update as managers save. Numbers are locked after finalization.
                                  </p>
                                )}
                                <div className="kpi-tpl-table-wrap">
                                  <table className="kpi-employee-lines-table">
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

                                {row.totalScore != null && (
                                  <p className="kpi-employee-total-note">
                                    Avg achievement % (weighted): <strong>{formatScore(row.totalScore)}</strong>
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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

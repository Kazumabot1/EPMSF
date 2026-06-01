import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import type { ManagerKpiAssignment, ManagerKpiTemplateSummary } from '../../types/kpiWorkflow';
import { displayDateTimeDisplay, formatPeriodRange } from './evaluateKpisFormat';
import {
  EVALUATE_KPIS_FONT,
  btnGhost,
  btnPrimary,
  btnSecondary,
  card,
  headerCard,
  headerDesc,
  headerKicker,
  headerTitle,
  input,
  pageWrap,
  row,
  tableHead,
  tableWrap,
  td,
  th,
} from './evaluateKpisUi';
import ManagerEmployeeKpiScoreModal from './ManagerEmployeeKpiScoreModal';
import type { DraftScores } from './ManagerEmployeeKpiScoreModal';

const PAGE_SIZE = 10;

const sortTemplateSummaries = (rows: ManagerKpiTemplateSummary[]) =>
  [...rows].sort((a, b) => {
    const openDelta = Number(b.openAssignments > 0) - Number(a.openAssignments > 0);
    if (openDelta !== 0) return openDelta;
    const aEnd = a.periodEndDate ? new Date(a.periodEndDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bEnd = b.periodEndDate ? new Date(b.periodEndDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (aEnd !== bEnd) return aEnd - bEnd;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

const summaryKey = (summary: Pick<ManagerKpiTemplateSummary, 'kpiFormId' | 'cyclePeriodId'>) =>
  `${summary.kpiFormId}:${summary.cyclePeriodId ?? 'legacy'}`;

const parseSummaryKey = (key: string) => {
  if (key === '') return null;
  const colon = key.indexOf(':');
  if (colon <= 0) return null;

  const kpiFormId = Number(key.slice(0, colon));
  const cyclePart = key.slice(colon + 1);
  if (!Number.isFinite(kpiFormId)) return null;

  if (cyclePart === 'legacy') {
    return { kpiFormId, cyclePeriodId: null as number | null };
  }

  const cyclePeriodId = Number(cyclePart);
  if (!Number.isFinite(cyclePeriodId)) return null;

  return { kpiFormId, cyclePeriodId };
};

function lineEffectivelyScored(
  line: ManagerKpiAssignment['lines'][number],
  draftRaw: string | undefined,
): boolean {
  const raw = draftRaw?.trim() ?? '';
  if (raw !== '') {
    const n = Number(raw);
    return Number.isFinite(n) && !Number.isNaN(n) && n >= 1 && n <= 100 && (line.target == null || n <= line.target);
  }
  return line.score != null;
}

const statusBadgeClass = (status: string) => {
  if (status === 'FINALIZED') {
    return 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800';
  }
  if (status === 'IN_PROGRESS' || status === 'SUBMITTED') {
    return 'inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900';
  }
  return 'inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-700';
};

const ManagerKpiScoringPage = () => {
  const [summaries, setSummaries] = useState<ManagerKpiTemplateSummary[]>([]);
  const [selectedSummaryKey, setSelectedSummaryKey] = useState('');
  const [assignments, setAssignments] = useState<ManagerKpiAssignment[]>([]);
  const [drafts, setDrafts] = useState<DraftScores>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizingEmployeeId, setFinalizingEmployeeId] = useState<number | null>(null);
  const [modalAssignment, setModalAssignment] = useState<ManagerKpiAssignment | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<ManagerKpiAssignment | null>(null);
  const [finalizeReason, setFinalizeReason] = useState('');
  const [savingFormId, setSavingFormId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const assignmentsRequestRef = useRef(0);

  const loadSummaries = useCallback(async () => {
    try {
      setLoadingMeta(true);
      const data = sortTemplateSummaries(await kpiWorkflowService.listManagerTemplates());
      setSummaries(data);
      setSelectedSummaryKey((prev) => {
        if (prev !== '' && data.some((s) => summaryKey(s) === prev)) return prev;
        return data.length ? summaryKey(data[0]) : '';
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load KPI list.');
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  const loadAssignmentsForKey = useCallback(async (key: string) => {
    const parsed = parseSummaryKey(key);
    if (!parsed) {
      setAssignments([]);
      setDrafts({});
      return;
    }

    const requestId = ++assignmentsRequestRef.current;

    try {
      setLoadingAssignments(true);
      const data = await kpiWorkflowService.listAssignments(parsed.kpiFormId, parsed.cyclePeriodId);
      if (requestId !== assignmentsRequestRef.current) return;

      setAssignments(data);
      const nextDrafts: DraftScores = {};
      for (const row of data) {
        nextDrafts[row.employeeKpiFormId] = {};
        for (const line of row.lines) {
          nextDrafts[row.employeeKpiFormId][line.kpiFormItemId] =
            line.actualValue != null && line.actualValue !== undefined ? String(line.actualValue) : '';
        }
      }
      setDrafts(nextDrafts);
    } catch (err) {
      if (requestId !== assignmentsRequestRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Failed to load assignments.');
    } finally {
      if (requestId === assignmentsRequestRef.current) {
        setLoadingAssignments(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedSummaryKey === '') {
      setAssignments([]);
      setDrafts({});
      return;
    }
    void loadAssignmentsForKey(selectedSummaryKey);
  }, [selectedSummaryKey, loadAssignmentsForKey]);

  useEffect(() => {
    setPage(1);
    setSearch('');
    setDepartmentFilter('ALL');
    setStatusFilter('ALL');
  }, [selectedSummaryKey]);

  const selectedSummary = useMemo(
    () => summaries.find((s) => summaryKey(s) === selectedSummaryKey),
    [summaries, selectedSummaryKey],
  );

  const departmentOptions = useMemo(() => {
    const names = new Set<string>();
    for (const a of assignments) {
      const name = a.departmentName?.trim();
      if (name) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [assignments]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(assignments.map((a) => a.status));
    return Array.from(statuses).sort();
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments
      .filter((a) => {
        if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
        if (departmentFilter !== 'ALL' && (a.departmentName ?? '') !== departmentFilter) return false;
        if (!q) return true;
        const haystack = [
          a.employeeName,
          a.departmentName,
          a.positionTitle,
          a.kpiTitle,
          selectedSummary?.title,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName, undefined, { sensitivity: 'base' }));
  }, [assignments, search, departmentFilter, statusFilter, selectedSummary?.title]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAssignments.slice(start, start + PAGE_SIZE);
  }, [filteredAssignments, safePage]);

  const periodLabelForRow = (a: ManagerKpiAssignment) =>
    formatPeriodRange(
      a.periodStartDate ?? selectedSummary?.periodStartDate,
      a.periodEndDate ?? selectedSummary?.graceEndsAt ?? selectedSummary?.periodEndDate,
    );

  const saveEmployee = async (assignment: ManagerKpiAssignment, closeModalAfter = false) => {
    const map = drafts[assignment.employeeKpiFormId] ?? {};
    const scores = assignment.lines.map((line) => {
      const raw = map[line.kpiFormItemId]?.trim() ?? '';
      if (raw !== '') {
        const actualValue = Number(raw);
        return { kpiFormItemId: line.kpiFormItemId, actualValue };
      }
      if (line.actualValue != null) {
        return { kpiFormItemId: line.kpiFormItemId, actualValue: null };
      }
      if (line.score != null && line.actualValue == null) {
        return { kpiFormItemId: line.kpiFormItemId, score: line.score };
      }
      return { kpiFormItemId: line.kpiFormItemId, actualValue: null };
    });
    for (const row of scores) {
      const av = 'actualValue' in row ? row.actualValue : undefined;
      if (av != null && (Number.isNaN(av) || av < 1 || av > 100 || !Number.isFinite(av))) {
        toast.error('Actual values must be between 1 and 100.');
        return;
      }
    }
    for (let i = 0; i < assignment.lines.length; i += 1) {
      const line = assignment.lines[i];
      const raw = map[line.kpiFormItemId]?.trim() ?? '';
      if (raw === '') continue;
      const actual = Number(raw);
      if (line.target != null && Number.isFinite(actual) && actual > line.target) {
        toast.error(`Row ${i + 1}: Actual % must be less than or equal to Target %.`);
        return;
      }
      if (line.target != null && line.target > 0 && line.weight != null && Number.isFinite(actual)) {
        const weightScore = ((actual / line.target) * 100 * line.weight) / 100;
        if (weightScore > line.weight) {
          toast.error(`Row ${i + 1}: Weight Score must be less than or equal to Weight %.`);
          return;
        }
      }
    }
    try {
      setSavingFormId(assignment.employeeKpiFormId);
      const updated = await kpiWorkflowService.updateScores(assignment.employeeKpiFormId, scores);
      toast.success('Saved successfully. Your KPI actuals have been recorded.', {
        duration: 4500,
        icon: '✓',
      });
      setAssignments((prev) => prev.map((a) => (a.employeeKpiFormId === updated.employeeKpiFormId ? updated : a)));
      setModalAssignment((prev) =>
        prev?.employeeKpiFormId === updated.employeeKpiFormId ? updated : prev,
      );
      await loadSummaries();
      await loadAssignmentsForKey(selectedSummaryKey);
      if (closeModalAfter) setModalAssignment(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSavingFormId(null);
    }
  };

  const finalize = async () => {
    if (!selectedSummary) return;
    const endLabel = displayDateTimeDisplay(selectedSummary.periodEndDate ?? undefined);
    const earlyNote =
      endLabel && selectedSummary.periodEndDate
        ? ` The KPI period ends ${endLabel}; early finalization will notify employees and HR now.`
        : ' Employees and HR will be notified.';
    if (
      !window.confirm(
        `Finalize all scored KPIs in your department for this template?${earlyNote} Incomplete rows will block finalization.`,
      )
    ) {
      return;
    }
    try {
      setFinalizing(true);
      const result = await kpiWorkflowService.finalizeDepartment(
        selectedSummary.kpiFormId,
        selectedSummary.cyclePeriodId,
      );
      toast.success(`Finalized ${result.assignmentsCreated} employee record(s).`);
      await loadSummaries();
      await loadAssignmentsForKey(selectedSummaryKey);
      setModalAssignment(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Finalize failed.');
    } finally {
      setFinalizing(false);
    }
  };

  const assignmentScoredCount = (assignment: ManagerKpiAssignment) =>
    assignment.lines.filter((line) =>
      lineEffectivelyScored(line, drafts[assignment.employeeKpiFormId]?.[line.kpiFormItemId]),
    ).length;

  const assignmentComplete = (assignment: ManagerKpiAssignment) =>
    assignment.lines.length > 0 && assignmentScoredCount(assignment) === assignment.lines.length;

  const openEmployeeFinalize = (assignment: ManagerKpiAssignment) => {
    if (assignment.status === 'FINALIZED') {
      toast.error('This employee KPI is already finalized.');
      return;
    }
    if (!assignmentComplete(assignment)) {
      toast.error('Complete all KPI rows for this employee before finalizing.');
      return;
    }
    setFinalizeTarget(assignment);
    setFinalizeReason('');
  };

  const submitEmployeeFinalize = async () => {
    if (!finalizeTarget) return;
    const reason = finalizeReason.trim();
    if (!reason) {
      toast.error('Enter a reason before finalizing.');
      return;
    }
    try {
      setFinalizingEmployeeId(finalizeTarget.employeeKpiFormId);
      const updated = await kpiWorkflowService.finalizeEmployee(finalizeTarget.employeeKpiFormId, reason);
      toast.success(`Finalized KPI for ${updated.employeeName}.`);
      setAssignments((prev) => prev.map((a) => (a.employeeKpiFormId === updated.employeeKpiFormId ? updated : a)));
      setModalAssignment((prev) =>
        prev?.employeeKpiFormId === updated.employeeKpiFormId ? updated : prev,
      );
      setFinalizeTarget(null);
      setFinalizeReason('');
      await loadSummaries();
      await loadAssignmentsForKey(selectedSummaryKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Finalize failed.');
    } finally {
      setFinalizingEmployeeId(null);
    }
  };

  const updateDraft = (employeeKpiFormId: number, kpiFormItemId: number, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [employeeKpiFormId]: {
        ...(prev[employeeKpiFormId] ?? {}),
        [kpiFormItemId]: value,
      },
    }));
  };

  const cycleClosing =
    selectedSummary?.periodStatus === 'CLOSING' || Boolean(selectedSummary?.graceEndsAt);
  const selectedPeriodLabel = selectedSummary
    ? formatPeriodRange(selectedSummary.periodStartDate, selectedSummary.graceEndsAt ?? selectedSummary.periodEndDate)
    : '—';

  return (
    <div className={pageWrap} style={{ fontFamily: EVALUATE_KPIS_FONT }}>
      <header className={headerCard}>
        <p className={headerKicker}>
          <i className="bi bi-ui-checks-grid" aria-hidden />
          KPI Management
        </p>
        <h1 className={headerTitle}>Evaluate KPIs</h1>
        <p className={headerDesc}>
          Select a KPI template, filter the employee list, then open a row to enter actual results.
          Score % is (actual ÷ target) × 100. Total Weight Score updates as you type. When every line is
          complete, use <strong>Finalize KPI</strong> to lock scores and publish to HR.
        </p>
      </header>

      <div className={`${card} mb-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="kpi-template-select" className="text-xs font-bold uppercase tracking-wide text-[#64748b]">
              KPI template
            </label>
            <select
              id="kpi-template-select"
              className={`${input} mt-1.5`}
              disabled={loadingMeta || summaries.length === 0}
              value={selectedSummaryKey}
              onChange={(e) => setSelectedSummaryKey(e.target.value)}
            >
              {summaries.length === 0 ? (
                <option value="">No KPI assignments yet</option>
              ) : (
                summaries.map((s) => (
                  <option key={summaryKey(s)} value={summaryKey(s)}>
                    {s.title}
                    {s.periodStartDate ? ` · ${displayDateTimeDisplay(s.periodStartDate)}` : ''}
                    {s.periodStatus === 'CLOSING' || s.graceEndsAt ? ' (Closing)' : ''}
                    {s.openAssignments > 0 ? ` (${s.openAssignments} open)` : ' (complete)'}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            disabled={
              selectedSummaryKey === ''
              || finalizing
              || !selectedSummary
              || selectedSummary.openAssignments === 0
            }
            onClick={() => void finalize()}
            className={btnPrimary}
          >
            {finalizing ? 'Finalizing…' : 'Finalize KPI'}
          </button>
        </div>

        {selectedSummary && (
          <p className="mt-4 rounded-lg border border-[#dbe7f6] bg-[#f8fafc] px-3 py-2 text-sm text-[#334155]">
            <strong className="text-[#0f172a]">Scoring period:</strong> {selectedPeriodLabel}.
            {cycleClosing
              ? ' HR has closed this cycle; complete scoring before the official end date.'
              : ' You may finalize early once all employee lines are complete.'}
          </p>
        )}
      </div>

      {selectedSummary && cycleClosing && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill mt-0.5 text-amber-600" aria-hidden />
            <div>
              <p className="font-bold">KPI cycle closing</p>
              <p className="mt-1">
                Official end:{' '}
                {displayDateTimeDisplay(selectedSummary.graceEndsAt ?? selectedSummary.periodEndDate)}.
                Please finalize actual scores before this date.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedSummaryKey !== '' && (
        <div className={`${card} mb-5`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="kpi-employee-search" className="text-xs font-bold uppercase tracking-wide text-[#64748b]">
                Search
              </label>
              <input
                id="kpi-employee-search"
                type="search"
                className={`${input} mt-1.5`}
                placeholder="Employee, department, position, KPI title…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label htmlFor="kpi-dept-filter" className="text-xs font-bold uppercase tracking-wide text-[#64748b]">
                Department
              </label>
              <select
                id="kpi-dept-filter"
                className={`${input} mt-1.5`}
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All departments</option>
                {departmentOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="kpi-status-filter" className="text-xs font-bold uppercase tracking-wide text-[#64748b]">
                Status
              </label>
              <select
                id="kpi-status-filter"
                className={`${input} mt-1.5`}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {loadingAssignments && (
        <p className="flex items-center gap-2 text-sm text-[#64748b]">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#dbe7f6] border-t-[#2563eb]"
            aria-hidden
          />
          Loading employee assignments…
        </p>
      )}

      {!loadingAssignments && selectedSummaryKey !== '' && assignments.length > 0 && (
        <>
          <div className={tableWrap}>
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className={tableHead}>
                  <th className={th}>Employee Name</th>
                  <th className={th}>Department</th>
                  <th className={th}>Position</th>
                  <th className={th}>KPI Title</th>
                  <th className={th}>Period</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Lines</th>
                  <th className={`${th} w-44`} />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-[#64748b]">
                      No employees match the current filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((a) => {
                    const totalLines = a.lines.length;
                    const scored = assignmentScoredCount(a);
                    const isFinalized = a.status === 'FINALIZED';
                    const isComplete = scored === totalLines && totalLines > 0;

                    return (
                      <tr
                        key={a.employeeKpiFormId}
                        className={row}
                        onClick={() => setModalAssignment(a)}
                      >
                        <td className={`${td} font-semibold text-[#1d4ed8]`}>{a.employeeName}</td>
                        <td className={td}>{a.departmentName ?? '—'}</td>
                        <td className={td}>{a.positionTitle ?? '—'}</td>
                        <td className={td}>{a.kpiTitle ?? selectedSummary?.title ?? '—'}</td>
                        <td className={`${td} max-w-[200px] text-xs leading-snug`}>{periodLabelForRow(a)}</td>
                        <td className={td}>
                          <span className={statusBadgeClass(a.status)}>{a.status}</span>
                        </td>
                        <td className={`${td} text-right tabular-nums`}>
                          {scored}/{totalLines}
                        </td>
                        <td className={td} onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setModalAssignment(a)}
                              className={btnGhost}
                            >
                              {isFinalized ? 'View' : 'Evaluate'}
                            </button>
                            <button
                              type="button"
                              disabled={isFinalized || !isComplete || finalizingEmployeeId === a.employeeKpiFormId}
                              onClick={() => openEmployeeFinalize(a)}
                              title={
                                !isComplete
                                  ? 'Complete all KPI rows before finalizing'
                                  : 'Finalize this employee KPI'
                              }
                              className={btnSecondary}
                            >
                              {finalizingEmployeeId === a.employeeKpiFormId ? '…' : 'Finalize'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#64748b]">
              Showing {(safePage - 1) * PAGE_SIZE + (pageRows.length > 0 ? 1 : 0)}–
              {(safePage - 1) * PAGE_SIZE + pageRows.length} of {filteredAssignments.length} employee
              {filteredAssignments.length === 1 ? '' : 's'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="px-2 text-sm font-semibold text-[#334155]">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                className={btnSecondary}
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {!loadingAssignments && selectedSummaryKey !== '' && assignments.length === 0 && (
        <p className="text-sm text-[#64748b]">No assignments for this template in your KPI evaluator scope.</p>
      )}

      <ManagerEmployeeKpiScoreModal
        open={modalAssignment != null}
        assignment={modalAssignment}
        drafts={drafts}
        saving={modalAssignment != null && savingFormId === modalAssignment.employeeKpiFormId}
        periodStart={selectedSummary?.periodStartDate}
        periodEnd={selectedSummary?.graceEndsAt ?? selectedSummary?.periodEndDate}
        onClose={() => setModalAssignment(null)}
        onDraftChange={updateDraft}
        onSave={(a) => void saveEmployee(a, false)}
      />

      {finalizeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#0f172a]/50 p-4 backdrop-blur-[2px]"
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[#dbe7f6] bg-white p-5 shadow-2xl"
            style={{ fontFamily: EVALUATE_KPIS_FONT }}
          >
            <h2 className="text-lg font-bold text-[#0f172a]">Finalize {finalizeTarget.employeeName}</h2>
            <p className="mt-2 text-sm text-[#64748b]">
              This locks the employee KPI result and publishes it to HR and the employee.
            </p>
            <label htmlFor="finalize-reason" className="mt-4 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
              Reason
            </label>
            <textarea
              id="finalize-reason"
              value={finalizeReason}
              onChange={(e) => setFinalizeReason(e.target.value)}
              rows={4}
              maxLength={2000}
              className={`${input} mt-1.5 resize-y`}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={finalizingEmployeeId === finalizeTarget.employeeKpiFormId}
                onClick={() => {
                  setFinalizeTarget(null);
                  setFinalizeReason('');
                }}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={finalizingEmployeeId === finalizeTarget.employeeKpiFormId || finalizeReason.trim() === ''}
                onClick={() => void submitEmployeeFinalize()}
                className={btnPrimary}
              >
                {finalizingEmployeeId === finalizeTarget.employeeKpiFormId ? 'Finalizing…' : 'Submit finalization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerKpiScoringPage;

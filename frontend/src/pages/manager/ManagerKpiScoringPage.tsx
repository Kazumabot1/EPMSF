import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import type { ManagerKpiAssignment, ManagerKpiTemplateSummary } from '../../types/kpiWorkflow';
import ManagerEmployeeKpiScoreModal from './ManagerEmployeeKpiScoreModal';
import type { DraftScores } from './ManagerEmployeeKpiScoreModal';

const formatIsoDate = (value: string | null | undefined) => {
  if (value == null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

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
  const assignmentsRequestRef = useRef(0);

  const loadSummaries = useCallback(async () => {
    try {
      setLoadingMeta(true);
      const data = sortTemplateSummaries(await kpiWorkflowService.listManagerTemplates());
      setSummaries(data);
      setSelectedSummaryKey((prev) => {
        if (prev !== '') return prev;
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

  const selectedSummary = useMemo(
    () => summaries.find((s) => summaryKey(s) === selectedSummaryKey),
    [summaries, selectedSummaryKey],
  );

  const assignmentsByPosition = useMemo(() => {
    const grouped = new Map<string, ManagerKpiAssignment[]>();
    for (const assignment of assignments) {
      const position = assignment.positionTitle?.trim() || 'No Position Assigned';
      grouped.set(position, [...(grouped.get(position) ?? []), assignment]);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(([position, rows]) => ({
        position,
        rows: rows.sort((a, b) =>
          a.employeeName.localeCompare(b.employeeName, undefined, { sensitivity: 'base' }),
        ),
      }));
  }, [assignments]);

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
      toast.success(`Saved KPI actuals for ${assignment.employeeName}.`);
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
    const endLabel = formatIsoDate(selectedSummary?.periodEndDate ?? undefined);
    const earlyNote =
      endLabel && selectedSummary?.periodEndDate
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
      const result = await kpiWorkflowService.finalizeDepartment(selectedSummary.kpiFormId, selectedSummary.cyclePeriodId);
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

  const periodEndLabel = formatIsoDate(selectedSummary?.periodEndDate ?? undefined);
  const periodStartLabel = formatIsoDate(selectedSummary?.periodStartDate ?? undefined);
  const officialEndLabel = formatIsoDate(selectedSummary?.graceEndsAt ?? selectedSummary?.periodEndDate ?? undefined);
  const cycleClosing =
    selectedSummary?.periodStatus === 'CLOSING' || Boolean(selectedSummary?.graceEndsAt);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 font-sans">
      <header className="mb-7">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          <i className="bi bi-clipboard-data" /> KPI Management
        </span>
        <h1 className="mb-1.5 text-3xl font-bold text-slate-800">KPI scoring</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Click an employee name to enter <strong>actual</strong> results and save. Achievement % is (actual / target) x 100.
          When every KPI line is scored for each person in your evaluator scope, use <strong>Finalize KPI</strong> to lock scores,
          notify score targets, alert HR, and publish rows under HR - Employee KPI.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-60 flex-1">
          <label htmlFor="kpi-template-select" className="text-xs font-bold text-slate-500">
            KPI template
          </label>
          <select
            id="kpi-template-select"
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
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
                  {s.periodStartDate ? ` - ${formatIsoDate(s.periodStartDate)}` : ''}
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
            selectedSummaryKey === '' ||
            finalizing ||
            !selectedSummary ||
            selectedSummary.openAssignments === 0
          }
          onClick={() => void finalize()}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {finalizing ? 'Finalizing...' : 'Finalize KPI'}
        </button>
      </div>

      {selectedSummary && (periodStartLabel || periodEndLabel) && (
        <p className="-mt-1 mb-5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <strong className="text-slate-700">Scoring period</strong>
          {periodStartLabel && periodEndLabel ? (
            <>
              : {periodStartLabel} - {periodEndLabel}.{' '}
              {cycleClosing
                ? 'HR has closed this cycle; final scoring is available until the official end date.'
                : 'You can finalize before the end date once all lines are complete.'}
            </>
          ) : periodEndLabel ? (
            <>
              : ends {periodEndLabel}.{' '}
              {cycleClosing
                ? 'HR has closed this cycle; final scoring is available until the official end date.'
                : 'You can finalize before the end date once all lines are complete.'}
            </>
          ) : (
            <> starts {periodStartLabel}.</>
          )}
        </p>
      )}

      {selectedSummary && cycleClosing && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill mt-0.5 text-amber-600" aria-hidden />
            <div>
              <p className="font-bold">KPI cycle closing</p>
              <p className="mt-1">
                {officialEndLabel
                  ? `Official end date is ${officialEndLabel}. Please finalize actual scores before this date.`
                  : 'Please finalize actual scores before the cycle officially ends.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {loadingAssignments && (
        <p className="text-sm text-slate-500">Loading assignments...</p>
      )}

      {!loadingAssignments && selectedSummaryKey !== '' && assignments.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-200 px-3 py-3">Employee</th>
                <th className="border-b border-slate-200 px-3 py-3">Position</th>
                <th className="border-b border-slate-200 px-3 py-3">Status</th>
                <th className="border-b border-slate-200 px-3 py-3 text-right">Lines scored</th>
                <th className="border-b border-slate-200 px-3 py-3 text-right">Weighted total</th>
                <th className="w-56 border-b border-slate-200 px-3 py-3" />
              </tr>
            </thead>
              {assignmentsByPosition.map(({ position, rows }) => (
                <tbody key={position}>
                  <tr>
                    <td
                      colSpan={6}
                      className="border-b border-slate-200 bg-slate-50 px-3 py-3 font-bold text-slate-950"
                    >
                      {position}
                      <span className="ml-2 text-xs font-semibold text-slate-500">
                        {rows.length} employee{rows.length === 1 ? '' : 's'}
                      </span>
                    </td>
                  </tr>
                  {rows.map((a) => {
                const totalLines = a.lines.length;
                const scored = a.lines.filter((line) =>
                  lineEffectivelyScored(line, drafts[a.employeeKpiFormId]?.[line.kpiFormItemId]),
                ).length;
                const isFinalized = a.status === 'FINALIZED';
                const isComplete = scored === totalLines && totalLines > 0;
                return (
                  <tr key={a.employeeKpiFormId}>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setModalAssignment(a)}
                        className="text-left font-bold text-blue-700 underline decoration-blue-700/30 hover:text-blue-800"
                      >
                        {a.employeeName}
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-600">
                      {a.positionTitle ?? 'No Position Assigned'}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{a.status}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums text-slate-600">
                      {scored}/{totalLines}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums text-slate-950">
                      {a.totalWeightedScore != null ? a.totalWeightedScore.toFixed(2) : '-'}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModalAssignment(a)}
                          className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          {isFinalized ? 'View KPIs' : 'Score KPIs'}
                        </button>
                        <button
                          type="button"
                          disabled={isFinalized || !isComplete || finalizingEmployeeId === a.employeeKpiFormId}
                          onClick={() => openEmployeeFinalize(a)}
                          title={!isComplete ? 'Complete all KPI rows before finalizing' : 'Finalize this employee KPI'}
                          className="inline-flex h-9 items-center rounded-lg border border-blue-600 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {finalizingEmployeeId === a.employeeKpiFormId ? 'Finalizing...' : 'Finalized'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                  })}
                </tbody>
              ))}
          </table>
        </div>
      )}

      {!loadingAssignments && selectedSummaryKey !== '' && assignments.length === 0 && (
        <p className="text-slate-500">No assignments for this template in your KPI evaluator scope.</p>
      )}

      <ManagerEmployeeKpiScoreModal
        open={modalAssignment != null}
        assignment={modalAssignment}
        drafts={drafts}
        saving={modalAssignment != null && savingFormId === modalAssignment.employeeKpiFormId}
        onClose={() => setModalAssignment(null)}
        onDraftChange={updateDraft}
        onSave={(a) => void saveEmployee(a, true)}
      />

      {finalizeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4"
        >
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-950">
              Finalize {finalizeTarget.employeeName}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This locks the employee KPI result and publishes it immediately to HR and the employee.
            </p>
            <label htmlFor="finalize-reason" className="mt-4 block text-xs font-bold text-slate-600">
              Reason
            </label>
            <textarea
              id="finalize-reason"
              value={finalizeReason}
              onChange={(e) => setFinalizeReason(e.target.value)}
              rows={4}
              maxLength={2000}
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                disabled={finalizingEmployeeId === finalizeTarget.employeeKpiFormId}
                onClick={() => {
                  setFinalizeTarget(null);
                  setFinalizeReason('');
                }}
                className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={finalizingEmployeeId === finalizeTarget.employeeKpiFormId || finalizeReason.trim() === ''}
                onClick={() => void submitEmployeeFinalize()}
                className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {finalizingEmployeeId === finalizeTarget.employeeKpiFormId ? 'Finalizing...' : 'Submit finalization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerKpiScoringPage;


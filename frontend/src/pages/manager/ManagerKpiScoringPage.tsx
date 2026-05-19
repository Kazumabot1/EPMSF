import { useCallback, useEffect, useMemo, useState } from 'react';
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

function lineEffectivelyScored(
  line: ManagerKpiAssignment['lines'][number],
  draftRaw: string | undefined,
): boolean {
  const raw = draftRaw?.trim() ?? '';
  if (raw !== '') {
    const n = Number(raw);
    return Number.isFinite(n) && !Number.isNaN(n) && n >= 0;
  }
  return line.score != null;
}

const ManagerKpiScoringPage = () => {
  const [summaries, setSummaries] = useState<ManagerKpiTemplateSummary[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | ''>('');
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

  const loadSummaries = useCallback(async () => {
    try {
      setLoadingMeta(true);
      const data = sortTemplateSummaries(await kpiWorkflowService.listManagerTemplates());
      setSummaries(data);
      setSelectedFormId((prev) => {
        if (prev !== '') return prev;
        return data.length ? data[0].kpiFormId : '';
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

  const loadAssignments = useCallback(async (kpiFormId: number) => {
    try {
      setLoadingAssignments(true);
      const data = await kpiWorkflowService.listAssignments(kpiFormId);
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
      toast.error(err instanceof Error ? err.message : 'Failed to load assignments.');
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFormId === '') return;
    void loadAssignments(selectedFormId);
  }, [selectedFormId, loadAssignments]);

  const selectedSummary = useMemo(
    () => summaries.find((s) => s.kpiFormId === selectedFormId),
    [summaries, selectedFormId],
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
      if (av != null && (Number.isNaN(av) || av < 0 || !Number.isFinite(av))) {
        toast.error('Actual values must be non‑negative numbers.');
        return;
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
      void loadSummaries();
      if (closeModalAfter) setModalAssignment(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSavingFormId(null);
    }
  };

  const finalize = async () => {
    if (selectedFormId === '') return;
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
      const result = await kpiWorkflowService.finalizeDepartment(selectedFormId);
      toast.success(`Finalized ${result.assignmentsCreated} employee record(s).`);
      await loadSummaries();
      await loadAssignments(selectedFormId);
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
      void loadSummaries();
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

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: '1.75rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.4rem',
            background: 'linear-gradient(135deg,#059669,#34d399)',
            color: '#fff',
            fontSize: '.75rem',
            fontWeight: 600,
            padding: '.3rem .8rem',
            borderRadius: '999px',
            marginBottom: '.75rem',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}
        >
          <i className="bi bi-clipboard-data" /> Manager
        </span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 .35rem' }}>Team KPI scoring</h1>
        <p style={{ color: '#64748b', margin: 0, maxWidth: '640px' }}>
          Click an employee name to enter <strong>actual</strong> results and save. Achievement % is (actual ÷ target) × 100.
          When every KPI line is scored for each employee, use <strong>Finalize department KPI</strong> to lock scores, notify
          your team, alert HR (sidebar notifications), and publish rows under HR → Employee KPI.
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'flex-end',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ flex: '1 1 240px' }}>
          <label htmlFor="kpi-template-select" style={{ fontSize: '.72rem', fontWeight: 700, color: '#64748b' }}>
            KPI template
          </label>
          <select
            id="kpi-template-select"
            style={{
              marginTop: '.35rem',
              width: '100%',
              padding: '.65rem .75rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '.9rem',
            }}
            disabled={loadingMeta || summaries.length === 0}
            value={selectedFormId === '' ? '' : String(selectedFormId)}
            onChange={(e) => setSelectedFormId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            {summaries.length === 0 ? (
              <option value="">No KPI assignments yet</option>
            ) : (
              summaries.map((s) => (
                <option key={s.kpiFormId} value={s.kpiFormId}>
                  {s.title}
                  {s.openAssignments > 0 ? ` (${s.openAssignments} open)` : ' (complete)'}
                </option>
              ))
            )}
          </select>
        </div>
        <button
          type="button"
          disabled={
            selectedFormId === '' ||
            finalizing ||
            !selectedSummary ||
            selectedSummary.openAssignments === 0
          }
          onClick={() => void finalize()}
          style={{
            padding: '.65rem 1.1rem',
            borderRadius: '10px',
            border: 'none',
            background:
              selectedSummary && selectedSummary.openAssignments > 0 ? '#059669' : '#94a3b8',
            color: '#fff',
            fontWeight: 600,
            cursor:
              selectedSummary && selectedSummary.openAssignments > 0 ? 'pointer' : 'not-allowed',
            opacity: selectedSummary && selectedSummary.openAssignments > 0 ? 1 : 0.7,
          }}
        >
          {finalizing ? 'Finalizing…' : 'Finalize department KPI'}
        </button>
      </div>

      {selectedSummary && (periodStartLabel || periodEndLabel) && (
        <p
          style={{
            margin: '-0.25rem 0 1.25rem',
            fontSize: '.82rem',
            color: '#475569',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '.65rem .85rem',
          }}
        >
          <strong style={{ color: '#334155' }}>Scoring period</strong>
          {periodStartLabel && periodEndLabel ? (
            <>
              : {periodStartLabel} – {periodEndLabel}. You can finalize before the end date once all lines are complete.
            </>
          ) : periodEndLabel ? (
            <>
              : ends {periodEndLabel}. You can finalize before the end date once all lines are complete.
            </>
          ) : (
            <> starts {periodStartLabel}.</>
          )}
        </p>
      )}

      {loadingAssignments && (
        <p style={{ color: '#64748b', fontSize: '.9rem' }}>Loading assignments…</p>
      )}

      {!loadingAssignments && selectedFormId !== '' && assignments.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b', background: '#f8fafc' }}>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Employee</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Position</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Lines scored</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Weighted total</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0', width: '220px' }} />
              </tr>
            </thead>
              {assignmentsByPosition.map(({ position, rows }) => (
                <tbody key={position}>
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '.65rem',
                        borderBottom: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontWeight: 700,
                      }}
                    >
                      {position}
                      <span style={{ marginLeft: '.6rem', color: '#64748b', fontSize: '.78rem', fontWeight: 600 }}>
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
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => setModalAssignment(a)}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          margin: 0,
                          font: 'inherit',
                          fontWeight: 700,
                          color: '#047857',
                          cursor: 'pointer',
                          textAlign: 'left',
                          textDecoration: 'underline',
                          textDecorationColor: 'rgba(4, 120, 87, 0.35)',
                        }}
                      >
                        {a.employeeName}
                      </button>
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                      {a.positionTitle ?? 'No Position Assigned'}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>{a.status}</td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                      {scored}/{totalLines}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#0f172a' }}>
                      {a.totalWeightedScore != null ? a.totalWeightedScore.toFixed(2) : '-'}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', gap: '.45rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setModalAssignment(a)}
                          style={{
                            padding: '.4rem .65rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: '.78rem',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isFinalized ? 'View KPIs' : 'Score KPIs'}
                        </button>
                        <button
                          type="button"
                          disabled={isFinalized || !isComplete || finalizingEmployeeId === a.employeeKpiFormId}
                          onClick={() => openEmployeeFinalize(a)}
                          title={!isComplete ? 'Complete all KPI rows before finalizing' : 'Finalize this employee KPI'}
                          style={{
                            padding: '.4rem .65rem',
                            borderRadius: '8px',
                            border: '1px solid #059669',
                            background: isFinalized || !isComplete ? '#f1f5f9' : '#ecfdf5',
                            fontSize: '.78rem',
                            fontWeight: 700,
                            color: isFinalized || !isComplete ? '#94a3b8' : '#047857',
                            cursor: isFinalized || !isComplete ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
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

      {!loadingAssignments && selectedFormId !== '' && assignments.length === 0 && (
        <p style={{ color: '#64748b' }}>No assignments for this template in your department.</p>
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
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.45)',
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              borderRadius: '12px',
              background: '#fff',
              boxShadow: '0 20px 60px rgba(15, 23, 42, 0.25)',
              padding: '1.25rem',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
              Finalize {finalizeTarget.employeeName}
            </h2>
            <p style={{ margin: '.5rem 0 1rem', color: '#64748b', fontSize: '.88rem' }}>
              This locks the employee KPI result and publishes it immediately to HR and the employee.
            </p>
            <label htmlFor="finalize-reason" style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#475569' }}>
              Reason
            </label>
            <textarea
              id="finalize-reason"
              value={finalizeReason}
              onChange={(e) => setFinalizeReason(e.target.value)}
              rows={4}
              maxLength={2000}
              style={{
                marginTop: '.35rem',
                width: '100%',
                resize: 'vertical',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '.7rem',
                font: 'inherit',
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '.6rem' }}>
              <button
                type="button"
                disabled={finalizingEmployeeId === finalizeTarget.employeeKpiFormId}
                onClick={() => {
                  setFinalizeTarget(null);
                  setFinalizeReason('');
                }}
                style={{
                  padding: '.55rem .9rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={finalizingEmployeeId === finalizeTarget.employeeKpiFormId || finalizeReason.trim() === ''}
                onClick={() => void submitEmployeeFinalize()}
                style={{
                  padding: '.55rem .9rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: finalizeReason.trim() === '' ? '#94a3b8' : '#059669',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: finalizeReason.trim() === '' ? 'not-allowed' : 'pointer',
                }}
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

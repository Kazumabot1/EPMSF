import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { departmentKpiWorkflowService } from '../../../services/departmentKpiService';
import type { DepartmentKpiResult, DepartmentKpiTemplateSummary } from '../../../types/departmentKpi';

type Drafts = Record<number, Record<number, string>>;
type ModalMode = 'view' | 'edit';
type ActiveModal = { resultId: number; mode: ModalMode };

const keyFor = (row: DepartmentKpiTemplateSummary) => `${row.templateId}:${row.cyclePeriodId ?? 'legacy'}`;
const PAGE_SIZE = 10;

const formatDate = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatScore = (value: number | null | undefined) => (value == null ? '-' : value.toFixed(2));

const draftsForResult = (result: DepartmentKpiResult) =>
  result.lines.reduce<Record<number, string>>((next, line) => {
    next[line.templateRowId] = line.actualValue == null ? '' : String(line.actualValue);
    return next;
  }, {});

const DepartmentKpiScoringPage = () => {
  const [summaries, setSummaries] = useState<DepartmentKpiTemplateSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [results, setResults] = useState<DepartmentKpiResult[]>([]);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [finalizationRequestId, setFinalizationRequestId] = useState<number | null>(null);
  const [finalizationReason, setFinalizationReason] = useState('');
  const [page, setPage] = useState(1);

  const loadSummaries = async () => {
    const rows = await departmentKpiWorkflowService.templates();
    setSummaries(rows);
    setSelectedKey((prev) => prev || (rows[0] ? keyFor(rows[0]) : ''));
  };

  useEffect(() => {
    void loadSummaries().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI scoring list.'));
  }, []);

  const selected = useMemo(() => summaries.find((row) => keyFor(row) === selectedKey), [selectedKey, summaries]);
  const activeResult = useMemo(
    () => results.find((row) => row.departmentKpiResultId === activeModal?.resultId) ?? null,
    [activeModal?.resultId, results],
  );
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pagedResults = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [page, results]);

  useEffect(() => {
    setPage(1);
  }, [selectedKey]);

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages]);

  const loadResults = async (summary: DepartmentKpiTemplateSummary) => {
    const rows = await departmentKpiWorkflowService.assignments(summary.templateId, summary.cyclePeriodId);
    const next: Drafts = {};
    rows.forEach((result) => {
      next[result.departmentKpiResultId] = draftsForResult(result);
    });
    setResults(rows);
    setDrafts(next);
  };

  useEffect(() => {
    if (!selected) return;
    void loadResults(selected).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI assignments.'));
  }, [selected]);

  const updateDraft = (resultId: number, rowId: number, value: string) => {
    if (value !== '' && (!/^\d+(\.\d*)?$/.test(value) || !Number.isFinite(Number(value)))) return;
    setDrafts((prev) => ({ ...prev, [resultId]: { ...(prev[resultId] ?? {}), [rowId]: value } }));
  };

  const replaceResult = (updated: DepartmentKpiResult) => {
    setResults((prev) => prev.map((row) => (row.departmentKpiResultId === updated.departmentKpiResultId ? updated : row)));
    setDrafts((prev) => ({ ...prev, [updated.departmentKpiResultId]: draftsForResult(updated) }));
  };

  const resetDraft = (result: DepartmentKpiResult) => {
    setDrafts((prev) => ({ ...prev, [result.departmentKpiResultId]: draftsForResult(result) }));
  };

  const closeModal = () => {
    if (activeModal?.mode === 'edit' && activeResult) resetDraft(activeResult);
    setActiveModal(null);
  };

  const isPersistedComplete = (result: DepartmentKpiResult) => result.lines.every((line) => line.score != null);

  const isLocked = (result: DepartmentKpiResult) =>
    result.status === 'FINALIZED' || result.status === 'CLOSED' || result.status === 'PENDING_APPROVAL';

  const save = async (result: DepartmentKpiResult) => {
    const scores = result.lines.map((line) => {
      const raw = drafts[result.departmentKpiResultId]?.[line.templateRowId]?.trim() ?? '';
      return { templateRowId: line.templateRowId, actualValue: raw === '' ? null : Number(raw) };
    });
    if (scores.some((row) => row.actualValue != null && (Number.isNaN(row.actualValue) || row.actualValue < 0))) {
      toast.error('Actual values must be zero or greater.');
      return;
    }
    for (let i = 0; i < result.lines.length; i += 1) {
      const line = result.lines[i];
      const raw = drafts[result.departmentKpiResultId]?.[line.templateRowId]?.trim() ?? '';
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
      setSavingId(result.departmentKpiResultId);
      const updated = await departmentKpiWorkflowService.updateScores(result.departmentKpiResultId, scores);
      replaceResult(updated);
      toast.success(`Saved scores for ${updated.departmentName}.`);
      await loadSummaries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setSavingId(null);
    }
  };

  const submitFinalizationRequest = async () => {
    const result = results.find((row) => row.departmentKpiResultId === finalizationRequestId);
    if (!result) return;
    if (!finalizationReason.trim()) {
      toast.error('Finalization reason is required.');
      return;
    }
    try {
      setSavingId(result.departmentKpiResultId);
      const updated = await departmentKpiWorkflowService.requestFinalization(result.departmentKpiResultId, finalizationReason.trim());
      replaceResult(updated);
      toast.success(`Submitted ${updated.departmentName} for CEO approval.`);
      await loadSummaries();
      setFinalizationRequestId(null);
      setFinalizationReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Finalization request failed.');
    } finally {
      setSavingId(null);
    }
  };

  const renderScoringModal = () => {
    if (!activeResult || !activeModal) return null;

    const locked = isLocked(activeResult);
    const viewOnly = activeModal.mode === 'view';

    return createPortal(
      <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
        <div className="kpi-tpl-modal">
          <div className="kpi-tpl-modal-header">
            <div>
              <p className="kpi-tpl-modal-kicker">Department KPI Scoring</p>
              <h2>{viewOnly ? 'View' : 'Edit'} - {activeResult.departmentName}</h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="text-right text-sm font-semibold text-gray-700">
                Total Weight Score %: <span className="text-gray-950">{formatScore(activeResult.totalWeightedScore)}</span>
              </div>
              {!viewOnly && (
                <button
                  type="button"
                  className="kpi-tpl-btn-secondary"
                  disabled={locked || savingId === activeResult.departmentKpiResultId}
                  onClick={() => void save(activeResult)}
                >
                  Save
                </button>
              )}
              <button type="button" className="kpi-tpl-icon-btn" onClick={closeModal} aria-label="Close">
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
          </div>

          <div className="kpi-tpl-modal-body">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Department Name</p>
                <p className="mt-1 font-semibold text-gray-900">{activeResult.departmentName}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Start Date</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(activeResult.periodStartDate ?? selected?.periodStartDate)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">End Date</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(activeResult.periodEndDate ?? selected?.periodEndDate)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-sm">
                <thead className="kpi-tpl-thead">
                  <tr>
                    <th className="px-4 py-3 text-left">KPI</th>
                    <th className="px-4 py-3 text-right">Target %</th>
                    <th className="px-4 py-3 text-right">Actual %</th>
                    <th className="px-4 py-3 text-right">Score %</th>
                    <th className="px-4 py-3 text-right">Weight %</th>
                    <th className="px-4 py-3 text-right">Weight Score</th>
                  </tr>
                </thead>
                <tbody>
                  {activeResult.lines.map((line) => {
                    const raw = drafts[activeResult.departmentKpiResultId]?.[line.templateRowId] ?? '';
                    const preview = !viewOnly && raw.trim() !== '' && line.target ? (Number(raw) / line.target) * 100 : line.score;
                    const actual = !viewOnly && raw.trim() !== '' ? Number(raw) : line.actualValue;
                    const actualInvalid = actual != null && line.target != null && Number.isFinite(actual) && actual > line.target;
                    const previewWeightScore =
                      !viewOnly && preview != null && line.weight != null ? (preview * line.weight) / 100 : line.weightedScore;

                    return (
                      <tr key={line.templateRowId} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {line.kpiLabel}
                          {line.unitName ? ` (${line.unitName})` : ''}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{line.target ?? '-'}</td>
                        <td className="px-4 py-3 text-right">
                          {viewOnly ? (
                            <span className="tabular-nums">{line.actualValue ?? '-'}</span>
                          ) : (
                            <input
                              className={`w-28 rounded-lg border px-2 py-1 text-right ${
                                actualInvalid ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-300'
                              }`}
                              disabled={locked}
                              value={raw}
                              onChange={(e) => updateDraft(activeResult.departmentKpiResultId, line.templateRowId, e.target.value)}
                            />
                          )}
                          {actualInvalid && <div className="mt-1 text-xs text-red-700">Max {line.target}</div>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatScore(preview)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{line.weight ?? '-'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatScore(previewWeightScore)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {!viewOnly && (
            <div className="kpi-tpl-modal-footer px-5">
              <p>Status: {activeResult.status}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="kpi-tpl-btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>,
      document.body,
    );
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">Department KPI</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">HR Department KPI Scoring</h1>
          </div>
        </header>

        <div className="mb-5 max-w-xl">
          <select
            className="kpi-tpl-input w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
          >
            {summaries.length === 0 ? (
              <option value="">No active Department KPI results</option>
            ) : (
              summaries.map((summary) => (
                <option key={keyFor(summary)} value={keyFor(summary)}>
                  {summary.title} {summary.periodStartDate ? `- ${summary.periodStartDate}` : ''} ({summary.openAssignments} open)
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-5">
          {results.length > 0 && (
            <div className="kpi-tpl-table-wrap">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-sm">
                  <thead className="kpi-tpl-thead">
                    <tr>
                      <th className="px-4 py-3 text-left">Department Name</th>
                      <th className="px-4 py-3 text-left">Start Date</th>
                      <th className="px-4 py-3 text-left">End Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Total Weight Score %</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedResults.map((result) => {
                      const locked = isLocked(result);
                      const pendingApproval = result.status === 'PENDING_APPROVAL';
                      const complete = isPersistedComplete(result);
                      return (
                      <tr
                        key={result.departmentKpiResultId}
                        className="cursor-pointer border-t border-gray-100 hover:bg-violet-50/50"
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveModal({ resultId: result.departmentKpiResultId, mode: locked ? 'view' : 'edit' })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setActiveModal({ resultId: result.departmentKpiResultId, mode: locked ? 'view' : 'edit' });
                          }
                        }}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900">{result.departmentName}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(result.periodStartDate ?? selected?.periodStartDate)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(result.periodEndDate ?? selected?.periodEndDate)}</td>
                        <td className="px-4 py-3 text-gray-700">{result.status}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{formatScore(result.totalWeightedScore)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              className="kpi-tpl-btn-secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                setActiveModal({ resultId: result.departmentKpiResultId, mode: 'view' });
                              }}
                            >
                              View
                            </button>
                            {!locked && complete && (
                              <button
                                type="button"
                                className="kpi-tpl-btn-primary"
                                disabled={savingId === result.departmentKpiResultId}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFinalizationRequestId(result.departmentKpiResultId);
                                  setFinalizationReason('');
                                }}
                              >
                                Finalize
                              </button>
                            )}
                            {pendingApproval && (
                              <button type="button" className="kpi-tpl-btn-secondary" disabled>
                                Finalize
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
              {results.length > PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                  <span>
                    Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, results.length)} of {results.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="kpi-tpl-btn-secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </button>
                    <span className="font-semibold text-slate-800">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="kpi-tpl-btn-secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selected && results.length === 0 && (
            <div className="kpi-tpl-card p-8 text-center text-gray-500">
              No Department KPI results for this template yet. Activate a Department KPI Cycle to create assignments.
            </div>
          )}
        </div>
      </div>

      {renderScoringModal()}
      {finalizationRequestId != null && (
        <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
          <div className="kpi-tpl-reason-modal">
            <div className="kpi-tpl-modal-header">
              <div>
                <p className="kpi-tpl-modal-kicker">CEO Approval</p>
                <h2>Request Department KPI finalization</h2>
              </div>
              <button
                type="button"
                className="kpi-tpl-icon-btn"
                onClick={() => {
                  setFinalizationRequestId(null);
                  setFinalizationReason('');
                }}
                aria-label="Close"
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="kpi-tpl-modal-body">
              <label className="kpi-tpl-reason-field">
                Reason
                <textarea
                  className="kpi-tpl-input rounded-lg border p-3"
                  rows={5}
                  maxLength={1000}
                  value={finalizationReason}
                  onChange={(event) => setFinalizationReason(event.target.value)}
                />
              </label>
            </div>
            <div className="kpi-tpl-modal-footer kpi-tpl-reason-footer">
              <button
                type="button"
                className="kpi-tpl-btn-secondary"
                onClick={() => {
                  setFinalizationRequestId(null);
                  setFinalizationReason('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kpi-tpl-btn-primary"
                disabled={savingId === finalizationRequestId || !finalizationReason.trim()}
                onClick={() => void submitFinalizationRequest()}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentKpiScoringPage;

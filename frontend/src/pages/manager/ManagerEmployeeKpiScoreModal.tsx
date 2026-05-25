import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ManagerKpiAssignment } from '../../types/kpiWorkflow';

export type DraftScores = Record<number, Record<number, string>>;

type Props = {
  open: boolean;
  assignment: ManagerKpiAssignment | null;
  drafts: DraftScores;
  saving: boolean;
  onClose: () => void;
  onDraftChange: (employeeKpiFormId: number, kpiFormItemId: number, value: string) => void;
  onSave: (assignment: ManagerKpiAssignment) => void | Promise<void>;
};

const blockedNumberKeys = new Set(['-', '+', 'e', 'E']);

function isAllowedActualText(value: string) {
  if (value === '') return true;
  return /^\d+(\.\d*)?$/.test(value) && Number.isFinite(Number(value));
}

function isInvalidActualText(value: string, target?: number | null) {
  if (value.trim() === '') return false;
  const numericValue = Number(value);
  return !Number.isFinite(numericValue)
    || numericValue < 1
    || numericValue > 100
    || (target != null && numericValue > target);
}

const formatScore = (value: number | null | undefined) => (value == null ? '-' : value.toFixed(2));

const detailItem = (label: string, value: string | number | null | undefined) => (
  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value ?? '-'}</p>
  </div>
);

const ManagerEmployeeKpiScoreModal = ({
  open,
  assignment,
  drafts,
  saving,
  onClose,
  onDraftChange,
  onSave,
}: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || assignment == null) return null;

  const isFinal = assignment.status === 'FINALIZED';

  const overlay = (
    <div
      role="presentation"
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mgr-kpi-modal-title"
        className="max-h-[min(90vh,920px)] w-full max-w-6xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="border-b border-slate-100 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">KPI Score Calculation</p>
              <h2 id="mgr-kpi-modal-title" className="mt-1 text-lg font-bold text-slate-950">
                {assignment.employeeName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Status: <span className="font-semibold text-slate-700">{assignment.status}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl leading-none text-slate-600 transition hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {detailItem('Name', assignment.employeeName)}
            {detailItem('Department', assignment.departmentName)}
            {detailItem('Position', assignment.positionTitle)}
            {detailItem('KPI Title', assignment.kpiTitle)}
          </div>
        </header>

        <div className="px-5 py-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-200 px-3 py-3">KPI</th>
                  <th className="border-b border-slate-200 px-3 py-3">KPI Category</th>
                  <th className="border-b border-slate-200 px-3 py-3">Unit</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Target</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Weight %</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Actual %</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Achievement %</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Weight Score</th>
                </tr>
              </thead>
              <tbody>
                {assignment.lines.map((line) => {
                  const rawDraft = drafts[assignment.employeeKpiFormId]?.[line.kpiFormItemId]?.trim() ?? '';
                  const actualDraft = drafts[assignment.employeeKpiFormId]?.[line.kpiFormItemId] ?? '';
                  const actualInvalid = isInvalidActualText(actualDraft, line.target);
                  const draftNum = rawDraft === '' ? null : Number(rawDraft);
                  const target = line.target != null && line.target > 0 ? line.target : null;
                  const previewPct =
                    draftNum != null && !Number.isNaN(draftNum) && target != null ? (draftNum / target) * 100 : null;
                  const achievementDisp = previewPct != null ? previewPct.toFixed(2) : formatScore(line.score);
                  const previewWeightScore =
                    previewPct != null && line.weight != null ? (previewPct * line.weight) / 100 : null;
                  const weightScoreDisp =
                    previewWeightScore != null ? previewWeightScore.toFixed(2) : formatScore(line.weightedScore);

                  return (
                    <tr key={line.kpiFormItemId} className="align-top">
                      <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-700">
                        {line.kpiLabel ?? '-'}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-600">
                        {line.kpiCategoryName ?? '-'}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-600">
                        {line.unitName ?? '-'}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums text-slate-700">
                        {line.target ?? '-'}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums text-slate-700">
                        {line.weight ?? '-'}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          disabled={isFinal}
                          value={drafts[assignment.employeeKpiFormId]?.[line.kpiFormItemId] ?? ''}
                          onKeyDown={(e) => {
                            if (blockedNumberKeys.has(e.key)) e.preventDefault();
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (!isAllowedActualText(pasted)) e.preventDefault();
                          }}
                          onChange={(e) => {
                            if (isAllowedActualText(e.target.value)) {
                              onDraftChange(assignment.employeeKpiFormId, line.kpiFormItemId, e.target.value);
                            }
                          }}
                          className={`h-9 w-24 rounded-lg border px-2 text-right tabular-nums outline-none transition disabled:bg-slate-100 disabled:text-slate-500 ${
                            actualInvalid
                              ? 'border-red-500 bg-red-50 text-red-800 focus:ring-2 focus:ring-red-200'
                              : 'border-slate-300 bg-white text-slate-950 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                          }`}
                        />
                        {actualInvalid && actualDraft.trim() !== '' && (
                          <div className="mt-1 whitespace-nowrap text-xs font-medium text-red-700">
                            Max {line.target ?? 100}
                          </div>
                        )}
                      </td>
                      <td
                        className="border-b border-slate-100 px-3 py-3 text-right tabular-nums text-slate-600"
                        title="(actual / target) x 100"
                      >
                        {achievementDisp}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums text-slate-600">
                        {weightScoreDisp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="mt-5 flex flex-col items-stretch gap-3 border-t border-slate-100 pt-4 sm:items-end">
            <div className="w-full rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-right sm:w-auto sm:min-w-64">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Total Score</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatScore(assignment.totalScore)}
                <span className="ml-2 text-xs font-medium text-slate-500">
                  Weight Score: {formatScore(assignment.totalWeightedScore)}
                </span>
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isFinal || saving}
                onClick={() => void onSave(assignment)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : 'Save actuals'}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default ManagerEmployeeKpiScoreModal;

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ManagerKpiAssignment } from '../../types/kpiWorkflow';
import {
  achievementPct,
  computeLiveTotalWeightedScore,
  displayDateTimeDisplay,
  formatPctOneDecimal,
  formatPeriodRange,
  resolveLineActual,
  weightScoreFromActual,
} from './evaluateKpisFormat';
import {
  EVALUATE_KPIS_FONT,
  detailGrid,
  detailItem,
  detailLabel,
  detailValue,
  modalBody,
  modalCloseBtn,
  modalFooter,
  modalHeader,
  modalOverlay,
  modalPanel,
  btnPrimary,
  btnSecondary,
  tableHead,
  th,
} from './evaluateKpisUi';

export type DraftScores = Record<number, Record<number, string>>;

type Props = {
  open: boolean;
  assignment: ManagerKpiAssignment | null;
  drafts: DraftScores;
  saving: boolean;
  periodStart?: string | null;
  periodEnd?: string | null;
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
  return (
    !Number.isFinite(numericValue)
    || numericValue < 1
    || numericValue > 100
    || (target != null && numericValue > target)
  );
}

const ManagerEmployeeKpiScoreModal = ({
  open,
  assignment,
  drafts,
  saving,
  periodStart,
  periodEnd,
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

  const liveTotalWeighted = useMemo(
    () => (assignment ? computeLiveTotalWeightedScore(assignment, drafts) : null),
    [assignment, drafts],
  );

  if (!open || assignment == null) return null;

  const isFinal = assignment.status === 'FINALIZED';
  const periodLabel = formatPeriodRange(
    periodStart ?? assignment.periodStartDate,
    periodEnd ?? assignment.periodEndDate,
  );

  const overlay = (
    <div
      role="presentation"
      className={modalOverlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evaluate-kpi-modal-title"
        className={modalPanel}
        style={{ fontFamily: EVALUATE_KPIS_FONT }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={modalHeader}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1d4ed8]">
                Evaluate KPIs
              </p>
              <h2 id="evaluate-kpi-modal-title" className="text-xl font-bold tracking-tight text-[#0f172a]">
                {assignment.employeeName}
              </h2>
              <p className="mt-1 text-sm text-[#334155]">
                Status: <span className="font-semibold text-[#0f172a]">{assignment.status}</span>
                {assignment.finalizedAt ? (
                  <>
                    {' '}
                    · Finalized {displayDateTimeDisplay(assignment.finalizedAt)}
                  </>
                ) : null}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className={modalCloseBtn}>
              <i className="bi bi-x-lg text-sm" aria-hidden />
            </button>
          </div>

          <div className={detailGrid}>
            <div className={detailItem}>
              <p className={detailLabel}>Employee Name</p>
              <p className={detailValue}>{assignment.employeeName}</p>
            </div>
            <div className={detailItem}>
              <p className={detailLabel}>Department</p>
              <p className={detailValue}>{assignment.departmentName ?? '—'}</p>
            </div>
            <div className={detailItem}>
              <p className={detailLabel}>Position</p>
              <p className={detailValue}>{assignment.positionTitle ?? '—'}</p>
            </div>
            <div className={detailItem}>
              <p className={detailLabel}>KPI Title</p>
              <p className={detailValue}>{assignment.kpiTitle ?? '—'}</p>
            </div>
            <div className={detailItem}>
              <p className={detailLabel}>Period</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-[#0f172a]">{periodLabel}</p>
            </div>
          </div>
        </div>

        <div className={modalBody}>
          <div className="overflow-x-auto rounded-xl border border-[#dbe7f6]">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className={tableHead}>
                  <th className={th}>KPI</th>
                  <th className={th}>Category</th>
                  <th className={`${th} text-right`}>Target</th>
                  <th className={`${th} text-right`}>Weight</th>
                  <th className={`${th} text-right`}>Actual</th>
                  <th className={`${th} text-right`}>Score %</th>
                  <th className={`${th} text-right`}>Weight Score</th>
                </tr>
              </thead>
              <tbody>
                {assignment.lines.map((line) => {
                  const draftRaw = drafts[assignment.employeeKpiFormId]?.[line.kpiFormItemId] ?? '';
                  const actualInvalid = isInvalidActualText(draftRaw, line.target);
                  const actualNum = resolveLineActual(line, draftRaw);
                  const scorePct =
                    actualNum != null
                      ? achievementPct(actualNum, line.target)
                      : line.score;
                  const weightScore =
                    actualNum != null
                      ? weightScoreFromActual(actualNum, line.target, line.weight)
                      : line.weightedScore;

                  return (
                    <tr key={line.kpiFormItemId} className="border-b border-[#e5e7eb] align-top">
                      <td className="px-4 py-3 font-medium text-[#0f172a]">{line.kpiLabel ?? '—'}</td>
                      <td className="px-4 py-3 text-[#334155]">{line.kpiCategoryName ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#334155]">
                        {formatPctOneDecimal(line.target)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#334155]">
                        {formatPctOneDecimal(line.weight)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={isFinal}
                            value={draftRaw}
                            onKeyDown={(e) => {
                              if (blockedNumberKeys.has(e.key)) e.preventDefault();
                            }}
                            onPaste={(e) => {
                              const pasted = e.clipboardData.getData('text');
                              if (!isAllowedActualText(pasted)) e.preventDefault();
                            }}
                            onChange={(e) => {
                              if (isAllowedActualText(e.target.value)) {
                                onDraftChange(
                                  assignment.employeeKpiFormId,
                                  line.kpiFormItemId,
                                  e.target.value,
                                );
                              }
                            }}
                            className={`h-9 w-20 rounded-lg border px-2 text-right tabular-nums outline-none transition disabled:bg-[#f1f5f9] disabled:text-[#64748b] ${
                              actualInvalid
                                ? 'border-red-500 bg-red-50 text-red-800 focus:ring-2 focus:ring-red-200'
                                : 'border-[#d7e4f5] bg-white text-[#0f172a] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15'
                            }`}
                            aria-label={`Actual for ${line.kpiLabel ?? 'KPI line'}`}
                          />
                          <span className="text-xs font-semibold text-[#64748b]">%</span>
                        </div>
                        {actualInvalid && draftRaw.trim() !== '' && (
                          <p className="mt-1 text-xs font-medium text-red-700">
                            Max {formatPctOneDecimal(line.target ?? 100)}
                          </p>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-right tabular-nums font-medium text-[#1e40af]"
                        title="(actual / target) × 100"
                      >
                        {formatPctOneDecimal(scorePct)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#0f172a]">
                        {formatPctOneDecimal(weightScore)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-[#eff6ff] via-[#dbeafe] to-[#bfdbfe]">
                  <td
                    colSpan={6}
                    className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#1e40af]"
                  >
                    Total Weight Score
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-[#0f172a]">
                    {formatPctOneDecimal(
                      liveTotalWeighted ?? assignment.totalWeightedScore,
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className={modalFooter}>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Close
          </button>
          <button
            type="button"
            disabled={isFinal || saving}
            onClick={() => void onSave(assignment)}
            className={btnPrimary}
          >
            {saving ? 'Saving…' : 'Save Actuals'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default ManagerEmployeeKpiScoreModal;

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { HrEmployeeKpiRow } from '../../../types/kpiWorkflow';

type Props = {
  open: boolean;
  row: HrEmployeeKpiRow | null;
  onClose: () => void;
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatPeriod = (start?: string | null, end?: string | null): string => {
  if (!start || !end) return '-';
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const formatPercent = (value: number | null | undefined): string =>
  value != null && Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : '-';

const HrEmployeeKpiModal = ({ open, row, onClose }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || row == null) return null;

  const metadata = [
    ['Employee Name', row.employeeName],
    ['Department', row.departmentName],
    ['Position', row.positionTitle],
    ['KPI Title', row.kpiTitle],
    ['Period', formatPeriod(row.periodStartDate, row.periodEndDate)],
  ];

  return createPortal(
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
        aria-labelledby="hr-kpi-modal-title"
        className="max-h-[min(90vh,920px)] w-full max-w-6xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Employee KPI Details</p>
            <h2 id="hr-kpi-modal-title" className="mt-1 text-xl font-semibold text-slate-950">
              {row.kpiTitle ?? 'KPI Result'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Status: <strong className="text-slate-900">{row.status ?? '-'}</strong>
              {row.finalizedAt ? (
                <>
                  <span className="px-2 text-slate-300">|</span>
                  Finalized: <strong className="text-slate-900">{formatDate(row.finalizedAt)}</strong>
                </>
              ) : null}
              {row.earlyFinalizedReason ? (
                <>
                  <span className="px-2 text-slate-300">|</span>
                  Reason: <strong className="text-slate-900">{row.earlyFinalizedReason}</strong>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-transparent bg-slate-100 text-xl font-semibold leading-none text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-900"
          >
            x
          </button>
        </div>

        <div className="px-6 py-5">
          <section className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
            {metadata.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}:</dt>
                <dd className="mt-1 truncate text-sm font-semibold text-slate-950" title={value ?? '-'}>
                  {value ?? '-'}
                </dd>
              </div>
            ))}
          </section>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-sm">
                <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">KPI</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Target%</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3 text-right">Actual%</th>
                    <th className="px-4 py-3 text-right">Weight %</th>
                    <th className="px-4 py-3 text-right">Score %</th>
                    <th className="px-4 py-3 text-right">Weighted Score%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {row.lines.map((line) => (
                    <tr key={line.kpiFormItemId} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {line.kpiLabel ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{line.kpiCategoryName ?? '-'}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">{formatPercent(line.target)}</td>
                      <td className="px-4 py-3 text-slate-500">{line.unitName ?? '-'}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatPercent(line.actualValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">{formatPercent(line.weight)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-blue-700">
                        {formatPercent(line.score)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        {formatPercent(line.weightedScore)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-blue-50">
                    <td colSpan={7} className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                      Total Weighted Score
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-base font-bold text-blue-700">
                      {formatPercent(row.totalWeightedScore)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default HrEmployeeKpiModal;

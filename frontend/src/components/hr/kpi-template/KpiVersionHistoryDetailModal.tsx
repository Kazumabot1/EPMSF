import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatDateTimeParen } from './kpiTemplateDateFormat';
import type { KpiVersionDetail } from '../../../types/kpiTemplate';

type Props = {
  open: boolean;
  detail: KpiVersionDetail | null;
  loading: boolean;
  onClose: () => void;
};

const rowStatusLabel = (status?: string | null) => {
  if (status === 'INITIAL') return 'Initial';
  if (status === 'UNCHANGED') return 'Unchanged';
  if (status === 'ADDED') return 'Added';
  if (status === 'REMOVED') return 'Removed';
  return 'Changed';
};

const rowStatusClass = (status?: string | null) => {
  const base = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';
  if (status === 'ADDED') return `${base} bg-emerald-50 text-emerald-800 ring-emerald-600/20`;
  if (status === 'REMOVED') return `${base} bg-red-50 text-red-800 ring-red-600/20`;
  if (status === 'INITIAL') return `${base} bg-blue-50 text-blue-800 ring-blue-600/20`;
  return `${base} bg-slate-100 text-slate-700 ring-slate-400/20`;
};

const formatPercent = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value}%`;
};

const KpiVersionHistoryDetailModal = ({ open, detail, loading, onClose }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-version-detail-title"
        className="max-h-[min(92vh,920px)] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_54%,#1e3a8a_100%)] px-6 py-4 shadow-sm shadow-blue-900/10">
          <div className="min-w-0 max-w-[calc(100%-3.5rem)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">View detail</p>
            <h2 id="kpi-version-detail-title" className="mt-1 text-xl font-semibold text-slate-950">
              {detail ? `Version ${detail.versionNumber}` : 'Version detail'}
            </h2>
            {detail && (
              <p className="mt-1 truncate text-sm text-slate-600">
                {detail.templateTitle}
                {detail.positionName ? ` · ${detail.positionName}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/15 text-xl font-semibold leading-none text-white shadow-sm transition hover:bg-white/25"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 px-6 py-10 text-sm text-slate-500">
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
              aria-hidden
            />
            Loading version detail…
          </div>
        )}

        {!loading && detail && (
          <div className="space-y-5 px-6 py-5">
            <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Template</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">{detail.templateTitle}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Position</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">{detail.positionName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Version title</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">{detail.versionTitle}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">{formatDateTimeParen(detail.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Edited</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">{formatDateTimeParen(detail.editedAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Edited by</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">{detail.editedBy ?? '—'}</dd>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-100 px-4 py-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Row changes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Change</th>
                      <th className="px-4 py-3">KPI</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Target%</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3 text-right">Weight%</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {detail.changes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                          No row changes recorded for this version.
                        </td>
                      </tr>
                    ) : (
                      detail.changes.map((change) => {
                        const status =
                          change.rowStatus ??
                          (change.initialVersion ? 'INITIAL' : change.changeType === 'DELETED' ? 'REMOVED' : 'ADDED');
                        const removed = status === 'REMOVED';
                        const added = status === 'ADDED';
                        const row = change.row;
                        return (
                          <tr
                            key={change.historyId}
                            className={
                              removed
                                ? 'bg-red-50/60'
                                : added
                                  ? 'bg-emerald-50/60'
                                  : 'hover:bg-blue-50/40'
                            }
                          >
                            <td className="px-4 py-3">
                              <span className={rowStatusClass(status)}>{rowStatusLabel(status)}</span>
                            </td>
                            <td className={`px-4 py-3 font-semibold text-slate-950 ${removed ? 'line-through opacity-70' : ''}`}>
                              {row?.kpiName ?? '—'}
                            </td>
                            <td className={`px-4 py-3 text-slate-700 ${removed ? 'line-through opacity-70' : ''}`}>
                              {row?.kpiCategoryName ?? '—'}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono tabular-nums text-slate-800 ${removed ? 'line-through opacity-70' : ''}`}>
                              {formatPercent(row?.target)}
                            </td>
                            <td className={`px-4 py-3 text-slate-700 ${removed ? 'line-through opacity-70' : ''}`}>
                              {row?.kpiUnitName ?? '—'}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono tabular-nums text-slate-800 ${removed ? 'line-through opacity-70' : ''}`}>
                              {formatPercent(row?.weight)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{change.reason ?? '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                              {formatDateTimeParen(change.changedAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default KpiVersionHistoryDetailModal;

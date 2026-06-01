import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { formatTemplatePositionLabels, kpiStatusBadgeClass, sumTemplateItemWeights } from './kpiTemplateUi';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import type { KpiTemplateItem, KpiTemplateResponse, KpiVersionDetail } from '../../../types/kpiTemplate';

type Props = {
  open: boolean;
  templateId: number | null;
  onClose: () => void;
};

const formatPercent = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value}%`;
};

const KpiTemplateViewModal = ({ open, templateId, onClose }: Props) => {
  const [template, setTemplate] = useState<KpiTemplateResponse | null>(null);
  const [versionDetail, setVersionDetail] = useState<KpiVersionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || templateId == null) {
      setTemplate(null);
      setVersionDetail(null);
      setError('');
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await kpiTemplateService.getTemplateById(templateId);
        setTemplate(data);
        setVersionDetail(
          (data.version ?? 1) > 1
            ? await kpiTemplateService.getTemplateVersionDetail(templateId, data.version ?? 1)
            : null,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load template.';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, templateId]);

  const sortedItems = useMemo(
    () => (template ? [...template.items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : []),
    [template],
  );

  const addedChanges = versionDetail?.changes.filter((change) => change.rowStatus === 'ADDED') ?? [];
  const removedChanges =
    versionDetail?.changes.filter(
      (change) => change.rowStatus === 'REMOVED' || change.changeType === 'DELETED',
    ) ?? [];

  const isAddedLine = (line: KpiTemplateItem) =>
    addedChanges.some((change) => {
      const row = change.row;
      const name = line.kpiItemName ?? line.kpiLabel ?? null;
      if (row?.itemId != null && line.id != null) {
        return row.itemId === line.id;
      }
      return (
        row != null &&
        row.kpiName === name &&
        row.kpiCategoryId === line.kpiCategoryId &&
        row.kpiCategoryName === line.kpiCategoryName &&
        row.kpiUnitId === line.kpiUnitId &&
        row.kpiUnitName === line.kpiUnitName &&
        row.target === line.target &&
        row.weight === line.weight
      );
    });

  const totalWeight = sumTemplateItemWeights(sortedItems);

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
        aria-labelledby="kpi-template-view-title"
        className="max-h-[min(92vh,920px)] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="border-b border-slate-200 bg-[linear-gradient(to_right,#ffffff_0%,#eff6ff_42%,#1e3a8a_100%)] px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 max-w-[calc(100%-3.5rem)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">View detail</p>
              <h2 id="kpi-template-view-title" className="mt-1 text-xl font-semibold text-slate-950">
                {template?.title ?? 'KPI template'}
              </h2>
              {template && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={kpiStatusBadgeClass(template.status)}>{template.status}</span>
                  <span className="text-xs font-medium text-slate-600">v{template.version ?? 1}</span>
                </div>
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
        </div>

        {loading && (
          <div className="flex items-center gap-3 px-6 py-10 text-sm text-slate-500">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" aria-hidden />
            Loading template…
          </div>
        )}

        {!loading && error && (
          <div className="mx-6 my-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">{error}</div>
        )}

        {!loading && !error && template && (
          <div className="space-y-5 px-6 py-5">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Position(s)</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-950">
                {formatTemplatePositionLabels(template.positions)}
              </dd>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-100 px-4 py-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">KPI definition</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">KPI</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Target%</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="bg-blue-50 px-4 py-3 text-right text-blue-800">Actual%</th>
                      <th className="px-4 py-3 text-right">Weight%</th>
                      <th className="bg-blue-50 px-4 py-3 text-right text-blue-800">Score%</th>
                      <th className="bg-blue-50 px-4 py-3 text-right text-blue-800">Weight Score%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sortedItems.map((line) => {
                      const kpiName = line.kpiItemName ?? line.kpiLabel ?? '—';
                      const added = isAddedLine(line);
                      return (
                        <tr key={line.id ?? `${kpiName}-${line.sortOrder}`} className={added ? 'bg-emerald-50/50' : ''}>
                          <td className="px-4 py-3 font-semibold text-slate-950">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{kpiName}</span>
                              {added && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                                  Added
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{line.kpiCategoryName ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{formatPercent(line.target)}</td>
                          <td className="px-4 py-3 text-slate-700">{line.kpiUnitName ?? '—'}</td>
                          <td className="bg-blue-50/50 px-4 py-3 text-right font-mono text-blue-700/80">—</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                            {formatPercent(line.weight)}
                          </td>
                          <td className="bg-blue-50/50 px-4 py-3 text-right font-mono text-blue-700/80">—</td>
                          <td className="bg-blue-50/50 px-4 py-3 text-right font-mono text-blue-700/80">—</td>
                        </tr>
                      );
                    })}
                    {removedChanges.map((change) => {
                      const row = change.row;
                      if (!row) return null;
                      return (
                        <tr key={`removed-${change.historyId}`} className="bg-red-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-950 line-through opacity-70">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{row.kpiName ?? 'Removed KPI row'}</span>
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800 no-underline">
                                Removed
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700 line-through opacity-70">{row.kpiCategoryName ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums line-through opacity-70">
                            {formatPercent(row.target)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 line-through opacity-70">{row.kpiUnitName ?? '—'}</td>
                          <td className="bg-blue-50/50 px-4 py-3 text-right">—</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums line-through opacity-70">
                            {formatPercent(row.weight)}
                          </td>
                          <td className="bg-blue-50/50 px-4 py-3 text-right">—</td>
                          <td className="bg-blue-50/50 px-4 py-3 text-right">—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                      <td colSpan={5} className="px-4 py-3 text-right text-xs uppercase tracking-wide text-slate-600">
                        Total weight
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-950">{totalWeight}%</td>
                      <td colSpan={2} className="bg-blue-50/60 px-4 py-3 text-right text-xs text-blue-800">
                        Total score — Manager phase
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Actual values and scores are captured when managers assign and evaluate employee KPI forms.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default KpiTemplateViewModal;

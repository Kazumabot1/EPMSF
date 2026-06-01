import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  formatTemplatePositionLabels,
  kpiStatusBadgeClass,
  sumTemplateItemWeights,
} from '../../../components/hr/kpi-template/kpiTemplateUi';
import { formatDateTimeParen } from '../../../components/hr/kpi-template/kpiTemplateDateFormat';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import type { KpiTemplateItem, KpiTemplateResponse, KpiVersionDetail } from '../../../types/kpiTemplate';

const formatPercent = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value}%`;
};

const buttonSecondary =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white/90 px-4 text-sm font-bold text-slate-700 no-underline shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100';

const buttonPrimary =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-700 bg-blue-700 px-4 text-sm font-bold text-white no-underline shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100';

const KpiTemplateDetailPage = () => {
  const { id } = useParams();
  const templateId = id ? Number(id) : NaN;

  const [template, setTemplate] = useState<KpiTemplateResponse | null>(null);
  const [versionDetail, setVersionDetail] = useState<KpiVersionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (Number.isNaN(templateId)) {
        setLoading(false);
        return;
      }

      try {
        const data = await kpiTemplateService.getTemplateById(templateId);
        setTemplate(data);
        setVersionDetail(
          (data.version ?? 1) > 1
            ? await kpiTemplateService.getTemplateVersionDetail(templateId, data.version ?? 1)
            : null,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load KPI template.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [templateId]);

  if (loading) {
    return (
      <div
        className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-28">
          <div className="mb-5 h-16 w-16 animate-pulse rounded-2xl bg-gradient-to-br from-blue-200 to-slate-200 shadow-sm" />
          <p className="text-sm font-semibold text-slate-600">Loading template…</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div
        className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <div className="rounded-2xl border border-red-100 bg-white p-12 shadow-sm">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600">
              <i className="bi bi-file-earmark-x text-2xl" aria-hidden />
            </div>
            <p className="font-semibold text-red-900">Template not found.</p>
            <Link className={`${buttonPrimary} mt-8`} to="/hr/kpi-template">
              <i className="bi bi-arrow-left" aria-hidden />
              Back to list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sortedItems = [...template.items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 pb-16">
        <header className="overflow-hidden rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_54%,#1e3a8a_100%)] px-5 py-5 shadow-sm shadow-blue-900/10 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-blue-100 bg-white/85 text-xl text-blue-800 shadow-sm">
                <i className="bi bi-eye" aria-hidden />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-blue-800">
                  <i className="bi bi-ui-checks-grid text-sm" aria-hidden />
                  KPI Template View
                </span>
                <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
                  {template.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={kpiStatusBadgeClass(template.status)}>{template.status}</span>
                  <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700">
                    v{template.version ?? 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Updated {formatDateTimeParen(template.updatedAt ?? template.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/hr/kpi-template" className={buttonSecondary}>
                <i className="bi bi-list-ul" aria-hidden />
                All templates
              </Link>
              <Link to={`/hr/kpi-template/${template.id}/edit`} className={buttonPrimary}>
                <i className="bi bi-pencil-square" aria-hidden />
                Edit
              </Link>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 border-t border-blue-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-white/85 px-4 py-3 shadow-sm">
              <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <i className="bi bi-people text-blue-700" aria-hidden />
                Positions
              </dt>
              <dd className="mt-1 text-sm font-semibold leading-relaxed text-slate-950">
                {formatTemplatePositionLabels(template.positions)}
              </dd>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white/85 px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Created</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-950">{formatDateTimeParen(template.createdAt)}</dd>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white/85 px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Created by</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-950">{template.createdBy ?? '—'}</dd>
            </div>
          </dl>
        </header>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <i className="bi bi-grid-3x3-gap text-blue-700" aria-hidden />
              KPI definition grid
            </h2>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
              Total weight {totalWeight}%
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">KPI</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5 text-right">Target%</th>
                    <th className="px-4 py-3.5">Unit</th>
                    <th className="bg-blue-50 px-4 py-3.5 text-right text-blue-900">Actual%</th>
                    <th className="px-4 py-3.5 text-right">Weight%</th>
                    <th className="bg-blue-50 px-4 py-3.5 text-right text-blue-900">Score%</th>
                    <th className="bg-blue-50 px-4 py-3.5 text-right text-blue-900">Weighted%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedItems.map((line) => {
                    const kpiName = line.kpiItemName ?? line.kpiLabel ?? '—';
                    const added = isAddedLine(line);
                    return (
                      <tr key={line.id ?? `${kpiName}-${line.sortOrder}`} className={added ? 'bg-emerald-50/60' : 'hover:bg-blue-50/40'}>
                        <td className="px-4 py-3.5 font-semibold text-slate-950">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{kpiName}</span>
                            {added && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                                Added
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{line.kpiCategoryName ?? '—'}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-800">{formatPercent(line.target)}</td>
                        <td className="px-4 py-3.5 text-slate-700">{line.kpiUnitName ?? '—'}</td>
                        <td className="bg-blue-50/50 px-4 py-3.5 text-right text-xs font-medium tabular-nums text-blue-700/75">—</td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-950">{formatPercent(line.weight)}</td>
                        <td className="bg-blue-50/50 px-4 py-3.5 text-right text-xs font-medium tabular-nums text-blue-700/75">—</td>
                        <td className="bg-blue-50/50 px-4 py-3.5 text-right text-xs font-medium tabular-nums text-blue-700/75">—</td>
                      </tr>
                    );
                  })}
                  {removedChanges.map((change) => {
                    const row = change.row;
                    if (!row) return null;
                    return (
                      <tr key={`removed-${change.historyId}`} className="bg-red-50/60">
                        <td className="px-4 py-3.5 font-semibold text-slate-950 line-through opacity-70">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{row.kpiName ?? 'Removed KPI row'}</span>
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
                              Removed
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 line-through opacity-70">{row.kpiCategoryName ?? '—'}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-800 line-through opacity-70">{formatPercent(row.target)}</td>
                        <td className="px-4 py-3.5 text-slate-700 line-through opacity-70">{row.kpiUnitName ?? '—'}</td>
                        <td className="bg-blue-50/50 px-4 py-3.5 text-right text-xs font-medium tabular-nums text-blue-700/75">—</td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-950 line-through opacity-70">{formatPercent(row.weight)}</td>
                        <td className="bg-blue-50/50 px-4 py-3.5 text-right text-xs font-medium tabular-nums text-blue-700/75">—</td>
                        <td className="bg-blue-50/50 px-4 py-3.5 text-right text-xs font-medium tabular-nums text-blue-700/75">—</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td colSpan={5} className="px-4 py-3.5 text-right text-slate-700">
                      Total weight
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-950">{totalWeight}%</td>
                    <td colSpan={2} className="bg-blue-50/50 px-4 py-3.5 text-right text-xs tabular-nums text-blue-700/80">
                      Total score — Manager phase
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="border-t border-slate-100 bg-slate-50/80 px-6 py-3.5 text-xs leading-relaxed text-slate-600">
              <i className="bi bi-info-circle mr-1.5 inline text-blue-700" aria-hidden />
              Actual values and scores are captured when managers assign and evaluate employee KPI forms.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default KpiTemplateDetailPage;

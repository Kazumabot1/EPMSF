import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { kpiStatusBadgeClass } from '../../../components/hr/kpi-template/kpiTemplateUi';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import type { KpiTemplateResponse } from '../../../types/kpiTemplate';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const KpiTemplateDetailPage = () => {
  const { id } = useParams();
  const templateId = id ? Number(id) : NaN;

  const [template, setTemplate] = useState<KpiTemplateResponse | null>(null);
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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [templateId]);

  if (loading) {
    return (
      <div className="kpi-tpl-page">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-28">
          <div className="kpi-tpl-shimmer mb-5 h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-300 to-gray-200" />
          <p className="text-sm font-medium text-gray-600">Loading template…</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="kpi-tpl-page">
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <div className="kpi-tpl-card border-red-100 bg-red-50/50 p-12">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <i className="bi bi-file-earmark-x text-2xl" aria-hidden />
            </div>
            <p className="font-semibold text-red-900">Template not found.</p>
            <Link className="kpi-tpl-btn-primary mt-8 inline-flex no-underline" to="/hr/kpi-template">
              <i className="bi bi-arrow-left" aria-hidden />
              Back to list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sortedItems = [...template.items].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-20">
        <header className="kpi-tpl-card--hero relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-400/15 blur-3xl" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-2xl text-white shadow-lg shadow-teal-900/15 ring-4 ring-teal-500/10">
                <i className="bi bi-eye" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">Preview</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{template.title}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={kpiStatusBadgeClass(template.status)}>{template.status}</span>
                  <span className="text-xs font-medium text-gray-400">v{template.version ?? 1}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/hr/kpi-template" className="kpi-tpl-btn-secondary no-underline">
                <i className="bi bi-list-ul" aria-hidden />
                All templates
              </Link>
              <Link
                to={`/hr/kpi-template/${template.id}/edit`}
                className="kpi-tpl-btn-primary no-underline"
              >
                <i className="bi bi-pencil-square" aria-hidden />
                Edit
              </Link>
            </div>
          </div>

          <dl className="relative mt-10 grid gap-4 border-t border-gray-200/90 pt-10 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50/90 px-5 py-4 ring-1 ring-gray-200/90">
              <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <i className="bi bi-calendar-range text-violet-600" aria-hidden />
                Period
              </dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">
                {formatDate(template.startDate)} — {formatDate(template.endDate)}
              </dd>
            </div>
            <div className="rounded-xl bg-gray-50/90 px-5 py-4 ring-1 ring-gray-200/90 sm:col-span-2">
              <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <i className="bi bi-people text-violet-600" aria-hidden />
                Positions
              </dt>
              <dd className="mt-2 text-sm font-medium leading-relaxed text-gray-800">
                {template.positions.length > 0
                  ? template.positions.map((position) => position.positionTitle).join(' · ')
                  : '—'}
              </dd>
            </div>
          </dl>
        </header>

        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            <i className="bi bi-grid-3x3-gap text-violet-600" aria-hidden />
            KPI definition grid
          </h2>
          <div className="kpi-tpl-card overflow-hidden p-0">
            <div className="kpi-tpl-table-wrap">
              <div className="overflow-x-auto">
                <table className="min-w-[960px] w-full border-collapse text-left text-sm">
                  <thead className="kpi-tpl-thead">
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3.5">KPI</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Target</th>
                      <th className="px-4 py-3.5">Unit</th>
                      <th className="bg-violet-50 px-4 py-3.5 text-violet-900">Actual</th>
                      <th className="px-4 py-3.5">Weight %</th>
                      <th className="bg-violet-50 px-4 py-3.5 text-violet-900">Score %</th>
                      <th className="bg-violet-50 px-4 py-3.5 text-violet-900">Weighted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sortedItems.map((line) => {
                      const kpiName = line.kpiItemName ?? line.kpiLabel ?? '—';
                      return (
                        <tr key={line.id ?? `${kpiName}-${line.sortOrder}`} className="hover:bg-violet-50/25">
                          <td className="px-4 py-3.5 font-semibold text-gray-900">{kpiName}</td>
                          <td className="px-4 py-3.5 text-gray-700">{line.kpiCategoryName ?? '—'}</td>
                          <td className="px-4 py-3.5 tabular-nums text-gray-800">{line.target ?? '—'}</td>
                          <td className="px-4 py-3.5 text-gray-700">{line.kpiUnitName ?? '—'}</td>
                          <td className="bg-violet-50/50 px-4 py-3.5 text-center text-xs font-medium text-violet-600/75">
                            —
                          </td>
                          <td className="px-4 py-3.5 font-bold tabular-nums text-gray-900">{line.weight ?? '—'}</td>
                          <td className="bg-violet-50/50 px-4 py-3.5 text-center text-xs font-medium text-violet-600/75">
                            —
                          </td>
                          <td className="bg-violet-50/50 px-4 py-3.5 text-center text-xs font-medium text-violet-600/75">
                            —
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="border-t border-gray-100 bg-gray-50/80 px-6 py-3.5 text-xs leading-relaxed text-gray-600">
              <i className="bi bi-info-circle mr-1.5 inline text-violet-600" aria-hidden />
              Actual values and scores are captured when PM assigns and evaluates employee KPI forms.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default KpiTemplateDetailPage;

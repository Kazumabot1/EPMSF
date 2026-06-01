import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import KpiVersionHistoryDetailModal from '../../../components/hr/kpi-template/KpiVersionHistoryDetailModal';
import { formatDateTimeParen } from '../../../components/hr/kpi-template/kpiTemplateDateFormat';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import type { KpiTemplateResponse, KpiVersionDetail, KpiVersionSummary } from '../../../types/kpiTemplate';

const PAGE_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const KpiVersionHistoryPage = () => {
  const [templates, setTemplates] = useState<KpiTemplateResponse[]>([]);
  const [versions, setVersions] = useState<KpiVersionSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<KpiVersionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [templateRows, historyRows] = await Promise.all([
          kpiTemplateService.getAllTemplates(),
          kpiTemplateService.getVersionHistory(),
        ]);
        setTemplates(templateRows);
        setVersions(historyRows);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load KPI version history.');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return versions.filter((version) => {
      const matchesTemplate = selectedTemplateId === '' || version.templateId === selectedTemplateId;
      const text = `Version ${version.versionNumber} ${version.versionTitle} ${version.templateTitle} ${version.positionName ?? ''}`.toLowerCase();
      return matchesTemplate && (!q || text.includes(q));
    });
  }, [query, selectedTemplateId, versions]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedTemplateId, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const openDetail = async (version: KpiVersionSummary) => {
    setDetailOpen(true);
    setDetail(null);
    try {
      setDetailLoading(true);
      setDetail(await kpiTemplateService.getTemplateVersionDetail(version.templateId, version.versionNumber));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load version detail.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
  };

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 pb-16">
        <header className="rounded-2xl border border-blue-100 bg-[radial-gradient(circle_at_92%_18%,rgba(255,255,255,0.22),transparent_13rem),linear-gradient(135deg,#ffffff_0%,#eff6ff_56%,#1e3a8a_100%)] px-5 py-4 shadow-sm shadow-blue-900/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.05em] text-blue-700">
                <i className="bi bi-clock-history text-sm" aria-hidden />
                KPI Management
              </span>
              <h1 className="text-2xl font-bold leading-tight text-slate-950">KPI Version History</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Review KPI template versions created when HR adds or removes KPI rows.
              </p>
            </div>
            {!loading && (
              <div className="shrink-0 rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-center shadow-sm">
                <strong className="block text-2xl font-bold tabular-nums leading-none text-slate-950">
                  {filtered.length}
                </strong>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Versions
                </span>
              </div>
            )}
          </div>
        </header>

        <section
          className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          aria-label="Version history filters"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              KPI template
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value ? Number(event.target.value) : '')}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">All KPI templates</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Search
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Version title or position…"
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-1">
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 lg:min-w-[120px]"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {loading && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            <span className="animate-pulse">Loading version history…</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
            <i
              className="bi bi-clock-history grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-xl text-blue-700"
              aria-hidden
            />
            <div>
              <strong className="block text-slate-950">No KPI version history found</strong>
              <p className="mt-1 text-sm text-slate-500">Try adjusting your template filter or search terms.</p>
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Version</th>
                      <th className="px-4 py-3">Template</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">Edited date</th>
                      <th className="px-4 py-3">Edited by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginated.map((version) => (
                      <tr
                        key={`${version.templateId}-${version.versionNumber}`}
                        tabIndex={0}
                        role="button"
                        onClick={() => void openDetail(version)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            void openDetail(version);
                          }
                        }}
                        className="cursor-pointer transition hover:bg-blue-50/70 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      >
                        <td className="px-4 py-3">
                          <span className="font-bold text-blue-700">Version {version.versionNumber}</span>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {version.versionNumber === 1
                              ? 'Initial collection'
                              : `${version.changeCount} row change(s)`}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-950">{version.templateTitle}</td>
                        <td className="px-4 py-3 text-slate-700">{version.positionName ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                          {formatDateTimeParen(version.editedAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{version.editedBy ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing <strong className="text-slate-900">{rangeStart}</strong>–
                <strong className="text-slate-900">{rangeEnd}</strong> of{' '}
                <strong className="text-slate-900">{filtered.length}</strong>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2 text-sm font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      <KpiVersionHistoryDetailModal
        open={detailOpen}
        detail={detail}
        loading={detailLoading}
        onClose={closeDetail}
      />
    </div>
  );
};

export default KpiVersionHistoryPage;

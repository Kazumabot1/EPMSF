import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/ConfirmModal';
import '../../../components/hr/kpi-template/kpi-template.css';
import {
  formatTemplatePositionLabels,
  kpiStatusBadgeClass,
} from '../../../components/hr/kpi-template/kpiTemplateUi';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import { kpiTemplateCycleService } from '../../../services/kpiTemplateCycleService';
import type { KpiTemplateResponse } from '../../../types/kpiTemplate';

const KpiTemplateListPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<KpiTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [templateToArchive, setTemplateToArchive] = useState<KpiTemplateResponse | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [activeCycleTemplateIds, setActiveCycleTemplateIds] = useState<Set<number>>(new Set());

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await kpiTemplateService.getAllTemplates();
      setTemplates(data);
      try {
        const cycles = await kpiTemplateCycleService.list();
        setActiveCycleTemplateIds(new Set(
          cycles
            .filter((cycle) => cycle.status === 'ACTIVE' || cycle.status === 'CLOSING')
            .flatMap((cycle) => cycle.kpiForms.map((form) => form.id)),
        ));
      } catch {
        setActiveCycleTemplateIds(new Set());
        toast.error('Could not load active KPI Template Cycle status.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...templates].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    if (!q) {
      return list;
    }
    return list.filter((template) => {
      const positionText = formatTemplatePositionLabels(template.positions).toLowerCase();
      return template.title.toLowerCase().includes(q) || positionText.includes(q);
    });
  }, [query, templates]);

  const handleArchiveConfirm = async () => {
    if (!templateToArchive) {
      return;
    }
    try {
      setArchiving(true);
      await kpiTemplateService.deleteTemplate(templateToArchive.id);
      toast.success('Template archived.');
      setTemplateToArchive(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setArchiving(false);
    }
  };

  const handleArchiveCancel = () => {
    if (archiving) {
      return;
    }
    setTemplateToArchive(null);
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-20">
        <header className="kpi-tpl-card--hero relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-3xl text-white shadow-lg shadow-blue-900/25 ring-4 ring-blue-500/15">
                <i className="bi bi-ui-checks-grid" aria-hidden />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700/90">
                  Human Resources
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  KPI templates
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Define KPI rows per position (KPI, category, target, unit, weight). Managers enter actuals and
                  scores later; employees view completed forms.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
              <button type="button" onClick={() => void load()} className="kpi-tpl-btn-secondary">
                <i className="bi bi-arrow-clockwise text-base text-gray-500" aria-hidden />
                Refresh
              </button>
              <Link to="/hr/kpi-template/new" className="kpi-tpl-btn-primary no-underline">
                <i className="bi bi-plus-lg text-lg" aria-hidden />
                New template
              </Link>
            </div>
          </div>

          {!loading && !error && (
            <div className="relative mt-8 flex flex-wrap gap-3 border-t border-gray-200/80 pt-8">
              <div className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200/90">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                  <i className="bi bi-stack" aria-hidden />
                </span>
                <span className="tabular-nums text-gray-900">{filtered.length}</span>
                <span className="font-medium text-gray-500">templates</span>
              </div>
            </div>
          )}
        </header>

        <section className="mt-10">
          {!loading && !error && templates.length > 0 && (
            <div className="mb-4">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title or position…"
                className="kpi-tpl-input w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
                aria-label="Search templates"
              />
            </div>
          )}

          {loading && (
            <div className="kpi-tpl-card p-12 sm:p-16">
              <div className="flex flex-col items-center justify-center gap-5 py-6">
                <div className="kpi-tpl-shimmer h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-200 to-gray-200" />
                <p className="text-sm font-medium text-gray-600">Loading templates…</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="kpi-tpl-card border-red-200 bg-red-50/80 p-10 text-center">
              <p className="font-semibold text-red-900">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-5 text-sm font-semibold text-red-800 underline-offset-4 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="kpi-tpl-card px-6 py-16 text-center sm:px-12 sm:py-20">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                {templates.length === 0 ? 'No templates yet' : 'No matching templates'}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-600">
                {templates.length === 0
                  ? 'Create a KPI template and link it to a position. One template per position.'
                  : 'Try a different search term.'}
              </p>
              {templates.length === 0 && (
                <Link to="/hr/kpi-template/new" className="kpi-tpl-btn-primary mt-8 inline-flex no-underline">
                  <i className="bi bi-plus-circle text-lg" aria-hidden />
                  Create template
                </Link>
              )}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="kpi-tpl-card overflow-hidden p-0">
              <div className="kpi-tpl-table-wrap">
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full border-collapse text-left text-sm">
                    <thead className="kpi-tpl-thead">
                      <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <th className="px-5 py-4">Template</th>
                        <th className="px-5 py-4">Position</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filtered.map((template) => {
                        const lockedByActiveCycle = activeCycleTemplateIds.has(template.id);
                        return (
                          <tr key={template.id} className="transition-colors hover:bg-blue-50/50">
                            <td className="px-5 py-4">
                              <p className="font-semibold text-gray-900">{template.title}</p>
                              <p className="mt-0.5 text-xs text-gray-500">Version {template.version ?? 1}</p>
                            </td>
                            <td className="max-w-[220px] px-5 py-4 text-gray-700">
                              {formatTemplatePositionLabels(template.positions)}
                            </td>
                            <td className="px-5 py-4">
                              <span className={kpiStatusBadgeClass(template.status)}>{template.status}</span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/hr/kpi-template/${template.id}`)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-gray-500 transition hover:border-gray-200 hover:bg-white hover:text-blue-700 hover:shadow-sm"
                                  title="View"
                                  aria-label="View"
                                >
                                  <i className="bi bi-eye text-lg" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!lockedByActiveCycle) {
                                      navigate(`/hr/kpi-template/${template.id}/edit`);
                                    }
                                  }}
                                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-gray-500 transition hover:border-gray-200 hover:bg-white hover:text-blue-700 hover:shadow-sm ${
                                    lockedByActiveCycle ? 'kpi-tpl-edit-muted' : ''
                                  }`}
                                  title={lockedByActiveCycle ? 'Template is active in a KPI Template Cycle' : 'Edit'}
                                  aria-label={lockedByActiveCycle ? 'Editing muted because template is active in a KPI Template Cycle' : 'Edit'}
                                >
                                  <i className="bi bi-pencil-square text-lg" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!lockedByActiveCycle) {
                                      setTemplateToArchive(template);
                                    }
                                  }}
                                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 ${
                                    lockedByActiveCycle ? 'kpi-tpl-delete-muted' : ''
                                  }`}
                                  title={lockedByActiveCycle ? 'Template is active in a KPI Template Cycle' : 'Delete'}
                                  aria-label={lockedByActiveCycle ? 'Delete muted because template is active in a KPI Template Cycle' : 'Delete'}
                                >
                                  <i className="bi bi-trash text-lg" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      <ConfirmModal
        open={templateToArchive !== null}
        title="Archive KPI template"
        message={`This will soft delete "${templateToArchive?.title ?? ''}" by marking it as archived. It will remain in records but cannot be used in KPI template cycles.`}
        confirmText="Archive"
        cancelText="Cancel"
        loading={archiving}
        onConfirm={() => void handleArchiveConfirm()}
        onCancel={handleArchiveCancel}
      />
    </div>
  );
};

export default KpiTemplateListPage;

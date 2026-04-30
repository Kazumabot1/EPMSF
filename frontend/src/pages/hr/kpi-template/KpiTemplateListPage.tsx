import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { kpiStatusBadgeClass } from '../../../components/hr/kpi-template/kpiTemplateUi';
import KpiTemplateCreateModal from '../../../components/hr/kpi-template/KpiTemplateCreateModal';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import type { KpiTemplateResponse } from '../../../types/kpiTemplate';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const KpiTemplateListPage = () => {
  const [templates, setTemplates] = useState<KpiTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await kpiTemplateService.getAllTemplates();
      setTemplates(data);
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

  const sorted = useMemo(
    () => [...templates].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [templates],
  );

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete KPI template "${title}"?`)) {
      return;
    }
    try {
      await kpiTemplateService.deleteTemplate(id);
      toast.success('Template deleted.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const openCreate = () => {
    setModalMode('create');
    setSelectedTemplateId(null);
    setCreateOpen(true);
  };

  const openView = (id: number) => {
    setModalMode('view');
    setSelectedTemplateId(id);
    setCreateOpen(true);
  };

  const openEdit = (id: number) => {
    setModalMode('edit');
    setSelectedTemplateId(id);
    setCreateOpen(true);
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-20">
        <header className="kpi-tpl-card--hero relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/4 h-56 w-56 rounded-full bg-indigo-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-3xl text-white shadow-lg shadow-violet-900/25 ring-4 ring-violet-500/15">
                <i className="bi bi-ui-checks-grid" aria-hidden />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-700/90">
                  Human Resources
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  KPI templates
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Define reusable KPI structures by position. Weights must sum to{' '}
                  <strong className="font-semibold text-gray-900">100%</strong> before going ACTIVE or FINALIZED.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
              <button type="button" onClick={() => void load()} className="kpi-tpl-btn-secondary">
                <i className="bi bi-arrow-clockwise text-base text-gray-500" aria-hidden />
                Refresh
              </button>
              <button type="button" onClick={openCreate} className="kpi-tpl-btn-primary">
                <i className="bi bi-plus-lg text-lg" aria-hidden />
                New template
              </button>
            </div>
          </div>

          {!loading && !error && (
            <div className="relative mt-8 flex flex-wrap gap-3 border-t border-gray-200/80 pt-8">
              <div className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200/90">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                  <i className="bi bi-stack" aria-hidden />
                </span>
                <span className="tabular-nums text-gray-900">{sorted.length}</span>
                <span className="font-medium text-gray-500">templates</span>
              </div>
            </div>
          )}
        </header>

        <section className="mt-10">
          {loading && (
            <div className="kpi-tpl-card p-12 sm:p-16">
              <div className="flex flex-col items-center justify-center gap-5 py-6">
                <div className="kpi-tpl-shimmer h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-200 to-gray-200" />
                <p className="text-sm font-medium text-gray-600">Loading templates…</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="kpi-tpl-card border-red-200 bg-red-50/80 p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <i className="bi bi-exclamation-triangle text-2xl" aria-hidden />
              </div>
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

          {!loading && !error && sorted.length === 0 && (
            <div className="kpi-tpl-card px-6 py-16 text-center sm:px-12 sm:py-20">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-gray-100 text-5xl text-violet-400 shadow-inner ring-1 ring-violet-200/60">
                <i className="bi bi-inboxes" aria-hidden />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">No templates yet</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-600">
                Create your first KPI template to attach metrics to job positions and kick off PM assignments later.
              </p>
              <button type="button" onClick={openCreate} className="kpi-tpl-btn-primary mt-8 inline-flex">
                <i className="bi bi-plus-circle text-lg" aria-hidden />
                Create template
              </button>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            <div className="kpi-tpl-card overflow-hidden p-0">
              <div className="kpi-tpl-table-wrap">
                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full border-collapse text-left text-sm">
                    <thead className="kpi-tpl-thead">
                      <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <th className="px-5 py-4">Template</th>
                        <th className="px-5 py-4">Period</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {sorted.map((template) => (
                        <tr key={template.id} className="transition-colors hover:bg-violet-50/50">
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-violet-700 ring-1 ring-gray-200/80">
                                <i className="bi bi-file-earmark-text text-lg" aria-hidden />
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">{template.title}</p>
                                <p className="mt-0.5 text-xs text-gray-500">Version {template.version ?? 1}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-700">
                            <div className="flex flex-col gap-1.5">
                              <span className="inline-flex items-center gap-2 text-xs text-gray-600">
                                <i className="bi bi-calendar-event text-gray-400" aria-hidden />
                                {formatDate(template.startDate)}
                              </span>
                              <span className="inline-flex items-center gap-2 text-xs text-gray-600">
                                <i className="bi bi-calendar-check text-gray-400" aria-hidden />
                                {formatDate(template.endDate)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={kpiStatusBadgeClass(template.status)}>{template.status}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openView(template.id)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-gray-500 transition hover:border-gray-200 hover:bg-white hover:text-violet-700 hover:shadow-sm"
                                title="View"
                                aria-label="View"
                              >
                                <i className="bi bi-eye text-lg" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(template.id)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-gray-500 transition hover:border-gray-200 hover:bg-white hover:text-violet-700 hover:shadow-sm"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <i className="bi bi-pencil-square text-lg" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(template.id, template.title)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                title="Delete"
                                aria-label="Delete"
                              >
                                <i className="bi bi-trash text-lg" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      <KpiTemplateCreateModal
        open={createOpen}
        mode={modalMode}
        templateId={selectedTemplateId}
        onClose={() => setCreateOpen(false)}
        onSaved={load}
      />
    </div>
  );
};

export default KpiTemplateListPage;

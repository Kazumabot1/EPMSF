import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import KpiTemplateCycleViewModal from '../../../components/hr/kpi-template/KpiTemplateCycleViewModal';
import { kpiTemplateCycleService } from '../../../services/kpiTemplateCycleService';
import type { KpiTemplateCycleResponse } from '../../../types/kpiTemplateCycle';

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const KpiTemplateCycleListPage = () => {
  const [cycles, setCycles] = useState<KpiTemplateCycleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewCycleId, setViewCycleId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await kpiTemplateCycleService.list();
      setCycles(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cycles.';
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
    () => [...cycles].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [cycles],
  );

  const handleToggleActive = async (cycle: KpiTemplateCycleResponse) => {
    const nextActive = cycle.status !== 'ACTIVE';
    try {
      setTogglingId(cycle.id);
      await kpiTemplateCycleService.updateStatus(cycle.id, nextActive);
      toast.success(nextActive ? 'Cycle activated.' : 'Cycle deactivated.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-7xl px-4 py-8 pb-20">
        <header className="kpi-tpl-card--hero relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-3xl text-white shadow-lg shadow-violet-900/25 ring-4 ring-violet-500/15">
                <i className="bi bi-arrow-repeat" aria-hidden />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-700/90">Human Resources</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">KPI template cycles</h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Group KPI forms into evaluation periods with start dates and configurable durations.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
              <button type="button" onClick={() => void load()} className="kpi-tpl-btn-secondary">
                <i className="bi bi-arrow-clockwise text-base text-gray-500" aria-hidden />
                Refresh
              </button>
              <Link to="/hr/kpi-template-cycle/new" className="kpi-tpl-btn-primary no-underline">
                <i className="bi bi-plus-lg text-lg" aria-hidden />
                New cycle
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-10">
          {loading && (
            <div className="kpi-tpl-card p-12 text-center text-sm font-medium text-gray-600">Loading cycles…</div>
          )}

          {error && !loading && (
            <div className="kpi-tpl-card border-red-200 bg-red-50/80 p-10 text-center">
              <p className="font-semibold text-red-900">{error}</p>
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="kpi-tpl-card px-6 py-16 text-center">
              <h2 className="text-xl font-bold text-gray-900">No cycles yet</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-gray-600">
                Create a cycle to schedule KPI forms across a defined evaluation window.
              </p>
              <Link to="/hr/kpi-template-cycle/new" className="kpi-tpl-btn-primary mt-8 inline-flex no-underline">
                Create cycle
              </Link>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            <div className="kpi-tpl-card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
                  <thead className="kpi-tpl-thead">
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-4 w-12">No.</th>
                      <th className="px-4 py-4">KPI Cycle Name</th>
                      <th className="px-4 py-4">Start Date</th>
                      <th className="px-4 py-4">End Date</th>
                      <th className="px-4 py-4">Duration</th>
                      <th className="px-4 py-4">Selected KPI Form Names</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sorted.map((cycle, index) => (
                      <tr key={cycle.id} className="transition-colors hover:bg-violet-50/50">
                        <td className="px-4 py-4 tabular-nums text-gray-600">{index + 1}</td>
                        <td className="px-4 py-4 font-semibold text-gray-900">{cycle.cycleName}</td>
                        <td className="px-4 py-4 text-gray-700">{formatDate(cycle.startDate)}</td>
                        <td className="px-4 py-4 text-gray-700">{formatDate(cycle.endDate)}</td>
                        <td className="px-4 py-4 text-gray-700">{cycle.durationLabel}</td>
                        <td className="px-4 py-4 text-gray-700">
                          <p className="max-w-xs truncate" title={cycle.kpiForms.map((f) => f.title).join(', ')}>
                            {cycle.kpiForms.length > 0
                              ? cycle.kpiForms.map((f) => f.title).join(', ')
                              : '—'}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setViewCycleId(cycle.id)}
                              className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              View
                            </button>
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
                              <span>{cycle.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span>
                              <span className="relative inline-flex h-6 w-11 shrink-0">
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={cycle.status === 'ACTIVE'}
                                  disabled={togglingId === cycle.id}
                                  onChange={() => void handleToggleActive(cycle)}
                                />
                                <span className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-emerald-500 peer-disabled:opacity-50" />
                                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                              </span>
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <KpiTemplateCycleViewModal
        open={viewCycleId != null}
        cycleId={viewCycleId}
        onClose={() => setViewCycleId(null)}
      />
    </div>
  );
};

export default KpiTemplateCycleListPage;

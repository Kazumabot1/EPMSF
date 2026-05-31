import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import KpiTemplateCycleViewModal from '../../../components/hr/kpi-template/KpiTemplateCycleViewModal';
import { kpiTemplateCycleService } from '../../../services/kpiTemplateCycleService';
import type {
  KpiCycleActivationReadiness,
  KpiGraceExtension,
  KpiTemplateCycleResponse,
} from '../../../types/kpiTemplateCycle';

const graceOptions: Array<{ value: KpiGraceExtension; label: string }> = [
  { value: 'ONE_WEEK', label: '1 week' },
  { value: 'TWO_WEEKS', label: '2 weeks' },
  { value: 'THREE_WEEKS', label: '3 weeks' },
  { value: 'ONE_MONTH', label: '1 month' },
];

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const statusLabel = (cycle: KpiTemplateCycleResponse) => {
  if (cycle.status === 'PENDING_APPROVAL') return 'Pending approval';
  if (cycle.status === 'CLOSING') return 'Closing';
  if (cycle.status === 'ACTIVE') return 'Active';
  if (cycle.status === 'DEACTIVATED') return 'Inactive';
  return 'Draft';
};

const graceLabel = (value: KpiGraceExtension | null | undefined) =>
  graceOptions.find((option) => option.value === value)?.label ?? '—';

const isBeforeOfficialEndDate = (cycle: KpiTemplateCycleResponse) => {
  const endValue = cycle.currentPeriodEndDate ?? cycle.endDate;
  if (!endValue) return false;
  const end = new Date(endValue);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return today < end;
};

const KpiTemplateCycleListPage = () => {
  const [cycles, setCycles] = useState<KpiTemplateCycleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewCycleId, setViewCycleId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [closeCycle, setCloseCycle] = useState<KpiTemplateCycleResponse | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [graceExtension, setGraceExtension] = useState<KpiGraceExtension>('ONE_WEEK');
  const [activationReadiness, setActivationReadiness] = useState<KpiCycleActivationReadiness | null>(null);

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
    if (!nextActive && isBeforeOfficialEndDate(cycle)) {
      setCloseCycle(cycle);
      setCloseReason('');
      setGraceExtension('ONE_WEEK');
      return;
    }
    if (nextActive) {
      try {
        setTogglingId(cycle.id);
        const readiness = await kpiTemplateCycleService.activationReadiness(cycle.id);
        if (!readiness.ready) {
          setActivationReadiness(readiness);
          return;
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Activation readiness check failed.');
        return;
      } finally {
        setTogglingId(null);
      }
    }
    try {
      setTogglingId(cycle.id);
      await kpiTemplateCycleService.updateStatus(cycle.id, nextActive);
      toast.success(nextActive ? 'Cycle activated.' : 'Cycle closing grace started.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setTogglingId(null);
    }
  };

  const submitEarlyCloseRequest = async () => {
    if (!closeCycle) return;
    if (!closeReason.trim()) {
      toast.error('Reason is required.');
      return;
    }
    try {
      setTogglingId(closeCycle.id);
      await kpiTemplateCycleService.updateStatus(closeCycle.id, {
        active: false,
        reason: closeReason.trim(),
        graceExtension,
      });
      toast.success('KPI close request sent to CEO.');
      setCloseCycle(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to request early close.');
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
                    {sorted.map((cycle, index) => {
                      const locked = cycle.status === 'PENDING_APPROVAL';
                      return (
                      <tr
                        key={cycle.id}
                        className={`transition-colors hover:bg-violet-50/50 ${locked ? 'bg-gray-50 opacity-65' : ''}`}
                      >
                        <td className="px-4 py-4 tabular-nums text-gray-600">{index + 1}</td>
                        <td className="px-4 py-4 font-semibold text-gray-900">
                          {cycle.cycleName}
                          {cycle.status === 'PENDING_APPROVAL' && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              CEO approval pending - {graceLabel(cycle.graceExtension)} grace requested
                            </p>
                          )}
                          {cycle.status === 'ACTIVE' && cycle.earlyCloseReviewDecision === 'REJECTED' && cycle.earlyCloseReviewReason && (
                            <p className="mt-1 text-xs font-semibold text-red-700">
                              CEO rejected early close: {cycle.earlyCloseReviewReason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {formatDate(cycle.currentPeriodStartDate ?? cycle.startDate)}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {formatDate(cycle.currentPeriodEndDate ?? cycle.endDate)}
                          {cycle.status === 'CLOSING' && cycle.graceEndsAt && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              Grace until {formatDate(cycle.graceEndsAt)}
                            </p>
                          )}
                        </td>
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
                            {cycle.status === 'ACTIVE' ? (
                              <span
                                className="inline-flex h-9 cursor-not-allowed items-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-400 opacity-50"
                                title="Active cycles cannot be edited"
                              >
                                Edit
                              </span>
                            ) : (
                              <Link
                                to={`/hr/kpi-template-cycle/${cycle.id}/edit`}
                                className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 no-underline hover:bg-gray-50"
                              >
                                Edit
                              </Link>
                            )}
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
                              <span>{statusLabel(cycle)}</span>
                              <span className="relative inline-flex h-6 w-11 shrink-0">
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={cycle.status === 'ACTIVE' || cycle.status === 'CLOSING' || cycle.status === 'PENDING_APPROVAL'}
                                  disabled={togglingId === cycle.id || cycle.status === 'CLOSING' || cycle.status === 'PENDING_APPROVAL'}
                                  onChange={() => void handleToggleActive(cycle)}
                                />
                                <span className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-emerald-500 peer-disabled:opacity-50" />
                                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                              </span>
                            </label>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
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

      {activationReadiness && (
        <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
          <div className="kpi-tpl-reason-modal max-w-3xl">
            <div className="kpi-tpl-modal-header">
              <div>
                <p className="kpi-tpl-modal-kicker">Activation blocked</p>
                <h2>Unassigned KPI evaluators</h2>
              </div>
              <button type="button" className="kpi-tpl-icon-btn" onClick={() => setActivationReadiness(null)}>
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="kpi-tpl-modal-body space-y-4">
              <p className="text-sm leading-6 text-gray-600">
                {activationReadiness.cycleName} cannot be activated until every target employee has a KPI evaluator.
                Fix organization setup or assign evaluators manually after applying templates.
              </p>
              {activationReadiness.blockingIssues.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                  {activationReadiness.blockingIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
              {activationReadiness.unassignedEvaluators.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-amber-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-amber-50 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      <tr>
                        <th className="px-3 py-2">Employee</th>
                        <th className="px-3 py-2">Department</th>
                        <th className="px-3 py-2">Position</th>
                        <th className="px-3 py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 bg-white">
                      {activationReadiness.unassignedEvaluators.map((row) => (
                        <tr key={row.employeeId}>
                          <td className="px-3 py-2 font-medium text-gray-900">{row.employeeName}</td>
                          <td className="px-3 py-2 text-gray-700">{row.departmentName}</td>
                          <td className="px-3 py-2 text-gray-700">{row.positionTitle}</td>
                          <td className="px-3 py-2 text-gray-600">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="kpi-tpl-modal-footer kpi-tpl-reason-footer">
              <button type="button" className="kpi-tpl-btn-primary" onClick={() => setActivationReadiness(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {closeCycle && (
        <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
          <div className="kpi-tpl-reason-modal">
            <div className="kpi-tpl-modal-header">
              <div>
                <p className="kpi-tpl-modal-kicker">CEO approval required</p>
                <h2>Request early KPI cycle close</h2>
              </div>
              <button type="button" className="kpi-tpl-icon-btn" onClick={() => setCloseCycle(null)}>
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="kpi-tpl-modal-body space-y-4">
              <p className="text-sm leading-6 text-gray-600">
                {closeCycle.cycleName} ends on {formatDate(closeCycle.currentPeriodEndDate ?? closeCycle.endDate)}.
                Add a reason and grace period for in-progress forms before sending this to CEO.
              </p>
              <label className="grid gap-2 text-sm font-semibold text-gray-700">
                Reason
                <textarea
                  value={closeReason}
                  onChange={(event) => setCloseReason(event.target.value)}
                  rows={5}
                  maxLength={1000}
                  className="rounded-lg border border-gray-200 p-3 text-sm font-normal text-gray-800 outline-none focus:border-violet-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-gray-700">
                Grace Period Extension
                <select
                  value={graceExtension}
                  onChange={(event) => setGraceExtension(event.target.value as KpiGraceExtension)}
                  className="rounded-lg border border-gray-200 p-3 text-sm font-normal text-gray-800 outline-none focus:border-violet-500"
                >
                  {graceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="kpi-tpl-modal-footer kpi-tpl-reason-footer">
              <button type="button" className="kpi-tpl-btn-secondary" onClick={() => setCloseCycle(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="kpi-tpl-btn-primary"
                disabled={togglingId === closeCycle.id}
                onClick={() => void submitEarlyCloseRequest()}
              >
                Send to CEO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiTemplateCycleListPage;

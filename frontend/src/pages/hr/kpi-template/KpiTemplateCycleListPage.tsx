import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import KpiTemplateCycleViewModal from '../../../components/hr/kpi-template/KpiTemplateCycleViewModal';
import { formatDate } from '../../../components/hr/kpi-template/kpiTemplateDateFormat';
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

const statusLabel = (cycle: KpiTemplateCycleResponse) => {
  if (cycle.status === 'PENDING_APPROVAL') return 'Pending approval';
  if (cycle.status === 'CLOSING') return 'Closing';
  if (cycle.status === 'CLOSED') return 'Closed';
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

const stopRowOpen = (event: SyntheticEvent) => {
  event.stopPropagation();
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

  useEffect(() => {
    if (!activationReadiness && !closeCycle) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activationReadiness) setActivationReadiness(null);
        if (closeCycle) setCloseCycle(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activationReadiness, closeCycle]);

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
      toast.success('KPI close request sent to HR Admin.');
      setCloseCycle(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to request early close.');
    } finally {
      setTogglingId(null);
    }
  };

  const openCycleDetail = (cycleId: number) => setViewCycleId(cycleId);

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 pb-16">
        <header className="rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_92%_16%,rgba(37,99,235,0.1),transparent_14rem),linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.05em] text-blue-700">
                <i className="bi bi-arrow-repeat text-sm" aria-hidden />
                KPI Management
              </span>
              <h1 className="text-2xl font-bold leading-tight text-slate-950">KPI template cycles</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Group KPI forms into evaluation periods with start dates and configurable durations.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:justify-end">
              {!loading && (
                <div className="shrink-0 rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-center shadow-sm">
                  <strong className="block text-2xl font-bold tabular-nums leading-none text-slate-950">
                    {sorted.length}
                  </strong>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cycles
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void load()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                >
                  <i className="bi bi-arrow-clockwise text-base text-slate-400" aria-hidden />
                  Refresh
                </button>
                <Link
                  to="/hr/kpi-template-cycle/new"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-4 text-sm font-bold text-blue-700 no-underline shadow-sm transition hover:border-blue-300 hover:from-blue-50 hover:to-blue-100"
                >
                  <i className="bi bi-plus-lg text-lg" aria-hidden />
                  New cycle
                </Link>
              </div>
            </div>
          </div>
        </header>

        {loading && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            <span className="animate-pulse">Loading cycles…</span>
          </div>
        )}

        {error && !loading && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <i className="bi bi-exclamation-triangle grid h-10 w-10 place-items-center rounded-lg bg-red-100 text-xl text-red-700" aria-hidden />
            <div>
              <strong className="block text-slate-950">Could not load cycles</strong>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <i className="bi bi-arrow-repeat mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700" aria-hidden />
            <h2 className="text-xl font-bold text-slate-950">No cycles yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Create a cycle to schedule KPI forms across a defined evaluation window.
            </p>
            <Link
              to="/hr/kpi-template-cycle/new"
              className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-4 text-sm font-bold text-blue-700 no-underline shadow-sm transition hover:border-blue-300 hover:from-blue-50 hover:to-blue-100"
            >
              Create cycle
            </Link>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="w-12 px-4 py-3">No.</th>
                      <th className="px-4 py-3">KPI Cycle Name</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">End Date</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Selected KPI Form Names</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sorted.map((cycle, index) => {
                      const locked = cycle.status === 'PENDING_APPROVAL';
                      return (
                        <tr
                          key={cycle.id}
                          tabIndex={0}
                          role="button"
                          onClick={() => openCycleDetail(cycle.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openCycleDetail(cycle.id);
                            }
                          }}
                          className={`cursor-pointer transition hover:bg-blue-50/70 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                            locked ? 'bg-slate-50/80 opacity-80' : ''
                          }`}
                        >
                          <td className="px-4 py-3 tabular-nums text-slate-600">{index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-950">
                            {cycle.cycleName}
                            {cycle.status === 'PENDING_APPROVAL' && (
                              <p className="mt-1 text-xs font-semibold text-amber-700">
                                HR Admin approval pending — {graceLabel(cycle.graceExtension)} grace requested
                              </p>
                            )}
                            {cycle.status === 'ACTIVE' &&
                              cycle.earlyCloseReviewDecision === 'REJECTED' &&
                              cycle.earlyCloseReviewReason && (
                                <p className="mt-1 text-xs font-semibold text-red-700">
                                  HR Admin rejected early close: {cycle.earlyCloseReviewReason}
                                </p>
                              )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDate(cycle.currentPeriodStartDate ?? cycle.startDate)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDate(cycle.currentPeriodEndDate ?? cycle.endDate)}
                            {cycle.status === 'CLOSING' && cycle.graceEndsAt && (
                              <p className="mt-1 text-xs font-semibold text-amber-700">
                                Grace until {formatDate(cycle.graceEndsAt)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{cycle.durationLabel}</td>
                          <td className="px-4 py-3 text-slate-700">
                            <p className="max-w-xs truncate" title={cycle.kpiForms.map((f) => f.title).join(', ')}>
                              {cycle.kpiForms.length > 0
                                ? cycle.kpiForms.map((f) => f.title).join(', ')
                                : '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3" onClick={stopRowOpen} onKeyDown={stopRowOpen}>
                            <div className="flex items-center justify-end gap-2">
                              {cycle.status === 'ACTIVE' ? (
                                <span
                                  className="inline-flex h-9 cursor-not-allowed items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-400 opacity-50"
                                  title="Active cycles cannot be edited"
                                >
                                  Edit
                                </span>
                              ) : (
                                <Link
                                  to={`/hr/kpi-template-cycle/${cycle.id}/edit`}
                                  onClick={stopRowOpen}
                                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 no-underline hover:bg-slate-50"
                                >
                                  Edit
                                </Link>
                              )}
                              <label
                                className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600"
                                onClick={stopRowOpen}
                                onKeyDown={stopRowOpen}
                              >
                                <span>{statusLabel(cycle)}</span>
                                <span className="relative inline-flex h-6 w-11 shrink-0">
                                  <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={
                                      cycle.status === 'ACTIVE' ||
                                      cycle.status === 'CLOSING' ||
                                      cycle.status === 'PENDING_APPROVAL'
                                    }
                                    disabled={
                                      togglingId === cycle.id ||
                                      cycle.status === 'CLOSING' ||
                                      cycle.status === 'PENDING_APPROVAL' ||
                                      cycle.status === 'CLOSED'
                                    }
                                    onChange={() => void handleToggleActive(cycle)}
                                    onClick={stopRowOpen}
                                  />
                                  <span className="absolute inset-0 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500 peer-disabled:opacity-50" />
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
          </section>
        )}
      </div>

      <KpiTemplateCycleViewModal
        open={viewCycleId != null}
        cycleId={viewCycleId}
        onClose={() => setViewCycleId(null)}
      />

      {activationReadiness && (
        <div
          role="presentation"
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActivationReadiness(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[min(90vh,920px)] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Activation blocked</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Unassigned KPI evaluators</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setActivationReadiness(null)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-transparent bg-slate-100 text-xl font-semibold text-slate-500 hover:bg-white hover:text-slate-900"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm leading-6 text-slate-600">
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
                <div className="overflow-x-auto rounded-xl border border-amber-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-amber-50 text-xs font-bold uppercase tracking-wide text-amber-900">
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
                          <td className="px-3 py-2 font-medium text-slate-900">{row.employeeName}</td>
                          <td className="px-3 py-2 text-slate-700">{row.departmentName}</td>
                          <td className="px-3 py-2 text-slate-700">{row.positionTitle}</td>
                          <td className="px-3 py-2 text-slate-600">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setActivationReadiness(null)}
                className="inline-flex min-h-10 items-center rounded-lg border border-blue-600 bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {closeCycle && (
        <div
          role="presentation"
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCloseCycle(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">HR Admin approval required</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Request early KPI cycle close</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setCloseCycle(null)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-transparent bg-slate-100 text-xl font-semibold text-slate-500 hover:bg-white hover:text-slate-900"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm leading-6 text-slate-600">
                {closeCycle.cycleName} ends on{' '}
                {formatDate(closeCycle.currentPeriodEndDate ?? closeCycle.endDate)}. Add a reason and grace period for
                in-progress forms before sending this to HR Admin.
              </p>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Reason
                <textarea
                  value={closeReason}
                  onChange={(event) => setCloseReason(event.target.value)}
                  rows={5}
                  maxLength={1000}
                  className="rounded-lg border border-slate-300 p-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Grace Period Extension
                <select
                  value={graceExtension}
                  onChange={(event) => setGraceExtension(event.target.value as KpiGraceExtension)}
                  className="rounded-lg border border-slate-300 p-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {graceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setCloseCycle(null)}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={togglingId === closeCycle.id}
                onClick={() => void submitEarlyCloseRequest()}
                className="inline-flex min-h-10 items-center rounded-lg border border-blue-600 bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send to HR Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiTemplateCycleListPage;

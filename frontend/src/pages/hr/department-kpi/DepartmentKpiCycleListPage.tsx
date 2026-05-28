import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { departmentKpiCycleService } from '../../../services/departmentKpiService';
import type { DepartmentKpiCycle } from '../../../types/departmentKpi';
import type { KpiGraceExtension } from '../../../types/kpiTemplateCycle';

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

const statusLabel = (cycle: DepartmentKpiCycle) => {
  if (cycle.status === 'PENDING_APPROVAL') return 'Pending approval';
  if (cycle.status === 'CLOSING') return 'Closing';
  if (cycle.status === 'ACTIVE') return 'Active';
  if (cycle.status === 'DEACTIVATED') return 'Inactive';
  return 'Draft';
};

const graceLabel = (value: KpiGraceExtension | null | undefined) =>
  graceOptions.find((option) => option.value === value)?.label ?? '—';

const isBeforeOfficialEndDate = (cycle: DepartmentKpiCycle) => {
  const endValue = cycle.currentPeriodEndDate ?? cycle.endDate;
  if (!endValue) return false;
  const end = new Date(endValue);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return today < end;
};

const DepartmentKpiCycleListPage = () => {
  const [cycles, setCycles] = useState<DepartmentKpiCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [closeCycle, setCloseCycle] = useState<DepartmentKpiCycle | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [graceExtension, setGraceExtension] = useState<KpiGraceExtension>('ONE_WEEK');

  const load = async () => {
    try {
      setLoading(true);
      setCycles(await departmentKpiCycleService.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI cycles.');
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

  const handleToggleActive = async (cycle: DepartmentKpiCycle) => {
    const nextActive = cycle.status !== 'ACTIVE';
    if (!nextActive && isBeforeOfficialEndDate(cycle)) {
      setCloseCycle(cycle);
      setCloseReason('');
      setGraceExtension('ONE_WEEK');
      return;
    }
    try {
      setTogglingId(cycle.id);
      await departmentKpiCycleService.updateStatus(cycle.id, nextActive);
      toast.success(nextActive ? 'Department KPI cycle activated.' : 'Department KPI cycle closing grace started.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Status update failed.');
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
      await departmentKpiCycleService.updateStatus(closeCycle.id, false, closeReason.trim(), graceExtension);
      toast.success('Department KPI close request sent to CEO.');
      setCloseCycle(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to request early close.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">Department KPI</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Department KPI Cycles</h1>
          </div>
          <Link to="/hr/department-kpi-cycle/new" className="kpi-tpl-btn-primary no-underline">New Cycle</Link>
        </header>

        <div className="kpi-tpl-card overflow-hidden p-0">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Loading cycles…</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="kpi-tpl-thead">
                <tr>
                  <th className="px-4 py-3 text-left">Cycle</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-left">Templates</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No Department KPI cycles yet.</td>
                  </tr>
                ) : (
                  sorted.map((cycle) => {
                    const locked = cycle.status === 'PENDING_APPROVAL';
                    return (
                      <tr
                        key={cycle.id}
                        className={`border-t border-gray-100 ${locked ? 'bg-gray-50 opacity-65' : ''}`}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {cycle.cycleName}
                          {cycle.status === 'PENDING_APPROVAL' && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              CEO approval pending - {graceLabel(cycle.graceExtension)} grace requested
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(cycle.currentPeriodStartDate ?? cycle.startDate)} -{' '}
                          {formatDate(cycle.currentPeriodEndDate ?? cycle.endDate)}
                          {cycle.status === 'CLOSING' && cycle.graceEndsAt && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              Grace until {formatDate(cycle.graceEndsAt)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {cycle.templates.map((t) => t.title).join(', ') || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{statusLabel(cycle)}</td>
                        <td className="px-4 py-3 text-right">
                          {cycle.status === 'ACTIVE' ? (
                            <span
                              className="kpi-tpl-btn-secondary mr-2 inline-flex cursor-not-allowed opacity-50"
                              title="Active cycles cannot be edited"
                            >
                              Edit
                            </span>
                          ) : (
                            <Link
                              className="kpi-tpl-btn-secondary mr-2 inline-flex no-underline"
                              to={`/hr/department-kpi-cycle/${cycle.id}/edit`}
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
                                checked={
                                  cycle.status === 'ACTIVE'
                                  || cycle.status === 'CLOSING'
                                  || cycle.status === 'PENDING_APPROVAL'
                                }
                                disabled={
                                  togglingId === cycle.id
                                  || cycle.status === 'CLOSING'
                                  || cycle.status === 'PENDING_APPROVAL'
                                }
                                onChange={() => void handleToggleActive(cycle)}
                              />
                              <span className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-emerald-500 peer-disabled:opacity-50" />
                              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                            </span>
                          </label>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {closeCycle && (
        <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
          <div className="kpi-tpl-reason-modal">
            <div className="kpi-tpl-modal-header">
              <div>
                <p className="kpi-tpl-modal-kicker">CEO approval required</p>
                <h2>Request early Department KPI cycle close</h2>
              </div>
              <button type="button" className="kpi-tpl-icon-btn" onClick={() => setCloseCycle(null)}>
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="kpi-tpl-modal-body space-y-4">
              <p className="text-sm leading-6 text-gray-600">
                {closeCycle.cycleName} ends on {formatDate(closeCycle.currentPeriodEndDate ?? closeCycle.endDate)}.
                Add a reason and grace period for in-progress Department KPI assignments before sending this to CEO.
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

export default DepartmentKpiCycleListPage;

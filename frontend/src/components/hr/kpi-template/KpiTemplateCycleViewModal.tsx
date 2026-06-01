import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime } from './kpiTemplateDateFormat';
import { kpiCycleStatusBadgeClass } from './kpiTemplateUi';
import { kpiTemplateCycleService } from '../../../services/kpiTemplateCycleService';
import type { KpiTemplateCycleResponse } from '../../../types/kpiTemplateCycle';

type Props = {
  open: boolean;
  cycleId: number | null;
  onClose: () => void;
};

const statusLabel = (cycle: KpiTemplateCycleResponse) => {
  if (cycle.status === 'PENDING_APPROVAL') return 'Pending approval';
  if (cycle.status === 'CLOSING') return 'Closing';
  if (cycle.status === 'CLOSED') return 'Closed';
  if (cycle.status === 'ACTIVE') return 'Active';
  if (cycle.status === 'DEACTIVATED') return 'Inactive';
  return 'Draft';
};

const KpiTemplateCycleViewModal = ({ open, cycleId, onClose }: Props) => {
  const [cycle, setCycle] = useState<KpiTemplateCycleResponse | null>(null);
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
    if (!open || cycleId == null) {
      setCycle(null);
      setError('');
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await kpiTemplateCycleService.getById(cycleId);
        setCycle(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load cycle.';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, cycleId]);

  if (!open) return null;

  const hasEarlyCloseReview =
    cycle?.earlyCloseReviewedAt ||
    cycle?.earlyCloseReviewDecision ||
    cycle?.earlyCloseReviewReason ||
    cycle?.earlyCloseReviewedByName;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-cycle-modal-title"
        className="max-h-[min(90vh,920px)] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">KPI template cycle</p>
            <h2 id="kpi-cycle-modal-title" className="mt-1 text-xl font-semibold text-slate-950">
              {cycle?.cycleName ?? 'Cycle detail'}
            </h2>
            {cycle && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={kpiCycleStatusBadgeClass(cycle.status)}>{statusLabel(cycle)}</span>
                <span className="text-sm text-slate-500">{cycle.durationLabel}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-transparent bg-slate-100 text-xl font-semibold leading-none text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-900"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 px-6 py-10 text-sm text-slate-500">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" aria-hidden />
            Loading cycle…
          </div>
        )}

        {!loading && error && (
          <div className="mx-6 my-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && cycle && (
          <div className="space-y-6 px-6 py-5">
            <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current period start</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">
                  {formatDate(cycle.currentPeriodStartDate ?? cycle.startDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current period end</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">
                  {formatDate(cycle.currentPeriodEndDate ?? cycle.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Base start date</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">{formatDate(cycle.startDate)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Base end date</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">{formatDate(cycle.endDate)}</dd>
              </div>
              {cycle.graceEndsAt && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Grace ends</dt>
                  <dd className="mt-1 text-sm font-semibold text-amber-700">{formatDate(cycle.graceEndsAt)}</dd>
                </div>
              )}
              {cycle.createdAt && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">{formatDateTime(cycle.createdAt)}</dd>
                </div>
              )}
              {cycle.updatedAt && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Updated</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">{formatDateTime(cycle.updatedAt)}</dd>
                </div>
              )}
              {cycle.closedAt && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Closed</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">{formatDateTime(cycle.closedAt)}</dd>
                </div>
              )}
            </section>

            {hasEarlyCloseReview && (
              <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <h3 className="text-sm font-semibold text-amber-900">Early close review</h3>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {cycle.earlyCloseReviewDecision && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">Decision</dt>
                      <dd className="mt-1 text-sm font-semibold text-amber-950">{cycle.earlyCloseReviewDecision}</dd>
                    </div>
                  )}
                  {cycle.earlyCloseReviewedByName && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">Reviewed by</dt>
                      <dd className="mt-1 text-sm font-semibold text-amber-950">{cycle.earlyCloseReviewedByName}</dd>
                    </div>
                  )}
                  {cycle.earlyCloseReviewedAt && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">Reviewed at</dt>
                      <dd className="mt-1 text-sm font-semibold text-amber-950">
                        {formatDateTime(cycle.earlyCloseReviewedAt)}
                      </dd>
                    </div>
                  )}
                  {cycle.earlyCloseReviewReason && (
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">Reason</dt>
                      <dd className="mt-1 text-sm text-amber-950">{cycle.earlyCloseReviewReason}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Selected KPI forms</h3>
              {cycle.kpiForms.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No KPI forms linked to this cycle.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {cycle.kpiForms.map((form) => (
                    <li
                      key={form.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                        {form.title.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{form.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Generated period schedule</h3>
              {!cycle.periodSchedules || cycle.periodSchedules.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No generated periods yet.
                </p>
              ) : (
                <div className="mt-3 space-y-4">
                  {cycle.periodSchedules.map((schedule) => (
                    <div key={schedule.kpiFormId} className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-950">{schedule.kpiFormTitle}</p>
                      </div>
                      {schedule.periods.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-slate-500">—</p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {schedule.periods.map((period) => (
                            <li
                              key={period.id}
                              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                            >
                              <span className="font-semibold text-slate-900">Period {period.periodNumber}</span>
                              <span className="text-slate-600">
                                {formatDate(period.startDate)} – {formatDate(period.endDate)}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                {period.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default KpiTemplateCycleViewModal;

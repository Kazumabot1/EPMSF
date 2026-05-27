import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { departmentKpiCycleService } from '../../../services/departmentKpiService';
import type { DepartmentKpiCycle } from '../../../types/departmentKpi';

type Props = {
  open: boolean;
  cycleId: number | null;
  onClose: () => void;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const DepartmentKpiCycleViewModal = ({ open, cycleId, onClose }: Props) => {
  const [cycle, setCycle] = useState<DepartmentKpiCycle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || cycleId == null) {
      setCycle(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await departmentKpiCycleService.get(cycleId);
        if (!cancelled) setCycle(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load cycle.');
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, cycleId, onClose]);

  if (!open) return null;

  const templates = cycle?.templates ?? [];
  const periodStart = cycle?.currentPeriodStartDate ?? cycle?.startDate ?? null;
  const periodEnd = cycle?.currentPeriodEndDate ?? cycle?.endDate ?? null;

  return createPortal(
    <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
      <div className="kpi-tpl-modal max-w-2xl">
        <div className="kpi-tpl-modal-header">
          <div>
            <p className="kpi-tpl-modal-kicker">Department KPI cycle</p>
            <h2>{cycle?.cycleName ?? 'Cycle details'}</h2>
          </div>
          <button type="button" className="kpi-tpl-icon-btn" onClick={onClose}>
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>

        <div className="kpi-tpl-modal-body space-y-4">
          {loading && <p className="text-sm text-gray-600">Loading…</p>}
          {!loading && !cycle && <p className="text-sm text-gray-600">No data.</p>}

          {!loading && cycle && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{cycle.status ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Duration</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{cycle.durationLabel ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Start date</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(periodStart)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">End date</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(periodEnd)}</p>
              </div>

              <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected templates</p>
                <p className="mt-2 text-sm text-gray-800">
                  {templates.length ? templates.map((t) => t.title).join(', ') : '—'}
                </p>
              </div>

              {(cycle.earlyCloseReason || cycle.earlyCloseReviewReason || cycle.graceEndsAt || cycle.graceExtension) && (
                <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Early close</p>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    {cycle.earlyCloseReason && (
                      <p>
                        <span className="font-semibold text-gray-900">Reason:</span> {cycle.earlyCloseReason}
                      </p>
                    )}
                    {cycle.graceExtension && (
                      <p>
                        <span className="font-semibold text-gray-900">Grace:</span> {cycle.graceExtension}
                      </p>
                    )}
                    {cycle.graceEndsAt && (
                      <p>
                        <span className="font-semibold text-gray-900">Grace ends:</span> {formatDate(cycle.graceEndsAt)}
                      </p>
                    )}
                    {cycle.earlyCloseReviewDecision && (
                      <p>
                        <span className="font-semibold text-gray-900">Decision:</span> {cycle.earlyCloseReviewDecision}
                      </p>
                    )}
                    {cycle.earlyCloseReviewReason && (
                      <p>
                        <span className="font-semibold text-gray-900">CEO note:</span> {cycle.earlyCloseReviewReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="kpi-tpl-modal-footer">
          <button type="button" className="kpi-tpl-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DepartmentKpiCycleViewModal;


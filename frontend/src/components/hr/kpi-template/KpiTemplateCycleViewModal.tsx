import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { kpiCycleStatusBadgeClass } from './kpiTemplateUi';
import { kpiTemplateCycleService } from '../../../services/kpiTemplateCycleService';
import type { KpiTemplateCycleResponse } from '../../../types/kpiTemplateCycle';

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

const KpiTemplateCycleViewModal = ({ open, cycleId, onClose }: Props) => {
  const [cycle, setCycle] = useState<KpiTemplateCycleResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || cycleId == null) {
      setCycle(null);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const data = await kpiTemplateCycleService.getById(cycleId);
        setCycle(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load cycle.');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, cycleId, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
      <div className="kpi-tpl-modal max-w-2xl">
        <div className="kpi-tpl-modal-header">
          <div>
            <p className="kpi-tpl-modal-kicker">KPI template cycle</p>
            <h2>{cycle?.cycleName ?? 'Cycle detail'}</h2>
          </div>
          <button type="button" onClick={onClose} className="kpi-tpl-btn-secondary">
            <i className="bi bi-x-lg" aria-hidden />
            Close
          </button>
        </div>

        {loading ? (
          <div className="kpi-tpl-modal-loading">
            <div className="kpi-tpl-shimmer h-10 w-10 rounded-xl bg-gradient-to-br from-violet-300 to-gray-200" />
            Loading cycle...
          </div>
        ) : cycle ? (
          <div className="kpi-tpl-modal-body space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={kpiCycleStatusBadgeClass(cycle.status)}>{cycle.status}</span>
              <span className="text-xs font-medium text-gray-500">{cycle.durationLabel}</span>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current period start</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(cycle.currentPeriodStartDate ?? cycle.startDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current period end</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(cycle.currentPeriodEndDate ?? cycle.endDate)}
                </dd>
              </div>
              {cycle.graceEndsAt && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Grace ends</dt>
                  <dd className="mt-1 text-sm font-semibold text-amber-700">{formatDate(cycle.graceEndsAt)}</dd>
                </div>
              )}
            </dl>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected KPI forms</p>
              {cycle.kpiForms.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600">—</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {cycle.kpiForms.map((form) => (
                    <li
                      key={form.id}
                      className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm font-medium text-gray-800"
                    >
                      {form.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

export default KpiTemplateCycleViewModal;

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import '../../components/hr/kpi-template/kpi-template.css';
import { kpiTemplateCycleService } from '../../services/kpiTemplateCycleService';
import type { KpiGraceExtension, KpiTemplateCycleResponse } from '../../types/kpiTemplateCycle';

const graceLabels: Record<KpiGraceExtension, string> = {
  ONE_WEEK: '1 week',
  TWO_WEEKS: '2 weeks',
  THREE_WEEKS: '3 weeks',
  ONE_MONTH: '1 month',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const graceLabel = (value?: KpiGraceExtension | null) => (value ? graceLabels[value] : '-');

const KpiApprovalPage = () => {
  const [requests, setRequests] = useState<KpiTemplateCycleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<KpiTemplateCycleResponse | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setRequests(await kpiTemplateCycleService.listPendingApprovals());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load KPI approval requests.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(
    () => ({
      total: requests.length,
      oneWeek: requests.filter((item) => item.graceExtension === 'ONE_WEEK').length,
      longer: requests.filter((item) => item.graceExtension && item.graceExtension !== 'ONE_WEEK').length,
    }),
    [requests],
  );

  const review = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    if (decision === 'reject' && !reviewReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    try {
      setActionLoading(true);
      if (decision === 'approve') {
        await kpiTemplateCycleService.approveEarlyClose(selected.id, reviewReason.trim());
        toast.success('KPI close request approved.');
      } else {
        await kpiTemplateCycleService.rejectEarlyClose(selected.id, reviewReason.trim());
        toast.success('KPI close request rejected.');
      }
      setSelected(null);
      setReviewReason('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Approval</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">KPI Approval</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Review HR requests to end KPI cycles before their official end date.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="kpi-tpl-btn-secondary">
          <i className="bi bi-arrow-clockwise" aria-hidden /> Refresh
        </button>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Pending Requests</p>
          <strong className="mt-2 block text-2xl text-gray-900">{summary.total}</strong>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">1 Week Grace</p>
          <strong className="mt-2 block text-2xl text-emerald-700">{summary.oneWeek}</strong>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Longer Grace</p>
          <strong className="mt-2 block text-2xl text-amber-700">{summary.longer}</strong>
        </div>
      </div>

      {loading && <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-600">Loading KPI approvals...</div>}
      {error && !loading && <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-800">{error}</div>}

      {!loading && !error && requests.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <i className="bi bi-check-circle text-3xl text-emerald-600" aria-hidden />
          <h2 className="mt-3 text-lg font-bold text-gray-900">No KPI approval requests</h2>
          <p className="mt-2 text-sm text-gray-600">Pending HR early-close requests will appear here.</p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Cycle</th>
                  <th className="px-4 py-3">Official End</th>
                  <th className="px-4 py-3">Grace</th>
                  <th className="px-4 py-3">Requested By</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-violet-50/40">
                    <td className="px-4 py-4">
                      <strong className="block text-gray-900">{request.cycleName}</strong>
                      <span className="text-xs text-gray-500">Requested {formatDateTime(request.earlyCloseRequestedAt)}</span>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{formatDate(request.currentPeriodEndDate ?? request.endDate)}</td>
                    <td className="px-4 py-4 font-semibold text-amber-700">{graceLabel(request.graceExtension)}</td>
                    <td className="px-4 py-4 text-gray-700">{request.earlyCloseRequestedByName ?? '-'}</td>
                    <td className="px-4 py-4 text-gray-700">
                      <p className="max-w-sm truncate" title={request.earlyCloseReason ?? ''}>
                        {request.earlyCloseReason ?? '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-lg border border-violet-200 px-3 text-xs font-bold text-violet-700 hover:bg-violet-50"
                        onClick={() => {
                          setSelected(request);
                          setReviewReason('');
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-700">KPI early close request</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">{selected.cycleName}</h2>
              </div>
              <button type="button" className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600" onClick={() => setSelected(null)}>
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="grid gap-4 p-5 text-sm text-gray-700">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">Official End</p>
                  <p className="mt-1 font-semibold">{formatDate(selected.currentPeriodEndDate ?? selected.endDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">Requested Grace</p>
                  <p className="mt-1 font-semibold">{graceLabel(selected.graceExtension)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">HR Reason</p>
                <p className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 leading-6">
                  {selected.earlyCloseReason}
                </p>
              </div>
              <label className="grid gap-2 font-semibold text-gray-700">
                Review note
                <textarea
                  value={reviewReason}
                  onChange={(event) => setReviewReason(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="rounded-lg border border-gray-200 p-3 font-normal outline-none focus:border-violet-500"
                />
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 p-5">
              <button type="button" className="kpi-tpl-btn-secondary" disabled={actionLoading} onClick={() => void review('reject')}>
                Reject
              </button>
              <button type="button" className="kpi-tpl-btn-primary" disabled={actionLoading} onClick={() => void review('approve')}>
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiApprovalPage;

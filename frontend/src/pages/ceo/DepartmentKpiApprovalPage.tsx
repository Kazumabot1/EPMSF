import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import '../../components/hr/kpi-template/kpi-template.css';
import { departmentKpiApprovalService } from '../../services/departmentKpiService';
import type { DepartmentKpiCycle, DepartmentKpiResult } from '../../types/departmentKpi';
import type { KpiGraceExtension } from '../../types/kpiTemplateCycle';

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
const formatScore = (value?: number | null) => (value == null ? '-' : value.toFixed(2));

const DepartmentKpiApprovalPage = () => {
  const [requests, setRequests] = useState<DepartmentKpiCycle[]>([]);
  const [finalizationRequests, setFinalizationRequests] = useState<DepartmentKpiResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DepartmentKpiCycle | null>(null);
  const [selectedFinalization, setSelectedFinalization] = useState<DepartmentKpiResult | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [earlyCloseRows, finalizationRows] = await Promise.all([
        departmentKpiApprovalService.listPendingEarlyCloseRequests(),
        departmentKpiApprovalService.listPendingFinalizationRequests(),
      ]);
      setRequests(earlyCloseRows);
      setFinalizationRequests(finalizationRows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load Department KPI approval requests.';
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
      finalizationTotal: finalizationRequests.length,
      oneWeek: requests.filter((item) => item.graceExtension === 'ONE_WEEK').length,
      longer: requests.filter((item) => item.graceExtension && item.graceExtension !== 'ONE_WEEK').length,
    }),
    [finalizationRequests.length, requests],
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
        await departmentKpiApprovalService.approveEarlyClose(selected.id, reviewReason.trim());
        toast.success('Department KPI close request approved.');
      } else {
        await departmentKpiApprovalService.rejectEarlyClose(selected.id, reviewReason.trim());
        toast.success('Department KPI close request rejected.');
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

  const reviewFinalization = async (decision: 'approve' | 'reject') => {
    if (!selectedFinalization) return;
    try {
      setActionLoading(true);
      if (decision === 'approve') {
        await departmentKpiApprovalService.approveFinalization(selectedFinalization.departmentKpiResultId, reviewReason.trim());
        toast.success('Department KPI finalization approved.');
      } else {
        await departmentKpiApprovalService.rejectFinalization(selectedFinalization.departmentKpiResultId, reviewReason.trim());
        toast.success('Department KPI finalization rejected.');
      }
      setSelectedFinalization(null);
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
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Department KPI Approval</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Review HR requests for Department KPI finalization and early cycle closure.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="kpi-tpl-btn-secondary">
          <i className="bi bi-arrow-clockwise" aria-hidden /> Refresh
        </button>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Finalization Requests</p>
          <strong className="mt-2 block text-2xl text-violet-700">{summary.finalizationTotal}</strong>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Early Close Requests</p>
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

      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-600">
          Loading Department KPI approvals...
        </div>
      )}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-800">{error}</div>
      )}

      {!loading && !error && requests.length === 0 && finalizationRequests.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <i className="bi bi-check-circle text-3xl text-emerald-600" aria-hidden />
          <h2 className="mt-3 text-lg font-bold text-gray-900">No Department KPI approval requests</h2>
          <p className="mt-2 text-sm text-gray-600">Pending HR finalization and early-close requests will appear here.</p>
        </div>
      )}

      {!loading && !error && finalizationRequests.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-bold text-gray-900">Score finalization requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Total Weight Score %</th>
                  <th className="px-4 py-3">Requested By</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {finalizationRequests.map((request) => (
                  <tr key={request.departmentKpiResultId} className="hover:bg-violet-50/40">
                    <td className="px-4 py-4 font-semibold text-gray-900">{request.departmentName}</td>
                    <td className="px-4 py-4 text-gray-700">{request.templateTitle}</td>
                    <td className="px-4 py-4 text-gray-700">
                      {formatDate(request.periodStartDate)} - {formatDate(request.periodEndDate)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-900">{formatScore(request.totalWeightedScore)}</td>
                    <td className="px-4 py-4 text-gray-700">{request.finalizationRequestedByName ?? '-'}</td>
                    <td className="px-4 py-4 text-gray-700">
                      <p className="max-w-sm truncate" title={request.finalizationRequestReason ?? ''}>
                        {request.finalizationRequestReason ?? '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-lg border border-violet-200 px-3 text-xs font-bold text-violet-700 hover:bg-violet-50"
                        onClick={() => {
                          setSelectedFinalization(request);
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

      {!loading && !error && requests.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-bold text-gray-900">Cycle early-close requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
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

      {selectedFinalization && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-700">
                  Department KPI finalization request
                </p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">{selectedFinalization.departmentName}</h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600"
                onClick={() => setSelectedFinalization(null)}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="grid gap-4 p-5 text-sm text-gray-700">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">Template</p>
                  <p className="mt-1 font-semibold">{selectedFinalization.templateTitle}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">Total Weight Score %</p>
                  <p className="mt-1 font-semibold">{formatScore(selectedFinalization.totalWeightedScore)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">HR Reason</p>
                <p className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 leading-6">
                  {selectedFinalization.finalizationRequestReason}
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
              <button
                type="button"
                className="kpi-tpl-btn-secondary"
                disabled={actionLoading}
                onClick={() => void reviewFinalization('reject')}
              >
                Reject
              </button>
              <button
                type="button"
                className="kpi-tpl-btn-primary"
                disabled={actionLoading}
                onClick={() => void reviewFinalization('approve')}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-700">
                  Department KPI early close request
                </p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">{selected.cycleName}</h2>
              </div>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600"
                onClick={() => setSelected(null)}
              >
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
              <button
                type="button"
                className="kpi-tpl-btn-secondary"
                disabled={actionLoading}
                onClick={() => void review('reject')}
              >
                Reject
              </button>
              <button
                type="button"
                className="kpi-tpl-btn-primary"
                disabled={actionLoading}
                onClick={() => void review('approve')}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentKpiApprovalPage;


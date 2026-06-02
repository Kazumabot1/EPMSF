import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { kpiTemplateCycleService } from '../../services/kpiTemplateCycleService';
import type {
  KpiEarlyCloseReviewDecision,
  KpiGraceExtension,
  KpiTemplateCycleResponse,
} from '../../types/kpiTemplateCycle';

type ApprovalTab = 'pending' | 'history';

const graceLabels: Record<KpiGraceExtension, string> = {
  ONE_WEEK: '1 week',
  TWO_WEEKS: '2 weeks',
  THREE_WEEKS: '3 weeks',
  ONE_MONTH: '1 month',
};

const decisionLabels: Record<KpiEarlyCloseReviewDecision, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
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

const decisionLabel = (value?: KpiEarlyCloseReviewDecision | null) =>
  value ? decisionLabels[value] : '-';

const decisionStyle = (value?: KpiEarlyCloseReviewDecision | null) => {
  if (value === 'APPROVED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value === 'REJECTED') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const matchesQuery = (item: KpiTemplateCycleResponse, query: string) => {
  const clean = query.trim().toLowerCase();
  if (!clean) return true;

  return [
    item.cycleName,
    item.earlyCloseRequestedByName,
    item.earlyCloseReviewedByName,
    item.earlyCloseReason,
    item.earlyCloseReviewReason,
    decisionLabel(item.earlyCloseReviewDecision),
    graceLabel(item.graceExtension),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(clean);
};

const KpiApprovalPage = () => {
  const [requests, setRequests] = useState<KpiTemplateCycleResponse[]>([]);
  const [history, setHistory] = useState<KpiTemplateCycleResponse[]>([]);
  const [activeTab, setActiveTab] = useState<ApprovalTab>('pending');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<KpiTemplateCycleResponse | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setHistoryLoading(true);
      setError('');

      const [pendingData, historyData] = await Promise.all([
        kpiTemplateCycleService.listPendingApprovals(),
        kpiTemplateCycleService.listApprovalHistory(),
      ]);

      setRequests(pendingData);
      setHistory(historyData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load KPI approvals.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(
    () => ({
      pending: requests.length,
      oneWeek: requests.filter((item) => item.graceExtension === 'ONE_WEEK').length,
      approved: history.filter((item) => item.earlyCloseReviewDecision === 'APPROVED').length,
      rejected: history.filter((item) => item.earlyCloseReviewDecision === 'REJECTED').length,
    }),
    [history, requests],
  );

  const filteredPending = useMemo(
    () => requests.filter((item) => matchesQuery(item, query)),
    [query, requests],
  );

  const filteredHistory = useMemo(
    () => history.filter((item) => matchesQuery(item, query)),
    [history, query],
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
      setActiveTab('history');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const displayedItems = activeTab === 'pending' ? filteredPending : filteredHistory;
  const isCurrentTabLoading = activeTab === 'pending' ? loading : historyLoading;

  return (
    <main className="min-h-[calc(100vh-86px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-blue-700 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  HR Admin Approval
                </div>
                <h1 className="text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">
                  KPI Approval
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                  Review HR requests to end KPI cycles before their official end date and track every completed approval decision.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading || historyLoading}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i className="bi bi-arrow-clockwise" aria-hidden />
                  {loading || historyLoading ? 'Refreshing' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon="bi-hourglass-split" label="Pending Requests" value={summary.pending} tone="blue" />
              <MetricCard icon="bi-calendar-week" label="1 Week Grace" value={summary.oneWeek} tone="emerald" />
              <MetricCard icon="bi-check2-circle" label="Approved History" value={summary.approved} tone="teal" />
              <MetricCard icon="bi-x-circle" label="Rejected History" value={summary.rejected} tone="rose" />
            </div>
          </div>

          <div className="px-5 py-5 sm:px-7">
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                {error}
              </div>
            )}

            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-100 p-1">
                <TabButton
                  active={activeTab === 'pending'}
                  label="Pending"
                  count={requests.length}
                  onClick={() => setActiveTab('pending')}
                />
                <TabButton
                  active={activeTab === 'history'}
                  label="History"
                  count={history.length}
                  onClick={() => setActiveTab('history')}
                />
              </div>

              <label className="relative w-full lg:max-w-md">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search cycle, reviewer, reason..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            {isCurrentTabLoading ? (
              <LoadingRows />
            ) : displayedItems.length === 0 ? (
              <EmptyState activeTab={activeTab} />
            ) : activeTab === 'pending' ? (
              <PendingTable
                items={filteredPending}
                onReview={(request) => {
                  setSelected(request);
                  setReviewReason('');
                }}
              />
            ) : (
              <HistoryTable items={filteredHistory} />
            )}
          </div>
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                  KPI early close request
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{selected.cycleName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Requested by {selected.earlyCloseRequestedByName ?? '-'}
                </p>
              </div>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                onClick={() => setSelected(null)}
                disabled={actionLoading}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoPanel label="Official End" value={formatDate(selected.currentPeriodEndDate ?? selected.endDate)} />
                <InfoPanel label="Requested Grace" value={graceLabel(selected.graceExtension)} />
                <InfoPanel label="Requested At" value={formatDateTime(selected.earlyCloseRequestedAt)} />
                <InfoPanel label="Cycle Status" value={selected.status} />
              </div>

              <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-black text-slate-950">HR Request Reason</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
                  {selected.earlyCloseReason || '-'}
                </p>
              </section>

              <label className="mt-5 block">
                <span className="text-sm font-black text-slate-800">Review note</span>
                <textarea
                  value={reviewReason}
                  onChange={(event) => setReviewReason(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Add approval note or rejection reason..."
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
                <span className="mt-2 block text-xs font-bold text-slate-500">
                  A note is optional for approval and required for rejection.
                </span>
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                disabled={actionLoading}
                onClick={() => void review('reject')}
              >
                <i className="bi bi-x-circle" aria-hidden />
                Reject
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                disabled={actionLoading}
                onClick={() => void review('approve')}
              >
                <i className="bi bi-check2-circle" aria-hidden />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

const MetricCard = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  tone: 'blue' | 'emerald' | 'teal' | 'rose';
}) => {
  const toneMap = {
    blue: 'border-blue-100 text-blue-700',
    emerald: 'border-emerald-100 text-emerald-700',
    teal: 'border-teal-100 text-teal-700',
    rose: 'border-rose-100 text-rose-700',
  };

  return (
    <div className={`rounded-2xl border bg-white/85 p-4 shadow-sm ${toneMap[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-500">{label}</span>
        <i className={`bi ${icon}`} aria-hidden />
      </div>
      <strong className="mt-3 block text-3xl font-black text-slate-950">{value}</strong>
    </div>
  );
};

const TabButton = ({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${
      active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-blue-700'
    }`}
  >
    {label}
    <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-500'}`}>
      {count}
    </span>
  </button>
);

const LoadingRows = () => (
  <div className="grid gap-3">
    {[0, 1, 2].map((item) => (
      <div key={item} className="flex animate-pulse gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="h-12 w-12 rounded-2xl bg-slate-100" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/5 rounded bg-slate-100" />
          <div className="h-4 w-4/5 rounded bg-slate-100" />
          <div className="h-3 w-32 rounded bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ activeTab }: { activeTab: ApprovalTab }) => (
  <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-16 text-center">
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl text-emerald-600 shadow-sm">
      <i className={activeTab === 'pending' ? 'bi bi-check-circle' : 'bi bi-journal-check'} aria-hidden />
    </div>
    <h2 className="mt-4 text-lg font-black text-slate-900">
      {activeTab === 'pending' ? 'No KPI approval requests' : 'No approval history yet'}
    </h2>
    <p className="mt-1 text-sm font-semibold text-slate-500">
      {activeTab === 'pending'
        ? 'Pending HR early-close requests will appear here.'
        : 'Completed HR Admin approval decisions will appear here.'}
    </p>
  </div>
);

const PendingTable = ({
  items,
  onReview,
}: {
  items: KpiTemplateCycleResponse[];
  onReview: (request: KpiTemplateCycleResponse) => void;
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Cycle</th>
            <th className="px-4 py-3">Official End</th>
            <th className="px-4 py-3">Grace</th>
            <th className="px-4 py-3">Requested By</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((request) => (
            <tr key={request.id} className="align-top transition hover:bg-blue-50/40">
              <td className="px-4 py-4">
                <strong className="block text-slate-950">{request.cycleName}</strong>
                <span className="mt-1 block text-xs font-bold text-slate-500">
                  Requested {formatDateTime(request.earlyCloseRequestedAt)}
                </span>
              </td>
              <td className="px-4 py-4 font-semibold text-slate-700">
                {formatDate(request.currentPeriodEndDate ?? request.endDate)}
              </td>
              <td className="px-4 py-4">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                  {graceLabel(request.graceExtension)}
                </span>
              </td>
              <td className="px-4 py-4 font-semibold text-slate-700">
                {request.earlyCloseRequestedByName ?? '-'}
              </td>
              <td className="px-4 py-4 text-slate-700">
                <p className="max-w-sm truncate font-semibold" title={request.earlyCloseReason ?? ''}>
                  {request.earlyCloseReason ?? '-'}
                </p>
              </td>
              <td className="px-4 py-4 text-right">
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-700"
                  onClick={() => onReview(request)}
                >
                  <i className="bi bi-shield-check" aria-hidden />
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const HistoryTable = ({ items }: { items: KpiTemplateCycleResponse[] }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Cycle</th>
            <th className="px-4 py-3">Decision</th>
            <th className="px-4 py-3">Requested By</th>
            <th className="px-4 py-3">Reviewed By</th>
            <th className="px-4 py-3">Reviewed At</th>
            <th className="px-4 py-3">Review Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="align-top transition hover:bg-slate-50">
              <td className="px-4 py-4">
                <strong className="block text-slate-950">{item.cycleName}</strong>
                <span className="mt-1 block text-xs font-bold text-slate-500">
                  Requested {formatDateTime(item.earlyCloseRequestedAt)}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${decisionStyle(item.earlyCloseReviewDecision)}`}>
                  {decisionLabel(item.earlyCloseReviewDecision)}
                </span>
              </td>
              <td className="px-4 py-4 font-semibold text-slate-700">
                {item.earlyCloseRequestedByName ?? '-'}
              </td>
              <td className="px-4 py-4 font-semibold text-slate-700">
                {item.earlyCloseReviewedByName ?? '-'}
              </td>
              <td className="px-4 py-4 font-semibold text-slate-700">
                {formatDateTime(item.earlyCloseReviewedAt)}
              </td>
              <td className="px-4 py-4 text-slate-700">
                <p className="max-w-md truncate font-semibold" title={item.earlyCloseReviewReason ?? ''}>
                  {item.earlyCloseReviewReason ?? '-'}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const InfoPanel = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-slate-950">{value || '-'}</p>
  </div>
);

export default KpiApprovalPage;

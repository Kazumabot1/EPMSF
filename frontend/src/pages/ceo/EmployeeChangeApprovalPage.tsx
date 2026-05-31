import { useEffect, useMemo, useState } from 'react';
import { employeeChangeRequestService } from '../../services/employeeChangeRequestService';
import type {
  EmployeeChangeDetail,
  EmployeeChangeRequestType,
  EmployeeChangeSummary,
} from '../../types/employeeChangeRequest';
import EmployeeChangeProfileModal from '../hr/employee-change/EmployeeChangeProfileModal';

type ReviewAction = 'APPROVE' | 'REJECT' | null;

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  'Request failed.';

const formatDate = (value?: string) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const requestTypeLabel = (type?: EmployeeChangeRequestType) => {
  if (type === 'POSITION_CHANGE') return 'Position Change';
  if (type === 'DEPARTMENT_CHANGE') return 'Department Change';
  return '-';
};

const EmployeeChangeApprovalPage = () => {
  const [requests, setRequests] = useState<EmployeeChangeSummary[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EmployeeChangeSummary | null>(null);
  const [detail, setDetail] = useState<EmployeeChangeDetail | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction>(null);

  const [profileEmployeeId, setProfileEmployeeId] = useState<number | null>(null);

  const [reason, setReason] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const filteredRequests = useMemo(() => {
    const clean = query.trim().toLowerCase();

    if (!clean) return requests;

    return requests.filter((request) =>
      [
        request.employeeName,
        request.employeeEmail,
        request.requestedByName,
        request.oldPositionName,
        request.newPositionName,
        request.oldCurrentDepartmentName,
        request.newCurrentDepartmentName,
        request.oldParentDepartmentName,
        request.newParentDepartmentName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(clean),
    );
  }, [query, requests]);

  const loadRequests = async () => {
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const data = await employeeChangeRequestService.getHrAdminPendingRequests();
      setRequests(data);
    } catch (error) {
      setIsError(true);
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (request: EmployeeChangeSummary) => {
    setSelectedRequest(request);
    setDetail(null);
    setReviewAction(null);
    setReason('');
    setDetailLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const data = await employeeChangeRequestService.getHrAdminDetail(request.id);
      setDetail(data);
    } catch (error) {
      setIsError(true);
      setMessage(getErrorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    if (submitting) return;

    setSelectedRequest(null);
    setDetail(null);
    setReviewAction(null);
    setReason('');
  };

  const submitDecision = async () => {
    if (!selectedRequest || !reviewAction) return;

    if (reason.trim().length < 10) {
      setIsError(true);
      setMessage('Please write a review reason with at least 10 characters.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    setIsError(false);

    try {
      if (reviewAction === 'APPROVE') {
        await employeeChangeRequestService.approveByHrAdmin(selectedRequest.id, reason.trim());
        setMessage('Workforce change approved and applied.');
      } else {
        await employeeChangeRequestService.rejectByHrAdmin(selectedRequest.id, reason.trim());
        setMessage('Workforce change rejected.');
      }

      setIsError(false);
      closeDetail();
      await loadRequests();
    } catch (error) {
      setIsError(true);
      setMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  return (
    <div className="min-h-[calc(100vh-86px)] bg-slate-50 px-3 py-5 text-slate-950 sm:px-5 lg:px-7">
      <div className="mx-auto flex max-w-[1450px] flex-col gap-5">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                Approval
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Workforce Change Approval
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
Review HR-submitted position and department change requests. Approved requests are applied immediately by HR Admin.              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadRequests()}
              disabled={loading}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </section>

        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              isError
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {message}
          </div>
        )}

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Pending Requests</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {requests.length} pending request(s)
              </p>
            </div>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search employee, HR, position, department..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 md:max-w-md"
            />
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
              Loading pending requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
              No pending workforce change requests.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Requested By</th>
                    <th className="px-4 py-3">Requested At</th>
                    <th className="px-4 py-3">Change</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="align-top">
                      <td className="min-w-[220px] px-4 py-4">
                        <p className="font-black text-slate-950">{request.employeeName}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {request.employeeEmail || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-700">
                        {requestTypeLabel(request.requestType)}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600">
                        {request.requestedByName || '-'}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600">
                        {formatDate(request.requestedAt)}
                      </td>
                      <td className="min-w-[280px] px-4 py-4 font-semibold text-slate-600">
                        {request.requestType === 'POSITION_CHANGE'
                          ? `${request.oldPositionName || '-'} → ${request.newPositionName || '-'}`
                          : `${request.oldCurrentDepartmentName || '-'} → ${request.newCurrentDepartmentName || '-'}`}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void openDetail(request)}
                          className="rounded-2xl bg-violet-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-violet-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {requestTypeLabel(selectedRequest.requestType)}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selectedRequest.employeeName} · submitted by {selectedRequest.requestedByName || '-'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                disabled={submitting}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {detailLoading ? (
                <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  Loading details...
                </div>
              ) : (
                <div className="grid gap-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InfoCard label="Employee" value={selectedRequest.employeeName || '-'} />
                    <InfoCard label="Email" value={selectedRequest.employeeEmail || '-'} />
                    <InfoCard label="Requested By" value={selectedRequest.requestedByName || '-'} />
                    <InfoCard label="Requested At" value={formatDate(selectedRequest.requestedAt)} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setProfileEmployeeId(selectedRequest.employeeId)}
                    className="w-fit rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 transition hover:bg-violet-100"
                  >
                    See More Employee Details
                  </button>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {selectedRequest.requestType === 'POSITION_CHANGE' ? (
                      <>
                        <InfoCard label="Current Position" value={selectedRequest.oldPositionName || '-'} />
                        <InfoCard label="Requested Position" value={selectedRequest.newPositionName || '-'} />
                      </>
                    ) : (
                      <>
                        <InfoCard
                          label="Current Department"
                          value={selectedRequest.oldCurrentDepartmentName || '-'}
                        />
                        <InfoCard
                          label="Requested Department"
                          value={selectedRequest.newCurrentDepartmentName || '-'}
                        />
                        <InfoCard
                          label="Current Parent Department"
                          value={selectedRequest.oldParentDepartmentName || '-'}
                        />
                        <InfoCard
                          label="Requested Parent Department"
                          value={selectedRequest.newParentDepartmentName || '-'}
                        />
                      </>
                    )}
                  </div>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-black text-slate-950">HR Request Reason</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
                      {selectedRequest.requestReason || '-'}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-black text-slate-950">Validation Summary</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
                      {selectedRequest.validationSummary || 'No validation summary available.'}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="font-black text-slate-950">Audit Trail</h3>
                    {detail?.audits?.length ? (
                      <div className="mt-3 divide-y divide-slate-100">
                        {detail.audits.map((audit) => (
                          <div key={audit.id} className="py-3 text-sm">
                            <p className="font-black text-slate-800">
                              {audit.action} · {audit.performedByName || '-'}
                            </p>
                            <p className="mt-1 font-semibold text-slate-500">
                              {formatDate(audit.performedAt)}
                            </p>
                            {audit.reason && (
                              <p className="mt-1 font-semibold text-slate-600">
                                Reason: {audit.reason}
                              </p>
                            )}
                            {audit.details && (
                              <p className="mt-1 font-semibold text-slate-600">
                                {audit.details}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        No audit records found.
                      </p>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="font-black text-slate-950">CEO Review</h3>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setReviewAction('APPROVE')}
                        className={`rounded-2xl px-4 py-2 text-sm font-black ${
                          reviewAction === 'APPROVE'
                            ? 'bg-emerald-600 text-white'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewAction('REJECT')}
                        className={`rounded-2xl px-4 py-2 text-sm font-black ${
                          reviewAction === 'REJECT'
                            ? 'bg-red-600 text-white'
                            : 'border border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        Reject
                      </button>
                    </div>

                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Write CEO approval/rejection reason..."
                      className="mt-4 min-h-28 w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      CEO review reason is required and must be at least 10 characters.
                    </p>
                  </section>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={closeDetail}
                disabled={submitting}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitDecision()}
                disabled={submitting || !reviewAction}
                className="rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
              >
                {submitting
                  ? 'Submitting...'
                  : reviewAction === 'REJECT'
                    ? 'Submit Rejection'
                    : 'Submit Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileEmployeeId && (
        <EmployeeChangeProfileModal
          employeeId={profileEmployeeId}
          onClose={() => setProfileEmployeeId(null)}
        />
      )}
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 truncate text-sm font-black text-slate-950">{value || '-'}</p>
  </div>
);

export default EmployeeChangeApprovalPage;
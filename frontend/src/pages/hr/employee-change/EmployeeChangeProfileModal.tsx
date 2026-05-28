import { useEffect, useState } from 'react';
import { employeeChangeRequestService } from '../../../services/employeeChangeRequestService';
import type { EmployeeChangeProfile } from '../../../types/employeeChangeRequest';

type Props = {
  employeeId: number;
  onClose: () => void;
};

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  'Failed to load employee profile.';

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const emptyText = (value?: string | number | boolean | null) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const EmployeeChangeProfileModal = ({ employeeId, onClose }: Props) => {
  const [profile, setProfile] = useState<EmployeeChangeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setMessage('');

    employeeChangeRequestService
      .getEmployeeProfile(employeeId)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Employee Details
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {profile?.employee?.employeeName || 'Workforce Profile'}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {profile?.employee?.employeeEmail || 'KPI, PIP, feedback, team, department, and audit history'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
              Loading employee details...
            </div>
          ) : message ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">
              {message}
            </div>
          ) : !profile ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
              No profile data found.
            </div>
          ) : (
            <div className="grid gap-5">
              <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Position" value={profile.employee?.positionName} />
                <InfoCard label="Level" value={profile.employee?.positionLevel} />
                <InfoCard label="Current Department" value={profile.employee?.currentDepartmentName} />
                <InfoCard label="Parent Department" value={profile.employee?.parentDepartmentName} />
                <InfoCard label="Working Department" value={profile.employee?.workingDepartmentName} />
                <InfoCard label="Role" value={profile.employee?.roleName} />
                <InfoCard label="Active Team" value={profile.employee?.activeTeamName || 'No Active Team'} />
                <InfoCard label="User Email" value={profile.employee?.userEmail} />
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <SnapshotCard
                  title="Current / Latest KPI"
                  rows={[
                    ['Title', profile.currentOrLatestKpi?.title],
                    ['Status', profile.currentOrLatestKpi?.status],
                    ['Cycle', profile.currentOrLatestKpi?.cycleName],
                    ['Period', profile.currentOrLatestKpi?.periodName],
                    ['Assigned At', formatDate(profile.currentOrLatestKpi?.assignedAt)],
                    ['Finalized At', formatDate(profile.currentOrLatestKpi?.finalizedAt)],
                    ['Total Score', profile.currentOrLatestKpi?.totalScore],
                  ]}
                />

                <SnapshotCard
                  title="Current / Latest PIP"
                  rows={[
                    ['Goal', profile.currentOrLatestPip?.goal],
                    ['Active', profile.currentOrLatestPip?.active ? 'Active' : 'Inactive / Closed'],
                    ['Start Date', formatDate(profile.currentOrLatestPip?.startDate)],
                    ['End Date', formatDate(profile.currentOrLatestPip?.endDate)],
                    ['Phase Count', profile.currentOrLatestPip?.phaseCount],
                  ]}
                />

                <SnapshotCard
                  title="Latest Continuous Feedback"
                  rows={[
                    ['Category', profile.latestContinuousFeedback?.category],
                    ['Rating', profile.latestContinuousFeedback?.rating],
                    ['Given By', profile.latestContinuousFeedback?.giverName],
                    ['Team', profile.latestContinuousFeedback?.teamName],
                    ['Created At', formatDate(profile.latestContinuousFeedback?.createdAt)],
                  ]}
                />
              </section>

              <HistoryTable
                title="All KPIs"
                emptyText="No KPI records found."
                headers={['Title', 'Status', 'Cycle', 'Period', 'Assigned', 'Finalized', 'Score']}
                rows={(profile.allKpis || []).map((item) => [
                  item.title,
                  item.status,
                  item.cycleName,
                  item.periodName,
                  formatDate(item.assignedAt),
                  formatDate(item.finalizedAt),
                  item.totalScore,
                ])}
              />

              <HistoryTable
                title="All PIPs"
                emptyText="No PIP records found."
                headers={['Goal', 'Active', 'Start', 'End', 'Created', 'Finished', 'Phases']}
                rows={(profile.allPips || []).map((item) => [
                  item.goal,
                  item.active ? 'Active' : 'Closed',
                  formatDate(item.startDate),
                  formatDate(item.endDate),
                  formatDate(item.createdAt),
                  formatDate(item.finishedAt),
                  item.phaseCount,
                ])}
              />

              <HistoryTable
                title="All Continuous Feedback"
                emptyText="No continuous feedback records found."
                headers={['Category', 'Rating', 'Given By', 'Team', 'Created', 'Feedback']}
                rows={(profile.allContinuousFeedback || []).map((item) => [
                  item.category,
                  item.rating,
                  item.giverName,
                  item.teamName,
                  formatDate(item.createdAt),
                  item.feedbackText,
                ])}
              />

              <HistoryTable
                title="Team History"
                emptyText="No team history found."
                headers={['Team', 'Role', 'Department', 'Status', 'Started', 'Ended']}
                rows={(profile.teamHistory || []).map((item) => [
                  item.teamName,
                  item.roleInTeam,
                  item.departmentName,
                  item.status,
                  formatDate(item.startedDate),
                  formatDate(item.endedDate),
                ])}
              />

              <HistoryTable
                title="Department History"
                emptyText="No department history found."
                headers={['Current Department', 'Parent Department', 'Working Department', 'Start', 'End', 'Assigned By']}
                rows={(profile.departmentHistory || []).map((item) => [
                  item.currentDepartmentName,
                  item.parentDepartmentName,
                  item.workingDepartmentName,
                  formatDate(item.startDate),
                  formatDate(item.endDate),
                  item.assignedBy,
                ])}
              />

              <HistoryTable
                title="Employee Audit History"
                emptyText="No employee audit history found."
                headers={['Field', 'Old Value', 'New Value', 'Edited By', 'Edited At', 'Reason']}
                rows={(profile.auditHistory || []).map((item) => [
                  item.fieldName,
                  item.oldValue,
                  item.newValue,
                  item.editedByName,
                  formatDate(item.editedAt),
                  item.reason,
                ])}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 truncate text-sm font-black text-slate-950">
      {emptyText(value)}
    </p>
  </div>
);

const SnapshotCard = ({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string | number | boolean | null | undefined]>;
}) => (
  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-lg font-black text-slate-950">{title}</h3>
    <div className="mt-4 grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[120px_1fr] gap-3 text-sm">
          <span className="font-black text-slate-500">{label}</span>
          <span className="font-semibold text-slate-800">{emptyText(value)}</span>
        </div>
      ))}
    </div>
  </section>
);

const HistoryTable = ({
  title,
  emptyText: emptyMessage,
  headers,
  rows,
}: {
  title: string;
  emptyText: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
}) => (
  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-lg font-black text-slate-950">{title}</h3>

    {rows.length === 0 ? (
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
        {emptyMessage}
      </div>
    ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="max-w-[320px] px-4 py-3 font-semibold text-slate-600">
                    {emptyText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

export default EmployeeChangeProfileModal;
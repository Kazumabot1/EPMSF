import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { extractErrorMessage } from '../../services/apiError';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type AuditLog = {
  id: number;
  userId?: number | null;
  changedByName?: string | null;
  dashboardRole?: string | null;
  action?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  titleName?: string | null;
  changedColumn?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  summary?: string | null;
  targetEmployeeName?: string | null;
  timestamp?: string | null;
};

const ENTITY_OPTIONS = [
  ['', 'All Entities'],
  ['TEAM', 'Team'],
  ['DEPARTMENT', 'Department'],
  ['EMPLOYEE', 'Employee'],
  ['ASSESSMENT_FORM', 'Assessment Form'],
  ['APPRAISAL_TEMPLATE', 'Appraisal Template Form'],
  ['APPRAISAL_CYCLE', 'Appraisal Cycle'],
  ['ONE_ON_ONE_MEETING', 'One-on-One Meeting'],
  ['POSITION_LEVEL', 'Position Level'],
  ['POSITION', 'Position'],
  ['ROLE', 'Role'],
  ['USER_DASHBOARD', 'User Dashboard'],
  ['KPI_TEMPLATE_FORM', 'KPI Template Form'],
  ['KPI_TEMPLATE_CYCLE', 'KPI Template Cycle'],
  ['KPI_UNIT', 'KPI Unit'],
  ['KPI_CATEGORY', 'KPI Category'],
  ['KPI_ITEM', 'KPI Items'],
  ['DEPARTMENT_KPI_TEMPLATE', 'Department KPI Template Form'],
  ['DEPARTMENT_KPI_CYCLE', 'Department KPI Cycle'],
  ['DEPARTMENT_KPI_SCORE', 'Department KPI Score'],
] as const;

const ROLE_OPTIONS = [
  ['', 'All Roles'],
  ['HRADMIN', 'HR Admin'],
  ['HR', 'HR'],
  ['MANAGER', 'Manager'],
  ['DEPARTMENT_HEAD', 'Department Head'],
  ['SYSTEM', 'System'],
] as const;

const ACTION_OPTIONS = [
  ['', 'All Actions'],
  ['CREATE', 'Create'],
  ['UPDATE', 'Edit'],
  ['DEACTIVATE', 'Deactivate'],
  ['ACTIVATE', 'Active'],
  ['CLOSE', 'Close'],
  ['CANCEL', 'Cancel'],
  ['SUBMIT', 'Submit'],
  ['SCORE', 'Score / Grade'],
] as const;

const unwrap = <T,>(payload: ApiEnvelope<T> | T, fallback: T): T => {
  if (Array.isArray(payload)) return payload as T;
  return (payload as ApiEnvelope<T>).data ?? fallback;
};

const formatDateTime = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return '-';

  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatEntity = (value?: string | null) => {
  if (!value) return '-';
  const match = ENTITY_OPTIONS.find(([optionValue]) => optionValue === value);
  return match?.[1] ?? value.replaceAll('_', ' ');
};

const formatValue = (value?: string | null) => {
  if (value === null || value === undefined || value === '') return '-';
  if (value === 'true') return 'Active';
  if (value === 'false') return 'Inactive';
  return value;
};

const exportCsv = (logs: AuditLog[]) => {
  const headers = ['Timestamp', 'User', 'Action', 'Dashboard Role', 'Title Name', 'Entity', 'Reason', 'Summary'];
  const rows = logs.map((log) => [
    formatDateTime(log.timestamp),
    log.changedByName ?? '',
    log.action ?? '',
    log.dashboardRole ?? '',
    log.titleName ?? '',
    formatEntity(log.entityType),
    log.reason ?? '',
    log.summary ?? '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex items-start justify-between gap-6 border-b border-slate-100 py-4">
    <dt className="text-sm font-medium text-slate-500">{label}</dt>
    <dd className="max-w-[62%] text-right text-sm font-medium text-slate-900">{value ?? '-'}</dd>
  </div>
);

const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [entityType, setEntityType] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const next: Record<string, string> = {};
    if (entityType) next.entityType = entityType;
    if (actorRole) next.actorRole = actorRole;
    if (action) next.action = action;
    if (search.trim()) next.search = search.trim();
    return next;
  }, [entityType, actorRole, action, search]);

  const loadLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<ApiEnvelope<AuditLog[]> | AuditLog[]>('/audit-logs', { params });
      setLogs(unwrap<AuditLog[]>(response.data, []));
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load audit logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs();
    }, search.trim() ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [params]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-7 text-slate-950">
      <div className="mb-7">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="font-semibold text-slate-900">Audit Logs</span>
        </div>
        <h1 className="text-3xl font-bold tracking-normal">Audit Logs</h1>
        <p className="mt-2 text-base text-slate-500">Track all system activities and changes</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <label className="relative min-w-[260px] flex-1 max-w-md">
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search audit logs..."
              />
            </label>

            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
            >
              {ENTITY_OPTIONS.map(([value, label]) => (
                <option key={value || 'all'} value={value}>{label}</option>
              ))}
            </select>

            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={actorRole}
              onChange={(event) => setActorRole(event.target.value)}
            >
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value || 'all'} value={value}>{label}</option>
              ))}
            </select>

            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              {ACTION_OPTIONS.map(([value, label]) => (
                <option key={value || 'all'} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => exportCsv(logs)}
            disabled={logs.length === 0}
          >
            <i className="bi bi-download" />
            Export
          </button>
        </div>

        {error && (
          <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['Timestamp', 'User', 'Action', 'Dashboard Role', 'Title Name'].map((heading) => (
                  <th key={heading} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={5}>Loading audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={5}>No audit logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="cursor-pointer transition hover:bg-slate-50"
                    onClick={() => setSelectedLog(log)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setSelectedLog(log);
                    }}
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-sm text-slate-700">{formatDateTime(log.timestamp)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-950">{log.changedByName || '-'}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        {log.action || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{log.dashboardRole || '-'}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">{log.titleName || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
          <aside
            className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-7 py-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Audit Log Detail</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {(selectedLog.action || 'action').toLowerCase()} on {formatEntity(selectedLog.entityType)}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setSelectedLog(null)}
                aria-label="Close audit detail"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <dl className="px-7 py-6">
              <DetailRow label="Timestamp" value={formatDateTime(selectedLog.timestamp)} />
              <DetailRow label="User" value={selectedLog.changedByName} />
              <DetailRow label="Dashboard Role" value={selectedLog.dashboardRole} />
              <DetailRow label="Action" value={selectedLog.action} />
              <DetailRow label="Entity Type" value={formatEntity(selectedLog.entityType)} />
              <DetailRow label="Entity ID" value={selectedLog.entityId} />
              <DetailRow label="Title Name" value={selectedLog.titleName} />
              <DetailRow label="Changed Column" value={selectedLog.changedColumn} />
              <DetailRow label="Target Employee" value={selectedLog.targetEmployeeName} />
              <DetailRow label="Old Value" value={formatValue(selectedLog.oldValue)} />
              <DetailRow label="New Value" value={formatValue(selectedLog.newValue)} />
              <DetailRow label="Reason" value={selectedLog.reason || 'No reason provided'} />

              <div className="pt-5">
                <dt className="mb-3 text-sm font-bold text-slate-800">Summary</dt>
                <dd className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {selectedLog.summary || '-'}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </main>
  );
};

export default AdminAuditLogsPage;

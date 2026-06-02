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

const PAGE_SIZE = 10;

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
] as const;

const ROLE_OPTIONS = [
  ['', 'All Roles'],
  ['ADMIN', 'Admin'],
  ['HR', 'HR'],
  ['MANAGER', 'Manager'],
  ['DEPARTMENT_HEAD', 'Department Head'],
  ['SYSTEM', 'System'],
] as const;

const ACTION_OPTIONS = [
  ['', 'All Actions'],
  ['CREATE', 'Create'],
  ['UPDATE', 'Update'],
  ['DEACTIVATE', 'Deactivate'],
  ['ACTIVATE', 'Activate'],
  ['CLOSE', 'Close'],
  ['CANCEL', 'Cancel'],
  ['SUBMIT', 'Submit'],
  ['SCORE', 'Score / Grade'],
] as const;

const unwrap = <T,>(payload: ApiEnvelope<T> | T, fallback: T): T => {
  if (Array.isArray(payload)) return payload as T;
  return (payload as ApiEnvelope<T>).data ?? fallback;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDateTime = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours24 = date.getHours();
  const minutes = pad2(date.getMinutes());
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = pad2(hours24 % 12 || 12);

  return `${day}-${month}-${year} (${hours12}:${minutes} ${suffix})`;
};

const formatEntity = (value?: string | null) => {
  if (!value) return '-';
  const match = ENTITY_OPTIONS.find(([optionValue]) => optionValue === value);
  return match?.[1] ?? value.replaceAll('_', ' ');
};

const formatRole = (value?: string | null) => {
  if (!value) return '-';
  return value.replace(/^ROLE_/i, '').replaceAll('_', ' ');
};

const formatValue = (value?: string | null) => {
  if (value === null || value === undefined || value === '') return '-';
  if (value === 'true') return 'Active';
  if (value === 'false') return 'Inactive';
  return value;
};

const actionTone = (action?: string | null) => {
  const normalized = String(action ?? '').toUpperCase();
  if (normalized.includes('CREATE')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized.includes('UPDATE') || normalized.includes('SCORE')) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (normalized.includes('DELETE') || normalized.includes('DEACTIVATE') || normalized.includes('REJECT')) {
    return 'border-red-200 bg-red-50 text-red-700';
  }
  if (normalized.includes('ACTIVATE') || normalized.includes('APPROVE')) return 'border-teal-200 bg-teal-50 text-teal-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
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

const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [entityType, setEntityType] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<ApiEnvelope<AuditLog[]> | AuditLog[]>('/audit-logs', {
        params: entityType ? { entityType } : {},
      });
      setLogs(unwrap<AuditLog[]>(response.data, []));
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load audit logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [entityType]);

  useEffect(() => {
    setPage(1);
  }, [action, actorRole, entityType, search]);

  const filteredLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const selectedRole = actorRole.toUpperCase();
    const selectedAction = action.toUpperCase();

    return logs.filter((log) => {
      const role = String(log.dashboardRole ?? '').toUpperCase();
      const logAction = String(log.action ?? '').toUpperCase();
      const matchesRole = !selectedRole || role.includes(selectedRole);
      const matchesAction = !selectedAction || logAction.includes(selectedAction);
      const matchesSearch =
        !needle ||
        [
          log.changedByName,
          log.dashboardRole,
          log.action,
          log.entityType,
          log.titleName,
          log.changedColumn,
          log.oldValue,
          log.newValue,
          log.reason,
          log.summary,
          log.targetEmployeeName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle);

      return matchesRole && matchesAction && matchesSearch;
    });
  }, [action, actorRole, logs, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = filteredLogs.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredLogs.length);
  const visibleLogs = filteredLogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const summary = useMemo(() => {
    const users = new Set(logs.map((log) => log.changedByName).filter(Boolean));
    const entities = new Set(logs.map((log) => log.entityType).filter(Boolean));

    return {
      total: logs.length,
      filtered: filteredLogs.length,
      users: users.size,
      entities: entities.size,
    };
  }, [filteredLogs.length, logs]);

  return (
    <main className="min-h-[calc(100vh-86px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>Dashboard</span>
          <i className="bi bi-chevron-right text-xs text-slate-300" aria-hidden />
          <span className="text-slate-700">Audit Logs</span>
        </nav>

        <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-white via-blue-50/60 to-slate-50 px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-blue-700 shadow-sm">
                  <i className="bi bi-shield-check" aria-hidden />
                  HR Admin Audit
                </div>
                <h1 className="text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">Audit Logs</h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                  Track system activities, record changes, editor actions, and entity-level updates from one controlled view.
                </p>
              </div>

              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => exportCsv(filteredLogs)}
                disabled={filteredLogs.length === 0}
              >
                <i className="bi bi-download" aria-hidden />
                Export
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Logs" value={summary.total} icon="bi-list-check" />
              <MetricCard label="Filtered Results" value={summary.filtered} icon="bi-funnel" />
              <MetricCard label="Editors" value={summary.users} icon="bi-people" />
              <MetricCard label="Entities" value={summary.entities} icon="bi-boxes" />
            </div>
          </div>

          <div className="px-5 py-5 sm:px-7">
            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(3,minmax(160px,190px))_auto]">
                <label className="relative">
                  <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search audit logs..."
                  />
                </label>

                <FilterSelect value={entityType} onChange={setEntityType} options={ENTITY_OPTIONS} />
                <FilterSelect value={actorRole} onChange={setActorRole} options={ROLE_OPTIONS} />
                <FilterSelect value={action} onChange={setAction} options={ACTION_OPTIONS} />

                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                  onClick={() => {
                    setSearch('');
                    setEntityType('');
                    setActorRole('');
                    setAction('');
                  }}
                >
                  <i className="bi bi-x-circle" aria-hidden />
                  Clear
                </button>
              </div>
            </section>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                {error}
              </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Dashboard Role</th>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">Title Name</th>
                      <th className="px-4 py-3">Changed Column</th>
                      <th className="px-4 py-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <TableState message="Loading audit logs..." />
                    ) : visibleLogs.length === 0 ? (
                      <TableState message="No audit logs found." />
                    ) : (
                      visibleLogs.map((log) => (
                        <tr key={log.id} className="align-top transition hover:bg-blue-50/40">
                          <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-slate-700">
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td className="px-4 py-4">
                            <strong className="block font-black text-slate-950">{log.changedByName || '-'}</strong>
                            {log.userId != null && <span className="mt-1 block text-xs font-bold text-slate-400">#{log.userId}</span>}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-black ${actionTone(log.action)}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {log.action || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-700">{formatRole(log.dashboardRole)}</td>
                          <td className="px-4 py-4 font-semibold text-slate-700">{formatEntity(log.entityType)}</td>
                          <td className="max-w-[220px] px-4 py-4 font-semibold text-slate-700">
                            <span className="block truncate" title={log.titleName ?? ''}>{log.titleName || '-'}</span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-600">{log.changedColumn || '-'}</td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                              onClick={() => setSelectedLog(log)}
                            >
                              <i className="bi bi-eye" aria-hidden />
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-500">
                  Showing {pageStart}-{pageEnd} of {filteredLogs.length}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="h-9 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    disabled={safePage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .slice(Math.max(0, safePage - 5), Math.max(10, safePage + 4))
                    .map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black transition ${
                          pageNumber === safePage
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  <button
                    type="button"
                    className="h-9 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
          <aside
            className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-7 py-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Audit Detail</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{formatEntity(selectedLog.entityType)}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selectedLog.action || 'Action'} by {selectedLog.changedByName || '-'}
                </p>
              </div>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                onClick={() => setSelectedLog(null)}
                aria-label="Close audit detail"
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>

            <dl className="px-7 py-6">
              <DetailRow label="Timestamp" value={formatDateTime(selectedLog.timestamp)} />
              <DetailRow label="User" value={selectedLog.changedByName} />
              <DetailRow label="Dashboard Role" value={formatRole(selectedLog.dashboardRole)} />
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
                <dt className="mb-3 text-sm font-black text-slate-800">Summary</dt>
                <dd className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
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

const FilterSelect = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) => (
  <select
    className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
    value={value}
    onChange={(event) => onChange(event.target.value)}
  >
    {options.map(([optionValue, label]) => (
      <option key={optionValue || 'all'} value={optionValue}>
        {label}
      </option>
    ))}
  </select>
);

const MetricCard = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
  <article className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <i className={`bi ${icon} text-blue-700`} aria-hidden />
    </div>
    <strong className="mt-3 block text-3xl font-black text-slate-950">{value}</strong>
  </article>
);

const TableState = ({ message }: { message: string }) => (
  <tr>
    <td className="px-5 py-12 text-center text-sm font-bold text-slate-500" colSpan={8}>
      {message}
    </td>
  </tr>
);

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex items-start justify-between gap-6 border-b border-slate-100 py-4">
    <dt className="text-sm font-bold text-slate-500">{label}</dt>
    <dd className="max-w-[62%] break-words text-right text-sm font-black text-slate-900">{value ?? '-'}</dd>
  </div>
);

export default AdminAuditLogsPage;

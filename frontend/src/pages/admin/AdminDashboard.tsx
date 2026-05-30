import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { DashboardChartCard, DonutSummaryChart, HorizontalBarChart } from '../../components/dashboard';
import EmployeeAvatar from '../../components/EmployeeAvatar';
import { exportToExcel, todayStr } from '../../utils/exportExcel';

type DepartmentOption = {
  id: number;
  department_name?: string;
  departmentName?: string;
};

type PositionOption = {
  id: number;
  positionTitle?: string;
  positionName?: string;
};

type RoleOption = {
  id: number;
  name: string;
};

type DashboardOption = {
  value: string;
  label: string;
  helper: string;
};

type DashboardAuditRow = {
  id: number;
  changedByUserId?: number | null;
  changedByName?: string | null;
  oldDashboard?: string | null;
  newDashboard?: string | null;
  reason?: string | null;
  timestamp?: string | null;
};

interface CreateOptions {
  departments: DepartmentOption[];
  positions: PositionOption[];
  roles: RoleOption[];
}

interface AdminUserAccount {
  userId: number;
  fullName: string;
  email: string;
  employeeCode?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  positionId?: number | null;
  positionName?: string | null;
  roleName?: string | null;
  dashboard?: string | null;
  active?: boolean;
  accountStatus?: string | null;
  mustChangePassword?: boolean;
  temporaryPasswordEmailSent?: boolean;
  message?: string;
  smtpErrorDetail?: string | null;
  profileImageData?: string | null;
  profileImageType?: string | null;
}

type IconName =
    | 'alert'
    | 'arrow'
    | 'building'
    | 'check'
    | 'clock'
    | 'database'
    | 'download'
    | 'edit'
    | 'filter'
    | 'info'
    | 'key'
    | 'plus'
    | 'search'
    | 'shield'
    | 'spark'
    | 'table'
    | 'upload'
    | 'user'
    | 'users'
    | 'work';

type NoticeState = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

type ExportUserRow = {
  fullName: string;
  email: string;
  employeeCode: string;
  departmentName: string;
  positionName: string;
  roleName: string;
  dashboard: string;
  status: string;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20] as const;

const unwrap = <T,>(payload: unknown, fallback: T): T => {
  const response = payload as { data?: unknown } | undefined;
  const body = response?.data as { data?: unknown } | undefined;

  return (body?.data ?? response?.data ?? fallback) as T;
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
  const error = err as {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  return error.response?.data?.message || error.response?.data?.error || error.message || fallback;
};

const dashboardOptions: DashboardOption[] = [
  {
    value: 'EMPLOYEE_DASHBOARD',
    label: 'Employee Dashboard',
    helper: 'Employee self-service workspace.',
  },
  {
    value: 'MANAGER_DASHBOARD',
    label: 'Manager Dashboard',
    helper: 'Manager review, KPI, team and appraisal workspace.',
  },
  {
    value: 'DEPARTMENT_HEAD_DASHBOARD',
    label: 'Department Head Dashboard',
    helper: 'Department review, assessment, appraisal and reports workspace.',
  },
  {
    value: 'HR_DASHBOARD',
    label: 'HR Dashboard',
    helper: 'HR configuration and organization workspace.',
  },
  {
    value: 'EXECUTIVE_DASHBOARD',
    label: 'CEO / Executive Dashboard',
    helper: 'Executive reports and company overview.',
  },
  {
    value: 'HRADMIN_DASHBOARD',
    label: 'HR Admin Dashboard',
    helper: 'User accounts, access control and admin settings.',
  },
];

const coreRoles: RoleOption[] = [
  { id: 1, name: 'EMPLOYEE' },
  { id: 2, name: 'HR' },
  { id: 3, name: 'HRADMIN' },
  { id: 4, name: 'MANAGER' },
  { id: 5, name: 'DEPARTMENT_HEAD' },
  { id: 6, name: 'CEO' },
];

const iconPaths: Record<IconName, string> = {
  alert:
      'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
  arrow: 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3',
  building:
      'M3 21h18M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M9 7h1m-1 4h1m-1 4h1m4-8h1m-1 4h1m-1 4h1M19 21v-9a2 2 0 0 0-2-2h-1',
  check: 'm5 13 4 4L19 7',
  clock: 'M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  database:
      'M4 7c0 2 3.6 3.5 8 3.5S20 9 20 7s-3.6-3.5-8-3.5S4 5 4 7Zm0 0v10c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5V7M4 12c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
  edit: 'm16.86 3.49 3.65 3.65L8.5 19.15 4 20l.85-4.5L16.86 3.49Z',
  filter: 'M4 5h16M7 12h10M10 19h4',
  info: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  key: 'M15 7a4 4 0 1 1-2.83 6.83L9 17H6v3H3v-3l5.17-5.17A4 4 0 0 1 15 7Z',
  plus: 'M12 5v14m-7-7h14',
  search: 'm21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z',
  shield: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z',
  spark:
      'M12 3l1.4 4.4L18 9l-4.6 1.6L12 15l-1.4-4.4L6 9l4.6-1.6L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z',
  table: 'M4 5h16v14H4V5Zm0 5h16M9 5v14',
  upload: 'M12 21V9m0 0-4 4m4-4 4 4M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0',
  users:
      'M16 21a6 6 0 0 0-12 0M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10a5 5 0 0 0-5-5m1-10a3 3 0 1 1 0 6',
  work: 'M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1m-9 0h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm3 6h8',
};

const Icon = ({ name, className = '' }: { name: IconName; className?: string }) => (
    <svg
        className={className || 'h-5 w-5'}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
);

const normalizeRoleName = (role?: string | null) => {
  const value = String(role || 'EMPLOYEE')
      .replace(/^ROLE_/i, '')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .trim()
      .toUpperCase();

  if (
      value === 'PROJECT_MANAGER' ||
      value === 'PROJECTMANAGER' ||
      value === 'TEAM_MANAGER' ||
      value === 'PM'
  ) {
    return 'MANAGER';
  }

  if (
      value === 'DEPARTMENTHEAD' ||
      value === 'DEPT_HEAD' ||
      value === 'HEAD_OF_DEPARTMENT'
  ) {
    return 'DEPARTMENT_HEAD';
  }

  if (value === 'EXECUTIVE' || value === 'CEO') {
    return 'CEO';
  }

  if (
      value === 'HRADMIN' ||
      value === 'HR' ||
      value === 'MANAGER' ||
      value === 'DEPARTMENT_HEAD' ||
      value === 'EMPLOYEE' ||
      value === 'CEO'
  ) {
    return value;
  }

  return 'EMPLOYEE';
};

const defaultDashboardForRole = (role?: string | null) => {
  const normalized = normalizeRoleName(role);

  switch (normalized) {
    case 'HRADMIN':
      return 'HRADMIN_DASHBOARD';
    case 'HR':
      return 'HR_DASHBOARD';
    case 'CEO':
      return 'EXECUTIVE_DASHBOARD';
    case 'DEPARTMENT_HEAD':
      return 'DEPARTMENT_HEAD_DASHBOARD';
    case 'MANAGER':
      return 'MANAGER_DASHBOARD';
    case 'EMPLOYEE':
    default:
      return 'EMPLOYEE_DASHBOARD';
  }
};

const normalizeDashboard = (dashboard?: string | null, role?: string | null) => {
  const value = String(dashboard || '')
      .replace(/^ROLE_/i, '')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .trim()
      .toUpperCase();

  switch (value) {
    case 'HRADMIN':
    case 'HRADMIN_DASHBOARD':
      return 'HRADMIN_DASHBOARD';
    case 'HR':
    case 'HR_DASHBOARD':
      return 'HR_DASHBOARD';
    case 'CEO':
    case 'EXECUTIVE':
    case 'CEO_DASHBOARD':
    case 'EXECUTIVE_DASHBOARD':
      return 'EXECUTIVE_DASHBOARD';
    case 'DEPARTMENTHEAD':
    case 'DEPARTMENT_HEAD':
    case 'DEPT_HEAD':
    case 'HEAD_OF_DEPARTMENT':
    case 'DEPARTMENTHEAD_DASHBOARD':
    case 'DEPARTMENT_HEAD_DASHBOARD':
    case 'DEPT_HEAD_DASHBOARD':
      return 'DEPARTMENT_HEAD_DASHBOARD';
    case 'MANAGER':
    case 'PROJECT_MANAGER':
    case 'TEAM_MANAGER':
    case 'MANAGER_DASHBOARD':
      return 'MANAGER_DASHBOARD';
    case 'EMPLOYEE':
    case 'EMPLOYEE_DASHBOARD':
      return 'EMPLOYEE_DASHBOARD';
    default:
      return defaultDashboardForRole(role);
  }
};

const roleDisplayName = (role?: string | null) => {
  const normalized = normalizeRoleName(role);

  switch (normalized) {
    case 'DEPARTMENT_HEAD':
      return 'Department Head';
    case 'EMPLOYEE':
      return 'Employee';
    case 'MANAGER':
      return 'Manager';
    case 'HRADMIN':
      return 'HR Admin';
    case 'HR':
      return 'HR';
    case 'CEO':
      return 'CEO';
    default:
      return normalized;
  }
};

const dashboardDisplayName = (dashboard?: string | null, role?: string | null) => {
  const normalized = normalizeDashboard(dashboard, role);
  return dashboardOptions.find((item) => item.value === normalized)?.label ?? normalized;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const getDepartmentName = (department: DepartmentOption) =>
    department.department_name ?? department.departmentName ?? `Department #${department.id}`;

const getPositionName = (position: PositionOption) =>
    position.positionTitle ?? position.positionName ?? `Position #${position.id}`;

const getVisiblePageNumbers = (currentPage: number, totalPages: number) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
};

const Panel = ({
                 title,
                 subtitle,
                 icon,
                 action,
                 children,
               }: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
  children: ReactNode;
}) => (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <Icon name={icon} className="h-5 w-5" />
          </span>
          )}

          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-950">{title}</h2>
            {subtitle && <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {action && <div className="flex flex-shrink-0 justify-start md:justify-end">{action}</div>}
      </div>

      <div className="min-w-0 flex-1 p-5">{children}</div>
    </section>
);

const MetricCard = ({
                      label,
                      value,
                      helper,
                      icon,
                      tone = 'blue',
                    }: {
  label: string;
  value: string | number;
  helper: string;
  icon: IconName;
  tone?: 'blue' | 'green' | 'amber' | 'rose' | 'violet';
}) => {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  }[tone];

  return (
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-500">{label}</p>
            <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-950">
              {value}
            </strong>
          </div>

          <span className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl ${toneClass}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
        </div>

        <p className="mt-3 text-sm leading-5 text-slate-500">{helper}</p>
      </article>
  );
};

const ActionRow = ({
                     icon,
                     title,
                     description,
                     meta,
                     to,
                     onClick,
                     disabled = false,
                   }: {
  icon: IconName;
  title: string;
  description: string;
  meta?: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
}) => {
  const content = (
      <>
      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
        <Icon name={icon} className="h-5 w-5" />
      </span>

        <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-slate-500">{description}</span>
      </span>

        {meta && (
            <span className="hidden flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 sm:inline-flex">
          {meta}
        </span>
        )}

        <Icon name="arrow" className="h-4 w-4 flex-shrink-0 text-slate-400" />
      </>
  );

  const className = `flex w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm ${
      disabled ? 'cursor-not-allowed opacity-60' : ''
  }`;

  if (to && !disabled) {
    return (
        <Link to={to} className={className}>
          {content}
        </Link>
    );
  }

  return (
      <button type="button" className={className} onClick={onClick} disabled={disabled}>
        {content}
      </button>
  );
};

const StatusPill = ({
                      children,
                      tone,
                    }: {
  children: ReactNode;
  tone: 'green' | 'red' | 'blue' | 'slate' | 'amber' | 'violet';
}) => {
  const toneClass = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  }[tone];

  return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClass}`}>
      {children}
    </span>
  );
};

const EmptyState = ({ title, message }: { title: string; message: string }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon name="info" className="h-5 w-5" />
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-500">{message}</p>
    </div>
);

const Notice = ({ notice, onClose }: { notice: NoticeState; onClose: () => void }) => {
  if (!notice) return null;

  const toneClass = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  }[notice.type];

  return (
      <div className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${toneClass}`}>
      <span className="flex min-w-0 items-start gap-2">
        <Icon name={notice.type === 'error' ? 'alert' : 'info'} className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{notice.message}</span>
      </span>

        <button type="button" className="text-current opacity-70 hover:opacity-100" onClick={onClose}>
          <Icon name="plus" className="h-4 w-4 rotate-45" />
        </button>
      </div>
  );
};

const Field = ({
                 label,
                 required,
                 children,
               }: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) => (
    <label className="min-w-0 space-y-2">
    <span className="block text-sm font-bold text-slate-700">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
      {children}
    </label>
);

const Pagination = ({
                      currentPage,
                      totalPages,
                      pageSize,
                      totalItems,
                      startItem,
                      endItem,
                      onPageChange,
                      onPageSizeChange,
                    }: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) => {
  const visiblePages = getVisiblePageNumbers(currentPage, totalPages);

  return (
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm font-semibold text-slate-500">
          {totalItems > 0 ? (
              <>
                Showing <span className="font-black text-slate-800">{startItem}</span>–
                <span className="font-black text-slate-800">{endItem}</span> of{' '}
                <span className="font-black text-slate-800">{totalItems}</span> accounts
              </>
          ) : (
              'No accounts to display'
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            Rows
            <select
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                value={pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1">
            <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || totalItems === 0}
            >
              Previous
            </button>

            <div className="hidden items-center gap-1 sm:flex">
              {visiblePages.map((page, index) => {
                const previousPage = visiblePages[index - 1];
                const showGap = previousPage && page - previousPage > 1;

                return (
                    <span key={page} className="flex items-center gap-1">
                  {showGap && <span className="px-1 text-sm font-black text-slate-400">…</span>}
                      <button
                          type="button"
                          className={`grid h-9 w-9 place-items-center rounded-xl border text-sm font-black transition ${
                              page === currentPage
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                          onClick={() => onPageChange(page)}
                      >
                    {page}
                  </button>
                </span>
                );
              })}
            </div>

            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 sm:hidden">
            {currentPage}/{totalPages}
          </span>

            <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || totalItems === 0}
            >
              Next
            </button>
          </div>
        </div>
      </div>
  );
};

const inputClass =
    'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100';

const selectClass =
    'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100';

const AdminDashboard = () => {
  const location = useLocation();
  const isUserAccountsPage = location.pathname === '/hradmin/users';

  const [options, setOptions] = useState<CreateOptions>({
    departments: [],
    positions: [],
    roles: [],
  });

  const [users, setUsers] = useState<AdminUserAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [savedUser, setSavedUser] = useState<AdminUserAccount | null>(null);
  const [dashboardAuditRows, setDashboardAuditRows] = useState<DashboardAuditRow[]>([]);
  const [dashboardAuditLoading, setDashboardAuditLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    employeeCode: '',
    departmentId: '',
    positionId: '',
    roleName: 'EMPLOYEE',
    dashboard: 'EMPLOYEE_DASHBOARD',
    active: true,
  });

  const resetForm = () => {
    setForm({
      fullName: '',
      email: '',
      employeeCode: '',
      departmentId: '',
      positionId: '',
      roleName: 'EMPLOYEE',
      dashboard: 'EMPLOYEE_DASHBOARD',
      active: true,
    });
    setEditingUserId(null);
    setSavedUser(null);
    setDashboardAuditRows([]);
    setError('');
  };

  const loadOptions = async () => {
    const [departmentRes, positionRes] = await Promise.allSettled([
      api.get('/departments'),
      api.get('/positions'),
    ]);

    setOptions({
      departments:
          departmentRes.status === 'fulfilled'
              ? unwrap<DepartmentOption[]>(departmentRes.value, [])
              : [],
      positions:
          positionRes.status === 'fulfilled' ? unwrap<PositionOption[]>(positionRes.value, []) : [],
      roles: [],
    });
  };

  const loadUsers = async () => {
    try {
      setListLoading(true);

      const response = await api.get('/users');
      const data = unwrap<AdminUserAccount[]>(response, []);

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load admin users', err);
      setUsers([]);
      setNotice({ type: 'error', message: 'Unable to load user accounts right now.' });
    } finally {
      setListLoading(false);
    }
  };

  const loadDashboardAudit = async (userId: number) => {
    try {
      setDashboardAuditLoading(true);

      const response = await api.get(`/users/${userId}/dashboard-audit`);
      const data = unwrap<DashboardAuditRow[]>(response, []);

      setDashboardAuditRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load dashboard audit', err);
      setDashboardAuditRows([]);
    } finally {
      setDashboardAuditLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    void loadOptions();
    void loadUsers();
  }, []);

  const roleOptions = useMemo(() => {
    const source = [...coreRoles, ...options.roles];

    const cleaned = source.map((role) => ({
      ...role,
      name: normalizeRoleName(role.name),
    }));

    const unique = new Map<string, RoleOption>();

    cleaned.forEach((role) => {
      if (!unique.has(role.name)) {
        unique.set(role.name, role);
      }
    });

    const order = ['EMPLOYEE', 'HR', 'HRADMIN', 'MANAGER', 'DEPARTMENT_HEAD', 'CEO'];

    return Array.from(unique.values()).sort(
        (a, b) => order.indexOf(a.name) - order.indexOf(b.name),
    );
  }, [options.roles]);

  const duplicateEmailUser = useMemo(() => {
    const email = form.email.trim().toLowerCase();

    if (!email) return null;

    return (
        users.find((user) => {
          if (!user.email) return false;
          if (editingUserId && user.userId === editingUserId) return false;
          return user.email.trim().toLowerCase() === email;
        }) ?? null
    );
  }, [editingUserId, form.email, users]);

  const selectedDashboardHelper = useMemo(
      () => dashboardOptions.find((item) => item.value === form.dashboard)?.helper ?? '',
      [form.dashboard],
  );

  const activeUsers = useMemo(() => users.filter((user) => user.active !== false), [users]);
  const inactiveUsers = useMemo(() => users.filter((user) => user.active === false), [users]);
  const attentionUsers = useMemo(
      () =>
          users.filter(
              (user) =>
                  user.active === false ||
                  user.mustChangePassword ||
                  !user.roleName ||
                  !user.dashboard ||
                  !user.departmentName ||
                  !user.positionName,
          ),
      [users],
  );

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return users;

    return users.filter((user) =>
        [
          user.fullName,
          user.email,
          user.employeeCode,
          user.departmentName,
          user.positionName,
          user.roleName,
          user.dashboard,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [searchTerm, users]);

  const totalPages = useMemo(
      () => Math.max(1, Math.ceil(filteredUsers.length / pageSize)),
      [filteredUsers.length, pageSize],
  );

  const paginatedUsers = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;

    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredUsers, pageSize, totalPages]);

  const pageStartItem = filteredUsers.length === 0 ? 0 : (Math.min(currentPage, totalPages) - 1) * pageSize + 1;
  const pageEndItem = Math.min(pageStartItem + paginatedUsers.length - 1, filteredUsers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, isUserAccountsPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const dashboardSummary = useMemo(() => {
    const counts = new Map<string, number>();

    users.forEach((user) => {
      const dashboard = normalizeDashboard(user.dashboard, user.roleName);
      counts.set(dashboard, (counts.get(dashboard) ?? 0) + 1);
    });

    return dashboardOptions
        .map((option) => ({ ...option, count: counts.get(option.value) ?? 0 }))
        .filter((option) => option.count > 0)
        .sort((a, b) => b.count - a.count);
  }, [users]);

  const accountStatusChart = useMemo(
      () => [
        { label: 'Active', value: activeUsers.length, color: '#16a34a' },
        { label: 'Inactive', value: inactiveUsers.length, color: '#dc2626' },
        { label: 'Needs attention', value: attentionUsers.length, color: '#d97706' },
      ],
      [activeUsers.length, attentionUsers.length, inactiveUsers.length],
  );

  const dashboardAssignmentBars = useMemo(
      () =>
          dashboardSummary.map((item, index) => ({
            label: item.label,
            value: item.count,
            detail: item.helper,
            color: ['#2563eb', '#0284c7', '#0891b2', '#16a34a', '#d97706', '#64748b'][index % 6],
          })),
      [dashboardSummary],
  );

  const openCreate = () => {
    resetForm();
    setShowForm(true);
    setNotice(null);

    window.requestAnimationFrame(() => {
      document.getElementById('admin-account-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const openEdit = (user: AdminUserAccount) => {
    const roleName = normalizeRoleName(user.roleName || 'EMPLOYEE');

    setEditingUserId(user.userId);
    setSavedUser(null);
    setError('');
    setNotice(null);

    setForm({
      fullName: user.fullName || '',
      email: user.email || '',
      employeeCode: user.employeeCode || '',
      departmentId: user.departmentId ? String(user.departmentId) : '',
      positionId: user.positionId ? String(user.positionId) : '',
      roleName,
      dashboard: normalizeDashboard(user.dashboard, roleName),
      active: user.active !== false,
    });

    setShowForm(true);
    void loadDashboardAudit(user.userId);

    window.requestAnimationFrame(() => {
      document.getElementById('admin-account-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const validate = () => {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (duplicateEmailUser) {
      return `Email is already used by ${duplicateEmailUser.fullName || duplicateEmailUser.email}.`;
    }
    if (!form.roleName.trim()) return 'Role is required.';
    if (!form.dashboard.trim()) return 'Dashboard is required.';
    return '';
  };

  const buildPayload = () => ({
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    employeeCode: form.employeeCode.trim() || null,
    departmentId: form.departmentId ? Number(form.departmentId) : null,
    positionId: form.positionId ? Number(form.positionId) : null,
    roleName: normalizeRoleName(form.roleName || 'EMPLOYEE'),
    dashboard: normalizeDashboard(form.dashboard, form.roleName),
    active: form.active,
    sendTemporaryPasswordEmail: !editingUserId,
  });

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSavedUser(null);
    setNotice(null);

    try {
      const payload = buildPayload();

      const response = editingUserId
          ? await api.put(`/users/${editingUserId}`, payload)
          : await api.post('/users', payload);

      const saved = unwrap<AdminUserAccount>(response, {} as AdminUserAccount);

      setSavedUser(saved);
      setNotice({
        type: 'success',
        message: editingUserId ? 'Account updated successfully.' : 'Login account created successfully.',
      });

      setUsers((previous) => {
        if (editingUserId) {
          return previous.map((item) =>
              item.userId === editingUserId ? { ...item, ...saved } : item,
          );
        }

        return [saved, ...previous];
      });

      if (!editingUserId) {
        setForm({
          fullName: '',
          email: '',
          employeeCode: '',
          departmentId: '',
          positionId: '',
          roleName: 'EMPLOYEE',
          dashboard: 'EMPLOYEE_DASHBOARD',
          active: true,
        });
      } else {
        await loadDashboardAudit(editingUserId);
      }

      await loadUsers();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to save user account.'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = () => {
    const exportRows: ExportUserRow[] = filteredUsers.map((user) => ({
      fullName: user.fullName ?? '',
      email: user.email ?? '',
      employeeCode: user.employeeCode ?? '',
      departmentName: user.departmentName ?? '',
      positionName: user.positionName ?? '',
      roleName: roleDisplayName(user.roleName ?? ''),
      dashboard: dashboardDisplayName(user.dashboard, user.roleName),
      status: user.active === false ? 'Inactive' : 'Active',
    }));

    exportToExcel(
        exportRows,
        [
          { header: 'Full Name', key: 'fullName' },
          { header: 'Email', key: 'email' },
          { header: 'Employee Code', key: 'employeeCode' },
          { header: 'Department', key: 'departmentName' },
          { header: 'Position', key: 'positionName' },
          { header: 'Role', key: 'roleName' },
          { header: 'Dashboard', key: 'dashboard' },
          { header: 'Status', key: 'status' },
        ],
        `admin_users_${todayStr()}`,
    );
  };

  const renderUserTable = (tableUsers: AdminUserAccount[]) => (
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[1120px] divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-14 px-4 py-3">#</th>
            <th className="min-w-[250px] px-4 py-3">Full Name</th>
            <th className="min-w-[220px] px-4 py-3">Email</th>
            <th className="min-w-[150px] px-4 py-3">Employee Code</th>
            <th className="min-w-[170px] px-4 py-3">Department</th>
            <th className="min-w-[180px] px-4 py-3">Position</th>
            <th className="min-w-[130px] px-4 py-3">Role</th>
            <th className="min-w-[190px] px-4 py-3">Dashboard</th>
            <th className="min-w-[120px] px-4 py-3">Status</th>
            <th className="min-w-[100px] px-4 py-3 text-right">Action</th>
          </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
          {listLoading && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                  Loading user accounts...
                </td>
              </tr>
          )}

          {!listLoading &&
              tableUsers.map((user, index) => {
                const rowNumber = (Math.min(currentPage, totalPages) - 1) * pageSize + index + 1;

                return (
                    <tr key={user.userId ?? user.email ?? index} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-500">{rowNumber}</td>

                      <td className="px-4 py-3">
                        <EmployeeAvatar
                            fullName={user.fullName}
                            email={user.email}
                            profileImageData={user.profileImageData}
                            profileImageType={user.profileImageType}
                            size="sm"
                            showName
                            subtitle={user.employeeCode || undefined}
                        />
                      </td>

                      <td className="px-4 py-3">
                    <span className="block max-w-[220px] truncate font-semibold text-slate-600">
                      {user.email ?? '—'}
                    </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600">{user.employeeCode ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{user.departmentName ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{user.positionName ?? '—'}</td>

                      <td className="px-4 py-3">
                        <StatusPill tone="violet">{roleDisplayName(user.roleName ?? '—')}</StatusPill>
                      </td>

                      <td className="px-4 py-3">
                        <StatusPill tone="blue">{dashboardDisplayName(user.dashboard, user.roleName)}</StatusPill>
                      </td>

                      <td className="px-4 py-3">
                        <StatusPill tone={user.active === false ? 'red' : 'green'}>
                          {user.active === false ? 'Inactive' : 'Active'}
                        </StatusPill>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => openEdit(user)}
                        >
                          <Icon name="edit" className="h-4 w-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                );
              })}

          {!listLoading && tableUsers.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10">
                  <EmptyState
                      title="No user accounts found"
                      message={
                        searchTerm
                            ? 'Try a different keyword or clear the search field.'
                            : 'User accounts will appear here after they are created or imported.'
                      }
                  />
                </td>
              </tr>
          )}
          </tbody>
        </table>
      </div>
  );

  return (
      <div className="min-w-0 space-y-5 text-slate-900">
        <Notice notice={notice} onClose={() => setNotice(null)} />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                <Icon name="shield" className="h-4 w-4" />
                {isUserAccountsPage ? 'Account Management' : 'HR Admin Workspace'}
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                {isUserAccountsPage ? 'User Accounts' : 'HR Admin Dashboard'}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {isUserAccountsPage
                    ? 'Create, edit, activate, and assign dashboard access for employee login accounts.'
                    : 'Manage login account setup, dashboard routing, and access-control health from one admin workspace.'}
              </p>
            </div>

            <div className="flex justify-start lg:justify-end">
              <button
                  type="button"
                  className="inline-flex min-w-[158px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                  onClick={showForm ? closeForm : openCreate}
              >
                <Icon name="plus" className={`h-4 w-4 ${showForm ? 'rotate-45' : ''}`} />
                {showForm ? 'Close Form' : 'Create Account'}
              </button>
            </div>
          </div>
        </section>

        {!isUserAccountsPage && (
            <>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Total Accounts" value={users.length} helper="All login accounts" icon="users" />
                <MetricCard
                    label="Active Accounts"
                    value={activeUsers.length}
                    helper={`${inactiveUsers.length} inactive`}
                    icon="check"
                    tone="green"
                />
                <MetricCard
                    label="Departments"
                    value={options.departments.length}
                    helper="Available departments"
                    icon="building"
                    tone="violet"
                />
                <MetricCard
                    label="Positions"
                    value={options.positions.length}
                    helper="Available positions"
                    icon="work"
                    tone="blue"
                />
                <MetricCard
                    label="Needs Attention"
                    value={attentionUsers.length}
                    helper="Missing setup or inactive"
                    icon="alert"
                    tone={attentionUsers.length > 0 ? 'amber' : 'green'}
                />
              </div>

              <div className="dashboard-grid dashboard-grid--two">
                <DashboardChartCard
                    title="Fluxen Account Health"
                    subtitle="Active, inactive, and attention-needed login accounts."
                >
                  <DonutSummaryChart
                      data={accountStatusChart}
                      totalLabel="Accounts"
                      emptyTitle="No account health data"
                      emptyDescription="Account status data appears after users are loaded."
                      height={220}
                  />
                </DashboardChartCard>

                <DashboardChartCard
                    title="Dashboard Assignment Comparison"
                    subtitle="How accounts are distributed across assigned dashboards."
                >
                  <HorizontalBarChart
                      data={dashboardAssignmentBars}
                      emptyTitle="No dashboard assignments"
                      emptyDescription="Dashboard assignment counts will appear after accounts are created."
                      height={220}
                      maxBars={8}
                  />
                </DashboardChartCard>
              </div>

              <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-2">
                <Panel
                    title="HR Admin Actions"
                    subtitle="Create accounts, import records, and manage login account setup."
                    icon="spark"
                >
                  <div className="space-y-3">
                    <ActionRow
                        icon="plus"
                        title="Create account"
                        description="Add one login account and assign its dashboard workspace."
                        meta="New"
                        onClick={openCreate}
                    />

                    <ActionRow
                        icon="upload"
                        title="Import accounts"
                        description="Bulk import employee login accounts from Excel or CSV."
                        meta="Import"
                        to="/hradmin/employee/import"
                    />

                    <ActionRow
                        icon="users"
                        title="Manage user accounts"
                        description="Search, edit, activate, and review all login accounts."
                        meta="Users"
                        to="/hradmin/users"
                    />

                    <ActionRow
                        icon="download"
                        title="Export users"
                        description="Download current user account records."
                        meta="Excel"
                        onClick={handleExportUsers}
                        disabled={users.length === 0}
                    />
                  </div>
                </Panel>

                <Panel
                    title="Access Control Health"
                    subtitle="Review the most important security and permission setup areas."
                    icon="key"
                >
                  <div className="space-y-3">
                    <ActionRow
                        icon="work"
                        title="Position permissions"
                        description="Control feature access by employee position."
                        meta="Priority"
                        to="/position-permissions"
                    />

                    <ActionRow
                        icon="user"
                        title="User roles"
                        description="Review account-role links and role assignment records."
                        to="/user-roles"
                    />

                    <ActionRow
                        icon="shield"
                        title="Role permissions"
                        description="Check role and permission mapping records."
                        to="/role-permissions"
                    />

                    <ActionRow
                        icon="key"
                        title="Permissions"
                        description="View base permission definitions used by the system."
                        to="/permissions"
                    />
                  </div>
                </Panel>
              </div>

              <Panel
                  title="Dashboard Assignments"
                  subtitle="See how many accounts open each dashboard after sign-in."
                  icon="database"
              >
                {dashboardSummary.length === 0 ? (
                    <EmptyState
                        title="No dashboard assignments yet"
                        message="Dashboard assignment counts will appear after accounts are created."
                    />
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {dashboardSummary.map((item) => {
                        const percentage = users.length > 0 ? Math.round((item.count / users.length) * 100) : 0;

                        return (
                            <div key={item.value} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">{item.label}</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.helper}</p>
                                </div>

                                <StatusPill tone="blue">{item.count}</StatusPill>
                              </div>

                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                    className="h-full rounded-full bg-blue-500"
                                    style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                        );
                      })}
                    </div>
                )}
              </Panel>
            </>
        )}

        {isUserAccountsPage && (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Accounts" value={users.length} helper="All login accounts" icon="users" />
              <MetricCard
                  label="Active"
                  value={activeUsers.length}
                  helper="Can access the system"
                  icon="check"
                  tone="green"
              />
              <MetricCard
                  label="Inactive"
                  value={inactiveUsers.length}
                  helper="Access is currently disabled"
                  icon="alert"
                  tone={inactiveUsers.length > 0 ? 'rose' : 'green'}
              />
              <MetricCard
                  label="Needs Attention"
                  value={attentionUsers.length}
                  helper="Missing setup or inactive"
                  icon="info"
                  tone={attentionUsers.length > 0 ? 'amber' : 'blue'}
              />
            </div>
        )}

        {isUserAccountsPage && (
            <div className="dashboard-grid dashboard-grid--two">
              <DashboardChartCard
                  title="Fluxen Account Health"
                  subtitle="Account availability and setup quality for the filtered admin workspace."
              >
                <DonutSummaryChart
                    data={accountStatusChart}
                    totalLabel="Accounts"
                    emptyTitle="No account health data"
                    emptyDescription="Account status data appears after users are loaded."
                    height={220}
                />
              </DashboardChartCard>

              <DashboardChartCard
                  title="Dashboard Assignment Comparison"
                  subtitle="Assigned dashboards across all login accounts."
              >
                <HorizontalBarChart
                    data={dashboardAssignmentBars}
                    emptyTitle="No dashboard assignments"
                    emptyDescription="Dashboard assignment counts will appear after accounts are created."
                    height={220}
                    maxBars={8}
                />
              </DashboardChartCard>
            </div>
        )}

        <section id="admin-account-form" className="scroll-mt-24">
          {showForm && (
              <Panel
                  title={editingUserId ? 'Edit Login Account' : 'Create Login Account'}
                  subtitle={
                    editingUserId
                        ? 'Update account identity, organization links, role, dashboard, and account status.'
                        : 'Create a new account and assign its role, position, and dashboard workspace.'
                  }
                  icon={editingUserId ? 'edit' : 'plus'}
              >
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Field label="Full Name" required>
                      <input
                          className={inputClass}
                          type="text"
                          placeholder="e.g. John Doe"
                          value={form.fullName}
                          onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                          required
                      />
                    </Field>

                    <Field label="Email" required>
                      <input
                          className={inputClass}
                          type="email"
                          placeholder="e.g. john@company.com"
                          value={form.email}
                          onChange={(event) => setForm({ ...form, email: event.target.value })}
                          required
                      />

                      {duplicateEmailUser && (
                          <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                            Email already exists for {duplicateEmailUser.fullName || duplicateEmailUser.email}.
                          </p>
                      )}
                    </Field>

                    <Field label="Employee Code">
                      <input
                          className={inputClass}
                          type="text"
                          placeholder="Optional"
                          value={form.employeeCode}
                          onChange={(event) => setForm({ ...form, employeeCode: event.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Department">
                      <select
                          className={selectClass}
                          value={form.departmentId}
                          onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                      >
                        <option value="">Select Department</option>
                        {options.departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {getDepartmentName(department)}
                            </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Position">
                      <select
                          className={selectClass}
                          value={form.positionId}
                          onChange={(event) => setForm({ ...form, positionId: event.target.value })}
                      >
                        <option value="">Select Position</option>
                        {options.positions.map((position) => (
                            <option key={position.id} value={position.id}>
                              {getPositionName(position)}
                            </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Role" required>
                      <select
                          className={selectClass}
                          value={form.roleName}
                          onChange={(event) => {
                            const roleName = normalizeRoleName(event.target.value);

                            setForm({
                              ...form,
                              roleName,
                              dashboard: defaultDashboardForRole(roleName),
                            });
                          }}
                          required
                      >
                        {roleOptions.map((role) => {
                          const roleName = normalizeRoleName(role.name);

                          return (
                              <option key={`${role.id}-${roleName}`} value={roleName}>
                                {roleDisplayName(roleName)}
                              </option>
                          );
                        })}
                      </select>
                    </Field>

                    <Field label="Dashboard" required>
                      <select
                          className={selectClass}
                          value={form.dashboard}
                          onChange={(event) =>
                              setForm({
                                ...form,
                                dashboard: normalizeDashboard(event.target.value, form.roleName),
                              })
                          }
                          required
                      >
                        {dashboardOptions.map((dashboard) => (
                            <option key={dashboard.value} value={dashboard.value}>
                              {dashboard.label}
                            </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs leading-5 text-slate-500">{selectedDashboardHelper}</p>
                    </Field>
                  </div>

                  {editingUserId && (
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-bold text-slate-700">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={form.active}
                            onChange={(event) => setForm({ ...form, active: event.target.checked })}
                        />
                        Active account
                      </label>
                  )}

                  {error && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                        {error}
                      </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={loading}
                    >
                      <Icon name={loading ? 'clock' : 'check'} className="h-4 w-4" />
                      {loading
                          ? editingUserId
                              ? 'Updating...'
                              : 'Creating...'
                          : editingUserId
                              ? 'Update Account'
                              : 'Create Login Account'}
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        onClick={closeForm}
                        disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {savedUser && (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
                        <Icon name="check" className="h-4 w-4" />
                        {editingUserId ? 'Account Updated' : 'Account Processed'}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {[
                          ['Full Name', savedUser.fullName],
                          ['Email', savedUser.email],
                          ['Employee Code', savedUser.employeeCode || 'Not set'],
                          ['Role', roleDisplayName(savedUser.roleName || form.roleName)],
                          [
                            'Dashboard',
                            dashboardDisplayName(
                                savedUser.dashboard || form.dashboard,
                                savedUser.roleName || form.roleName,
                            ),
                          ],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-xl bg-white/80 p-3">
                      <span className="block text-xs font-bold uppercase tracking-wide text-emerald-700/70">
                        {label}
                      </span>
                              <strong className="mt-1 block truncate text-sm font-black text-emerald-950">
                                {value}
                              </strong>
                            </div>
                        ))}
                      </div>

                      {savedUser.message && (
                          <p className="mt-3 text-sm font-semibold text-emerald-800">{savedUser.message}</p>
                      )}

                      {savedUser.smtpErrorDetail && (
                          <p className="mt-2 text-sm font-semibold text-amber-800">
                            SMTP: {savedUser.smtpErrorDetail}
                          </p>
                      )}
                    </div>
                )}

                {editingUserId && (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <Icon name="clock" className="h-4 w-4 text-blue-600" />
                        Dashboard Audit Log
                      </div>

                      {dashboardAuditLoading ? (
                          <p className="mt-3 text-sm font-semibold text-slate-500">Loading dashboard audit...</p>
                      ) : dashboardAuditRows.length === 0 ? (
                          <p className="mt-3 text-sm font-semibold text-slate-500">
                            No dashboard changes recorded yet.
                          </p>
                      ) : (
                          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full min-w-[760px] divide-y divide-slate-200 text-left text-sm">
                              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Changed By</th>
                                <th className="px-4 py-3">Old Dashboard</th>
                                <th className="px-4 py-3">New Dashboard</th>
                                <th className="px-4 py-3">Reason</th>
                              </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100">
                              {dashboardAuditRows.map((row) => (
                                  <tr key={row.id}>
                                    <td className="px-4 py-3 text-slate-600">{formatDateTime(row.timestamp)}</td>
                                    <td className="px-4 py-3 text-slate-600">{row.changedByName || 'System'}</td>
                                    <td className="px-4 py-3 text-slate-600">{dashboardDisplayName(row.oldDashboard)}</td>
                                    <td className="px-4 py-3 text-slate-600">{dashboardDisplayName(row.newDashboard)}</td>
                                    <td className="px-4 py-3 text-slate-600">
                                      {row.reason || 'Dashboard changed by HR Admin'}
                                    </td>
                                  </tr>
                              ))}
                              </tbody>
                            </table>
                          </div>
                      )}
                    </div>
                )}
              </Panel>
          )}
        </section>

        {isUserAccountsPage && (
            <Panel
                title={`User Accounts (${filteredUsers.length})`}
                subtitle="Search, review, edit, and export system login accounts."
                icon="table"
                action={
                  <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleExportUsers}
                      disabled={filteredUsers.length === 0}
                  >
                    <Icon name="download" className="h-4 w-4" />
                    Export
                  </button>
                }
            >
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-0 flex-1 lg:max-w-xl">
                  <Icon
                      name="search"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      type="search"
                      placeholder="Search by name, email, code, role, dashboard..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                  <StatusPill tone="green">{activeUsers.length} Active</StatusPill>
                  <StatusPill tone="red">{inactiveUsers.length} Inactive</StatusPill>
                  <StatusPill tone="amber">{attentionUsers.length} Attention</StatusPill>
                </div>
              </div>

              {renderUserTable(paginatedUsers)}

              <Pagination
                  currentPage={Math.min(currentPage, totalPages)}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredUsers.length}
                  startItem={pageStartItem}
                  endItem={pageEndItem}
                  onPageChange={(page) => setCurrentPage(Math.min(Math.max(page, 1), totalPages))}
                  onPageSizeChange={(nextPageSize) =>
                      setPageSize(nextPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
                  }
              />
            </Panel>
        )}
      </div>
  );
};

export default AdminDashboard;

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

type DashboardUser = Record<string, unknown> & {
    id?: number | string;
    userId?: number | string;
    fullName?: string;
    name?: string;
    email?: string;
    position?: string;
    employeeCode?: string;
};

type DashboardData = {
    user?: DashboardUser;
    stats?: {
        directReports?: number | string;
        kpisCreated?: number | string;
        activePipsManaged?: number | string;
        unreadNotifications?: number | string;
    };
    recentKpis?: Array<{ id?: number | string; title?: string; weight?: number | string }>;
    recentNotifications?: Array<{ id?: number | string; title?: string; read?: boolean }>;
};

type EmployeeRecord = {
    id?: number | string;
    active?: boolean;
    status?: string;
    department?: string;
    departmentName?: string;
    currentDepartment?: string;
};

type IconName =
    | 'activity'
    | 'alert'
    | 'bell'
    | 'briefcase'
    | 'building'
    | 'calendar'
    | 'check'
    | 'clipboard'
    | 'document'
    | 'flag'
    | 'grid'
    | 'kpi'
    | 'message'
    | 'people'
    | 'shield'
    | 'sparkles'
    | 'user';

type Tone = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate';

type HrStats = {
    employees: number;
    departments: number;
    kpis: number;
    pips: number;
    notifications: number;
};

const numberValue = (value: unknown) => {
    const result = Number(value ?? 0);
    return Number.isFinite(result) ? result : 0;
};

const activeEmployeeCount = (employees: EmployeeRecord[]) =>
    employees.filter((employee) => employee.active !== false && employee.status !== 'INACTIVE').length;

const uniqueDepartmentCount = (employees: EmployeeRecord[]) => {
    const names = employees
        .map((employee) => employee.departmentName ?? employee.currentDepartment ?? employee.department)
        .filter((name): name is string => Boolean(name && String(name).trim()));

    return new Set(names.map((name) => name.trim().toLowerCase())).size;
};

const formatNumber = (value: number) => value.toLocaleString();

const getUserDisplayName = (user?: DashboardUser) =>
    String(user?.fullName ?? user?.name ?? user?.email ?? 'HR User');

const getUserSubtitle = (user?: DashboardUser) =>
    String(user?.position ?? user?.employeeCode ?? user?.email ?? 'Human Resources');

function Home() {
    const navigate = useNavigate();

    const [data, setData] = useState<DashboardData | null>(null);
    const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        let mounted = true;

        const loadDashboard = async () => {
            setLoading(true);
            setError('');

            try {
                const [summaryResult, employeeResult] = await Promise.allSettled([
                    api.get('/dashboard/summary'),
                    api.get('/employees'),
                ]);

                if (!mounted) return;

                if (summaryResult.status === 'fulfilled') {
                    setData(summaryResult.value.data ?? null);
                } else {
                    const status = summaryResult.reason?.response?.status;
                    if (status === 401 || status === 403) {
                        setError('Your session is not authorized for this HR dashboard.');
                    } else {
                        setError('HR dashboard summary could not be loaded. Available information is still shown.');
                    }
                    setData(null);
                }

                if (employeeResult.status === 'fulfilled') {
                    const list = employeeResult.value.data?.data ?? employeeResult.value.data ?? [];
                    setEmployees(Array.isArray(list) ? list : []);
                } else {
                    setEmployees([]);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void loadDashboard();

        return () => {
            mounted = false;
        };
    }, []);

    const stats: HrStats = useMemo(() => {
        const employeeTotal = activeEmployeeCount(employees);
        const departmentTotal = uniqueDepartmentCount(employees);

        return {
            employees: employeeTotal || numberValue(data?.stats?.directReports),
            departments: departmentTotal,
            kpis: numberValue(data?.stats?.kpisCreated),
            pips: numberValue(data?.stats?.activePipsManaged),
            notifications: numberValue(data?.stats?.unreadNotifications),
        };
    }, [data?.stats, employees]);

    const recentKpis = data?.recentKpis ?? [];
    const recentNotifications = data?.recentNotifications ?? [];
    const userName = getUserDisplayName(data?.user);
    const firstName = userName.split(' ')[0] || 'HR';

    return (
        <main className="min-w-0 bg-slate-50 px-2 py-2 text-slate-950 sm:px-3 lg:px-4">
            <div className="flex w-full max-w-[1420px] flex-col gap-3 xl:gap-4">
                <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_44px_rgba(15,23,42,0.07)]">
                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:p-6">
                        <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                <Icon name="grid" className="h-4 w-4" />
                HR Dashboard
              </span>
                            <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl lg:text-5xl">
                                Welcome back, {firstName} <span aria-hidden="true">👋</span>
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">
                                Monitor workforce setup, appraisal workflows, KPI activity, feedback operations,
                                and HR attention items from one clean workspace.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2.5">
                                <SummaryChip icon="people" label="Employees" value={`${formatNumber(stats.employees)} active`} />
                                <SummaryChip
                                    icon="building"
                                    label="Departments"
                                    value={stats.departments ? `${stats.departments} visible` : 'Setup needed'}
                                />
                                <SummaryChip icon="bell" label="Alerts" value={`${formatNumber(stats.notifications)} unread`} />
                                <SummaryChip icon="user" label="Role" value={getUserSubtitle(data?.user)} />
                            </div>
                        </div>

                        <div className="rounded-[22px] border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 shadow-inner">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">HR Operating View</p>
                                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                  Today
                </span>
                            </div>
                            <div className="mt-4 grid gap-2.5">
                                <MiniStatus label="Workforce" value={`${formatNumber(stats.employees)} active`} />
                                <MiniStatus label="KPI setup" value={`${formatNumber(stats.kpis)} configured`} />
                                <MiniStatus label="PIP attention" value={`${formatNumber(stats.pips)} active`} />
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/hr/reports/performance')}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                            >
                                Open HR Reports
                                <span aria-hidden="true">→</span>
                            </button>
                        </div>
                    </div>
                </section>

                {error && <Notice tone="warning" icon="alert" title="Dashboard notice" message={error} />}
                {loading && <Notice tone="info" icon="activity" title="Loading HR dashboard" message="Preparing workforce, KPI, PIP, and notification summary." />}

                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        icon="people"
                        title="Active Employees"
                        value={formatNumber(stats.employees)}
                        description="Current active people in HR scope."
                        action="View employees"
                        onClick={() => navigate('/hr/employee')}
                        tone="blue"
                    />
                    <MetricCard
                        icon="building"
                        title="Departments"
                        value={stats.departments ? formatNumber(stats.departments) : '—'}
                        description={stats.departments ? 'Visible from employee records.' : 'Department records need setup.'}
                        action="Manage departments"
                        onClick={() => navigate('/hr/department')}
                        tone="violet"
                    />
                    <MetricCard
                        icon="kpi"
                        title="KPI Setup"
                        value={formatNumber(stats.kpis)}
                        description={stats.kpis ? 'KPI records configured by HR.' : 'No KPI records configured yet.'}
                        action="Open KPIs"
                        onClick={() => navigate('/hr/kpi-template')}
                        tone="emerald"
                    />
                    <MetricCard
                        icon="alert"
                        title="Active PIPs"
                        value={formatNumber(stats.pips)}
                        description={stats.pips ? 'PIP records currently tracked.' : 'No active PIP attention right now.'}
                        action="Review PIP status"
                        onClick={() => navigate('/hr/reports/pip-status')}
                        tone="rose"
                    />
                </section>

                <section className="grid gap-3 xl:grid-cols-2">
                    <Panel
                        title="HR Operations"
                        description="Core organization setup and workforce administration."
                        actionLabel="Open employees"
                        onAction={() => navigate('/hr/employee')}
                    >
                        <div className="grid gap-2.5">
                            <ActionRow
                                icon="people"
                                title="Manage employees"
                                description="Employee records, assignments, and workforce details."
                                status="Ready"
                                onClick={() => navigate('/hr/employee')}
                            />
                            <ActionRow
                                icon="building"
                                title="Maintain departments"
                                description="Department structure and department-level records."
                                status={stats.departments ? `${stats.departments} visible` : 'Setup'}
                                onClick={() => navigate('/hr/department')}
                            />
                            <ActionRow
                                icon="briefcase"
                                title="Configure positions"
                                description="Positions, levels, and permission-linked roles."
                                status="Manage"
                                onClick={() => navigate('/hr/position/table')}
                            />
                            <ActionRow
                                icon="shield"
                                title="Manage teams"
                                description="Teams, leaders, members, and team history."
                                status="Manage"
                                onClick={() => navigate('/hr/team')}
                            />
                        </div>
                    </Panel>

                    <Panel title="Workflow Focus" description="HR workflows that usually need setup, monitoring, or follow-up.">
                        <div className="space-y-2.5">
                            <FocusRow
                                icon="clipboard"
                                title="Appraisals"
                                description="Templates, cycles, manager checks, and HR approval follow-up."
                                status="Monitor"
                                onClick={() => navigate('/hr/appraisal/review-check')}
                            />
                            <FocusRow
                                icon="message"
                                title="360 Feedback"
                                description="Question bank, rule sets, campaigns, and assignment monitoring."
                                status="Configure"
                                onClick={() => navigate('/hr/feedback/questions')}
                            />
                            <FocusRow
                                icon="kpi"
                                title="KPI Management"
                                description="KPI items, templates, cycles, employee assignments, and history."
                                status={stats.kpis ? `${stats.kpis} records` : 'Setup'}
                                onClick={() => navigate('/hr/kpi-template')}
                            />
                            <FocusRow
                                icon="document"
                                title="Reports"
                                description="Performance, department comparison, PIP, feedback, and recommendations."
                                status="Available"
                                onClick={() => navigate('/hr/reports/performance')}
                            />
                        </div>
                    </Panel>
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                    <Panel title="Recent KPIs" description="Latest KPI records available from the HR dashboard feed.">
                        {recentKpis.length ? (
                            <div className="space-y-2.5">
                                {recentKpis.slice(0, 5).map((item, index) => (
                                    <RecordRow
                                        key={`${item.id ?? 'kpi'}-${index}`}
                                        icon="kpi"
                                        title={item.title || 'Untitled KPI'}
                                        detail={`Weight ${item.weight ?? '—'}`}
                                        onClick={() => navigate('/hr/kpi-template')}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon="kpi"
                                title="No KPI records yet"
                                description="KPI templates and employee KPI records will appear after HR configures them."
                                action="Create or review KPIs"
                                onAction={() => navigate('/hr/kpi-template')}
                            />
                        )}
                    </Panel>

                    <Panel title="Recent Notifications" description="Latest HR-visible alerts and workflow messages.">
                        {recentNotifications.length ? (
                            <div className="space-y-2.5">
                                {recentNotifications.slice(0, 6).map((item, index) => (
                                    <RecordRow
                                        key={`${item.id ?? 'notification'}-${index}`}
                                        icon="bell"
                                        title={item.title || 'Notification'}
                                        detail={item.read ? 'Read' : 'Unread'}
                                        status={item.read ? 'Read' : 'Unread'}
                                        onClick={() => navigate('/notifications')}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon="bell"
                                title="No notifications yet"
                                description="HR notifications, workflow alerts, and system updates will appear here."
                                action="Open notifications"
                                onAction={() => navigate('/notifications')}
                            />
                        )}
                    </Panel>
                </section>

                <Panel title="Quick Setup" description="Common setup areas HR may need to open during configuration work.">
                    <div className="grid gap-2.5 lg:grid-cols-2">
                        <SetupRow
                            icon="calendar"
                            title="Assessment Forms"
                            description="Create and maintain self-assessment forms."
                            onClick={() => navigate('/hr/assessment-forms')}
                        />
                        <SetupRow
                            icon="check"
                            title="Assessment Scores"
                            description="Review score tables and assessment records."
                            onClick={() => navigate('/hr/assessment-scores')}
                        />
                        <SetupRow
                            icon="flag"
                            title="Department KPI"
                            description="Manage department KPI templates and cycles."
                            onClick={() => navigate('/hr/department-kpi-template')}
                        />
                        <SetupRow
                            icon="sparkles"
                            title="Recommendations"
                            description="Review HR performance recommendations."
                            onClick={() => navigate('/hr/reports/recommendations')}
                        />
                    </div>
                </Panel>
            </div>
        </main>
    );
}

const toneClasses: Record<Tone, { icon: string; badge: string }> = {
    blue: { icon: 'bg-blue-50 text-blue-600 ring-blue-100', badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    violet: { icon: 'bg-violet-50 text-violet-600 ring-violet-100', badge: 'bg-violet-50 text-violet-700 ring-violet-200' },
    amber: { icon: 'bg-amber-50 text-amber-600 ring-amber-100', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
    rose: { icon: 'bg-rose-50 text-rose-600 ring-rose-100', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
    slate: { icon: 'bg-slate-50 text-slate-600 ring-slate-100', badge: 'bg-slate-50 text-slate-700 ring-slate-200' },
};

const SummaryChip = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
    <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm shadow-sm">
        <Icon name={icon} className="h-4 w-4 shrink-0 text-blue-600" />
        <span className="shrink-0 font-black text-slate-500">{label}:</span>
        <span className="truncate font-black text-slate-950">{value}</span>
    </div>
);

const MiniStatus = ({ label, value }: { label: string; value: string }) => (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
        <span className="truncate text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
        <strong className="shrink-0 text-sm font-black text-slate-950">{value}</strong>
    </div>
);

const Notice = ({
                    icon,
                    title,
                    message,
                    tone,
                }: {
    icon: IconName;
    title: string;
    message: string;
    tone: 'info' | 'warning';
}) => (
    <div
        className={`flex items-start gap-3 rounded-3xl border px-4 py-3 shadow-sm ${
            tone === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-blue-200 bg-blue-50 text-blue-900'
        }`}
    >
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/80 shadow-sm">
      <Icon name={icon} className="h-4.5 w-4.5" />
    </span>
        <div>
            <p className="font-black">{title}</p>
            <p className="mt-0.5 text-sm font-semibold leading-6 opacity-85">{message}</p>
        </div>
    </div>
);

const MetricCard = ({
                        icon,
                        title,
                        value,
                        description,
                        action,
                        onClick,
                        tone = 'blue',
                    }: {
    icon: IconName;
    title: string;
    value: string;
    description: string;
    action: string;
    onClick: () => void;
    tone?: Tone;
}) => (
    <article className="group min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_50px_rgba(37,99,235,0.10)]">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 className="truncate text-sm font-black text-slate-950">{title}</h2>
                <strong className="mt-3 block text-3xl font-black tracking-[-0.055em] text-slate-950">{value}</strong>
            </div>
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${toneClasses[tone].icon}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
        </div>
        <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">{description}</p>
        <button
            type="button"
            onClick={onClick}
            className="mt-3 inline-flex max-w-full items-center gap-2 truncate text-sm font-black text-blue-600 transition group-hover:text-blue-700"
        >
            <span className="truncate">{action}</span>
            <span className="shrink-0" aria-hidden="true">→</span>
        </button>
    </article>
);

const Panel = ({
                   title,
                   description,
                   actionLabel,
                   onAction,
                   children,
               }: {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    children: ReactNode;
}) => (
    <section className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_38px_rgba(15,23,42,0.06)]">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h2>
                <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-600">{description}</p>
            </div>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                >
                    {actionLabel}
                    <span aria-hidden="true">→</span>
                </button>
            )}
        </div>
        {children}
    </section>
);

const ActionRow = ({
                       icon,
                       title,
                       description,
                       status,
                       onClick,
                   }: {
    icon: IconName;
    title: string;
    description: string;
    status: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/70"
    >
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
      <Icon name={icon} className="h-5 w-5" />
    </span>
        <span className="min-w-0 flex-1">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-sm font-black leading-5 text-slate-950">{title}</span>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
          {status}
        </span>
      </span>
      <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">{description}</span>
    </span>
        <span className="shrink-0 text-blue-600 transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
    </button>
);

const FocusRow = ({
                      icon,
                      title,
                      description,
                      status,
                      onClick,
                  }: {
    icon: IconName;
    title: string;
    description: string;
    status: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/70"
    >
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
      <Icon name={icon} className="h-5 w-5" />
    </span>
        <span className="min-w-0 flex-1">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-sm font-black leading-5 text-slate-950">{title}</span>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
          {status}
        </span>
      </span>
      <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">{description}</span>
    </span>
        <span className="shrink-0 text-blue-600 transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
    </button>
);

const SetupRow = ({
                      icon,
                      title,
                      description,
                      onClick,
                  }: {
    icon: IconName;
    title: string;
    description: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/70"
    >
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
      <Icon name={icon} className="h-5 w-5" />
    </span>
        <span className="min-w-0 flex-1">
      <span className="block text-sm font-black leading-5 text-slate-950">{title}</span>
      <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">{description}</span>
    </span>
        <span className="shrink-0 text-blue-600 transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
    </button>
);

const RecordRow = ({
                       icon,
                       title,
                       detail,
                       status,
                       onClick,
                   }: {
    icon: IconName;
    title: string;
    detail: string;
    status?: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-left transition hover:border-blue-200 hover:bg-blue-50/70"
    >
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
      <Icon name={icon} className="h-4.5 w-4.5" />
    </span>
        <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-black text-slate-950">{title}</span>
      <span className="mt-0.5 block truncate text-sm font-semibold text-slate-600">{detail}</span>
    </span>
        {status && (
            <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
                    status === 'Unread'
                        ? 'bg-rose-50 text-rose-700 ring-rose-100'
                        : 'bg-slate-100 text-slate-600 ring-slate-200'
                }`}
            >
        {status}
      </span>
        )}
        <span className="shrink-0 text-blue-600 transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
    </button>
);

const EmptyState = ({
                        icon,
                        title,
                        description,
                        action,
                        onAction,
                    }: {
    icon: IconName;
    title: string;
    description: string;
    action?: string;
    onAction?: () => void;
}) => (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
        <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
        <Icon name={icon} className="h-5 w-5" />
      </span>
            <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-950">{title}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{description}</p>
                {action && onAction && (
                    <button type="button" onClick={onAction} className="mt-2 text-sm font-black text-blue-600 hover:text-blue-700">
                        {action} →
                    </button>
                )}
            </div>
        </div>
    </div>
);

const Icon = ({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) => {
    const common = {
        className,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
    };

    switch (name) {
        case 'activity':
            return (
                <svg {...common}>
                    <path d="M3 12h4l3 7 4-14 3 7h4" />
                </svg>
            );
        case 'alert':
            return (
                <svg {...common}>
                    <path d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                </svg>
            );
        case 'bell':
            return (
                <svg {...common}>
                    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
            );
        case 'briefcase':
            return (
                <svg {...common}>
                    <path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />
                    <rect x="3" y="6" width="18" height="14" rx="2" />
                    <path d="M3 12h18" />
                </svg>
            );
        case 'building':
            return (
                <svg {...common}>
                    <path d="M4 21V5a2 2 0 0 1 2-2h8v18" />
                    <path d="M14 8h4a2 2 0 0 1 2 2v11" />
                    <path d="M8 7h2M8 11h2M8 15h2" />
                </svg>
            );
        case 'calendar':
            return (
                <svg {...common}>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
            );
        case 'check':
            return (
                <svg {...common}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );
        case 'clipboard':
            return (
                <svg {...common}>
                    <rect x="8" y="3" width="8" height="4" rx="1" />
                    <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
                    <path d="m9 14 2 2 4-4" />
                </svg>
            );
        case 'document':
            return (
                <svg {...common}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M8 13h8M8 17h6" />
                </svg>
            );
        case 'flag':
            return (
                <svg {...common}>
                    <path d="M5 22V4" />
                    <path d="M5 4h12l-2 5 2 5H5" />
                </svg>
            );
        case 'grid':
            return (
                <svg {...common}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
            );
        case 'kpi':
            return (
                <svg {...common}>
                    <path d="M4 19V5" />
                    <path d="M4 19h16" />
                    <path d="m7 15 4-4 3 3 5-7" />
                </svg>
            );
        case 'message':
            return (
                <svg {...common}>
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                </svg>
            );
        case 'people':
            return (
                <svg {...common}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case 'shield':
            return (
                <svg {...common}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-5" />
                </svg>
            );
        case 'sparkles':
            return (
                <svg {...common}>
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
                    <path d="M5 14l.7 1.8L7.5 16.5l-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14z" />
                </svg>
            );
        case 'user':
            return (
                <svg {...common}>
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            );
        default:
            return null;
    }
};

export default Home;

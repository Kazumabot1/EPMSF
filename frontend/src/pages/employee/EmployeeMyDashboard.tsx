import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { DashboardChartCard, DonutSummaryChart, HorizontalBarChart } from '../../components/dashboard';
import { appraisalWorkflowService } from '../../services/appraisalService';
import { feedbackService } from '../../services/feedbackService';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import { notificationService } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import type { EmployeeAppraisalFormResponse } from '../../types/appraisal';
import type { FeedbackDashboard } from '../../types/feedback';
import type { EmployeeKpiResult } from '../../types/kpiWorkflow';
import type { NotificationDto } from '../../services/notificationService';
import type { UserProfile } from '../../services/profileService';

type IconProps = SVGProps<SVGSVGElement>;

type DashboardData = {
  profile: UserProfile | null;
  kpiRows: EmployeeKpiResult[];
  appraisalForms: EmployeeAppraisalFormResponse[];
  feedbackDashboard: FeedbackDashboard | null;
  notifications: NotificationDto[];
};

type MetricCard = {
  title: string;
  value: string;
  subtitle: string;
  helper: string;
  icon: ReactNode;
  href: string;
  actionLabel: string;
  progress?: number;
  ring?: boolean;
  tone: 'blue' | 'emerald' | 'violet' | 'rose';
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: ReactNode;
};

type OverviewItem = {
  title: string;
  value: string;
  helper: string;
  href: string;
  icon: ReactNode;
};

const initialData: DashboardData = {
  profile: null,
  kpiRows: [],
  appraisalForms: [],
  feedbackDashboard: null,
  notifications: [],
};

const safeLoad = async <T,>(request: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await request;
  } catch {
    return fallback;
  }
};

const clampPercent = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.max(0, Math.min(100, Number(value)));
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Not set';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatShortDate = (value?: string | null) => {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Recently';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatShortDate(value);
};

const prettyStatus = (status?: string | null) => {
  if (!status) return 'Not Started';

  return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const sortByMostRecent = <T,>(items: T[], keys: (keyof T)[]) => {
  return [...items].sort((a, b) => {
    const first = keys
        .map((key) => (a as Record<string, unknown>)[String(key)])
        .find(Boolean) as string | undefined;
    const second = keys
        .map((key) => (b as Record<string, unknown>)[String(key)])
        .find(Boolean) as string | undefined;

    return (second ?? '').localeCompare(first ?? '');
  });
};

const iconClassByTone: Record<MetricCard['tone'], string> = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  violet: 'bg-blue-50 text-blue-600 ring-blue-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
};

const progressClassByTone: Record<MetricCard['tone'], string> = {
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-500',
  violet: 'bg-blue-500',
  rose: 'bg-rose-500',
};

const DashboardIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4ZM13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4ZM4 14.5A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4ZM13 14.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
    </svg>
);

const TargetIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="m15 9 4-4M18 5h2v2" />
    </svg>
);

const ClipboardIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M9 5h6M9 5a3 3 0 0 1 6 0M9 5H7.5A2.5 2.5 0 0 0 5 7.5v11A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 16.5 5H15" />
      <path d="m8.5 13 2 2 5-5M8 18h8" />
    </svg>
);

const ChatIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4a3.5 3.5 0 0 1-3.5 3.5H12l-4.5 4v-4A3.5 3.5 0 0 1 4 10.5v-4Z" />
      <path d="M8 7.5h8M8 10.5h5" />
    </svg>
);

const ChartIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />
      <path d="m6 10 4-4 4 4 5-6" />
    </svg>
);

const CalendarIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M7 3v4M17 3v4M5 9h14M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z" />
    </svg>
);

const UserIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
);

const BuildingIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 21h16M6 21V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V21" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
    </svg>
);

const ArrowIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

const StatusIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m5 12 4 4L19 6" />
      <circle cx="12" cy="12" r="9" />
    </svg>
);

const CardShell = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <article
        className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_45px_rgba(15,23,42,0.05)] ${className}`}
    >
      {children}
    </article>
);

const MetricCardView = ({ card }: { card: MetricCard }) => {
  const progress = clampPercent(card.progress);

  return (
      <CardShell className="p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(37,99,235,0.1)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">{card.title}</p>
            <div className="mt-4 flex items-center gap-4">
              {card.ring ? (
                  <div
                      className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
                      style={{ background: `conic-gradient(#2563eb ${progress * 3.6}deg, #e5e7eb 0deg)` }}
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-xl font-black text-slate-950">
                      {card.value}
                    </div>
                  </div>
              ) : (
                  <p className="text-4xl font-black tracking-tight text-slate-950">{card.value}</p>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{card.subtitle}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{card.helper}</p>
              </div>
            </div>
          </div>
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${iconClassByTone[card.tone]}`}>
          {card.icon}
        </span>
        </div>

        {!card.ring && card.progress != null && (
            <div className="mt-5 h-2 rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${progressClassByTone[card.tone]}`} style={{ width: `${progress}%` }} />
            </div>
        )}

        <Link to={card.href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-700">
          {card.actionLabel}
          <ArrowIcon className="h-4 w-4" />
        </Link>
      </CardShell>
  );
};

const EmptyPanel = ({ children }: { children: ReactNode }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm font-medium text-slate-500">
      {children}
    </div>
);

const EmployeeMyDashboard = () => {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);

      const [profile, kpiRows, appraisalForms, feedbackDashboard, notifications] = await Promise.all([
        safeLoad<UserProfile | null>(profileService.getMyProfile(), null),
        safeLoad(kpiWorkflowService.myFinalizedResults(), []),
        safeLoad(appraisalWorkflowService.getEmployeeForms(), []),
        safeLoad<FeedbackDashboard | null>(feedbackService.getEmployeeDashboard(), null),
        safeLoad(notificationService.list(), []),
      ]);

      if (cancelled) return;

      setData({ profile, kpiRows, appraisalForms, feedbackDashboard, notifications });
      setLoading(false);
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const latestKpi = useMemo(() => {
    if (!data.kpiRows.length) return null;
    return sortByMostRecent(data.kpiRows, ['finalizedAt', 'kpiTitle'])[0];
  }, [data.kpiRows]);

  const latestAppraisal = useMemo(() => {
    if (!data.appraisalForms.length) return null;
    return sortByMostRecent(data.appraisalForms, ['cycleEndDate', 'cycleSubmissionDeadline', 'assessmentDate', 'hrApprovedAt'])[0];
  }, [data.appraisalForms]);

  const feedbackPending = data.feedbackDashboard?.totalPendingAssignments ?? data.feedbackDashboard?.pendingFeedbackToSubmit?.length ?? 0;
  const feedbackReceived = data.feedbackDashboard?.totalResponses ?? 0;
  const unreadNotifications = data.notifications.filter((notification) => !notification.isRead).length;
  const kpiPercent = clampPercent(latestKpi?.totalScore ?? latestKpi?.totalWeightedScore ?? 0);
  const kpiCompleted = latestKpi?.lines?.filter((line) => line.score != null || line.weightedScore != null).length ?? 0;
  const kpiTotal = latestKpi?.lines?.length ?? 0;

  const employeeName = data.profile?.fullName ?? latestAppraisal?.employeeName ?? 'Employee';
  const firstName = employeeName.split(' ').filter(Boolean)[0] ?? 'there';
  const departmentName = data.profile?.departmentName ?? latestAppraisal?.departmentName ?? 'Not assigned';
  const positionName = data.profile?.position ?? latestAppraisal?.positionName ?? 'Not assigned';
  const employeeCode = data.profile?.employeeCode ?? latestAppraisal?.employeeCode ?? '—';
  const appraisalStatus = latestAppraisal ? prettyStatus(latestAppraisal.status) : 'Not Started';

  const metricCards: MetricCard[] = [
    {
      title: 'KPI Progress',
      value: loading ? '…' : `${Math.round(kpiPercent)}%`,
      subtitle: latestKpi ? 'Latest finalized result' : 'No finalized KPI yet',
      helper: latestKpi ? `${kpiCompleted} of ${kpiTotal || 0} KPI items recorded` : 'Manager-finalized KPI results will appear here.',
      icon: <ChartIcon className="h-5 w-5" />,
      href: '/employee/kpis',
      actionLabel: 'View KPIs',
      progress: kpiPercent,
      ring: true,
      tone: 'blue',
    },
    {
      title: 'Self-Assessment',
      value: loading ? '…' : latestAppraisal ? 'Open' : '—',
      subtitle: latestAppraisal?.cycleName ?? 'No active cycle',
      helper: latestAppraisal?.cycleSubmissionDeadline ? `Due ${formatShortDate(latestAppraisal.cycleSubmissionDeadline)}` : 'Open the form page when a cycle is assigned.',
      icon: <ClipboardIcon className="h-5 w-5" />,
      href: '/employee/self-assessment',
      actionLabel: 'Open form',
      progress: latestAppraisal ? 45 : 0,
      tone: 'violet',
    },
    {
      title: 'Appraisal Status',
      value: loading ? '…' : appraisalStatus,
      subtitle: latestAppraisal?.cycleName ?? 'No active appraisal form',
      helper: latestAppraisal?.cycleSubmissionDeadline ? `Due ${formatShortDate(latestAppraisal.cycleSubmissionDeadline)}` : 'Assigned appraisals will show here.',
      icon: <StatusIcon className="h-5 w-5" />,
      href: '/employee/appraisals',
      actionLabel: 'View appraisals',
      progress: latestAppraisal?.scorePercent ?? 0,
      tone: 'emerald',
    },
    {
      title: 'Feedback',
      value: loading ? '…' : String(feedbackReceived),
      subtitle: `${feedbackPending} pending assignment${feedbackPending === 1 ? '' : 's'}`,
      helper: unreadNotifications ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}` : 'No urgent feedback alerts.',
      icon: <ChatIcon className="h-5 w-5" />,
      href: '/employee/feedback',
      actionLabel: 'Open feedback',
      progress: feedbackReceived ? Math.min(100, feedbackReceived * 12) : 0,
      tone: 'rose',
    },
  ];

  const overviewItems: OverviewItem[] = [
    {
      title: 'Current appraisal cycle',
      value: latestAppraisal?.cycleName ?? 'No active cycle',
      helper: latestAppraisal ? `Status: ${prettyStatus(latestAppraisal.status)}` : 'When HR assigns a cycle, it will appear here.',
      href: '/employee/appraisals',
      icon: <CalendarIcon className="h-5 w-5" />,
    },
    {
      title: 'Latest KPI record',
      value: latestKpi?.kpiTitle ?? 'No finalized KPI result',
      helper: latestKpi?.finalizedAt ? `Finalized ${formatDate(latestKpi.finalizedAt)}` : 'Manager-finalized KPI records will appear here.',
      href: '/employee/kpis',
      icon: <ChartIcon className="h-5 w-5" />,
    },
    {
      title: 'Feedback status',
      value: feedbackPending ? `${feedbackPending} response${feedbackPending === 1 ? '' : 's'} needed` : 'No pending feedback',
      helper: feedbackReceived ? `${feedbackReceived} feedback result${feedbackReceived === 1 ? '' : 's'} received` : 'Feedback activity will appear here.',
      href: '/employee/feedback',
      icon: <ChatIcon className="h-5 w-5" />,
    },
  ];

  const focusDistribution = [
    { label: 'KPI progress', value: Math.round(kpiPercent), color: '#2563eb' },
    { label: 'Appraisal progress', value: latestAppraisal ? clampPercent(latestAppraisal.scorePercent ?? 45) : 0, color: '#16a34a' },
    { label: 'Feedback received', value: feedbackReceived, color: '#0284c7' },
    { label: 'Feedback pending', value: feedbackPending, color: '#d97706' },
  ];

  const personalProgressBars = [
    {
      label: 'KPI completion',
      value: kpiTotal ? (kpiCompleted / kpiTotal) * 100 : kpiPercent,
      detail: kpiTotal ? `${kpiCompleted} of ${kpiTotal} KPI items recorded` : 'Latest KPI score progress',
      color: '#2563eb',
    },
    {
      label: 'Appraisal score',
      value: latestAppraisal ? clampPercent(latestAppraisal.scorePercent ?? 0) : 0,
      detail: latestAppraisal ? prettyStatus(latestAppraisal.status) : 'No active appraisal form',
      color: '#16a34a',
    },
    {
      label: 'Feedback activity',
      value: feedbackReceived + feedbackPending,
      detail: `${feedbackReceived} received, ${feedbackPending} pending`,
      color: '#0284c7',
    },
  ];

  const recentActivities: ActivityItem[] = [
    ...data.notifications.slice(0, 4).map((notification, index) => ({
      id: `notification-${notification.id ?? index}-${notification.createdAt ?? index}`,
      title: notification.title || 'Notification received',
      subtitle: notification.message || 'Open notifications for details.',
      time: formatRelativeTime(notification.createdAt),
      icon: <ChatIcon className="h-5 w-5" />,
    })),
    ...(latestKpi
        ? [
          {
            id: `kpi-${latestKpi.employeeKpiFormId}`,
            title: 'KPI result finalized',
            subtitle: latestKpi.kpiTitle,
            time: formatRelativeTime(latestKpi.finalizedAt),
            icon: <ChartIcon className="h-5 w-5" />,
          },
        ]
        : []),
    ...(feedbackReceived > 0
        ? [
          {
            id: 'feedback-published-summary',
            title: '360 feedback result available',
            subtitle: `${feedbackReceived} published feedback result${feedbackReceived === 1 ? '' : 's'} available`,
            time: 'Open feedback',
            icon: <TargetIcon className="h-5 w-5" />,
          },
        ]
        : []),
  ].slice(0, 5);

  return (
      <div className="min-h-[calc(100vh-120px)] w-full max-w-full overflow-hidden bg-slate-50 pb-6 text-slate-950 dashboard-page-shell">
        <div className="mx-auto flex w-full min-w-0 max-w-[1180px] flex-col gap-5 overflow-hidden">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="absolute inset-y-0 right-0 hidden w-[31%] bg-gradient-to-l from-blue-50 via-blue-50/80 to-transparent xl:block" />
            <div className="relative grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  <DashboardIcon className="h-4 w-4" />
                  Employee Workspace
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Welcome back, {firstName} <span aria-hidden="true">👋</span>
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 md:text-base">
                  A clean overview of your KPI, appraisal, and feedback progress.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <UserIcon className="h-4 w-4 text-blue-600" /> Employee Code
                    </div>
                    <p className="mt-1 truncate text-sm font-black text-slate-900">{employeeCode}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <BuildingIcon className="h-4 w-4 text-blue-600" /> Department
                    </div>
                    <p className="mt-1 truncate text-sm font-black text-slate-900">{departmentName}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <DashboardIcon className="h-4 w-4 text-blue-600" /> Position
                    </div>
                    <p className="mt-1 truncate text-sm font-black text-slate-900">{positionName}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <StatusIcon className="h-4 w-4 text-blue-600" /> Appraisal
                    </div>
                    <p className="mt-1 truncate text-sm font-black text-slate-900">{appraisalStatus}</p>
                  </div>
                </div>
              </div>

              <div className="hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-inner xl:block">
                <div className="rounded-2xl border border-blue-100 bg-white/90 p-4">
                  <div className="h-24 rounded-2xl bg-gradient-to-br from-blue-100 via-blue-50 to-white p-4">
                    <div className="flex h-full items-end gap-2">
                      {[42, 58, 50, 68, 62, 77, 88].map((height, index) => (
                          <span key={`${height}-${index}`} className="w-full rounded-t-lg bg-blue-500/80" style={{ height: `${height}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <span className="h-2 rounded-full bg-blue-100" />
                    <span className="h-2 rounded-full bg-blue-100" />
                    <span className="h-2 rounded-full bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {metricCards.map((card) => (
                <MetricCardView key={card.title} card={card} />
            ))}
          </section>

          <section className="dashboard-grid dashboard-grid--two">
            <DashboardChartCard
                title="Fluxen Personal Mix"
                subtitle="KPI, appraisal, and feedback signals in one compact view."
            >
              <DonutSummaryChart
                  data={focusDistribution}
                  totalLabel="Signals"
                  emptyTitle="No personal signals yet"
                  emptyDescription="KPI, appraisal, and feedback data will appear as records are assigned."
                  height={220}
              />
            </DashboardChartCard>

            <DashboardChartCard
                title="Progress Comparison"
                subtitle="Current personal progress across active workflows."
            >
              <HorizontalBarChart
                  data={personalProgressBars}
                  emptyTitle="No progress data"
                  emptyDescription="Your workflow progress appears here after activity is recorded."
                  height={220}
                  maxBars={4}
                  valueFormatter={(value, item) =>
                      item?.label === 'Feedback activity' ? String(Math.round(value)) : `${Math.round(value)}%`
                  }
              />
            </DashboardChartCard>
          </section>

          <section className="grid min-w-0 gap-4">
            <CardShell className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Current Overview</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Important current records without repeating sidebar shortcuts.</p>
                </div>
              </div>

              <div className="mt-5 grid min-w-0 gap-3">
                {overviewItems.map((item) => (
                    <Link
                        key={item.title}
                        to={item.href}
                        className="group grid min-w-0 grid-cols-[44px_minmax(0,1fr)_16px] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-100">
                    {item.icon}
                  </span>
                      <span className="min-w-0">
                    <span className="block truncate text-xs font-black uppercase tracking-wide text-slate-500">{item.title}</span>
                    <span className="mt-1 block truncate text-sm font-black text-slate-900">{item.value}</span>
                    <span className="mt-1 block truncate text-sm font-medium text-slate-500">{item.helper}</span>
                  </span>
                      <ArrowIcon className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                    </Link>
                ))}
              </div>
            </CardShell>

            <CardShell className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Recent Activity</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Latest updates from your workspace.</p>
                </div>
                <Link to="/employee/notifications" className="text-sm font-black text-blue-600 hover:text-blue-700">
                  View all
                </Link>
              </div>

              <div className="mt-5 min-w-0 divide-y divide-slate-100">
                {recentActivities.length ? (
                    recentActivities.map((activity) => (
                        <div
                            key={activity.id}
                            className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[40px_minmax(0,1fr)_72px] sm:items-center"
                        >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-blue-600 ring-1 ring-slate-200">
                      {activity.icon}
                    </span>
                          <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-900">{activity.title}</span>
                      <span className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-slate-500">
                        {activity.subtitle}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-400 sm:hidden">{activity.time}</span>
                    </span>
                          <span className="hidden justify-self-end text-xs font-bold text-slate-400 sm:block">{activity.time}</span>
                        </div>
                    ))
                ) : (
                    <EmptyPanel>No recent activity yet.</EmptyPanel>
                )}
              </div>
            </CardShell>
          </section>
        </div>
      </div>
  );
};

export default EmployeeMyDashboard;

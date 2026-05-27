import { useEffect, useMemo, useState } from "react";
import type { ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import { appraisalWorkflowService } from "../../services/appraisalService";
import { employeeAssessmentService } from "../../services/employeeAssessmentService";
import { feedbackService } from "../../services/feedbackService";
import { kpiWorkflowService } from "../../services/kpiWorkflowService";
import { notificationService } from "../../services/notificationService";
import { profileService } from "../../services/profileService";
import type { NotificationDto } from "../../services/notificationService";
import type { UserProfile } from "../../services/profileService";
import type { EmployeeAppraisalFormResponse } from "../../types/appraisal";
import type { AssessmentScoreRow } from "../../types/employeeAssessment";
import type { FeedbackDashboard } from "../../types/feedback";
import type { ManagerKpiTemplateSummary } from "../../types/kpiWorkflow";
import { useAuth } from "../../contexts/AuthContext";

type IconProps = SVGProps<SVGSVGElement>;
type Tone = "blue" | "indigo" | "emerald" | "amber" | "rose" | "slate";

type ManagerDashboardData = {
    profile: UserProfile | null;
    assessmentRows: AssessmentScoreRow[];
    appraisalForms: EmployeeAppraisalFormResponse[];
    feedbackDashboard: FeedbackDashboard | null;
    kpiTemplates: ManagerKpiTemplateSummary[];
    notifications: NotificationDto[];
};

type MetricCardModel = {
    title: string;
    value: string;
    description: string;
    href: string;
    actionLabel: string;
    icon: ReactNode;
    tone: Tone;
    progress?: number;
};

type QueueItem = {
    id: string;
    employee: string;
    detail: string;
    meta: string;
    href: string;
};

type FocusItem = {
    id: string;
    label: string;
    value: string;
    description: string;
    href: string;
    icon: ReactNode;
    tone: Tone;
    status: string;
};

type ActivityItem = {
    id: string;
    title: string;
    subtitle: string;
    time: string;
    icon: ReactNode;
    tone: Tone;
};

type UpcomingItem = {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    tone: Tone;
};

const initialData: ManagerDashboardData = {
    profile: null,
    assessmentRows: [],
    appraisalForms: [],
    feedbackDashboard: null,
    kpiTemplates: [],
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

const formatShortDate = (value?: string | null) => {
    if (!value) return "No date set";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
};

const formatRelativeTime = (value?: string | null) => {
    if (!value) return "Recently";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatShortDate(value);
};

const prettyStatus = (status?: string | null) => {
    if (!status) return "Not started";

    return status
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getMostRecentDate = (item: Record<string, unknown>) => {
    const value =
        item.updatedAt ??
        item.submittedAt ??
        item.pmSubmittedAt ??
        item.finalizedAt ??
        item.createdAt ??
        item.cycleEndDate ??
        null;

    return typeof value === "string" ? value : null;
};

const isOpenStatus = (status?: string | null) => {
    const normalized = String(status ?? "").toUpperCase();
    return ![
        "APPROVED",
        "COMPLETED",
        "COMPLETE",
        "CLOSED",
        "FINALIZED",
        "ARCHIVED",
        "CANCELLED",
    ].includes(normalized);
};

const isReviewWaiting = (row: AssessmentScoreRow) => {
    const status = String(row.status ?? "").toUpperCase();
    return (
        status.includes("SUBMITTED") ||
        status.includes("PENDING") ||
        (!row.managerSigned && row.employeeSigned)
    );
};

const uniqueByEmployee = (items: AssessmentScoreRow[]) => {
    const seen = new Set<string>();

    return items.filter((item, index) => {
        const key = String(
            item.employeeId ?? item.employeeCode ?? item.employeeName ?? index,
        );
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const toneStyles: Record<
    Tone,
    { icon: string; chip: string; text: string; bar: string }
> = {
    blue: {
        icon: "bg-blue-50 text-blue-600 ring-blue-100",
        chip: "bg-blue-50 text-blue-700 ring-blue-100",
        text: "text-blue-600",
        bar: "bg-blue-600",
    },
    indigo: {
        icon: "bg-indigo-50 text-indigo-600 ring-indigo-100",
        chip: "bg-indigo-50 text-indigo-700 ring-indigo-100",
        text: "text-indigo-600",
        bar: "bg-indigo-600",
    },
    emerald: {
        icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
        chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        text: "text-emerald-600",
        bar: "bg-emerald-500",
    },
    amber: {
        icon: "bg-amber-50 text-amber-600 ring-amber-100",
        chip: "bg-amber-50 text-amber-700 ring-amber-100",
        text: "text-amber-600",
        bar: "bg-amber-500",
    },
    rose: {
        icon: "bg-rose-50 text-rose-600 ring-rose-100",
        chip: "bg-rose-50 text-rose-700 ring-rose-100",
        text: "text-rose-600",
        bar: "bg-rose-500",
    },
    slate: {
        icon: "bg-slate-50 text-slate-600 ring-slate-200",
        chip: "bg-slate-50 text-slate-700 ring-slate-200",
        text: "text-slate-600",
        bar: "bg-slate-500",
    },
};

const DashboardIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4ZM13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4ZM4 14.5A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4ZM13 14.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
    </svg>
);

const UsersIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M14 19a4.5 4.5 0 0 1 7-3.7" />
    </svg>
);

const UserIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
);

const ClipboardIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <path d="M9 5h6M9 5a3 3 0 0 1 6 0M9 5H7.5A2.5 2.5 0 0 0 5 7.5v11A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 16.5 5H15" />
        <path d="m8.5 13 2 2 5-5M8 18h8" />
    </svg>
);

const ChartIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />
        <path d="m6 10 4-4 4 4 5-6" />
    </svg>
);

const ChatIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4a3.5 3.5 0 0 1-3.5 3.5H12l-4.5 4v-4A3.5 3.5 0 0 1 4 10.5v-4Z" />
        <path d="M8 7.5h8M8 10.5h5" />
    </svg>
);

const CalendarIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <path d="M7 3v4M17 3v4M5 9h14M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z" />
    </svg>
);

const BuildingIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <path d="M4 21h16M6 21V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V21" />
        <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
    </svg>
);

const DocumentIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <path d="M7 3.5h7l3 3V20a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V3.5Z" />
        <path d="M14 3.5V7h3M9.5 12h5M9.5 15.5h5" />
    </svg>
);

const ShieldIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <path d="M12 3.5 19 6v5.5c0 4.3-2.9 7.8-7 9-4.1-1.2-7-4.7-7-9V6l7-2.5Z" />
        <path d="m9 12 2 2 4-5" />
    </svg>
);

const ArrowIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        {...props}
    >
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

const IconBadge = ({
                       children,
                       tone = "blue",
                       compact = false,
                   }: {
    children: ReactNode;
    tone?: Tone;
    compact?: boolean;
}) => (
    <span
        className={`inline-flex shrink-0 items-center justify-center rounded-2xl ring-1 ${toneStyles[tone].icon} ${
            compact ? "h-9 w-9" : "h-11 w-11"
        }`}
    >
    {children}
  </span>
);

const TextLink = ({ to, children }: { to: string; children: ReactNode }) => (
    <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-black text-blue-600 transition hover:text-blue-700"
    >
        {children}
        <ArrowIcon className="h-3.5 w-3.5" />
    </Link>
);

const Panel = ({
                   title,
                   subtitle,
                   action,
                   children,
               }: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
}) => (
    <section className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5">
        <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 className="text-base font-black tracking-tight text-slate-950">
                    {title}
                </h2>
                {subtitle && (
                    <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
                )}
            </div>
            {action}
        </div>
        {children}
    </section>
);

const EmptyState = ({
                        title,
                        description,
                        icon,
                    }: {
    title: string;
    description: string;
    icon?: ReactNode;
}) => (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
        <IconBadge tone="slate" compact>
            {icon ?? <DashboardIcon className="h-4 w-4" />}
        </IconBadge>
        <div className="min-w-0">
            <p className="text-sm font-black text-slate-800">{title}</p>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-5 text-slate-500">
                {description}
            </p>
        </div>
    </div>
);

const ContextPill = ({
                         label,
                         value,
                         icon,
                     }: {
    label: string;
    value: string;
    icon: ReactNode;
}) => (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
      {icon}
    </span>
        <div className="min-w-0">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-slate-500">
                {label}
            </p>
            <p
                className="mt-0.5 line-clamp-1 text-sm font-black leading-5 text-slate-950"
                title={value}
            >
                {value}
            </p>
        </div>
    </div>
);

const MetricCard = ({ metric }: { metric: MetricCardModel }) => (
    <Link
        to={metric.href}
        className="group flex min-w-0 flex-col rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/60 sm:p-5"
    >
        <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">{metric.title}</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    {metric.value}
                </p>
            </div>
            <IconBadge tone={metric.tone} compact>
                {metric.icon}
            </IconBadge>
        </div>

        <p className="mt-2 min-h-[2.25rem] text-sm font-semibold leading-5 text-slate-600">
            {metric.description}
        </p>

        {metric.progress != null && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full ${toneStyles[metric.tone].bar}`}
                    style={{ width: `${clampPercent(metric.progress)}%` }}
                />
            </div>
        )}

        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-black text-blue-600 group-hover:text-blue-700">
      {metric.actionLabel}
            <ArrowIcon className="h-3.5 w-3.5" />
    </span>
    </Link>
);

const FocusRow = ({ item }: { item: FocusItem }) => (
    <Link
        to={item.href}
        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 transition hover:border-blue-200 hover:bg-blue-50/50"
    >
        <IconBadge tone={item.tone} compact>
            {item.icon}
        </IconBadge>
        <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-black text-slate-950">
                    {item.label}
                </p>
                <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-black ring-1 ${toneStyles[item.tone].chip}`}
                >
          {item.status}
        </span>
            </div>
            <p className="mt-0.5 truncate text-sm font-black text-slate-800">
                {item.value}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                {item.description}
            </p>
        </div>
        <ArrowIcon className="h-4 w-4 shrink-0 text-blue-600" />
    </Link>
);

const QueueRow = ({ item }: { item: QueueItem }) => (
    <Link
        to={item.href}
        className="flex min-w-0 items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
    >
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
      <UserIcon className="h-4 w-4" />
    </span>
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-950">
                {item.employee}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                {item.detail}
            </p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
      {item.meta}
    </span>
    </Link>
);

const ActivityRow = ({ item }: { item: ActivityItem }) => (
    <div className="flex min-w-0 items-start gap-3 border-b border-slate-100 py-3 last:border-b-0">
        <IconBadge tone={item.tone} compact>
            {item.icon}
        </IconBadge>
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-950">{item.title}</p>
            <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-5 text-slate-500">
                {item.subtitle}
            </p>
        </div>
        <span className="shrink-0 text-xs font-bold text-slate-400">
      {item.time}
    </span>
    </div>
);

const UpcomingRow = ({ item }: { item: UpcomingItem }) => (
    <Link
        to={item.href}
        className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 transition hover:border-blue-200 hover:bg-blue-50/50"
    >
        <IconBadge tone={item.tone} compact>
            <CalendarIcon className="h-4 w-4" />
        </IconBadge>
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-950">{item.title}</p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                {item.subtitle}
            </p>
        </div>
        <ArrowIcon className="h-4 w-4 shrink-0 text-blue-600" />
    </Link>
);

const ManagerDashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState<ManagerDashboardData>(initialData);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadDashboard = async () => {
            setLoading(true);

            const [
                profile,
                assessmentRows,
                appraisalForms,
                feedbackDashboard,
                kpiTemplates,
                notifications,
            ] = await Promise.all([
                safeLoad(profileService.getMyProfile(), null),
                safeLoad(employeeAssessmentService.getScoreTable(), []),
                safeLoad(appraisalWorkflowService.getPmHistory(), []),
                safeLoad(feedbackService.getManagerDashboard(), null),
                safeLoad(kpiWorkflowService.listManagerTemplates(), []),
                safeLoad(notificationService.list(), []),
            ]);

            if (!mounted) return;

            setData({
                profile,
                assessmentRows,
                appraisalForms,
                feedbackDashboard,
                kpiTemplates,
                notifications,
            });
            setLoading(false);
        };

        void loadDashboard();

        return () => {
            mounted = false;
        };
    }, []);

    const managerName = data.profile?.fullName || user?.fullName || "Manager";
    const firstName = managerName.split(" ")[0] || "Manager";
    const position = data.profile?.position || user?.position || "Manager";
    const departmentName = data.profile?.departmentName || "Your Department";

    const reviewRows = useMemo(
        () =>
            uniqueByEmployee(data.assessmentRows.filter(isReviewWaiting)).slice(0, 5),
        [data.assessmentRows],
    );

    const activeAppraisals = useMemo(
        () => data.appraisalForms.filter((form) => isOpenStatus(form.status)),
        [data.appraisalForms],
    );

    const directReportCount = useMemo(() => {
        const employeeIds = new Set<string>();

        data.assessmentRows.forEach((row) => {
            if (row.employeeId || row.employeeCode || row.employeeName) {
                employeeIds.add(
                    String(row.employeeId ?? row.employeeCode ?? row.employeeName),
                );
            }
        });

        data.appraisalForms.forEach((form) => {
            if (form.employeeId || form.employeeCode || form.employeeName) {
                employeeIds.add(
                    String(form.employeeId ?? form.employeeCode ?? form.employeeName),
                );
            }
        });

        return employeeIds.size;
    }, [data.appraisalForms, data.assessmentRows]);

    const openKpiAssignments = useMemo(
        () =>
            data.kpiTemplates.reduce(
                (total, item) => total + Number(item.openAssignments ?? 0),
                0,
            ),
        [data.kpiTemplates],
    );

    const pendingFeedbackCount = Number(
        data.feedbackDashboard?.totalPendingAssignments ??
        data.feedbackDashboard?.pendingFeedbackToSubmit?.length ??
        0,
    );

    const queueStatus = loading
        ? "Loading"
        : reviewRows.length
            ? `${reviewRows.length} pending`
            : "Clear today";
    const directReportLabel = directReportCount
        ? `${directReportCount} linked`
        : "Not linked yet";

    const metrics: MetricCardModel[] = [
        {
            title: "Pending Reviews",
            value: String(reviewRows.length),
            description: reviewRows.length
                ? "Submitted records need manager review."
                : "No reviews are waiting today.",
            href: "/manager/assessment-review",
            actionLabel: "Open review queue",
            icon: <ClipboardIcon className="h-5 w-5" />,
            tone: reviewRows.length ? "amber" : "blue",
            progress: reviewRows.length ? Math.min(reviewRows.length * 20, 100) : 0,
        },
        {
            title: "Team Scope",
            value: directReportCount ? String(directReportCount) : "—",
            description: directReportCount
                ? "Employees found in your manager workflows."
                : "No direct report records are linked yet.",
            href: "/manager/assessment-review",
            actionLabel: "Check team work",
            icon: <UsersIcon className="h-5 w-5" />,
            tone: "indigo",
        },
        {
            title: "Appraisal Work",
            value: String(activeAppraisals.length),
            description: activeAppraisals.length
                ? "Active appraisal records are in progress."
                : "No active appraisal cycle is open.",
            href: "/manager/appraisals",
            actionLabel: "View appraisals",
            icon: <DocumentIcon className="h-5 w-5" />,
            tone: "blue",
            progress: activeAppraisals.length
                ? Math.min(activeAppraisals.length * 14, 100)
                : 0,
        },
        {
            title: "KPI Workload",
            value: String(openKpiAssignments),
            description: openKpiAssignments
                ? "KPI assignments need manager scoring."
                : "No KPI work is currently open.",
            href: "/manager/kpi-scoring",
            actionLabel: "Open Team KPIs",
            icon: <ChartIcon className="h-5 w-5" />,
            tone: openKpiAssignments ? "emerald" : "slate",
            progress: openKpiAssignments ? Math.min(openKpiAssignments * 10, 100) : 0,
        },
    ];

    const focusItems: FocusItem[] = [
        {
            id: "focus-assessment-review",
            label: "Assessment Review",
            value: reviewRows.length
                ? `${reviewRows.length} record${reviewRows.length > 1 ? "s" : ""} waiting`
                : "All caught up",
            description: "Submitted self-assessments and manager review records.",
            href: "/manager/assessment-review",
            icon: <ClipboardIcon className="h-5 w-5" />,
            tone: reviewRows.length ? "amber" : "blue",
            status: reviewRows.length ? "Review" : "Clear",
        },
        {
            id: "focus-team-appraisals",
            label: "Team Appraisals",
            value: activeAppraisals.length
                ? `${activeAppraisals.length} active record${activeAppraisals.length > 1 ? "s" : ""}`
                : "No open cycle",
            description:
                "Employee performance review forms and manager submission work.",
            href: "/manager/appraisals",
            icon: <DocumentIcon className="h-5 w-5" />,
            tone: activeAppraisals.length ? "indigo" : "slate",
            status: activeAppraisals.length ? "Open" : "Idle",
        },
        {
            id: "focus-team-kpis",
            label: "Team KPIs",
            value: openKpiAssignments
                ? `${openKpiAssignments} assignment${openKpiAssignments > 1 ? "s" : ""} open`
                : "No open KPI work",
            description:
                "Employee KPI scoring, KPI history, and active KPI workload.",
            href: "/manager/kpi-scoring",
            icon: <ChartIcon className="h-5 w-5" />,
            tone: openKpiAssignments ? "emerald" : "slate",
            status: openKpiAssignments ? "Score" : "Clear",
        },
        {
            id: "focus-feedback",
            label: "Feedback",
            value: pendingFeedbackCount
                ? `${pendingFeedbackCount} pending assignment${pendingFeedbackCount > 1 ? "s" : ""}`
                : "No pending feedback",
            description:
                "360 feedback tasks, continuous feedback, and coaching signals.",
            href: "/manager/feedback",
            icon: <ChatIcon className="h-5 w-5" />,
            tone: pendingFeedbackCount ? "rose" : "blue",
            status: pendingFeedbackCount ? "Pending" : "Clear",
        },
    ];

    const reviewQueue: QueueItem[] = reviewRows.map((row, index) => ({
        id: `review-${row.id}-${index}`,
        employee: row.employeeName || "Employee Review",
        detail: `${row.formName || row.period || "Self-assessment"} · ${prettyStatus(row.status)}`,
        meta: row.submittedAt
            ? formatShortDate(row.submittedAt)
            : prettyStatus(row.status),
        href: "/manager/assessment-review",
    }));

    const activityItems: ActivityItem[] = useMemo(() => {
        const notificationItems = data.notifications.slice(0, 4).map(
            (notification, index): ActivityItem => ({
                id: `notification-${notification.id ?? index}-${index}`,
                title: notification.title || "Notification",
                subtitle: notification.message || "New manager workspace update.",
                time: formatRelativeTime(notification.createdAt),
                icon: <ChatIcon className="h-5 w-5" />,
                tone: "blue",
            }),
        );

        const assessmentItems = data.assessmentRows
            .filter((row) => row.submittedAt)
            .sort((a, b) =>
                String(b.submittedAt ?? "").localeCompare(String(a.submittedAt ?? "")),
            )
            .slice(0, 3)
            .map(
                (row, index): ActivityItem => ({
                    id: `assessment-${row.id}-${index}`,
                    title: `${row.employeeName || "Employee"} submitted assessment`,
                    subtitle: `${row.formName || row.period || "Self-assessment"} · ${prettyStatus(row.status)}`,
                    time: formatRelativeTime(row.submittedAt),
                    icon: <ClipboardIcon className="h-5 w-5" />,
                    tone: "indigo",
                }),
            );

        const appraisalItems = [...data.appraisalForms]
            .sort((a, b) =>
                String(
                    getMostRecentDate(b as unknown as Record<string, unknown>) ?? "",
                ).localeCompare(
                    String(
                        getMostRecentDate(a as unknown as Record<string, unknown>) ?? "",
                    ),
                ),
            )
            .slice(0, 3)
            .map(
                (form, index): ActivityItem => ({
                    id: `appraisal-${form.id}-${index}`,
                    title: `${form.employeeName || "Employee"} appraisal updated`,
                    subtitle: `${form.cycleName || "Appraisal cycle"} · ${prettyStatus(form.status)}`,
                    time: formatRelativeTime(
                        getMostRecentDate(form as unknown as Record<string, unknown>),
                    ),
                    icon: <DocumentIcon className="h-5 w-5" />,
                    tone: "emerald",
                }),
            );

        const combined = [
            ...notificationItems,
            ...assessmentItems,
            ...appraisalItems,
        ];
        return combined.length ? combined.slice(0, 6) : [];
    }, [data.appraisalForms, data.assessmentRows, data.notifications]);

    const upcomingItems: UpcomingItem[] = useMemo(() => {
        const kpiItems = data.kpiTemplates.slice(0, 3).map(
            (template, index): UpcomingItem => ({
                id: `kpi-${template.kpiFormId}-${template.cyclePeriodId ?? "cycle"}-${index}`,
                title: template.title || "Team KPI assignment",
                subtitle: template.periodEndDate
                    ? `KPI period ends ${formatShortDate(template.periodEndDate)}`
                    : `${template.openAssignments ?? 0} open assignments`,
                href: "/manager/kpi-scoring",
                tone: "emerald",
            }),
        );

        if (kpiItems.length) return kpiItems;

        return activeAppraisals.slice(0, 3).map(
            (form, index): UpcomingItem => ({
                id: `appraisal-${form.id}-${index}`,
                title: form.cycleName || "Team appraisal cycle",
                subtitle: form.cycleManagerSubmissionDeadline
                    ? `Manager due ${formatShortDate(form.cycleManagerSubmissionDeadline)}`
                    : prettyStatus(form.status),
                href: "/manager/appraisals",
                tone: "indigo",
            }),
        );
    }, [activeAppraisals, data.kpiTemplates]);

    return (
        <main className="min-w-0 bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-5">
                <section className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-6">
                    <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700 ring-1 ring-blue-100">
                <DashboardIcon className="h-4 w-4" />
                Manager Dashboard
              </span>
                            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                                Welcome back, {firstName} <span aria-hidden="true">👋</span>
                            </h1>
                            <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-slate-600">
                                Review team performance, approve employee work, follow KPI
                                progress, and stay on top of feedback activity.
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                            <IconBadge tone="blue" compact>
                                <ShieldIcon className="h-4 w-4" />
                            </IconBadge>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                                    Manager access
                                </p>
                                <p className="mt-0.5 text-sm font-black text-slate-950">
                                    Team review workspace
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                        <ContextPill
                            label="Department"
                            value={departmentName}
                            icon={<BuildingIcon className="h-4 w-4" />}
                        />
                        <ContextPill
                            label="Position"
                            value={position}
                            icon={<UserIcon className="h-4 w-4" />}
                        />
                        <ContextPill
                            label="Direct Reports"
                            value={directReportLabel}
                            icon={<UsersIcon className="h-4 w-4" />}
                        />
                        <ContextPill
                            label="Review Queue"
                            value={queueStatus}
                            icon={<ClipboardIcon className="h-4 w-4" />}
                        />
                    </div>
                </section>

                <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => (
                        <MetricCard key={metric.title} metric={metric} />
                    ))}
                </section>

                <section className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
                    <Panel
                        title="Review Queue"
                        subtitle="Manager review work that needs attention first."
                        action={
                            <TextLink to="/manager/assessment-review">View All</TextLink>
                        }
                    >
                        <div className="min-w-0">
                            {reviewQueue.length ? (
                                reviewQueue.map((item) => (
                                    <QueueRow key={item.id} item={item} />
                                ))
                            ) : (
                                <EmptyState
                                    title="You're all caught up"
                                    description="Submitted self-assessments and appraisal reviews will appear here when employees send work to you."
                                    icon={<ClipboardIcon className="h-5 w-5" />}
                                />
                            )}
                        </div>
                    </Panel>

                    <Panel
                        title="Manager Focus"
                        subtitle="The manager workflows that matter most today."
                    >
                        <div className="grid min-w-0 gap-3">
                            {focusItems.map((item) => (
                                <FocusRow key={item.id} item={item} />
                            ))}
                        </div>
                    </Panel>
                </section>

                <section className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
                    <Panel
                        title="Team Activity"
                        subtitle="Latest updates from appraisals, KPIs, feedback, and notifications."
                        action={<TextLink to="/notifications">View All</TextLink>}
                    >
                        <div className="min-w-0">
                            {activityItems.length ? (
                                activityItems.map((item) => (
                                    <ActivityRow key={item.id} item={item} />
                                ))
                            ) : (
                                <EmptyState
                                    title="No recent team activity"
                                    description="Team updates will appear here after employees submit assessments, update KPIs, or receive feedback."
                                    icon={<ChatIcon className="h-5 w-5" />}
                                />
                            )}
                        </div>
                    </Panel>

                    <Panel
                        title="Upcoming Work"
                        subtitle="Deadlines and manager follow-up items."
                    >
                        <div className="grid min-w-0 gap-3">
                            {upcomingItems.length ? (
                                upcomingItems.map((item) => (
                                    <UpcomingRow key={item.id} item={item} />
                                ))
                            ) : (
                                <EmptyState
                                    title="No upcoming work scheduled"
                                    description="KPI periods, appraisal deadlines, and manager milestones will appear here."
                                    icon={<CalendarIcon className="h-5 w-5" />}
                                />
                            )}
                        </div>
                    </Panel>
                </section>
            </div>
        </main>
    );
};

export default ManagerDashboard;

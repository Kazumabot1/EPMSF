import { Link } from 'react-router-dom';
import type { UserLike } from '../../config/roleNavigation';

function isKpiNotificationType(type: string | null | undefined): boolean {
  const t = String(type ?? '').toUpperCase();
  return t === 'KPI' || t.startsWith('KPI_');
}

/** Where to send the user for a KPI template deep-link based on role. */
export function kpiNotificationDetailPath(
  user: UserLike | null | undefined,
  templateId: number,
  type?: string | null,
): string | null {
  if (!user || templateId == null || Number.isNaN(Number(templateId))) return null;
  const normalizedType = String(type ?? '').toUpperCase();
  const raw = (user.roles ?? []).map((r) => String(r).toUpperCase().replace(/^ROLE_/, ''));
  if (normalizedType === 'KPI_FINALIZED_EMPLOYEE') {
    return '/my-kpis';
  }
  if (normalizedType === 'KPI_FINALIZED_HR') {
    return '/hr/employee-kpis';
  }
  if (raw.some((r) => r === 'HR' || r.startsWith('HR_'))) {
    return `/hr/kpi-template/${templateId}`;
  }
  if (
    raw.some((r) =>
      ['MANAGER', 'PROJECT_MANAGER', 'TEAM_MANAGER', 'DEPARTMENT_HEAD', 'DEPARTMENTHEAD', 'DEPT_HEAD', 'HEAD_OF_DEPARTMENT', 'CEO', 'EXECUTIVE'].includes(r),
    )
  ) {
    return '/kpi-scoring';
  }
  if (raw.some((r) => ['EMPLOYEE', 'HR', 'HUMAN_RESOURCE', 'HUMAN_RESOURCES', 'HR_MANAGER', 'HR_ADMIN'].includes(r))) {
    return '/my-kpis';
  }
  return null;
}

type Props = {
  message: string;
  type?: string | null;
  referenceId?: number | null;
  user: UserLike | null | undefined;
  className?: string;
  /** e.g. mark notification read when following the KPI link */
  onKpiLinkNavigate?: () => void;
};

/**
 * Wraps the quoted KPI template title in notification copy with a link when `referenceId`
 * is present (KPI template / kpi_form id from the API).
 */
export default function KpiNotificationMessageBody({
  message,
  type,
  referenceId,
  user,
  className,
  onKpiLinkNavigate,
}: Props) {
  const path =
    referenceId != null && isKpiNotificationType(type) ? kpiNotificationDetailPath(user, referenceId, type) : null;

  if (!path) {
    return <span className={className}>{message}</span>;
  }

  const re = /((?:KPI template|KPI)\s+")([^"]+)(")/;
  const m = message.match(re);
  if (!m || m.index === undefined) {
    return <span className={className}>{message}</span>;
  }

  const before = message.slice(0, m.index);
  const after = message.slice(m.index + m[0].length);

  return (
    <span className={className}>
      {before}
      {m[1]}
      <Link
        to={path}
        className="notif-kpi-title-link"
        onClick={(e) => {
          e.stopPropagation();
          onKpiLinkNavigate?.();
        }}
      >
        {m[2]}
      </Link>
      {m[3]}
      {after}
    </span>
  );
}

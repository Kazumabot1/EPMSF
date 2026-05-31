import type { Employee } from '../../services/employeeService';
import type { EvaluatorType } from '../../types/feedback';

export const evaluatorTypeOptions: EvaluatorType[] = ['MANAGER', 'PEER', 'SUBORDINATE'];

export const evaluatorTypeLabels: Record<EvaluatorType, string> = {
  MANAGER: 'Manager',
  PEER: 'Peer',
  SUBORDINATE: 'Subordinate reviewer',
  SELF: 'Self',
};

export const auditEntityOptions = [
  { value: 'CAMPAIGN', label: 'Campaign' },
  { value: 'REQUEST', label: 'Assignment' },
  { value: 'RESPONSE', label: 'Feedback response' },
  { value: 'SUMMARY', label: 'Published summary' },
  { value: 'AUDIT', label: 'Audit' },
];

export const auditEntityLabel = (value?: string | null) => {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'FORM') return 'Question setup';
  return auditEntityOptions.find((option) => option.value === normalized)?.label ?? value ?? 'Record';
};

const recentKeyPrefix = 'feedback-recent-ids:';

export const loadRecentIds = (key: string): number[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(`${recentKeyPrefix}${key}`);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'number') : [];
  } catch {
    return [];
  }
};

export const storeRecentId = (key: string, id: number): number[] => {
  const nextIds = [id, ...loadRecentIds(key).filter((item) => item !== id)].slice(0, 8);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(`${recentKeyPrefix}${key}`, JSON.stringify(nextIds));
  }
  return nextIds;
};

export const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
};

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

export const formatPercent = (value?: number | null) => `${Math.round(value ?? 0)}%`;

export const formatScore = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }

  return `${value.toFixed(1)}%`;
};

export const formatEmployeeLabel = (employee: Employee) =>
    `${employee.name}${employee.department ? ` • ${employee.department}` : ''}`;

export const getStatusTone = (status?: string) => {
  switch ((status ?? '').toUpperCase()) {
    case 'ACTIVE':
    case 'SUBMITTED':
    case 'COMPLETED':
      return 'success';
    case 'DRAFT':
    case 'PENDING':
      return 'warning';
    case 'CLOSED':
    case 'PUBLISHED':
      return 'neutral';
    default:
      return 'info';
  }
};

type MetricCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export const MetricCard = ({ label, value, hint }: MetricCardProps) => (
    <div className="feedback-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
);

type StatusBadgeProps = {
  status: string;
};

export const StatusBadge = ({ status }: StatusBadgeProps) => (
    <span className={`feedback-status-badge ${getStatusTone(status)}`}>{status || 'Unknown'}</span>
);

type EmptyStateProps = {
  title: string;
  body: string;
};

export const EmptyState = ({ title, body }: EmptyStateProps) => (
    <div className="feedback-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
);

type SectionIntroProps = {
  title: string;
  body: string;
  aside?: string;
};

export const SectionIntro = ({ title, body, aside }: SectionIntroProps) => (
    <div className="feedback-section-intro">
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      {aside ? <small>{aside}</small> : null}
    </div>
);

type RecentIdListProps = {
  title: string;
  ids: number[];
  emptyLabel: string;
  onPick: (id: number) => void;
};

export const RecentIdList = ({ title, ids, emptyLabel, onPick }: RecentIdListProps) => (
    <div className="feedback-reference-block">
      <span>{title}</span>
      {ids.length ? (
          <div className="feedback-reference-list">
            {ids.map((id) => (
                <button key={id} type="button" className="feedback-reference-chip" onClick={() => onPick(id)}>
                  #{id}
                </button>
            ))}
          </div>
      ) : (
          <small>{emptyLabel}</small>
      )}
    </div>
);

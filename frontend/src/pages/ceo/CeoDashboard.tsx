import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './ceo-dashboard.css';

interface AppraisalReview {
  id: number;
  appraisalId: number;

  employeeId?: number | null;
  employeeName?: string | null;
  employeeCode?: string | null;

  departmentId?: number | null;
  departmentName?: string | null;

  positionName?: string | null;

  cycleId?: number | null;
  cycleName?: string | null;

  managerName?: string | null;
  departmentHeadName?: string | null;

  reviewType?: string | null;
  reviewStatus?: string | null;
  reviewDecision?: string | null;

  totalScore?: number | null;
  scorePercent?: number | null;
  performanceLabel?: string | null;

  comments?: string | null;
  recommendation?: string | null;

  pmSubmittedAt?: string | null;
  deptHeadSubmittedAt?: string | null;
  hrApprovedAt?: string | null;
  updatedAt?: string | null;
}

const statusColor: Record<string, { bg: string; color: string }> = {
  PM_DRAFT: { bg: '#f1f5f9', color: '#475569' },
  DEPT_HEAD_PENDING: { bg: '#fef9c3', color: '#ca8a04' },
  HR_PENDING: { bg: '#dbeafe', color: '#2563eb' },
  COMPLETED: { bg: '#dcfce7', color: '#16a34a' },
  RETURNED: { bg: '#ffedd5', color: '#ea580c' },
  REJECTED: { bg: '#fee2e2', color: '#dc2626' },

  SUBMITTED: { bg: '#dcfce7', color: '#16a34a' },
  PENDING: { bg: '#fef9c3', color: '#ca8a04' },
  IN_PROGRESS: { bg: '#dbeafe', color: '#2563eb' },
  APPROVED: { bg: '#f0fdf4', color: '#15803d' },
};

const unwrap = <T,>(payload: any, fallback: T): T =>
  payload?.data?.data ?? payload?.data ?? fallback;

const formatStatus = (value?: string | null) =>
  value ? value.replace(/_/g, ' ') : 'Unknown';

const formatDate = (value?: string | null) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString();
};

const percentText = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${Number(value).toFixed(0)}%`;
};

const scoreColor = (value?: number | null) => {
  const score = Number(value ?? 0);

  if (score >= 86) return { bg: '#dcfce7', color: '#15803d' };
  if (score >= 71) return { bg: '#dbeafe', color: '#1d4ed8' };
  if (score >= 60) return { bg: '#f0fdf4', color: '#16a34a' };
  if (score >= 40) return { bg: '#ffedd5', color: '#c2410c' };

  return { bg: '#fee2e2', color: '#b91c1c' };
};

const CeoDashboard = () => {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<AppraisalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/appraisal-reviews');
      const data = unwrap<AppraisalReview[]>(response, []);

      setReviews(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load CEO appraisal reports', err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Unable to load appraisal reports. Please try again later.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(
    () => ({
      total: reviews.length,
      draft: reviews.filter((item) => item.reviewStatus === 'PM_DRAFT').length,
      deptPending: reviews.filter((item) => item.reviewStatus === 'DEPT_HEAD_PENDING').length,
      hrPending: reviews.filter((item) => item.reviewStatus === 'HR_PENDING').length,
      completed: reviews.filter((item) => item.reviewStatus === 'COMPLETED').length,
      averageScore:
        reviews.length === 0
          ? 0
          : reviews
              .map((item) => Number(item.scorePercent ?? 0))
              .filter((score) => Number.isFinite(score))
              .reduce((sum, score) => sum + score, 0) / reviews.length,
      highPerformers: reviews.filter((item) => Number(item.scorePercent ?? 0) >= 86).length,
      lowPerformers: reviews.filter((item) => Number(item.scorePercent ?? 0) < 60).length,
    }),
    [reviews],
  );

  const filtered = reviews.filter((review) => {
    const q = search.trim().toLowerCase();

    if (!q) return true;

    return (
      String(review.id).includes(q) ||
      String(review.appraisalId).includes(q) ||
      (review.employeeName ?? '').toLowerCase().includes(q) ||
      (review.employeeCode ?? '').toLowerCase().includes(q) ||
      (review.departmentName ?? '').toLowerCase().includes(q) ||
      (review.positionName ?? '').toLowerCase().includes(q) ||
      (review.cycleName ?? '').toLowerCase().includes(q) ||
      (review.reviewType ?? '').toLowerCase().includes(q) ||
      (review.reviewStatus ?? '').toLowerCase().includes(q) ||
      (review.performanceLabel ?? '').toLowerCase().includes(q) ||
      (review.comments ?? '').toLowerCase().includes(q) ||
      (review.recommendation ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="executive-fluxen-dashboard"
      style={{
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.4rem',
            background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
            color: '#fff',
            fontSize: '.75rem',
            fontWeight: 700,
            padding: '.3rem .8rem',
            borderRadius: '999px',
            marginBottom: '.75rem',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}
        >
          <i className="bi bi-eye" /> Executive · Read-Only
        </span>

        <h1
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: '#1e293b',
            margin: '0 0 .25rem',
          }}
        >
          Executive Dashboard
        </h1>

        <p style={{ color: '#64748b', margin: 0 }}>
          Executive view of appraisal reports, performance summaries, and organization-level reporting.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '.75rem',
          background: '#ede9fe',
          border: '1px solid #c4b5fd',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '.88rem',
          color: '#5b21b6',
        }}
      >
        <i className="bi bi-info-circle-fill" style={{ fontSize: '1.1rem', flexShrink: 0 }} />
        <span>
          Executive access is read-only. Creating, editing, signing, submitting,
          approving, or deleting records remains restricted to the relevant operational roles.
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {[
          { label: 'Total Reports', value: summary.total, color: '#6366f1', icon: 'bi-files' },
          { label: 'Manager Draft', value: summary.draft, color: '#64748b', icon: 'bi-pencil' },
          {
            label: 'Dept Head Pending',
            value: summary.deptPending,
            color: '#ca8a04',
            icon: 'bi-hourglass-split',
          },
          { label: 'HR Pending', value: summary.hrPending, color: '#2563eb', icon: 'bi-person-check' },
          { label: 'Completed', value: summary.completed, color: '#16a34a', icon: 'bi-check-circle' },
          {
            label: 'Avg. Score',
            value: `${Number(summary.averageScore || 0).toFixed(0)}%`,
            color: '#7c3aed',
            icon: 'bi-graph-up-arrow',
          },
          { label: 'High Performers', value: summary.highPerformers, color: '#15803d', icon: 'bi-stars' },
          { label: 'Low Performers', value: summary.lowPerformers, color: '#dc2626', icon: 'bi-exclamation-triangle' },
        ].map((chip) => (
          <div
            key={chip.label}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem',
              display: 'grid',
              gap: '.45rem',
              boxShadow: '0 12px 30px rgba(15,23,42,.06)',
              minHeight: 105,
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: `${chip.color}18`,
                color: chip.color,
              }}
            >
              <i className={`bi ${chip.icon}`} />
            </span>

            <strong style={{ fontSize: '1.35rem', fontWeight: 900, color: chip.color }}>
              {chip.value}
            </strong>

            <span style={{ fontSize: '.78rem', color: '#64748b', lineHeight: 1.2, fontWeight: 700 }}>
              {chip.label}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/executive/kpi-scoring')}
          style={{
            border: '1px solid #bbf7d0',
            background: '#fff',
            borderRadius: 18,
            padding: '1.2rem',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(15,23,42,.06)',
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              background: '#f0fdf4',
              color: '#16a34a',
              fontSize: 20,
              marginBottom: 10,
            }}
          >
            <i className="bi bi-bullseye" />
          </span>

          <strong
            style={{
              display: 'block',
              color: '#1e293b',
              fontSize: '1rem',
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            KPI Management
          </strong>

          <small
            style={{
              display: 'block',
              color: '#64748b',
              fontWeight: 650,
              lineHeight: 1.5,
            }}
          >
            Enter actual KPI scores for department heads and HR, review history, and manage approvals.
          </small>
        </button>

        <button
          type="button"
          onClick={() => navigate('/executive/approval/kpi')}
          style={{
            border: '1px solid #dcfce7',
            background: '#fff',
            borderRadius: 18,
            padding: '1.2rem',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(15,23,42,.06)',
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              background: '#ecfdf5',
              color: '#15803d',
              fontSize: 20,
              marginBottom: 10,
            }}
          >
            <i className="bi bi-shield-check" />
          </span>

          <strong
            style={{
              display: 'block',
              color: '#1e293b',
              fontSize: '1rem',
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            KPI Approval
          </strong>

          <small
            style={{
              display: 'block',
              color: '#64748b',
              fontWeight: 650,
              lineHeight: 1.5,
            }}
          >
            Review and approve employee KPI submissions awaiting executive sign-off.
          </small>
        </button>

        <button
          type="button"
          onClick={() => navigate('/executive/approval/department-kpi')}
          style={{
            border: '1px solid #bfdbfe',
            background: '#fff',
            borderRadius: 18,
            padding: '1.2rem',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(15,23,42,.06)',
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: 20,
              marginBottom: 10,
            }}
          >
            <i className="bi bi-building-check" />
          </span>

          <strong
            style={{
              display: 'block',
              color: '#1e293b',
              fontSize: '1rem',
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            Department KPI Approval
          </strong>

          <small
            style={{
              display: 'block',
              color: '#64748b',
              fontWeight: 650,
              lineHeight: 1.5,
            }}
          >
            Approve department KPI early-close requests and finalization submissions.
          </small>
        </button>

        <button
          type="button"
          onClick={() => navigate('/executive/reports')}
          style={{
            border: '1px solid #ddd6fe',
            background: '#fff',
            borderRadius: 18,
            padding: '1.2rem',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(15,23,42,.06)',
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              background: '#faf5ff',
              color: '#7c3aed',
              fontSize: 20,
              marginBottom: 10,
            }}
          >
            <i className="bi bi-bar-chart-line" />
          </span>

          <strong
            style={{
              display: 'block',
              color: '#1e293b',
              fontSize: '1rem',
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            Reporting & Analytics
          </strong>

          <small
            style={{
              display: 'block',
              color: '#64748b',
              fontWeight: 650,
              lineHeight: 1.5,
            }}
          >
            Open the full executive report dashboard with department and employee performance details.
          </small>
        </button>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            border: '1px solid #bfdbfe',
            background: '#fff',
            borderRadius: 18,
            padding: '1.2rem',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 12px 30px rgba(15,23,42,.06)',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: 20,
              marginBottom: 10,
            }}
          >
            <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'}`} />
          </span>

          <strong
            style={{
              display: 'block',
              color: '#1e293b',
              fontSize: '1rem',
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            Refresh Executive Data
          </strong>

          <small
            style={{
              display: 'block',
              color: '#64748b',
              fontWeight: 650,
              lineHeight: 1.5,
            }}
          >
            Reload the latest appraisal review records and dashboard summary.
          </small>
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', maxWidth: '420px', flex: '1 1 320px' }}>
          <i
            className="bi bi-search"
            style={{
              position: 'absolute',
              left: '.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '.9rem',
              pointerEvents: 'none',
            }}
          />

          <input
            type="search"
            placeholder="Search employee, department, cycle, status..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '.65rem .85rem .65rem 2.2rem',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '.88rem',
              outline: 'none',
              background: '#fff',
              fontFamily: 'inherit',
              color: '#1e293b',
            }}
          />
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            border: '1px solid #c4b5fd',
            background: '#fff',
            color: '#6d28d9',
            borderRadius: 10,
            padding: '.65rem .95rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'}`} /> Refresh
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7c3aed' }}>
          <i
            className="bi bi-arrow-repeat"
            style={{ fontSize: '1.5rem', display: 'block', marginBottom: '.5rem' }}
          />
          Loading reports...
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '1rem',
            color: '#991b1b',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 14px 40px rgba(15,23,42,.06)',
          }}
        >
          <div
            style={{
              padding: '1rem 1.2rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: '#1e293b',
                }}
              >
                Appraisal Report Review Centre
              </h2>
              <p
                style={{
                  margin: '.25rem 0 0',
                  color: '#64748b',
                  fontSize: '.84rem',
                  fontWeight: 600,
                }}
              >
                Showing {filtered.length} of {reviews.length} appraisal report records.
              </p>
            </div>

            <Link
              to="/executive/reports"
              style={{
                color: '#7c3aed',
                fontWeight: 900,
                textDecoration: 'none',
                fontSize: '.86rem',
              }}
            >
              Open full reports <i className="bi bi-arrow-right" />
            </Link>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <i
                className="bi bi-inbox"
                style={{ display: 'block', fontSize: '2rem', marginBottom: '.5rem' }}
              />
              No reports found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {[
                      'Employee',
                      'Department',
                      'Cycle',
                      'Review Status',
                      'Score',
                      'Performance',
                      'Manager',
                      'Dept Head',
                      'Updated',
                    ].map((head) => (
                      <th
                        key={head}
                        style={{
                          textAlign: 'left',
                          padding: '.85rem 1rem',
                          fontSize: '.72rem',
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((review) => {
                    const status = review.reviewStatus ?? 'UNKNOWN';
                    const statusStyle = statusColor[status] ?? {
                      bg: '#f1f5f9',
                      color: '#475569',
                    };
                    const scoreStyle = scoreColor(review.scorePercent);

                    return (
                      <tr key={`${review.id}-${review.appraisalId}`}>
                        <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          <strong style={{ display: 'block', color: '#1e293b' }}>
                            {review.employeeName ?? '—'}
                          </strong>
                          <small style={{ color: '#64748b' }}>
                            {review.employeeCode ?? `Employee #${review.employeeId ?? '—'}`}
                          </small>
                        </td>

                        <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          {review.departmentName ?? '—'}
                        </td>

                        <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          <strong style={{ display: 'block', color: '#1e293b' }}>
                            {review.cycleName ?? '—'}
                          </strong>
                          <small style={{ color: '#64748b' }}>
                            {review.reviewType ? formatStatus(review.reviewType) : 'Review'}
                          </small>
                        </td>

                        <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              borderRadius: '999px',
                              padding: '.25rem .6rem',
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              fontSize: '.75rem',
                              fontWeight: 800,
                            }}
                          >
                            {formatStatus(status)}
                          </span>
                        </td>

                        <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              borderRadius: '999px',
                              padding: '.25rem .6rem',
                              background: scoreStyle.bg,
                              color: scoreStyle.color,
                              fontSize: '.75rem',
                              fontWeight: 900,
                            }}
                          >
                            {percentText(review.scorePercent)}
                          </span>
                          <small style={{ display: 'block', color: '#64748b', marginTop: 3 }}>
                            {review.totalScore ?? '—'} pts
                          </small>
                        </td>

                        <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          {review.performanceLabel ?? '—'}
                        </td>

                        <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          {review.managerName ?? '—'}
                        </td>

                        <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          {review.departmentHeadName ?? '—'}
                        </td>

                        <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          {formatDate(
                            review.updatedAt ||
                              review.hrApprovedAt ||
                              review.deptHeadSubmittedAt ||
                              review.pmSubmittedAt,
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CeoDashboard;
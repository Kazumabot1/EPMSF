import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ProfileNameCell from './ProfileNameCell';
import './Home.css';

type DashboardData = {
  user?: any;
  stats?: {
    directReports?: number;
    kpisCreated?: number;
    activePipsManaged?: number;
    unreadNotifications?: number;
  };
  recentKpis?: Array<{ id: number | string; title?: string; weight?: number | string }>;
  recentNotifications?: Array<{ id: number | string; title?: string; read?: boolean }>;
};

const numberValue = (value: unknown) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

function Home() {
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/summary')
      .then((res) => setData(res.data))
      .catch((err) => {
        const status = err?.response?.status;

        if (status === 401 || status === 403) {
          setError('Your session is not authorized for this dashboard.');
          return;
        }

        setError('Failed to load dashboard');
      });

    api
      .get('/employees')
      .then((res) => {
        const list: any[] = res.data?.data ?? res.data ?? [];
        const active = Array.isArray(list)
          ? list.filter((e: any) => e.active !== false && e.status !== 'INACTIVE').length
          : 0;

        setTotalEmployees(active);
      })
      .catch(() => {
        setTotalEmployees(null);
      });
  }, []);

  const stats = useMemo(() => {
    return {
      employees: totalEmployees ?? numberValue(data?.stats?.directReports),
      kpis: numberValue(data?.stats?.kpisCreated),
      pips: numberValue(data?.stats?.activePipsManaged),
      notifications: numberValue(data?.stats?.unreadNotifications),
    };
  }, [data?.stats, totalEmployees]);

  return (
    <div className="fluxen-dashboard hr-fluxen-dashboard">
      <section className="fluxen-hero hr-fluxen-hero">
        <div className="fluxen-orb fluxen-orb--one" />
        <div className="fluxen-orb fluxen-orb--two" />

        <div className="fluxen-hero-copy">
          <span className="fluxen-eyebrow">
            <i className="bi bi-grid-1x2" /> HR Command Center
          </span>
          <h1>HR Dashboard</h1>
          <p>
            Monitor organization setup, workforce activity, KPIs, PIP attention, and HR operating
            signals from one clean Fluxen-style workspace.
          </p>
        </div>

        <div className="fluxen-hero-score">
          <span>Active Employees</span>
          <strong>{stats.employees}</strong>
          <small>Current HR scope</small>
        </div>
      </section>

      {error && <div className="fluxen-alert fluxen-alert--error">{error}</div>}
      {!data && !error && <div className="fluxen-alert">Loading HR dashboard...</div>}

      {data && (
        <>
          <section className="fluxen-metric-grid">
            <MetricCard
              icon="bi-people"
              label="Active Employees"
              value={stats.employees}
              detail="Active in system"
              tone="sky"
            />
            <MetricCard
              icon="bi-clipboard-check"
              label="KPIs Created"
              value={stats.kpis}
              detail="Configured by HR"
              tone="amber"
            />
            <MetricCard
              icon="bi-exclamation-triangle"
              label="Active PIPs"
              value={stats.pips}
              detail="Currently tracked"
              tone="rose"
            />
            <MetricCard
              icon="bi-bell"
              label="Unread Notifications"
              value={stats.notifications}
              detail="Need attention"
              tone="violet"
            />
          </section>

          <section className="fluxen-action-grid">
            <DashboardAction
              icon="bi-people-fill"
              title="Teams"
              description="Manage teams, leaders, and historical team changes."
              onClick={() => navigate('/hr/team')}
            />
            <DashboardAction
              icon="bi-building"
              title="Departments"
              description="Maintain departments and department-level structure."
              onClick={() => navigate('/hr/department')}
            />
            <DashboardAction
              icon="bi-clipboard-data"
              title="Assessment Scores"
              description="Review score records and assessment progress."
              onClick={() => navigate('/hr/assessment-scores')}
            />
            <DashboardAction
              icon="bi-chat-square-dots"
              title="360 Feedback"
              description="Configure questions, rules, campaigns, and analytics."
              onClick={() => navigate('/hr/feedback/questions')}
            />
          </section>

          <section className="fluxen-panel-grid">
            <article className="fluxen-panel-card">
              <div className="fluxen-panel-head">
                <h2>
                  <i className="bi bi-person-badge" /> Logged in as
                </h2>
              </div>
              <div className="fluxen-list-item">
                <ProfileNameCell
                  person={{
                    ...data.user,
                    userId: data.user?.userId ?? data.user?.id,
                  }}
                  size="md"
                  subtitle={data.user?.position ?? data.user?.email ?? 'HR'}
                />
                <span>{data.user?.employeeCode ?? 'No code'}</span>
              </div>
            </article>

            <article className="fluxen-panel-card">
              <div className="fluxen-panel-head">
                <h2>
                  <i className="bi bi-bullseye" /> Recent KPIs
                </h2>
              </div>
              {data.recentKpis?.length ? (
                data.recentKpis.map((item) => (
                  <div className="fluxen-list-item" key={item.id}>
                    <strong>{item.title || 'Untitled KPI'}</strong>
                    <span>Weight {item.weight ?? '—'}</span>
                  </div>
                ))
              ) : (
                <p className="fluxen-muted">No KPI records yet.</p>
              )}
            </article>

            <article className="fluxen-panel-card">
              <div className="fluxen-panel-head">
                <h2>
                  <i className="bi bi-bell" /> Recent Notifications
                </h2>
              </div>
              {data.recentNotifications?.length ? (
                data.recentNotifications.map((item) => (
                  <div className="fluxen-list-item" key={item.id}>
                    <strong>{item.title || 'Notification'}</strong>
                    <span className={item.read ? 'is-soft' : 'is-hot'}>
                      {item.read ? 'Read' : 'Unread'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="fluxen-muted">No notifications yet.</p>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}

const MetricCard = ({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  detail: string;
  tone: 'sky' | 'amber' | 'rose' | 'violet';
}) => (
  <article className={`fluxen-metric-card fluxen-metric-card--${tone}`}>
    <span className="fluxen-metric-icon">
      <i className={`bi ${icon}`} />
    </span>
    <p>{label}</p>
    <strong>{value.toLocaleString()}</strong>
    <small>{detail}</small>
  </article>
);

const DashboardAction = ({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button type="button" className="fluxen-action-card" onClick={onClick}>
    <span>
      <i className={`bi ${icon}`} />
    </span>
    <strong>{title}</strong>
    <small>{description}</small>
    <em>
      Open <i className="bi bi-arrow-right" />
    </em>
  </button>
);

export default Home;

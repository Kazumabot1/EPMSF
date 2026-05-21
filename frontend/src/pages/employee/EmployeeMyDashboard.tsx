
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import type { EmployeeKpiResult } from '../../types/kpiWorkflow';
import './employee-dashboard.css';

const staticCards = [
  {
    title: 'Appraisal Status',
    value: 'self submitted',
    subtitle: 'Annual Review 2024',
    icon: 'bi-clipboard-check',
    iconClass: 'bg-emerald-50 text-emerald-600',
    extra: '',
  },
  {
    title: 'Pending Feedback',
    value: '1',
    subtitle: 'To complete',
    icon: 'bi-chat-dots',
    iconClass: 'bg-amber-50 text-amber-600',
    extra: '',
  },
  {
    title: 'Next 1-on-1',
    value: 'None',
    subtitle: 'No schedule yet',
    icon: 'bi-calendar-check',
    iconClass: 'bg-sky-50 text-sky-600',
    extra: '',
  },
];

const EmployeeMyDashboard = () => {
  const [kpiRows, setKpiRows] = useState<EmployeeKpiResult[]>([]);
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setKpiLoading(true);
        const data = await kpiWorkflowService.myFinalizedResults();
        if (!cancelled) setKpiRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Could not load KPI summary.');
      } finally {
        if (!cancelled) setKpiLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const latestKpi = useMemo(() => {
    if (!kpiRows.length) return null;
    const sorted = [...kpiRows].sort((a, b) => (b.finalizedAt ?? '').localeCompare(a.finalizedAt ?? ''));
    return sorted[0];
  }, [kpiRows]);

  const kpiSummaryCard = {
    title: 'My KPI score',
    value: kpiLoading ? '…' : latestKpi?.totalWeightedScore != null ? `${latestKpi.totalWeightedScore.toFixed(2)}` : '—',
    subtitle: kpiLoading
      ? 'Loading KPI results…'
      : latestKpi
        ? `Latest: ${latestKpi.kpiTitle}`
        : 'No finalized KPIs yet',
    icon: 'bi-bullseye',
    iconClass: 'bg-indigo-50 text-indigo-600',
    extra:
      !kpiLoading && kpiRows.length > 1
        ? `${kpiRows.length} finalized cycle${kpiRows.length === 1 ? '' : 's'} on record`
        : '',
  };

  return (
    <div className="employee-dashboard">
      <section className="employee-dashboard-title">
        <h1>My Dashboard</h1>
        <p>Your performance overview and pending tasks</p>
      </section>

      <section className="employee-summary-grid">
        {[kpiSummaryCard, ...staticCards].map((card) => (
          <article key={card.title} className="employee-summary-card">
            <div className="employee-summary-head">
              <div>
                <p className="employee-summary-label">{card.title}</p>
                <p className="employee-summary-value">{card.value}</p>
                <p className="employee-summary-subtitle">{card.subtitle}</p>
                {card.extra && <p className="employee-summary-extra">{card.extra}</p>}
              </div>
              <span className={`employee-summary-icon ${card.iconClass}`}>
                <i className={`bi ${card.icon}`} />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="employee-panel-grid">
        <article className="employee-panel-card employee-panel-main">
          <div className="employee-panel-head">
            <h2>My KPIs</h2>
            <Link to="/employee/kpis" className="employee-kpi-view-all">
              View all
            </Link>
          </div>
          {kpiLoading && <p className="employee-kpi-muted">Loading…</p>}
          {!kpiLoading && kpiRows.length === 0 && (
            <p className="employee-kpi-muted">Finalized KPI scores from your manager will show here.</p>
          )}
          {!kpiLoading &&
            kpiRows.slice(0, 4).map((r) => (
              <div key={r.employeeKpiFormId} className="employee-kpi-box">
                <div className="employee-kpi-row">
                  <p>{r.kpiTitle}</p>
                  <span>Finalized</span>
                </div>
                <p className="employee-kpi-muted">
                  Weighted total:{' '}
                  {r.totalWeightedScore != null ? (
                    <strong style={{ color: '#1e293b' }}>{r.totalWeightedScore.toFixed(2)}</strong>
                  ) : (
                    '—'
                  )}
                </p>
                <div className="employee-kpi-progress">
                  <div
                    style={{
                      width: `${Math.min(100, r.totalScore ?? 0)}%`,
                    }}
                  />
                </div>
                <p className="employee-kpi-muted">
                  Avg achievement % (weighted): {r.totalScore != null ? `${r.totalScore.toFixed(1)}%` : '—'}
                </p>
              </div>
            ))}
        </article>

        <article className="employee-panel-card">
          <h2 className="employee-notification-title">Recent Notifications</h2>
          <ul className="employee-notification-list">
            <li>Your self-assessment for Annual Review 2024 is due soon.</li>
            <li>You have a pending feedback request from Jessica Park.</li>
            <li>No 1-on-1 meeting has been scheduled for this week.</li>
          </ul>
        </article>
      </section>
    </div>
  );
};

export default EmployeeMyDashboard;

import { useNavigate } from 'react-router-dom';/*Z*/
import {
  ComparisonColumnChart,
  DashboardChartCard,
  DashboardMetricCard,
  DashboardShell,
  DonutSummaryChart,
  InsightCard,
} from '../../components/dashboard';

const HRDashboard = () => {
  const navigate = useNavigate();

  const modules = [
    { icon: 'bi-diagram-3', label: 'Teams', path: '/hr/team', live: true },
    { icon: 'bi-building', label: 'Departments', path: '/hr/department', live: true },
    { icon: 'bi-briefcase', label: 'Positions', path: '/hr/position/table', live: true },
    { icon: 'bi-ui-checks-grid', label: 'KPI Templates', path: '/hr/kpi-template', live: true },
    { icon: 'bi-clipboard-check', label: 'Appraisals', path: '/one-on-one-meetings', live: true },
    { icon: 'bi-chat-dots', label: '360 Feedback', path: '/notifications', live: false },
    { icon: 'bi-exclamation-triangle', label: 'PIP Management', path: '/pip-updates', live: false },
    { icon: 'bi-file-earmark-bar-graph', label: 'Reports', path: '/reports', live: false },
  ];

  const liveModules = modules.filter((module) => module.live).length;
  const upcomingModules = modules.length - liveModules;

  const moduleReadiness = [
    { label: 'Teams', value: 72, compareValue: 58, color: '#7c5cff', compareColor: '#8ec5ff' },
    { label: 'Departments', value: 88, compareValue: 76, color: '#7c5cff', compareColor: '#8ec5ff' },
    { label: 'Positions', value: 64, compareValue: 49, color: '#7c5cff', compareColor: '#8ec5ff' },
    { label: 'KPIs', value: 81, compareValue: 68, color: '#7c5cff', compareColor: '#8ec5ff' },
    { label: 'Appraisals', value: 57, compareValue: 43, color: '#7c5cff', compareColor: '#8ec5ff' },
  ];

  const moduleDistribution = [
    { label: 'Live Modules', value: liveModules, color: '#62cdbb' },
    { label: 'Needs Setup', value: upcomingModules, color: '#ffbd72' },
    { label: 'Reporting Ready', value: 3, color: '#7c5cff' },
    { label: 'Review Tools', value: 2, color: '#8ec5ff' },
  ];

  return (
    <DashboardShell
      className="hr-command-dashboard"
      variant="violet"
      eyebrow="HR Workspace"
      title="HR Dashboard"
      description="Manage teams, departments, positions, KPIs, appraisals, feedback, PIP follow-up, and reporting shortcuts from one consistent workspace."
      metaLabel="Dashboard readiness"
      metaValue={`${liveModules}/${modules.length} modules live`}
      metaDetail={`${upcomingModules} modules are still marked as soon`}
    >
      <section className="dashboard-grid dashboard-grid--metrics hr-metric-strip">
        <DashboardMetricCard
          title="Live Modules"
          value={liveModules}
          detail="Available shortcuts"
          tone="emerald"
          icon={<i className="bi bi-check2-circle" aria-hidden="true" />}
          trend={{ label: 'Ready for HR use', direction: 'flat' }}
        />
        <DashboardMetricCard
          title="Coming Soon"
          value={upcomingModules}
          detail="Marked as not implemented"
          tone="amber"
          icon={<i className="bi bi-hourglass-split" aria-hidden="true" />}
          trend={{ label: 'Keep visible but soft', direction: 'flat' }}
        />
        <DashboardMetricCard
          title="Core Setup"
          value="5"
          detail="Teams, departments, positions, KPI, appraisal"
          tone="violet"
          icon={<i className="bi bi-grid-1x2" aria-hidden="true" />}
          trend={{ label: 'Primary admin area', direction: 'flat' }}
        />
        <DashboardMetricCard
          title="Review Tools"
          value="3"
          detail="Feedback, PIP, reports"
          tone="cyan"
          icon={<i className="bi bi-graph-up" aria-hidden="true" />}
          trend={{ label: 'Analytics style aligned', direction: 'flat' }}
        />
      </section>

      <section className="dashboard-grid dashboard-grid--overview mb-4">
        <DashboardChartCard
          title="Module Readiness Comparison"
          subtitle="This-period readiness compared with previous setup progress."
        >
          <ComparisonColumnChart
            data={moduleReadiness}
            height={205}
            primaryLabel="This Period"
            comparisonLabel="Previous Period"
            valueFormatter={(value) => `${value}%`}
          />
        </DashboardChartCard>

        <DashboardChartCard title="Workspace Distribution" subtitle="Soft multi-tone result split across HR modules.">
          <DonutSummaryChart data={moduleDistribution} totalLabel="Items" height={205} />
        </DashboardChartCard>
      </section>

      <DashboardChartCard title="Quick Setup" subtitle="Common HR configuration shortcuts." className="hr-quick-setup-card" size="compact">
        <div className="hr-quick-grid">
          {modules.map((module) => (
            <button
              type="button"
              key={module.label}
              onClick={() => module.live && navigate(module.path)}
              className="hr-quick-button group"
              disabled={!module.live}
              aria-disabled={!module.live}
            >
              <span>
                <i className={`bi ${module.icon}`} aria-hidden="true" />
              </span>
              <strong>{module.label}</strong>
              {module.live ? (
                <i className="bi bi-arrow-right-short text-lg text-blue-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
              ) : (
                <small>Soon</small>
              )}
            </button>
          ))}
        </div>
      </DashboardChartCard>

      <section className="dashboard-grid dashboard-grid--three mt-4">
        <InsightCard
          tone="success"
          icon={<i className="bi bi-palette" aria-hidden="true" />}
          title="Unified dashboard style"
          description="This page now uses the same shared Fluxen / 360 dashboard cards, chart palette, and spacing system."
        />
        <InsightCard
          tone="info"
          icon={<i className="bi bi-bar-chart" aria-hidden="true" />}
          title="Comparison graph included"
          description="The main result graph uses soft rounded columns plus a faint area trend, matching the reference style."
        />
        <InsightCard
          tone="warning"
          icon={<i className="bi bi-pie-chart" aria-hidden="true" />}
          title="Multi-tone distribution"
          description="Pie and result charts use multiple sleeve-like tones instead of one bulky repeated color."
        />
      </section>
    </DashboardShell>
  );
};

export default HRDashboard;

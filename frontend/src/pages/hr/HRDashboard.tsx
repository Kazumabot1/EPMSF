// Modified by KHN — HR Dashboard
import { useNavigate } from 'react-router-dom';

const HRDashboard = () => {
  const navigate = useNavigate();

  const modules = [
    { icon: 'bi-diagram-3',          label: 'Teams',            path: '/hr/team',                        live: true  },
    { icon: 'bi-building',           label: 'Departments',      path: '/hr/department',                  live: true  },
    { icon: 'bi-briefcase',          label: 'Positions',        path: '/hr/position/table',              live: true  },
    { icon: 'bi-clipboard-data',     label: 'KPI Management',   path: '/hr/performance-kpi/form',        live: true  },
    { icon: 'bi-clipboard-check',    label: 'Appraisals',       path: '/one-on-one-meetings',            live: true  },
    { icon: 'bi-chat-dots',          label: '360 Feedback',     path: '/notifications',                  live: false },
    { icon: 'bi-exclamation-triangle',label: 'PIP Management',  path: '/pip-updates',                   live: false },
    { icon: 'bi-file-earmark-bar-graph', label: 'Reports',      path: '/reports',                       live: false },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '.4rem',
          background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff',
          fontSize: '.75rem', fontWeight: 600, padding: '.3rem .8rem',
          borderRadius: '999px', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em'
        }}>
          <i className="bi bi-people" /> HR
        </span>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: '0 0 .25rem' }}>HR Dashboard</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Manage teams, departments, positions, KPIs, appraisals, and more.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {modules.map(mod => (
          <div
            key={mod.label}
            onClick={() => mod.live && navigate(mod.path)}
            style={{
              background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px',
              padding: '1.5rem', cursor: mod.live ? 'pointer' : 'default',
              opacity: mod.live ? 1 : 0.65,
              boxShadow: '0 1px 4px rgba(0,0,0,.05)',
              transition: 'all .2s',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { if (mod.live) (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
          >
            {!mod.live && (
              <span style={{
                position: 'absolute', top: '.6rem', right: '.6rem',
                background: '#f1f5f9', color: '#94a3b8', fontSize: '.65rem',
                fontWeight: 600, padding: '.15rem .5rem', borderRadius: '999px', textTransform: 'uppercase'
              }}>Soon</span>
            )}
            <i className={`bi ${mod.icon}`} style={{ fontSize: '1.75rem', color: '#0ea5e9', marginBottom: '.75rem', display: 'block' }} />
            <strong style={{ display: 'block', color: '#1e293b', fontSize: '.95rem', fontWeight: 600 }}>{mod.label}</strong>
            {!mod.live && <small style={{ color: '#94a3b8', fontSize: '.78rem' }}>Not implemented yet</small>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HRDashboard;

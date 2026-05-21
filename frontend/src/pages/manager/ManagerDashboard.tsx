
import { Link } from 'react-router-dom';
import ProfileNameCell from '../../components/ProfileNameCell';
import { useAuth } from '../../contexts/AuthContext';

type Section = {
  icon: string;
  label: string;
  description: string;
  live: boolean;
  to?: string;
};

const ManagerDashboard = () => {
  const { user } = useAuth();

  const sections: Section[] = [
    {
      icon: 'bi-person-check',
      label: 'Assessment Review',
      description: 'Review submitted self-assessments and sign them forward to Department Head.',
      live: true,
      to: '/manager/assessment-review',
    },
    {
      icon: 'bi-diagram-3',
      label: 'My Team',
      description: 'Team structure and member management will appear here.',
      live: false,
    },
    {
      icon: 'bi-clipboard-data',
      label: 'Team KPIs',
      description: 'Team KPI tracking will appear here.',
      live: false,
    },
    {
      icon: 'bi-clipboard-check',
      label: 'Appraisals',
      description: 'Review assigned appraisal records.',
      live: true,
      to: '/manager/appraisals',
    },
    {
      icon: 'bi-exclamation-triangle',
      label: 'PIP Tracking',
      description: 'Create and track performance improvement plans.',
      live: true,
      to: '/pip/create',
    },
    {
      icon: 'bi-calendar-check',
      label: '1-on-1 Meetings',
      description: 'Schedule and manage one-on-one meetings.',
      live: true,
      to: '/one-on-one-meetings',
    },
    {
      icon: 'bi-file-earmark-bar-graph',
      label: 'Reports',
      description: 'Manager reporting workflow placeholder.',
      live: false,
    },
  ];

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '1100px',
        margin: '0 auto',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
        <div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.4rem',
            background: 'linear-gradient(135deg,#059669,#34d399)',
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
          <i className="bi bi-person-workspace" /> Manager
        </span>

        <h1
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: '#1e293b',
            margin: '0 0 .25rem',
          }}
        >
          Manager Dashboard
        </h1>

        <p style={{ color: '#64748b', margin: 0 }}>
          Manage your team&apos;s performance workflow and review tasks.
        </p>
        </div>

        {user && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem', minWidth: 260 }}>
            <ProfileNameCell
              person={user}
              size="md"
              subtitle={user.position || user.email || 'Manager'}
            />
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))',
          gap: '1.25rem',
        }}
      >
        {sections.map((section) => {
          const card = (
            <div
              style={{
                minHeight: 160,
                background: '#fff',
                border: section.live ? '1px solid #bbf7d0' : '1.5px dashed #e2e8f0',
                borderRadius: '18px',
                padding: '1.5rem',
                opacity: section.live ? 1 : 0.72,
                boxShadow: section.live ? '0 18px 40px rgba(15, 23, 42, 0.08)' : 'none',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
              }}
            >
              <i
                className={`bi ${section.icon}`}
                style={{
                  fontSize: '1.7rem',
                  color: '#059669',
                  marginBottom: '.75rem',
                  display: 'block',
                }}
              />

              <strong
                style={{
                  display: 'block',
                  color: '#1e293b',
                  fontSize: '1rem',
                  fontWeight: 800,
                }}
              >
                {section.label}
              </strong>

              <small
                style={{
                  display: 'block',
                  marginTop: '.45rem',
                  color: '#64748b',
                  fontSize: '.82rem',
                  lineHeight: 1.5,
                }}
              >
                {section.description}
              </small>

              <span
                style={{
                  display: 'inline-flex',
                  marginTop: '1rem',
                  borderRadius: '999px',
                  padding: '.25rem .65rem',
                  background: section.live ? '#ecfdf5' : '#f8fafc',
                  color: section.live ? '#047857' : '#94a3b8',
                  fontSize: '.72rem',
                  fontWeight: 800,
                }}
              >
                {section.live ? 'Open' : 'Coming soon'}
              </span>
            </div>
          );

          if (!section.live || !section.to) {
            return <div key={section.label}>{card}</div>;
          }

          return (
            <Link key={section.label} to={section.to} style={{ textDecoration: 'none' }}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ManagerDashboard;

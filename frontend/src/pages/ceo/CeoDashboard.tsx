// Modified by KHN — CEO Dashboard
const CeoDashboard = () => {
  const stats = [
    { icon: 'bi-people-fill',       label: 'Total Employees',  value: '—', color: '#6366f1' },
    { icon: 'bi-building',          label: 'Departments',      value: '—', color: '#0ea5e9' },
    { icon: 'bi-diagram-3',         label: 'Active Teams',     value: '—', color: '#10b981' },
    { icon: 'bi-graph-up-arrow',    label: 'KPIs Tracked',     value: '—', color: '#f59e0b' },
  ];

  const sections = [
    { icon: 'bi-people',            label: 'Workforce Overview',    note: 'Not implemented yet' },
    { icon: 'bi-bar-chart-line',    label: 'Performance Reports',   note: 'Not implemented yet' },
    { icon: 'bi-building',          label: 'Department Analytics',  note: 'Not implemented yet' },
    { icon: 'bi-trophy',            label: 'KPI Summary',           note: 'Not implemented yet' },
    { icon: 'bi-cash-stack',        label: 'Budget Overview',       note: 'Not implemented yet' },
    { icon: 'bi-file-earmark-text', label: 'Executive Reports',     note: 'Not implemented yet' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '.4rem',
          background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff',
          fontSize: '.75rem', fontWeight: 600, padding: '.3rem .8rem',
          borderRadius: '999px', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em'
        }}>
          <i className="bi bi-building" /> CEO
        </span>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: '0 0 .25rem' }}>CEO Dashboard</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Executive overview of the organisation.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
            <i className={`bi ${s.icon}`} style={{ fontSize:'1.6rem', color: s.color }} />
            <div>
              <strong style={{ display:'block', fontSize:'1.4rem', fontWeight:700, color:'#1e293b' }}>{s.value}</strong>
              <span style={{ fontSize:'.8rem', color:'#64748b' }}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1rem' }}>
        {sections.map(sec => (
          <div key={sec.label} style={{ background:'#fff', border:'1.5px dashed #e2e8f0', borderRadius:'14px', padding:'1.5rem', opacity:.7 }}>
            <i className={`bi ${sec.icon}`} style={{ fontSize:'1.5rem', color:'#7c3aed', marginBottom:'.6rem', display:'block' }} />
            <strong style={{ display:'block', color:'#1e293b', fontSize:'.9rem', fontWeight:600 }}>{sec.label}</strong>
            <small style={{ color:'#94a3b8', fontSize:'.78rem' }}>{sec.note}</small>
          </div>
        ))}
      </div>
    </div>
  );
};
export default CeoDashboard;

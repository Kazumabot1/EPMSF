// Modified by KHN — Manager / Project Manager Dashboard
const ManagerDashboard = () => {
  const sections = [
    { icon:'bi-diagram-3',          label:'My Team',               live:false },
    { icon:'bi-clipboard-data',     label:'Team KPIs',             live:false },
    { icon:'bi-clipboard-check',    label:'Appraisals',            live:false },
    { icon:'bi-exclamation-triangle',label:'PIP Tracking',         live:false },
    { icon:'bi-calendar-check',     label:'1-on-1 Meetings',       live:false },
    { icon:'bi-file-earmark-bar-graph',label:'Reports',            live:false },
  ];

  return (
    <div style={{ padding:'2rem', maxWidth:'1000px', margin:'0 auto', fontFamily:'Inter, sans-serif' }}>
      <div style={{ marginBottom:'2rem' }}>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:'.4rem',
          background:'linear-gradient(135deg,#059669,#34d399)', color:'#fff',
          fontSize:'.75rem', fontWeight:600, padding:'.3rem .8rem',
          borderRadius:'999px', marginBottom:'.75rem', textTransform:'uppercase', letterSpacing:'.05em'
        }}>
          <i className="bi bi-person-workspace" /> Manager
        </span>
        <h1 style={{ fontSize:'1.8rem', fontWeight:700, color:'#1e293b', margin:'0 0 .25rem' }}>Manager Dashboard</h1>
        <p style={{ color:'#64748b', margin:0 }}>Manage your team's performance and activities.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1.25rem' }}>
        {sections.map(s => (
          <div key={s.label} style={{ background:'#fff', border:'1.5px dashed #e2e8f0', borderRadius:'14px', padding:'1.5rem', opacity:.7 }}>
            <i className={`bi ${s.icon}`} style={{ fontSize:'1.5rem', color:'#059669', marginBottom:'.6rem', display:'block' }} />
            <strong style={{ display:'block', color:'#1e293b', fontSize:'.9rem', fontWeight:600 }}>{s.label}</strong>
            <small style={{ color:'#94a3b8', fontSize:'.78rem' }}>This function has not been implemented yet.</small>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ManagerDashboard;

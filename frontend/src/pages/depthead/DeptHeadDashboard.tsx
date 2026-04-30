// Modified by KHN — Department Head Dashboard
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { authStorage } from '../../services/authStorage';

const DeptHeadDashboard = () => {
  const user = authStorage.getUser();
  const [deptStats, setDeptStats] = useState<any>(null);
  const [members, setMembers]     = useState<any[]>([]);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!user) return;
    // Try to fetch dept members via dashboard summary
    api.get('/api/dashboard/summary')
      .then(r => {
        const data = r.data.data ?? r.data;
        setDeptStats(data?.stats ?? null);
      })
      .catch(() => setError('Could not load department data.'));

    // Fetch users in same department
    const deptId = user.departmentId;
    if (deptId) {
      api.get(`/api/users/department/${deptId}`)
        .then(r => setMembers(r.data.data ?? []))
        .catch(() => {});
    }
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '.4rem',
          background: 'linear-gradient(135deg,#0891b2,#22d3ee)', color: '#fff',
          fontSize: '.75rem', fontWeight: 600, padding: '.3rem .8rem',
          borderRadius: '999px', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em'
        }}>
          <i className="bi bi-person-badge" /> Department Head
        </span>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: '0 0 .25rem' }}>Department Dashboard</h1>
        <p style={{ color: '#64748b', margin: 0 }}>View your department's people and performance.</p>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
          <i className="bi bi-people-fill" style={{ fontSize:'1.5rem', color:'#0891b2' }} />
          <div>
            <strong style={{ display:'block', fontSize:'1.4rem', fontWeight:700, color:'#1e293b' }}>{members.length}</strong>
            <span style={{ fontSize:'.8rem', color:'#64748b' }}>Department Members</span>
          </div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
          <i className="bi bi-graph-up" style={{ fontSize:'1.5rem', color:'#10b981' }} />
          <div>
            <strong style={{ display:'block', fontSize:'1.4rem', fontWeight:700, color:'#1e293b' }}>{deptStats?.kpisCreated ?? '—'}</strong>
            <span style={{ fontSize:'.8rem', color:'#64748b' }}>KPIs Tracked</span>
          </div>
        </div>
      </div>

      {/* Members table */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'14px', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.05)', marginBottom:'2rem' }}>
        <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid #f1f5f9' }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:600, color:'#1e293b' }}>
            <i className="bi bi-people" /> Department Members
          </h2>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc' }}>
              {['#','Full Name','Email','Employee Code','Status'].map(h => (
                <th key={h} style={{ padding:'.7rem 1rem', textAlign:'left', fontSize:'.75rem', fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'.7rem 1rem', fontSize:'.875rem', color:'#64748b' }}>{i+1}</td>
                <td style={{ padding:'.7rem 1rem', fontSize:'.875rem', color:'#1e293b', fontWeight:500 }}>{m.fullName ?? '—'}</td>
                <td style={{ padding:'.7rem 1rem', fontSize:'.875rem', color:'#64748b' }}>{m.email}</td>
                <td style={{ padding:'.7rem 1rem', fontSize:'.875rem', color:'#64748b' }}>{m.employeeCode ?? '—'}</td>
                <td style={{ padding:'.7rem 1rem' }}>
                  <span style={{ background: m.active ? '#dcfce7' : '#fee2e2', color: m.active ? '#166534' : '#991b1b', padding:'.2rem .6rem', borderRadius:'999px', fontSize:'.75rem', fontWeight:600 }}>
                    {m.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={5} style={{ padding:'2rem', textAlign:'center', color:'#94a3b8' }}>No members found in your department.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Not implemented sections */}
      {[{ icon:'bi-clipboard-data', label:'Department KPI Reports' }, { icon:'bi-exclamation-triangle', label:'Department PIPs' }].map(s => (
        <div key={s.label} style={{ background:'#f8fafc', border:'1.5px dashed #e2e8f0', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'1rem', opacity:.7 }}>
          <i className={`bi ${s.icon}`} style={{ fontSize:'1.4rem', color:'#94a3b8' }} />
          <div>
            <strong style={{ display:'block', color:'#475569' }}>{s.label}</strong>
            <small style={{ color:'#94a3b8' }}>This function has not been implemented yet.</small>
          </div>
        </div>
      ))}
    </div>
  );
};
export default DeptHeadDashboard;

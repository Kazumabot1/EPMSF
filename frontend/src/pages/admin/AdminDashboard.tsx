// Modified by KHN — Admin Dashboard with User Account Creation
import { useEffect, useState } from 'react';
import api from '../../services/api';
import './admin-dashboard.css';

interface CreateOptions {
  departments: { id: number; department_name?: string; departmentName?: string }[];
  positions:   { id: number; positionTitle: string }[];
  roles:       { id: number; name: string }[];
}

interface CreatedUser {
  email: string;
  fullName: string;
  employeeCode: string;
  temporaryPassword: string;
}

const AdminDashboard = () => {
  const [options, setOptions]       = useState<CreateOptions | null>(null);
  const [users, setUsers]           = useState<any[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [created, setCreated]       = useState<CreatedUser | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const [form, setForm] = useState({
    fullName:     '',
    departmentId: '',
    positionId:   '',
    roleId:       '',
  });

  useEffect(() => {
    api.get('/api/users/create-options').then(r => setOptions(r.data.data)).catch(() => {});
    api.get('/api/users').then(r => setUsers(r.data.data ?? [])).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreated(null);
    if (!form.fullName.trim()) { setError('Full name is required'); return; }
    try {
      setLoading(true);
      const res = await api.post('/api/users/create', {
        fullName:     form.fullName,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        positionId:   form.positionId   ? Number(form.positionId)   : null,
        roleId:       form.roleId       ? Number(form.roleId)       : null,
      });
      const newUser = res.data.data as CreatedUser;
      setCreated(newUser);
      setUsers(prev => [newUser, ...prev]);
      setForm({ fullName: '', departmentId: '', positionId: '', roleId: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-page">
      {/* ── Header ── */}
      <div className="adm-hero">
        <div className="adm-hero-badge"><i className="bi bi-shield-lock" /> Admin</div>
        <h1>Admin Dashboard</h1>
        <p>Manage user accounts, assign positions and roles.</p>
      </div>

      {/* ── Stats row ── */}
      <div className="adm-stats">
        <div className="adm-stat-card">
          <i className="bi bi-people" />
          <div>
            <strong>{users.length}</strong>
            <span>Total Users</span>
          </div>
        </div>
        <div className="adm-stat-card">
          <i className="bi bi-building" />
          <div>
            <strong>{options?.departments.length ?? '—'}</strong>
            <span>Departments</span>
          </div>
        </div>
        <div className="adm-stat-card">
          <i className="bi bi-briefcase" />
          <div>
            <strong>{options?.positions.length ?? '—'}</strong>
            <span>Positions</span>
          </div>
        </div>
      </div>

      {/* ── Employee Create Section ── */}
      <div className="adm-section">
        <div className="adm-section-header">
          <h2><i className="bi bi-person-plus" /> Employee Create</h2>
          <button className="adm-btn primary" onClick={() => { setShowForm(f => !f); setCreated(null); setError(''); }}>
            <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'}`} />
            {showForm ? 'Cancel' : 'Create'}
          </button>
        </div>

        {showForm && (
          <div className="adm-form-card">
            <p className="adm-form-hint">
              <i className="bi bi-info-circle" /> Email and password will be auto-generated. Share them with the user after creation.
            </p>
            <form onSubmit={handleCreate} className="adm-form">
              <div className="adm-field">
                <label>Full Name <span className="adm-req">*</span></label>
                <input
                  className="adm-input"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="adm-form-grid">
                <div className="adm-field">
                  <label>Department</label>
                  <select className="adm-select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                    <option value="">— Select Department —</option>
                    {options?.departments.map(d => (
                      <option key={d.id} value={d.id}>{d.department_name ?? d.departmentName}</option>
                    ))}
                  </select>
                </div>

                <div className="adm-field">
                  <label>Position</label>
                  <select className="adm-select" value={form.positionId} onChange={e => setForm({ ...form, positionId: e.target.value })}>
                    <option value="">— Select Position —</option>
                    {options?.positions.map(p => (
                      <option key={p.id} value={p.id}>{p.positionTitle}</option>
                    ))}
                  </select>
                </div>

                <div className="adm-field">
                  <label>Role <span className="adm-req">*</span></label>
                  <select className="adm-select" value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} required>
                    <option value="">— Select Role —</option>
                    {options?.roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name.replace('ROLE_', '')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <div className="adm-alert error">{error}</div>}

              <div className="adm-form-actions">
                <button type="submit" className="adm-btn primary" disabled={loading}>
                  <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-check-lg'}`} />
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>

            {/* ── Success card showing credentials ── */}
            {created && (
              <div className="adm-credentials-card">
                <div className="adm-credentials-title">
                  <i className="bi bi-check-circle-fill" /> Account Created — Share these credentials with the user
                </div>
                <div className="adm-credentials-grid">
                  <div><span>Full Name</span><strong>{created.fullName}</strong></div>
                  <div><span>Employee Code</span><strong>{created.employeeCode}</strong></div>
                  <div><span>Email</span><strong>{created.email}</strong></div>
                  <div><span>Temporary Password</span><strong className="adm-temp-pass">{created.temporaryPassword}</strong></div>
                </div>
                <p className="adm-credentials-note">⚠️ This password is shown only once. Please copy and share it now.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Users Table ── */}
      <div className="adm-section">
        <div className="adm-section-header">
          <h2><i className="bi bi-table" /> All Users ({users.length})</h2>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Employee Code</th>
                <th>Position</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id ?? i}>
                  <td>{i + 1}</td>
                  <td>{u.fullName ?? '—'}</td>
                  <td>{u.email}</td>
                  <td>{u.employeeCode ?? '—'}</td>
                  <td>{u.positionTitle ?? '—'}</td>
                  <td>
                    <span className={`adm-badge ${u.active ? 'active' : 'inactive'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

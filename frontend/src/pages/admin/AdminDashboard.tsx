import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { exportToExcel, todayStr } from '../../utils/exportExcel';
import './admin-dashboard.css';

type DepartmentOption = {
  id: number;
  department_name?: string;
  departmentName?: string;
};

type PositionOption = {
  id: number;
  positionTitle?: string;
  positionName?: string;
};

type RoleOption = {
  id: number;
  name: string;
};

interface CreateOptions {
  departments: DepartmentOption[];
  positions: PositionOption[];
  roles: RoleOption[];
}

interface AccountResult {
  userId?: number;
  success?: boolean;
  accountCreated?: boolean;
  accountLinked?: boolean;
  temporaryPasswordEmailSent?: boolean;
  message?: string;
  smtpErrorDetail?: string | null;
  email?: string;
  fullName?: string;
  employeeCode?: string;
}

const unwrap = <T,>(payload: any, fallback: T): T =>
  payload?.data?.data ?? payload?.data ?? fallback;

const AdminDashboard = () => {
  const [options, setOptions] = useState<CreateOptions>({
    departments: [],
    positions: [],
    roles: [],
  });

  const [users, setUsers] = useState<AccountResult[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<AccountResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    employeeCode: '',
    departmentId: '',
    positionId: '',
    roleName: 'EMPLOYEE',
  });

  useEffect(() => {
    const loadOptions = async () => {
      const [departmentRes, positionRes, roleRes] = await Promise.allSettled([
        api.get('/departments'),
        api.get('/positions'),
        api.get('/roles'),
      ]);

      setOptions({
        departments:
          departmentRes.status === 'fulfilled'
            ? unwrap<DepartmentOption[]>(departmentRes.value, [])
            : [],
        positions:
          positionRes.status === 'fulfilled'
            ? unwrap<PositionOption[]>(positionRes.value, [])
            : [],
        roles:
          roleRes.status === 'fulfilled'
            ? unwrap<RoleOption[]>(roleRes.value, [])
            : [],
      });
    };

    const loadUsers = async () => {
      try {
        const response = await api.get('/employees', {
          params: { includeInactive: true },
        });

        setUsers(unwrap<AccountResult[]>(response, []));
      } catch {
        setUsers([]);
      }
    };

    loadOptions();
    loadUsers();
  }, []);

  const roleOptions = useMemo(() => {
    // CEO/Executive role is excluded from admin account creation — managed separately
    const EXCLUDED_ROLES = ['CEO', 'ROLE_CEO', 'EXECUTIVE', 'ROLE_EXECUTIVE'];

    const filtered = options.roles.length
      ? options.roles
      : [
          { id: 1, name: 'EMPLOYEE' },
          { id: 2, name: 'HR' },
          { id: 3, name: 'ADMIN' },
          { id: 4, name: 'MANAGER' },
        ];

    return filtered.filter(
      (r) => !EXCLUDED_ROLES.includes(r.name.replace(/^ROLE_/i, '').toUpperCase())
    );
  }, [options.roles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreated(null);

    if (!form.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setLoading(true);

      const res = await api.post('/users', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        employeeCode: form.employeeCode.trim() || undefined,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        positionId: form.positionId ? Number(form.positionId) : null,
        roleName: form.roleName || 'EMPLOYEE',
        sendTemporaryPasswordEmail: true,
      });

      const result = unwrap<AccountResult>(res, {});

      const newUser = {
        ...result,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        employeeCode: form.employeeCode.trim(),
      };

      setCreated(newUser);
      setUsers((prev) => [newUser, ...prev]);

      setForm({
        fullName: '',
        email: '',
        employeeCode: '',
        departmentId: '',
        positionId: '',
        roleName: 'EMPLOYEE',
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to create user account'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero-badge">
          <i className="bi bi-shield-lock" /> Admin
        </div>
        <h1>Admin Dashboard</h1>
        <p>Create login accounts and manage access from the admin area.</p>
      </div>

      <div className="adm-stats">
        <div className="adm-stat-card">
          <i className="bi bi-people" />
          <div>
            <strong>{users.length}</strong>
            <span>Total People</span>
          </div>
        </div>

        <div className="adm-stat-card">
          <i className="bi bi-building" />
          <div>
            <strong>{options.departments.length}</strong>
            <span>Departments</span>
          </div>
        </div>

        <div className="adm-stat-card">
          <i className="bi bi-briefcase" />
          <div>
            <strong>{options.positions.length}</strong>
            <span>Positions</span>
          </div>
        </div>
      </div>

      <div className="adm-section">
        <div className="adm-section-header">
          <h2>
            <i className="bi bi-person-plus" /> Login Account User
          </h2>

          <button
            className="adm-btn primary"
            onClick={() => {
              setShowForm((prev) => !prev);
              setCreated(null);
              setError('');
            }}
          >
            <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'}`} />
            {showForm ? 'Cancel' : 'Create'}
          </button>
        </div>

        {showForm && (
          <div className="adm-form-card">
            <p className="adm-form-hint">
              <i className="bi bi-info-circle" /> This creates the login account from Admin.
            </p>

            <form onSubmit={handleCreate} className="adm-form">
              <div className="adm-form-grid">
                <div className="adm-field">
                  <label>
                    Full Name <span className="adm-req">*</span>
                  </label>
                  <input
                    className="adm-input"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="adm-field">
                  <label>
                    Email <span className="adm-req">*</span>
                  </label>
                  <input
                    className="adm-input"
                    type="email"
                    placeholder="e.g. john@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div className="adm-field">
                  <label>Employee Code</label>
                  <input
                    className="adm-input"
                    type="text"
                    placeholder="Optional"
                    value={form.employeeCode}
                    onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="adm-form-grid">
                <div className="adm-field">
                  <label>Department</label>
                  <select
                    className="adm-select"
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {options.departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.department_name ?? department.departmentName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="adm-field">
                  <label>Position</label>
                  <select
                    className="adm-select"
                    value={form.positionId}
                    onChange={(e) => setForm({ ...form, positionId: e.target.value })}
                  >
                    <option value="">Select Position</option>
                    {options.positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.positionTitle ?? position.positionName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="adm-field">
                  <label>
                    Role <span className="adm-req">*</span>
                  </label>
                  <select
                    className="adm-select"
                    value={form.roleName}
                    onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                    required
                  >
                    {roleOptions.map((role) => {
                      const roleName = role.name.replace('ROLE_', '').toUpperCase();

                      return (
                        <option key={role.id} value={roleName}>
                          {roleName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {error && <div className="adm-alert error">{error}</div>}

              <div className="adm-form-actions">
                <button type="submit" className="adm-btn primary" disabled={loading}>
                  <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-check-lg'}`} />
                  {loading ? 'Creating...' : 'Create Login Account'}
                </button>
              </div>
            </form>

            {created && (
              <div className="adm-credentials-card">
                <div className="adm-credentials-title">
                  <i className="bi bi-check-circle-fill" /> Account Processed
                </div>

                <div className="adm-credentials-grid">
                  <div>
                    <span>Full Name</span>
                    <strong>{created.fullName}</strong>
                  </div>

                  <div>
                    <span>Email</span>
                    <strong>{created.email}</strong>
                  </div>

                  <div>
                    <span>Employee Code</span>
                    <strong>{created.employeeCode || 'Not set'}</strong>
                  </div>

                  <div>
                    <span>Email Status</span>
                    <strong>
                      {created.temporaryPasswordEmailSent
                        ? 'Temporary password sent'
                        : 'Check SMTP / resend later'}
                    </strong>
                  </div>
                </div>

                {created.message && <p className="adm-credentials-note">{created.message}</p>}
                {created.smtpErrorDetail && (
                  <p className="adm-credentials-note">SMTP: {created.smtpErrorDetail}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="adm-section">
        <div className="adm-section-header">
          <h2>
            <i className="bi bi-table" /> Recent People ({users.length})
          </h2>
          <button
            className="adm-btn primary"
            onClick={() =>
              exportToExcel(
                users.map((u) => ({
                  fullName: u.fullName ?? '',
                  email: u.email ?? '',
                  employeeCode: u.employeeCode ?? '',
                  status: u.success === false ? 'Needs Attention' : 'Active',
                })) as any,
                [
                  { header: 'Full Name',      key: 'fullName'      },
                  { header: 'Email',           key: 'email'         },
                  { header: 'Employee Code',   key: 'employeeCode'  },
                  { header: 'Status',          key: 'status'        },
                ],
                `admin_users_${todayStr()}`
              )
            }
            disabled={users.length === 0}
            title="Export to Excel"
          >
            <i className="bi bi-file-earmark-excel" /> Export Excel
          </button>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Employee Code</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u, i) => (
                <tr key={u.userId ?? u.email ?? i}>
                  <td>{i + 1}</td>
                  <td>{u.fullName ?? '—'}</td>
                  <td>{u.email ?? '—'}</td>
                  <td>{u.employeeCode ?? '—'}</td>
                  <td>
                    <span className={`adm-badge ${u.success === false ? 'inactive' : 'active'}`}>
                      {u.success === false ? 'Needs Attention' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
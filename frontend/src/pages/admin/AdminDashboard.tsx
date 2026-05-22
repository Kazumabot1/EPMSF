import { useEffect, useMemo, useState, type FormEvent } from 'react';
import api from '../../services/api';
import EmployeeAvatar from '../../components/EmployeeAvatar';
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

type DashboardOption = {
  value: string;
  label: string;
  helper: string;
};

type DashboardAuditRow = {
  id: number;
  changedByUserId?: number | null;
  changedByName?: string | null;
  oldDashboard?: string | null;
  newDashboard?: string | null;
  reason?: string | null;
  timestamp?: string | null;
};

interface CreateOptions {
  departments: DepartmentOption[];
  positions: PositionOption[];
  roles: RoleOption[];
}

interface AdminUserAccount {
  userId: number;
  fullName: string;
  email: string;
  employeeCode?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  positionId?: number | null;
  positionName?: string | null;
  roleName?: string | null;
  dashboard?: string | null;
  active?: boolean;
  accountStatus?: string | null;
  mustChangePassword?: boolean;
  temporaryPasswordEmailSent?: boolean;
  message?: string;
  smtpErrorDetail?: string | null;
  profileImageData?: string | null;
  profileImageType?: string | null;
}

const unwrap = <T,>(payload: any, fallback: T): T =>
  payload?.data?.data ?? payload?.data ?? fallback;

const dashboardOptions: DashboardOption[] = [
  {
    value: 'EMPLOYEE_DASHBOARD',
    label: 'Employee Dashboard',
    helper: 'Employee self-service workspace.',
  },
  {
    value: 'MANAGER_DASHBOARD',
    label: 'Manager Dashboard',
    helper: 'Manager review, KPI, team and appraisal workspace.',
  },
  {
    value: 'DEPARTMENT_HEAD_DASHBOARD',
    label: 'Department Head Dashboard',
    helper: 'Department review, assessment, appraisal and reports workspace.',
  },
  {
    value: 'HR_DASHBOARD',
    label: 'HR Dashboard',
    helper: 'HR configuration and organization workspace.',
  },
  {
    value: 'EXECUTIVE_DASHBOARD',
    label: 'CEO / Executive Dashboard',
    helper: 'Executive reports and company overview.',
  },
  {
    value: 'ADMIN_DASHBOARD',
    label: 'Admin Dashboard',
    helper: 'User accounts, access control and admin settings.',
  },
];

const normalizeRoleName = (role?: string | null) => {
  const value = String(role || 'EMPLOYEE')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .trim()
    .toUpperCase();

  if (
    value === 'PROJECT_MANAGER' ||
    value === 'PROJECTMANAGER' ||
    value === 'TEAM_MANAGER' ||
    value === 'PM'
  ) {
    return 'MANAGER';
  }

  if (
    value === 'DEPARTMENTHEAD' ||
    value === 'DEPT_HEAD' ||
    value === 'HEAD_OF_DEPARTMENT'
  ) {
    return 'DEPARTMENT_HEAD';
  }

  if (value === 'EXECUTIVE' || value === 'CEO') {
    return 'CEO';
  }

  if (
    value === 'ADMIN' ||
    value === 'HR' ||
    value === 'MANAGER' ||
    value === 'DEPARTMENT_HEAD' ||
    value === 'EMPLOYEE' ||
    value === 'CEO'
  ) {
    return value;
  }

  return 'EMPLOYEE';
};

const defaultDashboardForRole = (role?: string | null) => {
  const normalized = normalizeRoleName(role);

  switch (normalized) {
    case 'ADMIN':
      return 'ADMIN_DASHBOARD';
    case 'HR':
      return 'HR_DASHBOARD';
    case 'CEO':
      return 'EXECUTIVE_DASHBOARD';
    case 'DEPARTMENT_HEAD':
      return 'DEPARTMENT_HEAD_DASHBOARD';
    case 'MANAGER':
      return 'MANAGER_DASHBOARD';
    case 'EMPLOYEE':
    default:
      return 'EMPLOYEE_DASHBOARD';
  }
};

const normalizeDashboard = (dashboard?: string | null, role?: string | null) => {
  const value = String(dashboard || '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .trim()
    .toUpperCase();

  switch (value) {
    case 'ADMIN':
    case 'ADMIN_DASHBOARD':
      return 'ADMIN_DASHBOARD';
    case 'HR':
    case 'HR_DASHBOARD':
      return 'HR_DASHBOARD';
    case 'CEO':
    case 'EXECUTIVE':
    case 'CEO_DASHBOARD':
    case 'EXECUTIVE_DASHBOARD':
      return 'EXECUTIVE_DASHBOARD';
    case 'DEPARTMENTHEAD':
    case 'DEPARTMENT_HEAD':
    case 'DEPT_HEAD':
    case 'HEAD_OF_DEPARTMENT':
    case 'DEPARTMENTHEAD_DASHBOARD':
    case 'DEPARTMENT_HEAD_DASHBOARD':
    case 'DEPT_HEAD_DASHBOARD':
      return 'DEPARTMENT_HEAD_DASHBOARD';
    case 'MANAGER':
    case 'PROJECT_MANAGER':
    case 'TEAM_MANAGER':
    case 'MANAGER_DASHBOARD':
      return 'MANAGER_DASHBOARD';
    case 'EMPLOYEE':
    case 'EMPLOYEE_DASHBOARD':
      return 'EMPLOYEE_DASHBOARD';
    default:
      return defaultDashboardForRole(role);
  }
};

const roleDisplayName = (role?: string | null) => {
  const normalized = normalizeRoleName(role);

  switch (normalized) {
    case 'DEPARTMENT_HEAD':
      return 'Department Head';
    case 'EMPLOYEE':
      return 'Employee';
    case 'MANAGER':
      return 'Manager';
    case 'ADMIN':
      return 'Admin';
    case 'HR':
      return 'HR';
    case 'CEO':
      return 'CEO';
    default:
      return normalized;
  }
};

const dashboardDisplayName = (dashboard?: string | null, role?: string | null) => {
  const normalized = normalizeDashboard(dashboard, role);

  return dashboardOptions.find((item) => item.value === normalized)?.label ?? normalized;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const coreRoles: RoleOption[] = [
  { id: 1, name: 'EMPLOYEE' },
  { id: 2, name: 'HR' },
  { id: 3, name: 'ADMIN' },
  { id: 4, name: 'MANAGER' },
  { id: 5, name: 'DEPARTMENT_HEAD' },
  { id: 6, name: 'CEO' },
];

const AdminDashboard = () => {
  const [options, setOptions] = useState<CreateOptions>({
    departments: [],
    positions: [],
    roles: [],
  });

  const [users, setUsers] = useState<AdminUserAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [savedUser, setSavedUser] = useState<AdminUserAccount | null>(null);
  const [dashboardAuditRows, setDashboardAuditRows] = useState<DashboardAuditRow[]>([]);
  const [dashboardAuditLoading, setDashboardAuditLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    employeeCode: '',
    departmentId: '',
    positionId: '',
    roleName: 'EMPLOYEE',
    dashboard: 'EMPLOYEE_DASHBOARD',
    active: true,
  });

  const resetForm = () => {
    setForm({
      fullName: '',
      email: '',
      employeeCode: '',
      departmentId: '',
      positionId: '',
      roleName: 'EMPLOYEE',
      dashboard: 'EMPLOYEE_DASHBOARD',
      active: true,
    });
    setEditingUserId(null);
    setSavedUser(null);
    setDashboardAuditRows([]);
    setError('');
  };

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
      setListLoading(true);

      const response = await api.get('/users');
      const data = unwrap<AdminUserAccount[]>(response, []);

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load admin users', err);
      setUsers([]);
    } finally {
      setListLoading(false);
    }
  };

  const loadDashboardAudit = async (userId: number) => {
    try {
      setDashboardAuditLoading(true);

      const response = await api.get(`/users/${userId}/dashboard-audit`);
      const data = unwrap<DashboardAuditRow[]>(response, []);

      setDashboardAuditRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load dashboard audit', err);
      setDashboardAuditRows([]);
    } finally {
      setDashboardAuditLoading(false);
    }
  };

  useEffect(() => {
    void loadOptions();
    void loadUsers();
  }, []);

  const roleOptions = useMemo(() => {
    const source = [...coreRoles, ...options.roles];

    const cleaned = source.map((role) => ({
      ...role,
      name: normalizeRoleName(role.name),
    }));

    const unique = new Map<string, RoleOption>();

    cleaned.forEach((role) => {
      if (!unique.has(role.name)) {
        unique.set(role.name, role);
      }
    });

    const order = ['EMPLOYEE', 'HR', 'ADMIN', 'MANAGER', 'DEPARTMENT_HEAD', 'CEO'];

    return Array.from(unique.values()).sort(
      (a, b) => order.indexOf(a.name) - order.indexOf(b.name),
    );
  }, [options.roles]);

  const duplicateEmailUser = useMemo(() => {
    const email = form.email.trim().toLowerCase();

    if (!email) return null;

    return (
      users.find((user) => {
        if (!user.email) return false;
        if (editingUserId && user.userId === editingUserId) return false;
        return user.email.trim().toLowerCase() === email;
      }) ?? null
    );
  }, [editingUserId, form.email, users]);

  const selectedDashboardHelper = useMemo(
    () => dashboardOptions.find((item) => item.value === form.dashboard)?.helper ?? '',
    [form.dashboard],
  );

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (user: AdminUserAccount) => {
    const roleName = normalizeRoleName(user.roleName || 'EMPLOYEE');

    setEditingUserId(user.userId);
    setSavedUser(null);
    setError('');

    setForm({
      fullName: user.fullName || '',
      email: user.email || '',
      employeeCode: user.employeeCode || '',
      departmentId: user.departmentId ? String(user.departmentId) : '',
      positionId: user.positionId ? String(user.positionId) : '',
      roleName,
      dashboard: normalizeDashboard(user.dashboard, roleName),
      active: user.active !== false,
    });

    setShowForm(true);
    void loadDashboardAudit(user.userId);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const validate = () => {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (duplicateEmailUser) {
      return `Email is already used by ${duplicateEmailUser.fullName || duplicateEmailUser.email}.`;
    }
    if (!form.roleName.trim()) return 'Role is required.';
    if (!form.dashboard.trim()) return 'Dashboard is required.';
    return '';
  };

  const buildPayload = () => ({
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    employeeCode: form.employeeCode.trim() || null,
    departmentId: form.departmentId ? Number(form.departmentId) : null,
    positionId: form.positionId ? Number(form.positionId) : null,
    roleName: normalizeRoleName(form.roleName || 'EMPLOYEE'),
    dashboard: normalizeDashboard(form.dashboard, form.roleName),
    active: form.active,
    sendTemporaryPasswordEmail: !editingUserId,
  });

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSavedUser(null);

    try {
      const payload = buildPayload();

      const response = editingUserId
        ? await api.put(`/users/${editingUserId}`, payload)
        : await api.post('/users', payload);

      const saved = unwrap<AdminUserAccount>(response, {} as AdminUserAccount);

      setSavedUser(saved);

      setUsers((previous) => {
        if (editingUserId) {
          return previous.map((item) =>
            item.userId === editingUserId ? { ...item, ...saved } : item,
          );
        }

        return [saved, ...previous];
      });

      if (!editingUserId) {
        setForm({
          fullName: '',
          email: '',
          employeeCode: '',
          departmentId: '',
          positionId: '',
          roleName: 'EMPLOYEE',
          dashboard: 'EMPLOYEE_DASHBOARD',
          active: true,
        });
      } else {
        await loadDashboardAudit(editingUserId);
      }

      await loadUsers();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to save user account.',
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
        <p>Create, edit, and manage login accounts from the admin area.</p>
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
            <i className="bi bi-person-plus" />{' '}
            {editingUserId ? 'Edit Login Account' : 'Login Account User'}
          </h2>

          <button
            className="adm-btn"
            type="button"
            onClick={async () => {
              try {
                await api.post('/users/resync-employee-links', {});
                await loadUsers();
                alert('User/employee links resynced successfully.');
              } catch (err: any) {
                alert(
                  err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    'Failed to resync employee links.',
                );
              }
            }}
          >
            <i className="bi bi-arrow-repeat" />
            Resync Employee Links
          </button>

          <button
            className="adm-btn primary"
            type="button"
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                openCreate();
              }
            }}
          >
            <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'}`} />
            {showForm ? 'Cancel' : 'Create'}
          </button>
        </div>

        {showForm && (
          <div className="adm-form-card">
            <p className="adm-form-hint">
              <i className="bi bi-info-circle" />{' '}
              {editingUserId
                ? 'Update the login account details, role, dashboard, department, position, and active status.'
                : 'This creates the login account from Admin.'}
            </p>

            <form onSubmit={handleSave} className="adm-form">
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
                    onChange={(event) =>
                      setForm({ ...form, fullName: event.target.value })
                    }
                    required
                  />

                  {duplicateEmailUser && (
                    <div
                      className="adm-alert error"
                      style={{ marginTop: 8, padding: '8px 10px', fontSize: '.82rem' }}
                    >
                      <i className="bi bi-exclamation-triangle-fill" /> Email already exists for{' '}
                      <strong>{duplicateEmailUser.fullName || duplicateEmailUser.email}</strong>.
                    </div>
                  )}
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
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
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
                    onChange={(event) =>
                      setForm({ ...form, employeeCode: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="adm-form-grid">
                <div className="adm-field">
                  <label>Department</label>

                  <select
                    className="adm-select"
                    value={form.departmentId}
                    onChange={(event) =>
                      setForm({ ...form, departmentId: event.target.value })
                    }
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
                    onChange={(event) =>
                      setForm({ ...form, positionId: event.target.value })
                    }
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
                    onChange={(event) => {
                      const roleName = normalizeRoleName(event.target.value);

                      setForm({
                        ...form,
                        roleName,
                        dashboard: defaultDashboardForRole(roleName),
                      });
                    }}
                    required
                  >
                    {roleOptions.map((role) => {
                      const roleName = normalizeRoleName(role.name);

                      return (
                        <option key={`${role.id}-${roleName}`} value={roleName}>
                          {roleDisplayName(roleName)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="adm-form-grid">
                <div className="adm-field">
                  <label>
                    Dashboard <span className="adm-req">*</span>
                  </label>

                  <select
                    className="adm-select"
                    value={form.dashboard}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dashboard: normalizeDashboard(event.target.value, form.roleName),
                      })
                    }
                    required
                  >
                    {dashboardOptions.map((dashboard) => (
                      <option key={dashboard.value} value={dashboard.value}>
                        {dashboard.label}
                      </option>
                    ))}
                  </select>

                  <small style={{ display: 'block', marginTop: 6, color: '#64748b' }}>
                    {selectedDashboardHelper}
                  </small>
                </div>

                {editingUserId && (
                  <div className="adm-field">
                    <label>Status</label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        minHeight: 44,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(event) =>
                          setForm({ ...form, active: event.target.checked })
                        }
                      />
                      Active account
                    </label>
                  </div>
                )}
              </div>

              {error && <div className="adm-alert error">{error}</div>}

              <div className="adm-form-actions">
                <button type="submit" className="adm-btn primary" disabled={loading}>
                  <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-check-lg'}`} />
                  {loading
                    ? editingUserId
                      ? 'Updating...'
                      : 'Creating...'
                    : editingUserId
                      ? 'Update Account'
                      : 'Create Login Account'}
                </button>

                {editingUserId && (
                  <button
                    type="button"
                    className="adm-btn"
                    onClick={closeForm}
                    disabled={loading}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            {savedUser && (
              <div className="adm-credentials-card">
                <div className="adm-credentials-title">
                  <i className="bi bi-check-circle-fill" />{' '}
                  {editingUserId ? 'Account Updated' : 'Account Processed'}
                </div>

                <div className="adm-credentials-grid">
                  <div>
                    <span>Full Name</span>
                    <strong>{savedUser.fullName}</strong>
                  </div>

                  <div>
                    <span>Email</span>
                    <strong>{savedUser.email}</strong>
                  </div>

                  <div>
                    <span>Employee Code</span>
                    <strong>{savedUser.employeeCode || 'Not set'}</strong>
                  </div>

                  <div>
                    <span>Role</span>
                    <strong>{roleDisplayName(savedUser.roleName || form.roleName)}</strong>
                  </div>

                  <div>
                    <span>Dashboard</span>
                    <strong>{dashboardDisplayName(savedUser.dashboard || form.dashboard, savedUser.roleName || form.roleName)}</strong>
                  </div>
                </div>

                {savedUser.message && (
                  <p className="adm-credentials-note">{savedUser.message}</p>
                )}

                {savedUser.smtpErrorDetail && (
                  <p className="adm-credentials-note">
                    SMTP: {savedUser.smtpErrorDetail}
                  </p>
                )}
              </div>
            )}

            {editingUserId && (
              <div
                className="adm-credentials-card"
                style={{ marginTop: 16, background: '#f8fafc' }}
              >
                <div className="adm-credentials-title">
                  <i className="bi bi-clock-history" /> Dashboard Audit Log
                </div>

                {dashboardAuditLoading ? (
                  <p className="adm-credentials-note">Loading dashboard audit...</p>
                ) : dashboardAuditRows.length === 0 ? (
                  <p className="adm-credentials-note">No dashboard changes recorded yet.</p>
                ) : (
                  <div className="adm-table-wrap" style={{ marginTop: 12 }}>
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Changed By</th>
                          <th>Old Dashboard</th>
                          <th>New Dashboard</th>
                          <th>Reason</th>
                        </tr>
                      </thead>

                      <tbody>
                        {dashboardAuditRows.map((row) => (
                          <tr key={row.id}>
                            <td>{formatDateTime(row.timestamp)}</td>
                            <td>{row.changedByName || 'System'}</td>
                            <td>{dashboardDisplayName(row.oldDashboard)}</td>
                            <td>{dashboardDisplayName(row.newDashboard)}</td>
                            <td>{row.reason || 'Dashboard changed by Admin'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                users.map((user) => ({
                  fullName: user.fullName ?? '',
                  email: user.email ?? '',
                  employeeCode: user.employeeCode ?? '',
                  departmentName: user.departmentName ?? '',
                  positionName: user.positionName ?? '',
                  roleName: roleDisplayName(user.roleName ?? ''),
                  dashboard: dashboardDisplayName(user.dashboard, user.roleName),
                  status: user.active === false ? 'Inactive' : 'Active',
                })) as any,
                [
                  { header: 'Full Name', key: 'fullName' },
                  { header: 'Email', key: 'email' },
                  { header: 'Employee Code', key: 'employeeCode' },
                  { header: 'Department', key: 'departmentName' },
                  { header: 'Position', key: 'positionName' },
                  { header: 'Role', key: 'roleName' },
                  { header: 'Dashboard', key: 'dashboard' },
                  { header: 'Status', key: 'status' },
                ],
                `admin_users_${todayStr()}`,
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
                <th>Department</th>
                <th>Position</th>
                <th>Role</th>
                <th>Dashboard</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {listLoading && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#888' }}>
                    Loading users...
                  </td>
                </tr>
              )}

              {!listLoading &&
                users.map((user, index) => (
                  <tr key={user.userId ?? user.email ?? index}>
                    <td>{index + 1}</td>
                    <td>
                      <EmployeeAvatar
                        fullName={user.fullName}
                        email={user.email}
                        profileImageData={user.profileImageData}
                        profileImageType={user.profileImageType}
                        size="sm"
                        showName
                        subtitle={user.email || user.employeeCode || undefined}
                      />
                    </td>
                    <td>{user.email ?? '—'}</td>
                    <td>{user.employeeCode ?? '—'}</td>
                    <td>{user.departmentName ?? '—'}</td>
                    <td>{user.positionName ?? '—'}</td>
                    <td>{roleDisplayName(user.roleName ?? '—')}</td>
                    <td>{dashboardDisplayName(user.dashboard, user.roleName)}</td>
                    <td>
                      <span
                        className={`adm-badge ${
                          user.active === false ? 'inactive' : 'active'
                        }`}
                      >
                        {user.active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn"
                        onClick={() => openEdit(user)}
                        style={{ padding: '7px 12px' }}
                      >
                        <i className="bi bi-pencil-square" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}

              {!listLoading && users.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#888' }}>
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
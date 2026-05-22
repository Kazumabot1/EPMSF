import { useEffect, useMemo, useState, type FormEvent } from 'react';
import api from '../../services/api';
import DashboardSelector from '../admin/DashboardSelector';
import {
  defaultDashboardForRole,
  normalizeDashboard,
  type DashboardValue,
} from '../../utils/dashboardOptions';

type ModalMode = 'create' | 'edit';

type EmployeeFormModalProps = {
  open: boolean;
  mode: ModalMode;
  employee?: any | null;
  onClose: () => void;
  onSaved: () => void;
};

type DepartmentOption = {
  id: number;
  departmentName?: string;
  department_name?: string;
  name?: string;
};

type PositionOption = {
  id: number;
  positionTitle?: string;
  positionName?: string;
  name?: string;
  levelCode?: string;
  roleName?: string;
  role?: {
    name?: string;
  } | string | null;
};

type EmployeeFormState = {
  firstName: string;
  lastName: string;
  positionId: string;
  currentDepartmentId: string;
  parentDepartmentId: string;

  phoneNumber: string;
  email: string;
  staffNrc: string;
  gender: string;
  dateOfBirth: string;

  createLoginAccount: boolean;
  sendTemporaryPasswordEmail: boolean;
  dashboard: DashboardValue;

  race: string;
  religion: string;
  contactAddress: string;
  permanentAddress: string;
  maritalStatus: string;
  spouseName: string;
  spouseNrc: string;
  fatherName: string;
  fatherNrc: string;
};

const emptyForm: EmployeeFormState = {
  firstName: '',
  lastName: '',
  positionId: '',
  currentDepartmentId: '',
  parentDepartmentId: '',

  phoneNumber: '',
  email: '',
  staffNrc: '',
  gender: '',
  dateOfBirth: '',

  createLoginAccount: true,
  sendTemporaryPasswordEmail: true,
  dashboard: 'EMPLOYEE_DASHBOARD',

  race: '',
  religion: '',
  contactAddress: '',
  permanentAddress: '',
  maritalStatus: '',
  spouseName: '',
  spouseNrc: '',
  fatherName: '',
  fatherNrc: '',
};

const unwrap = <T,>(payload: any, fallback: T): T => {
  if (payload?.data?.data !== undefined) return payload.data.data as T;
  if (payload?.data !== undefined) return payload.data as T;
  return fallback;
};

const getDepartmentName = (department: DepartmentOption) =>
  department.departmentName || department.department_name || department.name || `Department #${department.id}`;

const getPositionName = (position: PositionOption) =>
  position.positionTitle || position.positionName || position.name || `Position #${position.id}`;

const getRoleNameFromPosition = (position?: PositionOption | null) => {
  if (!position) return 'EMPLOYEE';

  if (position.roleName) return position.roleName;

  if (typeof position.role === 'string') return position.role;

  if (position.role?.name) return position.role.name;

  return 'EMPLOYEE';
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const firstValue = (...values: any[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return '';
};

const EmployeeFormModal = ({
  open,
  mode,
  employee,
  onClose,
  onSaved,
}: EmployeeFormModalProps) => {
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPosition = useMemo(
    () =>
      positions.find((position) => String(position.id) === String(form.positionId)) ??
      null,
    [positions, form.positionId],
  );

  const selectedRoleName = getRoleNameFromPosition(selectedPosition);

  const parentDepartmentOptions = useMemo(() => {
    if (!form.currentDepartmentId) return [];

    return departments.filter(
      (department) => String(department.id) !== String(form.currentDepartmentId),
    );
  }, [departments, form.currentDepartmentId]);

  useEffect(() => {
    if (!open) return;

    const loadLookups = async () => {
      try {
        setLoadingLookups(true);
        setError('');

        const [departmentsResponse, positionsResponse] = await Promise.all([
          api.get('/departments'),
          api.get('/positions'),
        ]);

        const departmentData = unwrap<DepartmentOption[]>(departmentsResponse, []);
        const positionData = unwrap<PositionOption[]>(positionsResponse, []);

        setDepartments(Array.isArray(departmentData) ? departmentData : []);
        setPositions(Array.isArray(positionData) ? positionData : []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            'Failed to load employee form options.',
        );
      } finally {
        setLoadingLookups(false);
      }
    };

    void loadLookups();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && employee) {
      const roleName =
        employee.roleName ||
        employee.positionRoleName ||
        employee.position?.roleName ||
        employee.position?.role?.name ||
        'EMPLOYEE';

      setForm({
        firstName: firstValue(employee.firstName),
        lastName: firstValue(employee.lastName),
        positionId: firstValue(employee.positionId, employee.position?.id),
        currentDepartmentId: firstValue(
          employee.currentDepartmentId,
          employee.departmentId,
          employee.department?.id,
        ),
        parentDepartmentId: firstValue(
          employee.parentDepartmentId,
          employee.workingDepartmentId,
          employee.parentDepartment?.id,
        ),

        phoneNumber: firstValue(employee.phoneNumber, employee.phone),
        email: firstValue(employee.email, employee.workEmail),
        staffNrc: firstValue(employee.staffNrc, employee.nrc),
        gender: firstValue(employee.gender),
        dateOfBirth: toDateInput(employee.dateOfBirth),

        createLoginAccount: Boolean(employee.email || employee.workEmail),
        sendTemporaryPasswordEmail: false,
        dashboard: normalizeDashboard(employee.dashboard, roleName),

        race: firstValue(employee.race),
        religion: firstValue(employee.religion),
        contactAddress: firstValue(employee.contactAddress),
        permanentAddress: firstValue(employee.permanentAddress),
        maritalStatus: firstValue(employee.maritalStatus),
        spouseName: firstValue(employee.spouseName),
        spouseNrc: firstValue(employee.spouseNrc),
        fatherName: firstValue(employee.fatherName),
        fatherNrc: firstValue(employee.fatherNrc),
      });

      return;
    }

    setForm(emptyForm);
  }, [open, mode, employee]);

  if (!open) {
    return null;
  }

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!form.currentDepartmentId) return 'Current Department is required.';

    if (form.createLoginAccount && !form.email.trim()) {
      return 'Work email is required when creating a login account.';
    }

    if (form.createLoginAccount && !form.dashboard) {
      return 'Dashboard is required when creating a login account.';
    }

    return '';
  };

  const buildPayload = () => ({
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),

    positionId: form.positionId ? Number(form.positionId) : null,
    currentDepartmentId: form.currentDepartmentId
      ? Number(form.currentDepartmentId)
      : null,
    departmentId: form.currentDepartmentId ? Number(form.currentDepartmentId) : null,
    parentDepartmentId: form.parentDepartmentId
      ? Number(form.parentDepartmentId)
      : null,

    phoneNumber: form.phoneNumber.trim() || null,
    phone: form.phoneNumber.trim() || null,
    email: form.email.trim() || null,
    workEmail: form.email.trim() || null,
    staffNrc: form.staffNrc.trim() || null,
    nrc: form.staffNrc.trim() || null,
    gender: form.gender || null,
    dateOfBirth: form.dateOfBirth || null,

    createLoginAccount: form.createLoginAccount,
    sendTemporaryPasswordEmail: form.sendTemporaryPasswordEmail,

    dashboard: form.createLoginAccount
      ? normalizeDashboard(form.dashboard, selectedRoleName)
      : null,

    race: form.race.trim() || null,
    religion: form.religion.trim() || null,
    contactAddress: form.contactAddress.trim() || null,
    permanentAddress: form.permanentAddress.trim() || null,
    maritalStatus: form.maritalStatus || null,
    spouseName: form.spouseName.trim() || null,
    spouseNrc: form.spouseNrc.trim() || null,
    fatherName: form.fatherName.trim() || null,
    fatherNrc: form.fatherNrc.trim() || null,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validation = validate();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = buildPayload();

      if (mode === 'edit' && employee?.id) {
        await api.put(`/employees/${employee.id}`, payload);
      } else {
        await api.post('/employees', payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Employee could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
   <div className="epms-emp-modal-overlay">
     <div className="epms-emp-modal epms-emp-modal--wide">
        <div className="employee-modal-header">
          <div>
            <h2>{mode === 'edit' ? 'Edit employee' : 'Add employee'}</h2>
            <p>
              {mode === 'edit'
                ? 'Update employee master data and login dashboard.'
                : 'Create employee master data and optional login account.'}
            </p>
          </div>

          <button type="button" className="employee-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="employee-form">
          <div className="employee-form-grid">
            <div className="employee-field">
              <label>
                First name <span className="employee-required">*</span>
              </label>
              <input
                className="employee-input"
                value={form.firstName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, firstName: event.target.value }))
                }
              />
            </div>

            <div className="employee-field">
              <label>
                Last name <span className="employee-required">*</span>
              </label>
              <input
                className="employee-input"
                value={form.lastName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="employee-form-grid">
            <div className="employee-field">
              <label>Position</label>
              <select
                className="employee-input"
                value={form.positionId}
                disabled={loadingLookups}
                onChange={(event) => {
                  const nextPositionId = event.target.value;
                  const nextPosition =
                    positions.find(
                      (position) => String(position.id) === String(nextPositionId),
                    ) ?? null;

                  const nextRoleName = getRoleNameFromPosition(nextPosition);

                  setForm((prev) => ({
                    ...prev,
                    positionId: nextPositionId,
                    dashboard: defaultDashboardForRole(nextRoleName),
                  }));
                }}
              >
                <option value="">—</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {getPositionName(position)}
                    {position.levelCode ? ` (${position.levelCode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="employee-field">
              <label>
                Current Department <span className="employee-required">*</span>
              </label>
              <select
                className="employee-input"
                value={form.currentDepartmentId}
                disabled={loadingLookups}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    currentDepartmentId: event.target.value,
                    parentDepartmentId:
                      prev.parentDepartmentId === event.target.value
                        ? ''
                        : prev.parentDepartmentId,
                  }))
                }
              >
                <option value="">— Select Current Department —</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {getDepartmentName(department)}
                  </option>
                ))}
              </select>
            </div>

            <div className="employee-field">
              <label>Parent Department / Working Department</label>
              <select
                className="employee-input"
                value={form.parentDepartmentId}
                disabled={!form.currentDepartmentId || loadingLookups}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    parentDepartmentId: event.target.value,
                  }))
                }
              >
                <option value="">
                  {form.currentDepartmentId
                    ? '— Same as Current Department —'
                    : '— Select Current Department first —'}
                </option>
                {parentDepartmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {getDepartmentName(department)}
                  </option>
                ))}
              </select>
              <small>
                Blank means the employee works in their Current Department. Select Parent
                Department only when the employee is working under another department.
              </small>
            </div>
          </div>

          <h3 className="employee-form-section-title">Contact & identity</h3>

          <div className="employee-form-grid">
            <div className="employee-field">
              <label>Phone</label>
              <input
                className="employee-input"
                value={form.phoneNumber}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))
                }
              />
            </div>

            <div className="employee-field">
              <label>Work email</label>
              <input
                className="employee-input"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                    createLoginAccount: event.target.value.trim()
                      ? prev.createLoginAccount
                      : false,
                  }))
                }
              />
            </div>

            <div className="employee-field">
              <label>Staff NRC</label>
              <input
                className="employee-input"
                value={form.staffNrc}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, staffNrc: event.target.value }))
                }
              />
            </div>

            <div className="employee-field">
              <label>Gender</label>
              <select
                className="employee-input"
                value={form.gender}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, gender: event.target.value }))
                }
              >
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="employee-field">
              <label>Date of birth</label>
              <input
                className="employee-input"
                type="date"
                value={form.dateOfBirth}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="employee-login-box">
            <label className="employee-checkbox">
              <input
                type="checkbox"
                checked={form.createLoginAccount}
                disabled={!form.email.trim()}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    createLoginAccount: event.target.checked,
                  }))
                }
              />
              Create login account automatically when email is provided
            </label>

            <label className="employee-checkbox">
              <input
                type="checkbox"
                checked={form.sendTemporaryPasswordEmail}
                disabled={!form.createLoginAccount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sendTemporaryPasswordEmail: event.target.checked,
                  }))
                }
              />
              Send temporary password onboarding email
            </label>

            {form.createLoginAccount && (
              <div className="employee-field" style={{ marginTop: 12 }}>
                <label>
                  Dashboard <span className="employee-required">*</span>
                </label>

                <DashboardSelector
                  value={form.dashboard}
                  roleName={selectedRoleName}
                  onChange={(dashboard) =>
                    setForm((prev) => ({
                      ...prev,
                      dashboard,
                    }))
                  }
                />

                <small>
                  This controls which dashboard the login account opens after login.
                </small>
              </div>
            )}
          </div>

          <h3 className="employee-form-section-title">Background</h3>

          <div className="employee-form-grid">
            <div className="employee-field">
              <label>Race</label>
              <input
                className="employee-input"
                value={form.race}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, race: event.target.value }))
                }
              />
            </div>

            <div className="employee-field">
              <label>Religion</label>
              <input
                className="employee-input"
                value={form.religion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, religion: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="employee-field">
            <label>Contact address</label>
            <textarea
              className="employee-input employee-textarea"
              value={form.contactAddress}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  contactAddress: event.target.value,
                }))
              }
            />
          </div>

          <div className="employee-field">
            <label>Permanent address</label>
            <textarea
              className="employee-input employee-textarea"
              value={form.permanentAddress}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  permanentAddress: event.target.value,
                }))
              }
            />
          </div>

          <h3 className="employee-form-section-title">Family</h3>

          <div className="employee-form-grid">
            <div className="employee-field">
              <label>Marital status</label>
              <select
                className="employee-input"
                value={form.maritalStatus}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    maritalStatus: event.target.value,
                  }))
                }
              >
                <option value="">—</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            <div className="employee-field">
              <label>Spouse name</label>
              <input
                className="employee-input"
                value={form.spouseName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, spouseName: event.target.value }))
                }
              />
            </div>

            <div className="employee-field">
              <label>Spouse NRC</label>
              <input
                className="employee-input"
                value={form.spouseNrc}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, spouseNrc: event.target.value }))
                }
              />
            </div>

            <div className="employee-field">
              <label>Father name</label>
              <input
                className="employee-input"
                value={form.fatherName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fatherName: event.target.value }))
                }
              />
            </div>

            <div className="employee-field">
              <label>Father NRC</label>
              <input
                className="employee-input"
                value={form.fatherNrc}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fatherNrc: event.target.value }))
                }
              />
            </div>
          </div>

          {error && <div className="employee-alert error">{error}</div>}

          <div className="employee-form-actions">
            <button type="button" className="employee-btn secondary" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" className="employee-btn primary" disabled={saving}>
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeFormModal;
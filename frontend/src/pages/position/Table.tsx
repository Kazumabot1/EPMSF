import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { positionService } from '../../services/positionService';
import api from '../../services/api';
import type { PositionDetailResponse, PositionEmployeeUsage, PositionLevelResponse, PositionResponse } from '../../types/position';
import './position-ui.css';

type DashboardRoleOption = {
  id: number;
  name: string;
  label: string;
  dashboard: string;
};

type EditFormState = {
  id: number;
  positionTitle: string;
  levelId: string;
  roleId: string;
  description: string;
  status: boolean;
  reason: string;
};

const allDepartmentsKey = 'all';
const noDepartmentKey = 'none';

const dateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const dateOnly = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const departmentKey = (departmentId?: number | null) =>
  departmentId === null || departmentId === undefined ? noDepartmentKey : String(departmentId);

const statusText = (value?: string | null) => {
  if (!value || value.trim().length === 0) return 'Account created';
  return value;
};

const unwrap = <T,>(payload: any, fallback: T): T => {
  if (payload?.data?.data !== undefined) return payload.data.data as T;
  if (payload?.data !== undefined) return payload.data as T;
  return fallback;
};

const PositionTable = () => {
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [levels, setLevels] = useState<PositionLevelResponse[]>([]);
  const [roles, setRoles] = useState<DashboardRoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [error, setError] = useState('');
  const [rolesError, setRolesError] = useState('');
  const [query, setQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [originalPosition, setOriginalPosition] = useState<PositionResponse | null>(null);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [details, setDetails] = useState<PositionDetailResponse | null>(null);
  const [selectedDepartmentKey, setSelectedDepartmentKey] = useState(allDepartmentsKey);

  const loadPositions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await positionService.getPositions();
      setPositions(response);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load positions.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadLevels = async () => {
    try {
      const response = await positionService.getPositionLevels();
      setLevels(response);
    } catch {
      setLevels([]);
    }
  };

  const loadDashboardRoles = async () => {
    try {
      setRolesLoading(true);
      setRolesError('');
      const response = await api.get('/positions/dashboard-roles');
      const data = unwrap<DashboardRoleOption[]>(response, []);
      setRoles(Array.isArray(data) ? data : []);
    } catch (roleError: any) {
      const message =
        roleError?.response?.data?.message ||
        roleError?.response?.data?.error ||
        roleError?.message ||
        'Failed to load dashboard roles.';
      setRolesError(message);
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    void loadPositions();
    void loadLevels();
    void loadDashboardRoles();
  }, []);

  const filteredPositions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return positions;

    return positions.filter((position) =>
      [position.positionTitle, position.levelCode, position.roleName, position.description, position.createdBy]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [positions, query]);

  const filteredDetailEmployees = useMemo(() => {
    if (!details) return [] as PositionEmployeeUsage[];
    if (selectedDepartmentKey === allDepartmentsKey) return details.employees;

    return details.employees.filter((employee) => departmentKey(employee.usageDepartmentId) === selectedDepartmentKey);
  }, [details, selectedDepartmentKey]);

  const openEditModal = (position: PositionResponse) => {
    setOriginalPosition(position);
    setEditForm({
      id: position.id,
      positionTitle: position.positionTitle || '',
      levelId: String(position.levelId || ''),
      roleId: String(position.roleId || ''),
      description: position.description || '',
      status: position.status !== false,
      reason: '',
    });
    setModalError('');
    setModalSuccess('');
    setModalOpen(true);
  };

  const closeEditModal = () => {
    setModalOpen(false);
    setEditForm(null);
    setOriginalPosition(null);
    setModalError('');
    setModalSuccess('');
  };

  const openDetailsModal = async (position: PositionResponse) => {
    setDetailsOpen(true);
    setDetails(null);
    setDetailsError('');
    setDetailsLoading(true);
    setSelectedDepartmentKey(allDepartmentsKey);

    try {
      const response = await positionService.getPositionDetails(position.id);
      setDetails(response);
    } catch (detailError) {
      const message = detailError instanceof Error ? detailError.message : 'Failed to load position details.';
      setDetailsError(message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setDetailsOpen(false);
    setDetails(null);
    setDetailsError('');
    setSelectedDepartmentKey(allDepartmentsKey);
  };

  const hasChanges = () => {
    if (!editForm || !originalPosition) return false;

    return (
      editForm.positionTitle.trim() !== (originalPosition.positionTitle || '') ||
      Number(editForm.levelId) !== originalPosition.levelId ||
      Number(editForm.roleId) !== originalPosition.roleId ||
      editForm.description.trim() !== (originalPosition.description || '') ||
      editForm.status !== (originalPosition.status !== false)
    );
  };

  const validateEditForm = (): string => {
    if (!editForm) return 'No position selected.';
    if (editForm.positionTitle.trim().length === 0) return 'Position title is required.';
    if (editForm.levelId.trim().length === 0 || Number.isNaN(Number(editForm.levelId))) {
      return 'Position level is required.';
    }
    if (editForm.roleId.trim().length === 0 || Number.isNaN(Number(editForm.roleId))) {
      return 'Dashboard role is required.';
    }
    if (!roles.some((role) => role.id === Number(editForm.roleId))) {
      return 'Selected dashboard role is no longer available. Please choose again.';
    }
    if (!hasChanges()) return 'No changes detected.';
    if (editForm.reason.trim().length === 0) return 'Reason is required for edit or deactivate.';
    if (editForm.reason.trim().length > 150) return 'Reason must not exceed 150 characters.';
    return '';
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editForm) return;

    const validationError = validateEditForm();
    if (validationError) {
      setModalError(validationError);
      setModalSuccess('');
      return;
    }

    try {
      setSaving(true);
      setModalError('');
      setModalSuccess('');

      await positionService.updatePosition(editForm.id, {
        positionTitle: editForm.positionTitle.trim(),
        levelId: Number(editForm.levelId),
        roleId: Number(editForm.roleId),
        description: editForm.description.trim(),
        status: editForm.status,
        reason: editForm.reason.trim(),
      });

      setModalSuccess('Position updated successfully.');
      await loadPositions();
      setTimeout(() => closeEditModal(), 450);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to update position.';
      setModalError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="position-page">
      <div className="position-hero">
        <span className="position-hero-badge">
          <i className="bi bi-table" />
          Live Overview
        </span>
        <h1>Position Table</h1>
        <p>Review position setup, usage by department, employee assignment, account status, and team impact.</p>
      </div>

      <div className="position-surface">
        <div className="position-surface-inner">
          <div className="position-table-toolbar">
            <input
              className="position-input position-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search positions..."
            />
            <button type="button" onClick={loadPositions} disabled={loading} className="position-btn secondary">
              <i className={`bi ${loading ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="position-state">
              <i className="bi bi-hourglass-split" />
              Loading positions...
            </div>
          ) : error ? (
            <div className="position-state">
              <i className="bi bi-exclamation-triangle" />
              <div className="position-alert error">{error}</div>
              <button type="button" onClick={loadPositions} className="position-btn primary position-retry-btn">
                Retry
              </button>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="position-state">
              <i className="bi bi-inbox" />
              No positions found.
            </div>
          ) : (
            <div className="position-table-wrap">
              <table className="position-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Position Title</th>
                    <th>Level Code</th>
                    <th>Dashboard Role</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPositions.map((position) => (
                    <tr key={position.id}>
                      <td>{position.id}</td>
                      <td>
                        <strong>{position.positionTitle}</strong>
                      </td>
                      <td>{position.levelCode || '-'}</td>
                      <td>{position.roleName || 'No role linked'}</td>
                      <td>
                        <span className={`position-pill ${position.status ? 'active' : 'inactive'}`}>
                          {position.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{position.description || '-'}</td>
                      <td>{position.createdBy || '-'}</td>
                      <td>{dateTime(position.createdAt)}</td>
                      <td>
                        <div className="position-action-group">
                          <button
                            type="button"
                            className="position-btn view"
                            title="View position details"
                            onClick={() => void openDetailsModal(position)}
                          >
                            <i className="bi bi-eye" />
                            View Details
                          </button>
                          <button
                            type="button"
                            className="position-btn ghost"
                            title="Edit position"
                            onClick={() => openEditModal(position)}
                          >
                            <i className="bi bi-pencil-square" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && editForm && (
        <div className="position-modal-backdrop" role="presentation" onClick={closeEditModal}>
          <div
            className="position-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit position"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="position-modal-header">
              <h2>Edit Position</h2>
              <button type="button" className="position-btn ghost" onClick={closeEditModal}>
                <i className="bi bi-x-lg" />
                Close
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="position-form-grid">
                <div className="position-field">
                  <label htmlFor="editPositionTitle">
                    Position Title <span className="position-required">*</span>
                  </label>
                  <input
                    id="editPositionTitle"
                    type="text"
                    className="position-input"
                    value={editForm.positionTitle}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, positionTitle: event.target.value } : prev))
                    }
                  />
                </div>

                <div className="position-field">
                  <label htmlFor="editLevelId">
                    Position Level <span className="position-required">*</span>
                  </label>
                  <select
                    id="editLevelId"
                    className="position-select"
                    value={editForm.levelId}
                    onChange={(event) => setEditForm((prev) => (prev ? { ...prev, levelId: event.target.value } : prev))}
                  >
                    <option value="">Select level</option>
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.levelCode}{level.active === false ? ' (Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="position-field">
                  <label htmlFor="editRoleId">
                    Dashboard Role <span className="position-required">*</span>
                  </label>
                  <select
                    id="editRoleId"
                    className="position-select"
                    value={editForm.roleId}
                    disabled={rolesLoading || roles.length === 0}
                    onChange={(event) => setEditForm((prev) => (prev ? { ...prev, roleId: event.target.value } : prev))}
                  >
                    <option value="">
                      {rolesLoading
                        ? 'Loading dashboard roles...'
                        : roles.length === 0
                          ? 'No dashboard roles available'
                          : 'Select dashboard role'}
                    </option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {rolesError && <div className="position-alert error">{rolesError}</div>}
                </div>
              </div>

              <div className="position-field position-gap-top">
                <label htmlFor="editDescription">Description</label>
                <textarea
                  id="editDescription"
                  className="position-textarea"
                  rows={3}
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                  }
                />
              </div>

              <div className="position-form-grid position-gap-top">
                <div className="position-field">
                  <label>Status</label>
                  <select
                    className="position-select"
                    value={editForm.status ? 'active' : 'inactive'}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, status: event.target.value === 'active' } : prev))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="position-field position-gap-top">
                <label htmlFor="editReason">
                  Reason <span className="position-required">*</span>
                </label>
                <textarea
                  id="editReason"
                  className="position-textarea"
                  rows={3}
                  maxLength={150}
                  value={editForm.reason}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, reason: event.target.value.slice(0, 150) } : prev))
                  }
                  placeholder="Why is this position being edited?"
                />
                <small>{editForm.reason.length}/150</small>
              </div>

              {modalError && <div className="position-alert error">{modalError}</div>}
              {modalSuccess && <div className="position-alert success">{modalSuccess}</div>}

              <div className="position-modal-actions position-gap-top">
                <button type="button" className="position-btn secondary" onClick={closeEditModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="position-btn primary" disabled={saving}>
                  <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : 'bi-check2'}`} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailsOpen && (
        <div className="position-modal-backdrop" role="presentation" onClick={closeDetailsModal}>
          <div
            className="position-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Position details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="position-detail-header">
              <div>
                <span className="position-hero-badge detail-badge">
                  <i className="bi bi-diagram-3" />
                  Position Details
                </span>
                <h2>{details?.positionTitle || 'Position details'}</h2>
                <p>
                  {details?.description || 'Department usage, employees, user accounts, and team impact for this position.'}
                </p>
              </div>
              <button type="button" className="position-detail-close" onClick={closeDetailsModal}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="position-state detail-state">
                <i className="bi bi-hourglass-split" />
                Loading detailed position data...
              </div>
            ) : detailsError ? (
              <div className="position-state detail-state">
                <i className="bi bi-exclamation-triangle" />
                <div className="position-alert error">{detailsError}</div>
              </div>
            ) : details ? (
              <>
                <div className="position-detail-summary">
                  <div className="position-metric-card">
                    <span>Total employees</span>
                    <strong>{details.totalEmployeeCount}</strong>
                    <small>{details.activeEmployeeCount} active / {details.inactiveEmployeeCount} inactive</small>
                  </div>
                  <div className="position-metric-card">
                    <span>Login accounts</span>
                    <strong>{details.loginAccountCount}</strong>
                    <small>{details.userOnlyAccountCount} account-only record(s)</small>
                  </div>
                  <div className="position-metric-card">
                    <span>Departments using it</span>
                    <strong>{details.departmentCount}</strong>
                    <small>Based on working department logic</small>
                  </div>
                  <div className="position-metric-card">
                    <span>Active teams impacted</span>
                    <strong>{details.teamCount}</strong>
                    <small>Member, leader, and project manager teams</small>
                  </div>
                </div>

                <div className="position-detail-meta">
                  <div>
                    <span>Level</span>
                    <strong>{details.levelCode || '-'}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{details.status ? 'Active' : 'Inactive'}</strong>
                  </div>
                  <div>
                    <span>Dashboard role</span>
                    <strong>{details.roleName || 'No role linked'}</strong>
                  </div>
                  <div>
                    <span>Created by</span>
                    <strong>{details.createdBy || '-'}</strong>
                  </div>
                  <div>
                    <span>Created at</span>
                    <strong>{dateTime(details.createdAt)}</strong>
                  </div>
                </div>

                <div className="position-detail-section-title">
                  <div>
                    <h3>Department usage</h3>
                    <p>Click a department to show only employees/users under that department.</p>
                  </div>
                  <button
                    type="button"
                    className={`position-department-chip ${selectedDepartmentKey === allDepartmentsKey ? 'selected' : ''}`}
                    onClick={() => setSelectedDepartmentKey(allDepartmentsKey)}
                  >
                    All departments
                  </button>
                </div>

                <div className="position-department-grid">
                  {details.departments.length === 0 ? (
                    <div className="position-empty-card">No department usage found for this position.</div>
                  ) : (
                    details.departments.map((department) => {
                      const key = departmentKey(department.departmentId);
                      const percent = details.totalEmployeeCount > 0
                        ? Math.round((department.employeeCount / details.totalEmployeeCount) * 100)
                        : 0;

                      return (
                        <button
                          type="button"
                          key={key}
                          className={`position-department-card ${selectedDepartmentKey === key ? 'selected' : ''}`}
                          onClick={() => setSelectedDepartmentKey(key)}
                        >
                          <div className="position-department-card-top">
                            <span>{department.departmentCode || 'Dept'}</span>
                            <strong>{department.employeeCount}</strong>
                          </div>
                          <h4>{department.departmentName}</h4>
                          <p>{department.activeEmployeeCount} active employee(s), {department.loginAccountCount} login account(s)</p>
                          <div className="position-progress">
                            <span style={{ width: `${percent}%` }} />
                          </div>
                          <small>{department.employeeNames.slice(0, 3).join(', ') || 'No employee names'}</small>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="position-detail-section-title">
                  <div>
                    <h3>Employees in this position</h3>
                    <p>{filteredDetailEmployees.length} record(s) currently shown.</p>
                  </div>
                </div>

                <div className="position-detail-table-wrap">
                  <table className="position-detail-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department usage</th>
                        <th>Account</th>
                        <th>Teams</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDetailEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="position-detail-empty-row">No employee records found.</td>
                        </tr>
                      ) : (
                        filteredDetailEmployees.map((employee) => (
                          <tr key={employee.employeeId}>
                            <td>
                              <div className="position-person-cell">
                                <strong>{employee.fullName}</strong>
                                <span>{employee.email || 'No email'}{employee.employeeCode ? ` · ${employee.employeeCode}` : ''}</span>
                              </div>
                            </td>
                            <td>
                              <div className="position-dept-cell">
                                <strong>{employee.usageDepartmentName || 'No department assigned'}</strong>
                                <span>{employee.departmentUsageLabel || 'Department usage'}</span>
                                {employee.currentDepartment && employee.workingDepartment && employee.currentDepartment !== employee.workingDepartment && (
                                  <small>{employee.currentDepartment} → {employee.workingDepartment}</small>
                                )}
                              </div>
                            </td>
                            <td>
                              {employee.loginAccountCreated ? (
                                <span className="position-soft-pill success">{statusText(employee.accountStatus)}</span>
                              ) : (
                                <span className="position-soft-pill muted">No login</span>
                              )}
                              <div className="position-mini-text">Joined: {dateOnly(employee.joinDate)}</div>
                            </td>
                            <td>
                              {employee.teamRoles.length > 0 ? (
                                <div className="position-team-list">
                                  {employee.teamRoles.map((teamRole) => <span key={teamRole}>{teamRole}</span>)}
                                </div>
                              ) : (
                                <span className="position-mini-text">No active team</span>
                              )}
                            </td>
                            <td>
                              <span className={`position-pill ${employee.active ? 'active' : 'inactive'}`}>
                                {employee.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {details.userOnlyAccounts.length > 0 && (
                  <div className="position-account-only-box">
                    <h3>User accounts with this position but no matching employee position record</h3>
                    <p>These are included because the users table also stores position assignment.</p>
                    <div className="position-account-grid">
                      {details.userOnlyAccounts.map((account) => (
                        <div key={account.userId} className="position-account-card">
                          <strong>{account.fullName}</strong>
                          <span>{account.email || 'No email'}{account.employeeCode ? ` · ${account.employeeCode}` : ''}</span>
                          <small>{account.departmentName || 'No department'} · {account.active ? 'Active' : 'Inactive'}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionTable;

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import api from '../../services/api';
import '../position/position-ui.css';

type Role = {
  id: number;
  name: string;
  description?: string | null;
  active?: boolean;
  createdAt?: string;
  createdBy?: number | null;
  updatedAt?: string;
};

type FormState = {
  name: string;
  description: string;
  active: boolean;
  reason: string;
};

const initialForm: FormState = {
  name: '',
  description: '',
  active: true,
  reason: '',
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

const RoleManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Role | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await api.get<Role[]>('/roles');
      setRoles(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setRoles([]);
      setMessage(getErrorMessage(error, 'Failed to load roles.'));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) =>
      [role.name, role.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [roles, query]);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
  };

  const handleEdit = (role: Role) => {
    setEditing(role);
    setForm({
      name: role.name || '',
      description: role.description || '',
      active: role.active !== false,
      reason: '',
    });
    setMessage('');
    setIsError(false);
  };

  const validate = () => {
    if (!form.name.trim()) return 'Role name is required.';
    if (editing && !form.reason.trim()) return 'Reason is required for edit or deactivate.';
    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setIsError(false);

    const validationMessage = validate();
    if (validationMessage) {
      setMessage(validationMessage);
      setIsError(true);
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await api.put(`/roles/${editing.id}`, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          active: form.active,
          reason: form.reason.trim(),
        });
        setMessage('Role updated successfully.');
      } else {
        await api.post('/roles', {
          name: form.name.trim(),
          description: form.description.trim() || null,
          active: true,
        });
        setMessage('Role created successfully.');
      }
      setIsError(false);
      resetForm();
      await loadRoles();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to save role.'));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    if (!deactivateReason.trim()) {
      setMessage('Reason is required for edit or deactivate.');
      setIsError(true);
      return;
    }

    try {
      setSaving(true);
      await api.delete(`/roles/${deactivateTarget.id}`, { data: { reason: deactivateReason.trim() } });
      setMessage(`Role "${deactivateTarget.name}" deactivated successfully.`);
      setIsError(false);
      setDeactivateTarget(null);
      setDeactivateReason('');
      await loadRoles();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to deactivate role.'));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="position-page">
      <div className="position-hero">
        <span className="position-hero-badge">
          <i className="bi bi-shield-lock" />
          Access Control
        </span>
        <h1>Roles</h1>
        <p>Create, edit, and deactivate roles. Inactive roles are shown in red and are ignored during login authorization.</p>
      </div>

      {message && (
        <div className={`position-alert ${isError ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="position-surface">
        <div className="position-surface-inner">
          <form onSubmit={handleSubmit}>
            <div className="position-form-grid">
              <div className="position-field">
                <label>Role Name <span className="position-required">*</span></label>
                <input
                  className="position-input"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g. HRADMIN, HR, MANAGER"
                  required
                />
              </div>

              {editing && (
                <div className="position-field">
                  <label>Status</label>
                  <select
                    className="position-select"
                    value={form.active ? 'active' : 'inactive'}
                    onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === 'active' }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="position-field" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea
                  className="position-textarea"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Describe this role"
                />
              </div>

              {editing && (
                <div className="position-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Reason <span className="position-required">*</span></label>
                  <textarea
                    className="position-textarea"
                    value={form.reason}
                    onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value.slice(0, 150) }))}
                    placeholder="Why is this role being edited?"
                    required
                  />
                  <small>{form.reason.length}/150</small>
                </div>
              )}
            </div>

            <div className="position-form-actions" style={{ gap: 10 }}>
              {editing && <button type="button" className="position-btn secondary" onClick={resetForm} disabled={saving}>Cancel Edit</button>}
              <button type="submit" className="position-btn primary" disabled={saving}>
                <i className={`bi ${editing ? 'bi-check-circle' : 'bi-plus-circle'}`} />
                {saving ? 'Saving...' : editing ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="position-surface">
        <div className="position-surface-inner">
          <div className="position-table-toolbar" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2>Role List</h2>
              <p className="text-muted">Total: {roles.length}</p>
            </div>
            <input
              className="position-input"
              style={{ maxWidth: 320 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search roles..."
            />
          </div>

          {loading ? (
            <div className="position-state">Loading roles...</div>
          ) : filteredRoles.length === 0 ? (
            <div className="position-state">No roles found.</div>
          ) : (
            <div className="position-table-wrap">
              <table className="position-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role) => (
                    <tr key={role.id}>
                      <td>{role.id}</td>
                      <td><strong>{role.name}</strong></td>
                      <td>{role.description || '-'}</td>
                      <td>
                        <span className={`position-pill ${role.active === false ? 'inactive' : 'active'}`}>
                          {role.active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>{role.createdBy || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="position-btn ghost" type="button" onClick={() => handleEdit(role)}>
                            <i className="bi bi-pencil-square" /> Edit
                          </button>
                          {role.active !== false && (
                            <button className="position-btn ghost" type="button" style={{ color: '#dc2626' }} onClick={() => setDeactivateTarget(role)}>
                              <i className="bi bi-slash-circle" /> Deactivate
                            </button>
                          )}
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

      {deactivateTarget && (
        <div className="position-modal-backdrop">
          <div className="position-modal">
            <div className="position-modal-header">
              <h2>Deactivate Role</h2>
              <button className="position-btn ghost" type="button" onClick={() => setDeactivateTarget(null)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <p>Deactivate <strong>{deactivateTarget.name}</strong>?</p>
            <div className="position-field" style={{ marginTop: 12 }}>
              <label>Reason <span className="position-required">*</span></label>
              <textarea
                className="position-textarea"
                value={deactivateReason}
                onChange={(event) => setDeactivateReason(event.target.value.slice(0, 150))}
                placeholder="Why is this role being deactivated?"
                required
              />
              <small>{deactivateReason.length}/150</small>
            </div>
            <div className="position-modal-actions" style={{ marginTop: 16 }}>
              <button className="position-btn secondary" type="button" onClick={() => setDeactivateTarget(null)} disabled={saving}>Cancel</button>
              <button className="position-btn primary" type="button" onClick={confirmDeactivate} disabled={saving || !deactivateReason.trim()}>
                {saving ? 'Saving...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
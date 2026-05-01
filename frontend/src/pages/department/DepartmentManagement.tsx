import { useEffect, useMemo, useState } from 'react';
import DepartmentForm from './DepartmentForm';
import type { DepartmentFormValues } from './DepartmentForm';
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
} from '../../services/departmentService';
import type { Department } from '../../services/departmentService';
import './department-ui.css';

const emptyFormValues: DepartmentFormValues = {
  departmentName: '',
  departmentCode: '',
  headEmployee: '',
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message || response?.data?.error || fallback;
  }
  return fallback;
};

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setMessage('');
      setDepartments(await fetchDepartments());
    } catch (error) {
      setDepartments([]);
      setMessage(getErrorMessage(error, 'Unable to load departments.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((department) =>
      [department.departmentName, department.departmentCode, department.headEmployee, department.createdBy]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [departments, query]);

  const handleCreate = async (values: DepartmentFormValues) => {
    try {
      setSaving(true);
      setMessage('');
      await createDepartment({
        departmentName: values.departmentName,
        departmentCode: values.departmentCode || null,
        headEmployee: values.headEmployee || null,
      });
      await loadDepartments();
      setShowForm(false);
      setMessage('Department created successfully.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to create department. Please check your input and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: DepartmentFormValues) => {
    if (!editingDepartment) return;

    try {
      setSaving(true);
      setMessage('');
      await updateDepartment(editingDepartment.id, {
        departmentName: values.departmentName,
        departmentCode: values.departmentCode || null,
        headEmployee: values.headEmployee || null,
        status: editingDepartment.status ?? true,
      });
      await loadDepartments();
      setEditingDepartment(null);
      setShowForm(false);
      setMessage('Department updated successfully.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to update department.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department: Department) => {
    if (!window.confirm(`Deactivate ${department.departmentName}?`)) return;

    try {
      setMessage('');
      await deleteDepartment(department.id);
      await loadDepartments();
      setMessage('Department deactivated successfully.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to deactivate department.'));
    }
  };

  const openCreate = () => {
    setEditingDepartment(null);
    setShowForm(true);
    setMessage('');
  };

  const openEdit = (department: Department) => {
    setEditingDepartment(department);
    setShowForm(true);
    setMessage('');
  };

  const closeForm = () => {
    setEditingDepartment(null);
    setShowForm(false);
    setMessage('');
  };

  const initialValues: DepartmentFormValues = editingDepartment
    ? {
        departmentName: editingDepartment.departmentName || '',
        departmentCode: editingDepartment.departmentCode || '',
        headEmployee: editingDepartment.headEmployee || '',
      }
    : emptyFormValues;

  return (
    <div className="team-page">
      <div className="team-hero">
        <span className="team-hero-badge">
          <i className="bi bi-building" />
          Organization
        </span>
        <h1>Departments</h1>
        <p>Create, update, and deactivate departments for your organization.</p>
      </div>

      {message && (
        <div className={`team-alert ${message.toLowerCase().includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="team-surface">
        <div className="team-surface-inner">
          <div className="team-table-toolbar">
            <div>
              <h2>Department List</h2>
              <p className="text-muted">Total departments: {departments.length}</p>
            </div>

            <button className="team-btn primary" onClick={openCreate}>
              Create Department
            </button>
          </div>

          <div className="team-table-toolbar" style={{ paddingTop: 0 }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search departments..."
              className="team-search-input"
              style={{ maxWidth: 420 }}
            />
          </div>

          {showForm && (
            <DepartmentForm
              initialValues={initialValues}
              submitLabel={editingDepartment ? 'Update Department' : 'Create Department'}
              loading={saving}
              onSubmit={editingDepartment ? handleUpdate : handleCreate}
              onCancel={closeForm}
            />
          )}

          {loading ? (
            <div className="team-state">Loading departments...</div>
          ) : filteredDepartments.length === 0 ? (
            <div className="team-state">
              No departments found. Click Create Department to add one.
            </div>
          ) : (
            <div className="team-table-wrap">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Department Name</th>
                    <th>Code</th>
                    <th>Head Employee</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDepartments.map((department) => (
                    <tr key={department.id}>
                      <td>{department.id}</td>
                      <td>{department.departmentName || '-'}</td>
                      <td>{department.departmentCode || '-'}</td>
                      <td>{department.headEmployee || '-'}</td>
                      <td>{department.status === false ? 'Inactive' : 'Active'}</td>
                      <td>{department.createdBy || '-'}</td>
                      <td>
                        <button className="team-btn ghost" onClick={() => openEdit(department)}>
                          Edit
                        </button>

                        <button
                          className="team-btn ghost danger"
                          onClick={() => handleDelete(department)}
                          style={{ marginLeft: 8 }}
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentManagement;

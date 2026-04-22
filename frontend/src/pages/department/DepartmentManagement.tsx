import { useEffect, useMemo, useState } from 'react';
import DepartmentForm from './DepartmentForm';
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
  type Department,
} from '../../services/departmentService';
import './department-ui.css';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);

  const editingDepartment = useMemo(
    () => departments.find((department) => department.id === editingDepartmentId) ?? null,
    [departments, editingDepartmentId],
  );

  const loadDepartments = async () => {
    setLoading(true);
    setPageError('');
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setPageError('Unable to load departments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (!showCreateModal) {
      return undefined;
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCreateModal(false);
      }
    };

    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [showCreateModal]);

  const handleCreate = async (values: { departmentName: string }) => {
    setSaving(true);
    setPageError('');
    try {
      await createDepartment(values);
      setShowCreateModal(false);
      await loadDepartments();
    } catch (error) {
      console.error('Failed to create department:', error);
      setPageError('Unable to create department. Please check your input and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: { departmentName: string }) => {
    if (!editingDepartment) {
      return;
    }

    setSaving(true);
    setPageError('');
    try {
      await updateDepartment(editingDepartment.id, values);
      setEditingDepartmentId(null);
      await loadDepartments();
    } catch (error) {
      console.error('Failed to update department:', error);
      setPageError('Unable to update department. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department: Department) => {
    const confirmed = window.confirm(`Delete department "${department.departmentName}"?`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setPageError('');
    try {
      await deleteDepartment(department.id);
      await loadDepartments();
    } catch (error) {
      console.error('Failed to delete department:', error);
      setPageError('Unable to delete department. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="department-page">
      <header className="department-hero">
        <small>
          <i className="bi bi-building" />
          Employee Management
        </small>
        <h1>Department</h1>
        <p>Create, update, and remove departments for your organization.</p>
      </header>

      <div className="department-surface">
        <div className="department-surface-inner">
          <div className="department-toolbar">
            <h2>Department List</h2>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="department-btn primary"
          >
            <i className="bi bi-plus-lg" />
            Create Department
          </button>
          </div>

          {pageError && <div className="department-alert">{pageError}</div>}

          {loading ? (
            <div className="department-state">
              <i className="bi bi-arrow-repeat animate-spin" />
              Loading departments...
            </div>
          ) : departments.length === 0 ? (
            <div className="department-state">
              <i className="bi bi-inbox" />
              No departments yet. Click Create Department to add one.
            </div>
          ) : (
            <div className="department-table-wrap">
              <table className="department-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Department Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((department) => (
                    <tr key={department.id}>
                      <td>{department.id}</td>
                      <td>
                        <strong>{department.departmentName}</strong>
                      </td>
                      <td>
                        <div className="department-actions">
                          <button
                            type="button"
                            onClick={() => setEditingDepartmentId(department.id)}
                            className="department-btn ghost"
                          >
                            <i className="bi bi-pencil-square" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(department)}
                            className="department-btn danger"
                            disabled={saving}
                          >
                            <i className="bi bi-trash" />
                            Delete
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

      {editingDepartment && (
        <div className="department-edit-card">
          <h3>Edit Department</h3>
          <DepartmentForm
            initialValues={{ departmentName: editingDepartment.departmentName }}
            submitLabel="Save Changes"
            loading={saving}
            onSubmit={handleUpdate}
            onCancel={() => setEditingDepartmentId(null)}
          />
        </div>
      )}

      {showCreateModal && (
        <div
          className="department-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-department-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="department-modal">
            <div className="department-modal-header">
              <h3 id="create-department-title">Create Department</h3>
              <button
                type="button"
                aria-label="Close create department modal"
                onClick={() => setShowCreateModal(false)}
                className="department-btn ghost"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="department-modal-body">
              <DepartmentForm
                submitLabel="Create"
                loading={saving}
                onSubmit={handleCreate}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DepartmentManagement;

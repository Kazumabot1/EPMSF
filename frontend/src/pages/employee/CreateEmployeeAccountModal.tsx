import { useEffect, useState } from 'react';
import api from '../../services/api';
import { fetchDepartments, type Department } from '../../services/departmentService';
import { positionService } from '../../services/positionService';
import type { PositionResponse } from '../../types/position';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const emptyForm = {
  employeeCode: '',
  fullName: '',
  email: '',
  departmentName: '',
  positionName: '',
  roleName: 'EMPLOYEE',
  sendTemporaryPasswordEmail: true,
};

const CreateEmployeeAccountModal = ({ open, onClose, onCreated }: Props) => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [orgPickersLoading, setOrgPickersLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setMessage('');
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setOrgPickersLoading(true);

    Promise.all([positionService.getPositions(), fetchDepartments()])
      .then(([posList, deptList]) => {
        if (!cancelled) {
          setPositions(posList.filter((p) => p.status !== false));
          setDepartments(deptList);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPositions([]);
          setDepartments([]);
          setMessage('Could not load departments or positions.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrgPickersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage('');

      await api.post('/users', {
        ...form,
        email: form.email.trim().toLowerCase(),
      });

      setMessage('Employee login account created successfully.');
      setForm(emptyForm);
      onCreated?.();
    } catch (err: any) {
      setMessage(
        err?.response?.data?.message ||
          'Failed to create employee login account.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="epms-emp-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="epms-emp-modal epms-emp-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="epms-emp-modal__accent" />

        <div className="epms-emp-modal__head">
          <div>
            <h2 id="create-account-title" className="epms-emp-modal__title">
              Create employee login account
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a login account from the employee list.
            </p>
          </div>

          <button
            type="button"
            className="epms-emp-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>

        <form className="epms-emp-form" onSubmit={handleSubmit}>
          <div className="epms-emp-form-body">
            {message && (
              <div className="my-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {message}
              </div>
            )}

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-person-vcard" aria-hidden />
                Account information
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Employee code</span>
                  <input
                    name="employeeCode"
                    className="epms-emp-input-field"
                    value={form.employeeCode}
                    onChange={handleChange}
                  />
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Full name</span>
                  <input
                    name="fullName"
                    className="epms-emp-input-field"
                    value={form.fullName}
                    onChange={handleChange}
                  />
                </label>

                <label className="epms-emp-field block sm:col-span-2">
                  <span className="epms-emp-field__label">
                    Email <span className="text-red-600">*</span>
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    className="epms-emp-input-field"
                    value={form.email}
                    onChange={handleChange}
                  />
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Role</span>
                  <select
                    name="roleName"
                    className="epms-emp-input-field"
                    value={form.roleName}
                    onChange={handleChange}
                  >
                   <option value="EMPLOYEE">Employee</option>
                   <option value="HR">HR</option>
                   <option value="MANAGER">Manager</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  </select>
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Department</span>
                  <select
                    name="departmentName"
                    className="epms-emp-input-field"
                    value={form.departmentName}
                    onChange={handleChange}
                    disabled={orgPickersLoading}
                  >
                    <option value="">
                      {orgPickersLoading ? 'Loading…' : '— Select department —'}
                    </option>

                    {departments.map((d) => (
                      <option key={d.id} value={d.departmentName}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Position</span>
                  <select
                    name="positionName"
                    className="epms-emp-input-field"
                    value={form.positionName}
                    onChange={handleChange}
                    disabled={orgPickersLoading}
                  >
                    <option value="">
                      {orgPickersLoading ? 'Loading…' : '— Select position —'}
                    </option>

                    {positions.map((p) => (
                      <option key={p.id} value={p.positionTitle}>
                        {p.positionTitle}
                        {p.levelCode ? ` (${p.levelCode})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-2 text-sm text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    name="sendTemporaryPasswordEmail"
                    className="mr-2"
                    checked={form.sendTemporaryPasswordEmail}
                    onChange={handleChange}
                  />
                  Send temporary password onboarding email
                </label>
              </div>
            </div>
          </div>

          <div className="epms-emp-form-footer">
            <button
              type="button"
              className="epms-emp-btn epms-emp-btn--ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="epms-emp-btn epms-emp-btn--primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="bi bi-hourglass-split" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg" aria-hidden />
                  Create account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployeeAccountModal;
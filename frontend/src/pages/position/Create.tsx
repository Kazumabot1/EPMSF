import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { positionService } from '../../services/positionService';
import api from '../../services/api';
import type { PositionLevelResponse } from '../../types/position';
import './position-ui.css';

type DashboardRoleOption = {
  id: number;
  name: string;
  label: string;
  dashboard: string;
};

type PositionFormState = {
  positionTitle: string;
  levelId: string;
  roleId: string;
  description: string;
  status: boolean;
  createdBy: string;
};

const initialForm: PositionFormState = {
  positionTitle: '',
  levelId: '',
  roleId: '',
  description: '',
  status: true,
  createdBy: '',
};

const unwrap = <T,>(payload: any, fallback: T): T => {
  if (payload?.data?.data !== undefined) return payload.data.data as T;
  if (payload?.data !== undefined) return payload.data as T;
  return fallback;
};

const PositionCreate = () => {
  const [form, setForm] = useState<PositionFormState>({
    ...initialForm,
    createdBy: localStorage.getItem('epmsUserEmail') ?? '',
  });

  const [levels, setLevels] = useState<PositionLevelResponse[]>([]);
  const [roles, setRoles] = useState<DashboardRoleOption[]>([]);

  const [levelsLoading, setLevelsLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [levelsError, setLevelsError] = useState('');
  const [rolesError, setRolesError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadLevels = async () => {
      try {
        setLevelsLoading(true);
        setLevelsError('');

        const response = await positionService.getPositionLevels();
        setLevels(Array.isArray(response) ? response : []);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load position levels.';
        setLevelsError(message);
        setLevels([]);
      } finally {
        setLevelsLoading(false);
      }
    };

    const loadDashboardRoles = async () => {
      try {
        setRolesLoading(true);
        setRolesError('');

        const response = await api.get('/positions/dashboard-roles');
        const data = unwrap<DashboardRoleOption[]>(response, []);

        setRoles(Array.isArray(data) ? data : []);
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Failed to load dashboard roles.';

        setRolesError(message);
        setRoles([]);
      } finally {
        setRolesLoading(false);
      }
    };

    void loadLevels();
    void loadDashboardRoles();
  }, []);

  const isLevelSelectable = useMemo(
    () => !levelsLoading && levels.length > 0,
    [levels, levelsLoading],
  );

  const isRoleSelectable = useMemo(
    () => !rolesLoading && roles.length > 0,
    [roles, rolesLoading],
  );

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === form.roleId) ?? null,
    [roles, form.roleId],
  );

  const validate = (): string => {
    if (form.positionTitle.trim().length === 0) {
      return 'Position title is required.';
    }

    if (form.levelId.trim().length === 0) {
      return 'Position level is required.';
    }

    if (Number.isNaN(Number(form.levelId))) {
      return 'Position level selection is invalid.';
    }

    if (form.roleId.trim().length === 0) {
      return 'Dashboard role is required. Every position must connect to a dashboard role.';
    }

    if (Number.isNaN(Number(form.roleId))) {
      return 'Dashboard role selection is invalid.';
    }

    if (!roles.some((role) => role.id === Number(form.roleId))) {
      return 'Selected dashboard role is no longer available. Please choose again.';
    }

    if (form.createdBy.trim().length === 0) {
      return 'Created by is required.';
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validate();

    setFormError(validationMessage);
    setSubmitError('');
    setSuccessMessage('');

    if (validationMessage) {
      return;
    }

    try {
      setIsSubmitting(true);

      const createdPosition = await positionService.createPosition({
        positionTitle: form.positionTitle.trim(),
        levelId: Number(form.levelId),
        roleId: Number(form.roleId),
        description: form.description.trim(),
        status: form.status,
        createdBy: form.createdBy.trim(),
      });

      setSuccessMessage(`Position "${createdPosition.positionTitle}" created successfully.`);

      setForm((prev) => ({
        ...initialForm,
        createdBy: prev.createdBy,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create position.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="position-page">
      <div className="position-hero">
        <span className="position-hero-badge">
          <i className="bi bi-stars" />
          HR Configuration
        </span>

        <h1>Position Create</h1>

        <p>
          Create a new role profile with level mapping, dashboard role, ownership,
          and activation status.
        </p>
      </div>

      <div className="position-surface">
        <div className="position-surface-inner">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="position-form-grid">
              <div className="position-field">
                <label htmlFor="positionTitle">
                  Position Title <span className="position-required">*</span>
                </label>

                <input
                  id="positionTitle"
                  type="text"
                  value={form.positionTitle}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      positionTitle: event.target.value,
                    }))
                  }
                  className="position-input"
                  placeholder="Example: HR Specialist"
                  maxLength={100}
                />
              </div>

              <div className="position-field">
                <label htmlFor="levelId">
                  Position Level <span className="position-required">*</span>
                </label>

                <select
                  id="levelId"
                  value={form.levelId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      levelId: event.target.value,
                    }))
                  }
                  className="position-select"
                  disabled={!isLevelSelectable}
                >
                  <option value="">
                    {levelsLoading
                      ? 'Loading levels...'
                      : levels.length === 0
                        ? 'No levels available'
                        : 'Select level'}
                  </option>

                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.levelCode}
                    </option>
                  ))}
                </select>

                {levelsError && <div className="position-alert error">{levelsError}</div>}
              </div>

              <div className="position-field">
                <label htmlFor="roleId">
                  Dashboard Role <span className="position-required">*</span>
                </label>

                <select
                  id="roleId"
                  value={form.roleId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      roleId: event.target.value,
                    }))
                  }
                  className="position-select"
                  disabled={!isRoleSelectable}
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

                {selectedRole && (
                  <small style={{ display: 'block', marginTop: 6, color: '#64748b' }}>
                    Dashboard: {selectedRole.dashboard}
                  </small>
                )}

                {rolesError && <div className="position-alert error">{rolesError}</div>}
              </div>
            </div>

            <div className="position-field">
              <label htmlFor="description">Description</label>

              <textarea
                id="description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="position-textarea"
                placeholder="Optional position description"
                rows={4}
                maxLength={500}
              />
            </div>

            <div className="position-form-grid">
              <div className="position-field">
                <label htmlFor="createdBy">
                  Created By <span className="position-required">*</span>
                </label>

                <input
                  id="createdBy"
                  type="text"
                  value={form.createdBy}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      createdBy: event.target.value,
                    }))
                  }
                  className="position-input"
                  placeholder="Creator email or username"
                  maxLength={100}
                />
              </div>

              <div className="position-checkbox-row">
                <label className="position-checkbox">
                  <input
                    type="checkbox"
                    checked={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.checked,
                      }))
                    }
                  />
                  Active status
                </label>
              </div>
            </div>

            {formError && <div className="position-alert error">{formError}</div>}
            {submitError && <div className="position-alert error">{submitError}</div>}
            {successMessage && <div className="position-alert success">{successMessage}</div>}

            <div className="position-form-actions">
              <button
                type="submit"
                disabled={isSubmitting}
                className="position-btn primary"
              >
                <i
                  className={`bi ${
                    isSubmitting ? 'bi-arrow-repeat animate-spin' : 'bi-check2-circle'
                  }`}
                />
                {isSubmitting ? 'Submitting...' : 'Create Position'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PositionCreate;
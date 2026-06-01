import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { positionService } from '../../services/positionService';
import api from '../../services/api';
import type { PositionLevelResponse, PositionResponse } from '../../types/position';
import { formatPositionDateTime } from './positionDateFormat';
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  PAGE_SIZE_OPTIONS,
  POSITION_FONT,
  positionHeroGradient,
  modalOverlayClass,
} from './positionPageUi';

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
};

const initialForm: PositionFormState = {
  positionTitle: '',
  levelId: '',
  roleId: '',
  description: '',
  status: true,
};

const unwrap = <T,>(payload: { data?: { data?: T } | T }, fallback: T): T => {
  if (payload?.data && typeof payload.data === 'object' && payload.data !== null && 'data' in payload.data) {
    return (payload.data as { data: T }).data;
  }
  if (payload?.data !== undefined) return payload.data as T;
  return fallback;
};

const PositionCreate = () => {
  const [form, setForm] = useState<PositionFormState>(initialForm);
  const [levels, setLevels] = useState<PositionLevelResponse[]>([]);
  const [roles, setRoles] = useState<DashboardRoleOption[]>([]);
  const [positions, setPositions] = useState<PositionResponse[]>([]);

  const [levelsLoading, setLevelsLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);

  const [levelsError, setLevelsError] = useState('');
  const [rolesError, setRolesError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPositionList, setShowPositionList] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [listQuery, setListQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const listRef = useRef<HTMLElement | null>(null);

  const loadPositions = async () => {
    try {
      setPositionsLoading(true);
      const response = await positionService.getPositions();
      setPositions(response);
    } catch {
      toast.error('Failed to load position list.');
    } finally {
      setPositionsLoading(false);
    }
  };

  useEffect(() => {
    const loadLevels = async () => {
      try {
        setLevelsLoading(true);
        setLevelsError('');
        const response = await positionService.getPositionLevels();
        setLevels(Array.isArray(response) ? response.filter((l) => l.active !== false) : []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load position levels.';
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
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to load dashboard roles.';
        setRolesError(message);
        setRoles([]);
      } finally {
        setRolesLoading(false);
      }
    };

    void loadLevels();
    void loadDashboardRoles();
    void loadPositions();
  }, []);

  const isLevelSelectable = !levelsLoading && levels.length > 0;
  const isRoleSelectable = !rolesLoading && roles.length > 0;

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === form.roleId) ?? null,
    [roles, form.roleId],
  );

  const validate = (): string => {
    if (form.positionTitle.trim().length === 0) return 'Position title is required.';
    if (form.levelId.trim().length === 0) return 'Position level is required.';
    if (Number.isNaN(Number(form.levelId))) return 'Position level selection is invalid.';
    if (form.roleId.trim().length === 0) {
      return 'Dashboard role is required. Every position must connect to a dashboard role.';
    }
    if (Number.isNaN(Number(form.roleId))) return 'Dashboard role selection is invalid.';
    if (!roles.some((role) => role.id === Number(form.roleId))) {
      return 'Selected dashboard role is no longer available. Please choose again.';
    }
    return '';
  };

  const filteredPositions = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((position) =>
      [position.positionTitle, position.levelCode, position.roleName, position.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [positions, listQuery]);

  useEffect(() => {
    setPage(1);
  }, [listQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredPositions.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedPositions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPositions.slice(start, start + pageSize);
  }, [filteredPositions, currentPage, pageSize]);

  const rangeStart = filteredPositions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredPositions.length);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validate();
    setFormError(validationMessage);
    setSubmitError('');
    if (validationMessage) return;

    const createdBy = localStorage.getItem('epmsUserEmail')?.trim() ?? '';

    try {
      setIsSubmitting(true);
      const createdPosition = await positionService.createPosition({
        positionTitle: form.positionTitle.trim(),
        levelId: Number(form.levelId),
        roleId: Number(form.roleId),
        description: form.description.trim(),
        status: form.status,
        createdBy: createdBy || undefined,
      });

      setSuccessMessage(`Position "${createdPosition.positionTitle}" was created successfully.`);
      setSuccessOpen(true);
      setForm(initialForm);
      setShowPositionList(true);
      await loadPositions();

      requestAnimationFrame(() => {
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create position.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccess = () => {
    setSuccessOpen(false);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: POSITION_FONT }}
    >
      <div className="mx-auto max-w-6xl px-4 py-5 pb-16">
        <header
          className={`rounded-xl border border-blue-200/70 px-4 py-3 shadow-sm ${positionHeroGradient}`}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 shadow-sm backdrop-blur-sm">
            <i className="bi bi-stars text-xs" aria-hidden />
            HR Configuration
          </span>
          <h1 className="mt-1.5 text-xl font-bold leading-tight text-blue-950">Position Create</h1>
          <p className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-700">
            Create a role profile with level mapping, dashboard role, and activation status.
          </p>
        </header>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Position title <span className="text-red-600">*</span>
                <input
                  id="positionTitle"
                  type="text"
                  value={form.positionTitle}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, positionTitle: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Example: HR Specialist"
                  maxLength={100}
                />
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Position level <span className="text-red-600">*</span>
                <select
                  id="levelId"
                  value={form.levelId}
                  onChange={(event) => setForm((prev) => ({ ...prev, levelId: event.target.value }))}
                  className={inputClass}
                  disabled={!isLevelSelectable}
                >
                  <option value="">
                    {levelsLoading
                      ? 'Loading levels…'
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
                {levelsError && <span className="text-xs font-semibold text-red-700">{levelsError}</span>}
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-1">
                Dashboard role <span className="text-red-600">*</span>
                <select
                  id="roleId"
                  value={form.roleId}
                  onChange={(event) => setForm((prev) => ({ ...prev, roleId: event.target.value }))}
                  className={inputClass}
                  disabled={!isRoleSelectable}
                >
                  <option value="">
                    {rolesLoading
                      ? 'Loading roles…'
                      : roles.length === 0
                        ? 'No roles available'
                        : 'Select dashboard role'}
                  </option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {selectedRole && (
                  <span className="text-xs text-slate-500">Dashboard: {selectedRole.dashboard}</span>
                )}
                {rolesError && <span className="text-xs font-semibold text-red-700">{rolesError}</span>}
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Description
              <textarea
                id="description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className={`${inputClass} min-h-[88px] resize-y`}
                placeholder="Optional position description"
                rows={3}
                maxLength={500}
              />
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Active status
            </label>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                {formError}
              </div>
            )}
            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                {submitError}
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button type="submit" disabled={isSubmitting} className={btnPrimary}>
                <i
                  className={`bi ${isSubmitting ? 'bi-arrow-repeat animate-spin' : 'bi-check2-circle'}`}
                  aria-hidden
                />
                {isSubmitting ? 'Submitting…' : 'Create Position'}
              </button>
            </div>
          </form>
        </section>

        {(showPositionList || positions.length > 0) && (
          <section
            ref={listRef}
            className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-blue-950">Position list</h2>
              <p className="text-xs text-slate-500">{filteredPositions.length} position(s)</p>
            </div>

            <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Search
                <div className="relative">
                  <i
                    className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={listQuery}
                    onChange={(event) => setListQuery(event.target.value)}
                    placeholder="Title, level, role…"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Rows per page
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className={inputClass}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void loadPositions()}
                  disabled={positionsLoading}
                  className={`${btnSecondary} w-full`}
                >
                  <i className="bi bi-arrow-clockwise text-slate-400" aria-hidden />
                  Refresh
                </button>
              </div>
            </div>

            {positionsLoading ? (
              <div className="p-6 text-sm text-slate-500 animate-pulse">Loading positions…</div>
            ) : filteredPositions.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No positions found.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="w-14 px-4 py-3 text-center">No.</th>
                        <th className="px-4 py-3">Position title</th>
                        <th className="px-4 py-3">Level</th>
                        <th className="px-4 py-3">Dashboard role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedPositions.map((position, index) => (
                        <tr
                          key={position.id}
                          className={index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}
                        >
                          <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                            {rangeStart + index}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-950">
                            {position.positionTitle}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{position.levelCode || '—'}</td>
                          <td className="px-4 py-3 text-slate-700">{position.roleName || '—'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                position.status
                                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/15'
                                  : 'bg-slate-100 text-slate-600 ring-slate-400/20'
                              }`}
                            >
                              {position.status ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatPositionDateTime(position.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    Showing <strong className="text-slate-900">{rangeStart}</strong>–
                    <strong className="text-slate-900">{rangeEnd}</strong> of{' '}
                    <strong className="text-slate-900">{filteredPositions.length}</strong>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-2 text-sm font-semibold text-slate-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {successOpen &&
        createPortal(
          <div
            role="presentation"
            className={modalOverlayClass}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeSuccess();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              style={{ fontFamily: POSITION_FONT }}
            >
              <div className="flex flex-col items-center text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-3xl text-emerald-600">
                  <i className="bi bi-check-circle-fill" aria-hidden />
                </span>
                <h2 className="mt-4 text-xl font-bold text-blue-950">Position created</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{successMessage}</p>
              </div>
              <div className="mt-6 flex justify-center gap-2">
                <button type="button" onClick={closeSuccess} className={btnPrimary}>
                  View position list
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default PositionCreate;

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { positionService } from '../../services/positionService';
import api from '../../services/api';
import type {
  PositionDetailResponse,
  PositionEmployeeUsage,
  PositionLevelResponse,
  PositionResponse,
} from '../../types/position';
import { formatDate, formatPositionDateTime } from './positionDateFormat';
import {
  btnIconBlue,
  btnIconNudeRed,
  btnIconSecondary,
  btnNudeRed,
  btnPrimary,
  btnSecondary,
  inputClass,
  modalOverlayClass,
  PAGE_SIZE_OPTIONS,
  POSITION_FONT,
  positionHeroGradient,
} from './positionPageUi';

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

const statusPill = (active: boolean) =>
  active
    ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15'
    : 'inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-400/20';

const departmentKey = (departmentId?: number | null) =>
  departmentId === null || departmentId === undefined ? noDepartmentKey : String(departmentId);

const statusText = (value?: string | null) => {
  if (!value || value.trim().length === 0) return 'Account created';
  return value;
};

const unwrap = <T,>(payload: { data?: { data?: T } | T }, fallback: T): T => {
  if (payload?.data && typeof payload.data === 'object' && payload.data !== null && 'data' in payload.data) {
    return (payload.data as { data: T }).data;
  }
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [originalPosition, setOriginalPosition] = useState<PositionResponse | null>(null);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<PositionResponse | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');

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
    } catch (roleError: unknown) {
      const err = roleError as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
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

  useEffect(() => {
    void loadPositions();
    void loadLevels();
    void loadDashboardRoles();
  }, []);

  const filteredPositions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((position) =>
      [position.positionTitle, position.levelCode, position.roleName, position.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [positions, query]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredPositions.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedPositions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPositions.slice(start, start + pageSize);
  }, [filteredPositions, currentPage, pageSize]);

  const rangeStart = filteredPositions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredPositions.length);

  const filteredDetailEmployees = useMemo(() => {
    if (!details) return [] as PositionEmployeeUsage[];
    if (selectedDepartmentKey === allDepartmentsKey) return details.employees;
    return details.employees.filter(
      (employee) => departmentKey(employee.usageDepartmentId) === selectedDepartmentKey,
    );
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
    setEditError('');
    setEditOpen(true);
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditOpen(false);
    setEditForm(null);
    setOriginalPosition(null);
    setEditError('');
  };

  const openDeactivateModal = (position: PositionResponse) => {
    setDeactivateTarget(position);
    setDeactivateReason('');
    setEditError('');
    setDeactivateOpen(true);
  };

  const closeDeactivateModal = () => {
    if (saving) return;
    setDeactivateOpen(false);
    setDeactivateTarget(null);
    setDeactivateReason('');
    setEditError('');
  };

  const openDetailsModal = async (position: PositionResponse) => {
    setDetailsOpen(true);
    setDetails(null);
    setDetailsError('');
    setDetailsLoading(true);
    setSelectedDepartmentKey(allDepartmentsKey);
    try {
      setDetails(await positionService.getPositionDetails(position.id));
    } catch (detailError) {
      const message =
        detailError instanceof Error ? detailError.message : 'Failed to load position details.';
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
      return 'Selected dashboard role is no longer available.';
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
      setEditError(validationError);
      return;
    }
    try {
      setSaving(true);
      setEditError('');
      await positionService.updatePosition(editForm.id, {
        positionTitle: editForm.positionTitle.trim(),
        levelId: Number(editForm.levelId),
        roleId: Number(editForm.roleId),
        description: editForm.description.trim(),
        status: editForm.status,
        reason: editForm.reason.trim(),
      });
      toast.success('Position updated successfully.');
      closeEditModal();
      await loadPositions();
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : 'Failed to update position.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    if (!deactivateReason.trim()) {
      setEditError('Reason is required to deactivate a position.');
      return;
    }
    if (deactivateReason.trim().length > 150) {
      setEditError('Reason must not exceed 150 characters.');
      return;
    }
    if (!deactivateTarget.roleId) {
      setEditError('This position has no dashboard role linked and cannot be deactivated here.');
      return;
    }
    try {
      setSaving(true);
      setEditError('');
      await positionService.updatePosition(deactivateTarget.id, {
        positionTitle: deactivateTarget.positionTitle,
        levelId: deactivateTarget.levelId,
        roleId: deactivateTarget.roleId,
        description: deactivateTarget.description ?? '',
        status: false,
        reason: deactivateReason.trim(),
      });
      toast.success(`Position "${deactivateTarget.positionTitle}" deactivated.`);
      closeDeactivateModal();
      await loadPositions();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to deactivate position.');
    } finally {
      setSaving(false);
    }
  };

  const modalShell = (
    children: ReactNode,
    onClose: () => void,
    maxWidth = 'max-w-lg',
  ) =>
    createPortal(
      <div
        role="presentation"
        className={modalOverlayClass}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`max-h-[min(90vh,720px)] w-full ${maxWidth} overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl`}
          style={{ fontFamily: POSITION_FONT }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>,
      document.body,
    );

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: POSITION_FONT }}
    >
      <div className="mx-auto max-w-7xl px-4 py-5 pb-16">
        <header
          className={`rounded-xl border border-blue-200/70 px-4 py-3 shadow-sm ${positionHeroGradient}`}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 shadow-sm backdrop-blur-sm">
            <i className="bi bi-table text-xs" aria-hidden />
            Live overview
          </span>
          <h1 className="mt-1.5 text-xl font-bold leading-tight text-blue-950">Position table</h1>
          <p className="mt-0.5 max-w-3xl text-xs leading-5 text-slate-700">
            Review position setup, department usage, employee assignments, and team impact.
          </p>
        </header>

        <section
          className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          aria-label="Position filters"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Search
              <div className="relative">
                <i
                  className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
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
                disabled={loading}
                className={`${btnSecondary} w-full`}
              >
                <i
                  className={`bi ${loading ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'} text-slate-400`}
                  aria-hidden
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm animate-pulse">
            Loading positions…
          </div>
        ) : error ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <i className="bi bi-exclamation-triangle text-xl text-red-700" aria-hidden />
            <div>
              <strong className="block text-slate-950">Could not load positions</strong>
              <p className="mt-1 text-sm text-red-800">{error}</p>
              <button type="button" onClick={() => void loadPositions()} className={`${btnPrimary} mt-3`}>
                Retry
              </button>
            </div>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <i
              className="bi bi-inbox mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700"
              aria-hidden
            />
            <h2 className="text-lg font-bold text-blue-950">No positions found</h2>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your search.</p>
          </div>
        ) : (
          <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-blue-950">All positions</h2>
              <p className="text-xs text-slate-500">
                {filteredPositions.length} position{filteredPositions.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-14 px-4 py-3 text-center">No.</th>
                    <th className="px-4 py-3">Position title</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Dashboard role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Created at</th>
                    <th className="px-4 py-3 text-right">Actions</th>
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
                      <td className="px-4 py-3 text-slate-700">
                        {position.roleName || 'No role linked'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusPill(position.status !== false)}>
                          {position.status !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-slate-600">
                        <span className="line-clamp-2" title={position.description || undefined}>
                          {position.description || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatPositionDateTime(position.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            title="View details"
                            aria-label="View details"
                            onClick={() => void openDetailsModal(position)}
                            className={btnIconBlue}
                          >
                            <i className="bi bi-eye" />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            aria-label="Edit"
                            onClick={() => openEditModal(position)}
                            className={btnIconSecondary}
                          >
                            <i className="bi bi-pencil-square" />
                          </button>
                          {position.status !== false && (
                            <button
                              type="button"
                              title="Deactivate"
                              aria-label="Deactivate"
                              onClick={() => openDeactivateModal(position)}
                              className={btnIconNudeRed}
                            >
                              <i className="bi bi-slash-circle" />
                            </button>
                          )}
                        </div>
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
          </section>
        )}
      </div>

      {editOpen &&
        editForm &&
        modalShell(
          <>
            <div className={`border-b border-blue-200/60 px-5 py-4 ${positionHeroGradient}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Edit position</p>
              <h2 className="text-lg font-bold text-blue-950">{editForm.positionTitle}</h2>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
                  Position title <span className="text-red-600">*</span>
                  <input
                    className={inputClass}
                    value={editForm.positionTitle}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, positionTitle: event.target.value } : prev,
                      )
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Position level <span className="text-red-600">*</span>
                  <select
                    className={inputClass}
                    value={editForm.levelId}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, levelId: event.target.value } : prev))
                    }
                  >
                    <option value="">Select level</option>
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.levelCode}
                        {level.active === false ? ' (Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Dashboard role <span className="text-red-600">*</span>
                  <select
                    className={inputClass}
                    value={editForm.roleId}
                    disabled={rolesLoading || roles.length === 0}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, roleId: event.target.value } : prev))
                    }
                  >
                    <option value="">
                      {rolesLoading ? 'Loading…' : roles.length === 0 ? 'None available' : 'Select role'}
                    </option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {rolesError && (
                    <span className="text-xs font-semibold text-red-700">{rolesError}</span>
                  )}
                </label>
              </div>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Description
                <textarea
                  className={`${inputClass} min-h-[80px] resize-y`}
                  rows={3}
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Status
                <select
                  className={inputClass}
                  value={editForm.status ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, status: event.target.value === 'active' } : prev,
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Reason <span className="text-red-600">*</span>
                <textarea
                  className={`${inputClass} min-h-[80px] resize-y`}
                  rows={3}
                  maxLength={150}
                  value={editForm.reason}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, reason: event.target.value.slice(0, 150) } : prev,
                    )
                  }
                  placeholder="Why is this position being edited?"
                />
                <span className="text-xs text-slate-500">{editForm.reason.length}/150</span>
              </label>
              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                  {editError}
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" className={btnSecondary} onClick={closeEditModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </>,
          closeEditModal,
          'max-w-2xl',
        )}

      {deactivateOpen &&
        deactivateTarget &&
        modalShell(
          <>
            <div className="border-b border-[#e8c4c4] bg-[#faf0f0] px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#a85858]">Deactivate</p>
              <h2 className="text-lg font-bold text-slate-950">{deactivateTarget.positionTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">
                The position will be marked inactive. Existing records are not deleted.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Reason <span className="text-red-600">*</span>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  value={deactivateReason}
                  onChange={(event) => setDeactivateReason(event.target.value.slice(0, 150))}
                  placeholder="Why is this position being deactivated?"
                  required
                />
                <span className="text-xs text-slate-500">{deactivateReason.length}/150</span>
              </label>
              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                  {editError}
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={closeDeactivateModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={btnNudeRed}
                  disabled={saving || !deactivateReason.trim()}
                  onClick={() => void confirmDeactivate()}
                >
                  {saving ? 'Deactivating…' : 'Deactivate'}
                </button>
              </div>
            </div>
          </>,
          closeDeactivateModal,
        )}

      {detailsOpen &&
        modalShell(
          <>
            <div className={`border-b border-blue-200/60 px-5 py-4 ${positionHeroGradient}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Position details</p>
              <h2 className="text-lg font-bold text-blue-950">
                {details?.positionTitle || 'Loading…'}
              </h2>
              <p className="mt-1 text-xs text-slate-700">
                {details?.description ||
                  'Department usage, employees, accounts, and team impact.'}
              </p>
            </div>

            <div className="p-5">
              {detailsLoading ? (
                <p className="text-sm text-slate-500 animate-pulse">Loading detailed position data…</p>
              ) : detailsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {detailsError}
                </div>
              ) : details ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ['Total employees', details.totalEmployeeCount, `${details.activeEmployeeCount} active`],
                      ['Login accounts', details.loginAccountCount, `${details.userOnlyAccountCount} account-only`],
                      ['Departments', details.departmentCount, 'Working dept. logic'],
                      ['Teams impacted', details.teamCount, 'Leaders & PMs'],
                    ].map(([label, value, sub]) => (
                      <div
                        key={String(label)}
                        className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          {label}
                        </span>
                        <strong className="mt-1 block text-xl font-bold text-blue-950">{value}</strong>
                        <small className="text-xs text-slate-500">{sub}</small>
                      </div>
                    ))}
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ['Level', details.levelCode || '—'],
                      ['Status', details.status ? 'Active' : 'Inactive'],
                      ['Dashboard role', details.roleName || '—'],
                      ['Created at', formatPositionDateTime(details.createdAt)],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          {label}
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-blue-950">Department usage</h3>
                      <p className="text-xs text-slate-500">Click a department to filter employees.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDepartmentKey(allDepartmentsKey)}
                      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                        selectedDepartmentKey === allDepartmentsKey
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      All departments
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {details.departments.length === 0 ? (
                      <p className="text-sm text-slate-500">No department usage found.</p>
                    ) : (
                      details.departments.map((department) => {
                        const key = departmentKey(department.departmentId);
                        const percent =
                          details.totalEmployeeCount > 0
                            ? Math.round(
                                (department.employeeCount / details.totalEmployeeCount) * 100,
                              )
                            : 0;
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => setSelectedDepartmentKey(key)}
                            className={`rounded-xl border p-3 text-left transition ${
                              selectedDepartmentKey === key
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-slate-200 bg-white hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{department.departmentCode || 'Dept'}</span>
                              <strong className="text-slate-900">{department.employeeCount}</strong>
                            </div>
                            <h4 className="mt-1 font-semibold text-slate-950">
                              {department.departmentName}
                            </h4>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <span
                                className="block h-full rounded-full bg-blue-600"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-blue-950">Employees in this position</h3>
                    <p className="text-xs text-slate-500">
                      {filteredDetailEmployees.length} record(s) shown.
                    </p>
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-600">
                          <tr>
                            <th className="px-3 py-2">Employee</th>
                            <th className="px-3 py-2">Department</th>
                            <th className="px-3 py-2">Account</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDetailEmployees.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                                No employee records found.
                              </td>
                            </tr>
                          ) : (
                            filteredDetailEmployees.map((employee) => (
                              <tr key={employee.employeeId}>
                                <td className="px-3 py-2">
                                  <strong className="block text-slate-950">{employee.fullName}</strong>
                                  <span className="text-xs text-slate-500">{employee.email || '—'}</span>
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {employee.usageDepartmentName || '—'}
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-600">
                                  {employee.loginAccountCreated
                                    ? statusText(employee.accountStatus)
                                    : 'No login'}
                                  <br />
                                  Joined: {formatDate(employee.joinDate)}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={statusPill(employee.active)}>
                                    {employee.active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {details.userOnlyAccounts.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                      <h3 className="text-sm font-bold text-slate-950">
                        User accounts without matching employee record
                      </h3>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {details.userOnlyAccounts.map((account) => (
                          <li key={account.userId}>
                            <strong>{account.fullName}</strong>
                            {account.email ? ` · ${account.email}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-5 flex justify-end border-t border-slate-100 pt-3">
                <button type="button" className={btnPrimary} onClick={closeDetailsModal}>
                  Close
                </button>
              </div>
            </div>
          </>,
          closeDetailsModal,
          'max-w-5xl',
        )}
    </div>
  );
};

export default PositionTable;

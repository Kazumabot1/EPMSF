import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { positionService } from '../../services/positionService';
import type { PositionLevelResponse, PositionResponse } from '../../types/position';
import { formatPositionDateTime } from '../position/positionDateFormat';
import {
  btnIconNudeRed,
  btnNudeRed,
  btnPrimary,
  btnSecondary,
  inputClass,
  modalOverlayClass,
  PAGE_SIZE_OPTIONS,
  POSITION_FONT,
  positionHeroGradient,
} from '../position/positionPageUi';

type FormState = {
  levelCode: string;
  active: boolean;
  reason: string;
};

const initialForm: FormState = {
  levelCode: '',
  active: true,
  reason: '',
};

const PositionLevelCreate = () => {
  const [levels, setLevels] = useState<PositionLevelResponse[]>([]);
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const [form, setForm] = useState<FormState>(initialForm);
  const [editing, setEditing] = useState<PositionLevelResponse | null>(null);
  const [detailLevel, setDetailLevel] = useState<PositionLevelResponse | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<PositionLevelResponse | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');

  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [levelRows, positionRows] = await Promise.all([
        positionService.getPositionLevels(),
        positionService.getPositions(),
      ]);
      setLevels(levelRows);
      setPositions(positionRows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load position levels.';
      toast.error(message);
      setLevels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const positionsByLevelId = useMemo(() => {
    const map = new Map<number, PositionResponse[]>();
    for (const position of positions) {
      const list = map.get(position.levelId) ?? [];
      list.push(position);
      map.set(position.levelId, list);
    }
    return map;
  }, [positions]);

  const filteredLevels = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...levels].sort((a, b) => a.levelCode.localeCompare(b.levelCode));
    if (!q) return sorted;
    return sorted.filter((level) => level.levelCode.toLowerCase().includes(q));
  }, [levels, query]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLevels.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedLevels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLevels.slice(start, start + pageSize);
  }, [filteredLevels, currentPage, pageSize]);

  const rangeStart = filteredLevels.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredLevels.length);

  const detailPositions = detailLevel ? positionsByLevelId.get(detailLevel.id) ?? [] : [];

  const validate = (forEdit: boolean): string => {
    if (form.levelCode.trim().length === 0) return 'Level code is required.';
    if (forEdit && form.reason.trim().length === 0) {
      return 'Reason is required when editing a position level.';
    }
    return '';
  };

  const resetModals = () => {
    setForm(initialForm);
    setEditing(null);
    setFormError('');
    setSubmitError('');
  };

  const openCreate = () => {
    resetModals();
    setCreateOpen(true);
  };

  const openEdit = (level: PositionLevelResponse) => {
    setEditing(level);
    setForm({
      levelCode: level.levelCode,
      active: level.active !== false,
      reason: '',
    });
    setFormError('');
    setSubmitError('');
    setEditOpen(true);
  };

  const openDetail = (level: PositionLevelResponse) => {
    setDetailLevel(level);
    setDetailOpen(true);
  };

  const openDeactivate = (level: PositionLevelResponse) => {
    setDeactivateTarget(level);
    setDeactivateReason('');
    setSubmitError('');
    setDeactivateOpen(true);
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validate(false);
    setFormError(validationMessage);
    setSubmitError('');
    if (validationMessage) return;

    try {
      setIsSubmitting(true);
      const created = await positionService.createPositionLevel({
        levelCode: form.levelCode.trim(),
        active: true,
      });
      toast.success(`Position level "${created.levelCode}" created.`);
      setCreateOpen(false);
      resetModals();
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create position level.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const validationMessage = validate(true);
    setFormError(validationMessage);
    setSubmitError('');
    if (validationMessage) return;

    try {
      setIsSubmitting(true);
      const updated = await positionService.updatePositionLevel(editing.id, {
        levelCode: form.levelCode.trim(),
        active: form.active,
        reason: form.reason.trim(),
      });
      toast.success(`Position level "${updated.levelCode}" updated.`);
      setEditOpen(false);
      resetModals();
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update position level.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    if (!deactivateReason.trim()) {
      setSubmitError('Reason is required to deactivate a position level.');
      return;
    }

    try {
      setIsSubmitting(true);
      await positionService.deactivatePositionLevel(deactivateTarget.id, deactivateReason.trim());
      toast.success(`Position level "${deactivateTarget.levelCode}" deactivated.`);
      setDeactivateOpen(false);
      setDeactivateTarget(null);
      setDeactivateReason('');
      if (detailLevel?.id === deactivateTarget.id) {
        setDetailOpen(false);
        setDetailLevel(null);
      }
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate position level.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalShell = (children: ReactNode, onClose: () => void) =>
    createPortal(
      <div
        role="presentation"
        className={modalOverlayClass}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
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
      <div className="mx-auto max-w-6xl px-4 py-5 pb-16">
        <header
          className={`rounded-xl border border-blue-200/70 px-4 py-3 shadow-sm ${positionHeroGradient}`}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 shadow-sm backdrop-blur-sm">
            <i className="bi bi-diagram-3 text-xs" aria-hidden />
            Hierarchy setup
          </span>
          <h1 className="mt-1.5 text-xl font-bold leading-tight text-blue-950">Position levels</h1>
          <p className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-700">
            Manage reusable level codes and view positions linked to each level.
          </p>
        </header>

        <section
          className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          aria-label="Position level filters"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
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
                    placeholder="Level code…"
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
            </div>
            <button type="button" onClick={openCreate} className={`${btnPrimary} shrink-0`}>
              <i className="bi bi-plus-lg" aria-hidden />
              Create position level
            </button>
          </div>
        </section>

        {loading ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm animate-pulse">
            Loading position levels…
          </div>
        ) : filteredLevels.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <i
              className="bi bi-diagram-3 mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700"
              aria-hidden
            />
            <h2 className="text-lg font-bold text-blue-950">No position levels found</h2>
            <p className="mt-1 text-sm text-slate-500">
              {levels.length === 0
                ? 'Create your first level code to standardize the hierarchy.'
                : 'Try a different search term.'}
            </p>
            {levels.length === 0 && (
              <button type="button" onClick={openCreate} className={`${btnPrimary} mt-6`}>
                Create position level
              </button>
            )}
          </div>
        ) : (
          <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-blue-950">Position level list</h2>
              <p className="text-xs text-slate-500">
                Click a row for details · {filteredLevels.length} level{filteredLevels.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-14 px-4 py-3 text-center">No.</th>
                    <th className="px-4 py-3">Level code</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Positions</th>
                    <th className="px-4 py-3">Created at</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLevels.map((level, index) => {
                    const linkedCount = positionsByLevelId.get(level.id)?.length ?? 0;
                    return (
                      <tr
                        key={level.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => openDetail(level)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetail(level);
                          }
                        }}
                        className={`cursor-pointer transition hover:bg-blue-50/60 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                          index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                        }`}
                      >
                        <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                          {rangeStart + index}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-950">{level.levelCode}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                              level.active === false
                                ? 'bg-slate-100 text-slate-600 ring-slate-400/20'
                                : 'bg-emerald-50 text-emerald-800 ring-emerald-600/15'
                            }`}
                          >
                            {level.active === false ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{linkedCount}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatPositionDateTime(level.createdAt)}
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              title="Edit"
                              aria-label="Edit"
                              onClick={() => openEdit(level)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-white hover:text-blue-700"
                            >
                              <i className="bi bi-pencil-square" />
                            </button>
                            {level.active !== false && (
                              <button
                                type="button"
                                title="Deactivate"
                                aria-label="Deactivate"
                                onClick={() => openDeactivate(level)}
                                className={btnIconNudeRed}
                              >
                                <i className="bi bi-slash-circle" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing <strong className="text-slate-900">{rangeStart}</strong>–
                <strong className="text-slate-900">{rangeEnd}</strong> of{' '}
                <strong className="text-slate-900">{filteredLevels.length}</strong>
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

      {createOpen &&
        modalShell(
          <>
            <div className={`border-b border-blue-200/60 px-5 py-4 ${positionHeroGradient}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">New level</p>
              <h2 className="text-lg font-bold text-blue-950">Create position level</h2>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 p-5">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Level code <span className="text-red-600">*</span>
                <input
                  className={inputClass}
                  value={form.levelCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, levelCode: event.target.value }))}
                  placeholder="e.g. LD1, LD2, M3"
                  maxLength={50}
                  required
                />
              </label>
              {(formError || submitError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                  {formError || submitError}
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={isSubmitting}
                  onClick={() => {
                    setCreateOpen(false);
                    resetModals();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </>,
          () => {
            if (!isSubmitting) {
              setCreateOpen(false);
              resetModals();
            }
          },
        )}

      {editOpen &&
        editing &&
        modalShell(
          <>
            <div className={`border-b border-blue-200/60 px-5 py-4 ${positionHeroGradient}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Edit level</p>
              <h2 className="text-lg font-bold text-blue-950">{editing.levelCode}</h2>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 p-5">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Level code <span className="text-red-600">*</span>
                <input
                  className={inputClass}
                  value={form.levelCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, levelCode: event.target.value }))}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Status
                <select
                  className={inputClass}
                  value={form.active ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, active: event.target.value === 'active' }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Reason <span className="text-red-600">*</span>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  value={form.reason}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, reason: event.target.value.slice(0, 150) }))
                  }
                  placeholder="Why is this position level being edited?"
                  required
                />
                <span className="text-xs text-slate-500">{form.reason.length}/150</span>
              </label>
              {(formError || submitError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                  {formError || submitError}
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={isSubmitting}
                  onClick={() => {
                    setEditOpen(false);
                    resetModals();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </>,
          () => {
            if (!isSubmitting) {
              setEditOpen(false);
              resetModals();
            }
          },
        )}

      {detailOpen &&
        detailLevel &&
        modalShell(
          <>
            <div className={`border-b border-blue-200/60 px-5 py-4 ${positionHeroGradient}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Level details</p>
              <h2 className="text-lg font-bold text-blue-950">{detailLevel.levelCode}</h2>
              <p className="mt-1 text-xs text-slate-700">
                Created {formatPositionDateTime(detailLevel.createdAt)}
                {detailLevel.updatedAt ? ` · Updated ${formatPositionDateTime(detailLevel.updatedAt)}` : ''}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {detailLevel.active === false ? 'Inactive' : 'Active'}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Linked positions
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">{detailPositions.length}</dd>
                </div>
              </dl>

              <div>
                <h3 className="text-sm font-bold text-blue-950">Associated positions</h3>
                {detailPositions.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No positions use this level yet.</p>
                ) : (
                  <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Role</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailPositions.map((position) => (
                          <tr key={position.id}>
                            <td className="px-3 py-2 font-medium text-slate-900">
                              {position.positionTitle}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{position.roleName || '—'}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  position.status
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {position.status ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                {detailLevel.active !== false && (
                  <button
                    type="button"
                    className={btnNudeRed}
                    onClick={() => {
                      setDetailOpen(false);
                      openDeactivate(detailLevel);
                    }}
                  >
                    Deactivate
                  </button>
                )}
                <button type="button" className={btnSecondary} onClick={() => openEdit(detailLevel)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => {
                    setDetailOpen(false);
                    setDetailLevel(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </>,
          () => {
            setDetailOpen(false);
            setDetailLevel(null);
          },
        )}

      {deactivateOpen &&
        deactivateTarget &&
        modalShell(
          <>
            <div className="border-b border-[#e8c4c4] bg-[#faf0f0] px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#a85858]">Deactivate</p>
              <h2 className="text-lg font-bold text-slate-950">{deactivateTarget.levelCode}</h2>
              <p className="mt-1 text-sm text-slate-600">
                This level will be marked inactive. Linked positions are not deleted.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Reason <span className="text-red-600">*</span>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  value={deactivateReason}
                  onChange={(event) => setDeactivateReason(event.target.value.slice(0, 150))}
                  placeholder="Why is this position level being deactivated?"
                  required
                />
                <span className="text-xs text-slate-500">{deactivateReason.length}/150</span>
              </label>
              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                  {submitError}
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={isSubmitting}
                  onClick={() => {
                    setDeactivateOpen(false);
                    setDeactivateTarget(null);
                    setDeactivateReason('');
                    setSubmitError('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={btnNudeRed}
                  disabled={isSubmitting || !deactivateReason.trim()}
                  onClick={() => void confirmDeactivate()}
                >
                  {isSubmitting ? 'Deactivating…' : 'Deactivate'}
                </button>
              </div>
            </div>
          </>,
          () => {
            if (!isSubmitting) {
              setDeactivateOpen(false);
              setDeactivateTarget(null);
              setDeactivateReason('');
              setSubmitError('');
            }
          },
        )}
    </div>
  );
};

export default PositionLevelCreate;

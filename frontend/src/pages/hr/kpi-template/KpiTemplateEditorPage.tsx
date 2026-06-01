import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/ConfirmModal';
import KpiAlertModal from '../../../components/hr/kpi-template/KpiAlertModal';
import KpiPositionExistingAlert from '../../../components/hr/kpi-template/KpiPositionExistingAlert';
import KpiRowReasonModal from '../../../components/hr/kpi-template/KpiRowReasonModal';
import KpiTemplateRowsTable from '../../../components/hr/kpi-template/KpiTemplateRowsTable';
import { handleKpiTemplateSaveError } from '../../../components/hr/kpi-template/kpiTemplateConflict';
import {
  buildKpiPositionDropdownOptions,
  countAvailableKpiPositions,
  DEFAULT_KPI_TEMPLATE_DURATION_MONTHS,
  KPI_TEMPLATE_DURATION_OPTIONS,
  type KpiTemplateDurationMonths,
} from '../../../components/hr/kpi-template/kpiTemplateUi';
import {
  findExistingTemplateForPosition,
  loadKpiTemplateEditorLookups,
  loadTemplateFormFields,
  newKpiTemplateRow,
  saveKpiTemplateCreateOrUpdate,
  type ExistingKpiForPosition,
} from '../../../components/hr/kpi-template/kpiTemplateWorkflow';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import { toApiRequestError } from '../../../services/apiError';
import type { KpiCategory } from '../../../types/kpiCategory';
import type { KpiItem } from '../../../types/kpiItem';
import type { KpiFormStatus, KpiTemplateRequest, KpiTemplateRowDraft } from '../../../types/kpiTemplate';
import type { KpiUnit } from '../../../types/kpiUnit';
import type { PositionResponse } from '../../../types/position';

const fieldClass =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100';

const btnSecondary =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 no-underline shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

const btnPrimary =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:from-blue-50 hover:to-blue-100 disabled:cursor-not-allowed disabled:opacity-50';

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</span>
);

const KpiTemplateEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const saveInFlightRef = useRef(false);
  const isEdit = Boolean(id) && id !== 'new';
  const templateId = id && id !== 'new' ? Number(id) : NaN;

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<KpiFormStatus>('DRAFT');
  const [positionId, setPositionId] = useState<number | null>(null);
  const [positionDurationMonths, setPositionDurationMonths] = useState<KpiTemplateDurationMonths>(
    DEFAULT_KPI_TEMPLATE_DURATION_MONTHS,
  );
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [assignedPositionIds, setAssignedPositionIds] = useState<number[]>([]);
  const [existingTemplate, setExistingTemplate] = useState<ExistingKpiForPosition | null>(null);
  const [rows, setRows] = useState<KpiTemplateRowDraft[]>([newKpiTemplateRow()]);
  const [removedItemReasons, setRemovedItemReasons] = useState<Record<number, string>>({});
  const [reasonAction, setReasonAction] = useState<
    | { type: 'add' }
    | { type: 'remove'; row: KpiTemplateRowDraft }
    | null
  >(null);

  const [categories, setCategories] = useState<KpiCategory[]>([]);
  const [units, setUnits] = useState<KpiUnit[]>([]);
  const [items, setItems] = useState<KpiItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [savingAction, setSavingAction] = useState<'draft' | 'use-in-cycle' | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [draftConfirmOpen, setDraftConfirmOpen] = useState(false);
  const [successAlert, setSuccessAlert] = useState<{ title: string; message: string } | null>(null);

  const applyLookups = useCallback((lookups: Awaited<ReturnType<typeof loadKpiTemplateEditorLookups>>) => {
    setCategories(lookups.categories);
    setUnits(lookups.units);
    setItems(lookups.items);
    setPositions(lookups.positions);
    setAssignedPositionIds(lookups.assignedPositionIds);
  }, []);

  const refreshAfterConflict = useCallback(async () => {
    const excludeFormId = isEdit && !Number.isNaN(templateId) ? templateId : undefined;
    const lookups = await loadKpiTemplateEditorLookups(excludeFormId, { toastOnPartialFailure: false });
    setPositions(lookups.positions);
    setAssignedPositionIds(lookups.assignedPositionIds);
    setExistingTemplate(null);
    if (!isEdit && positionId != null && lookups.assignedPositionIds.includes(positionId)) {
      setPositionId(null);
    }
  }, [isEdit, positionId, templateId]);

  const handlePositionChange = useCallback(
    async (nextPositionId: number | null) => {
      setPositionId(nextPositionId);
      if (isEdit || nextPositionId == null) {
        setExistingTemplate(null);
        return;
      }
      setExistingTemplate(await findExistingTemplateForPosition(nextPositionId));
    },
    [isEdit],
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        const excludeFormId = isEdit && !Number.isNaN(templateId) ? templateId : undefined;
        const lookups = await loadKpiTemplateEditorLookups(excludeFormId);
        applyLookups(lookups);
        setExistingTemplate(null);

        if (isEdit && !Number.isNaN(templateId)) {
          const fields = await loadTemplateFormFields(templateId);
          setTitle(fields.title);
          setStatus(fields.status);
          setPositionId(fields.positionId);
          setPositionDurationMonths(fields.positionDurationMonths);
          setRows(fields.rows);
          setRemovedItemReasons({});
        }
      } catch (err) {
        toast.error(toApiRequestError(err, 'Failed to load form.').message);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [applyLookups, isEdit, templateId]);

  const positionOptions = useMemo(
    () =>
      buildKpiPositionDropdownOptions(positions, assignedPositionIds, positionId, {
        createOrEditMode: false,
      }),
    [positions, assignedPositionIds, positionId],
  );

  const availablePositionCount = useMemo(
    () => countAvailableKpiPositions(positionOptions),
    [positionOptions],
  );

  const totalWeight = useMemo(
    () => rows.reduce((sum, row) => sum + (row.weight ?? 0), 0),
    [rows],
  );

  const buildPayload = (submitStatus: KpiFormStatus): KpiTemplateRequest => ({
    title: title.trim(),
    status: submitStatus,
    startDate: null,
    endDate: null,
    positionDurationMonths,
    positionIds: positionId != null ? [positionId] : [],
    items: rows.map((row, index) => ({
      kpiLabel: row.kpiItemId !== null ? null : row.kpiLabel.trim() || null,
      kpiItemId: row.kpiItemId,
      kpiCategoryId: row.kpiCategoryId,
      kpiCategoryLabel: row.kpiCategoryId !== null ? null : row.kpiCategoryLabel.trim() || null,
      kpiUnitId: row.kpiUnitId,
      kpiUnitLabel: row.kpiUnitId !== null ? null : row.kpiUnitLabel.trim() || null,
      target: row.target,
      weight: row.weight,
      sortOrder: index,
      kpiCategoryName: null,
      kpiItemName: null,
      kpiUnitName: null,
      actual: null,
      score: null,
      weightedScore: null,
      id: row.id ?? null,
      changeReason: isEdit && row.id == null ? row.changeReason ?? null : null,
    })),
    removedItemReasons,
  });

  const validate = (submitStatus: KpiFormStatus): string | null => {
    if (!title.trim()) return 'Title is required.';
    if (positionId === null) return 'Select a position.';
    if (!KPI_TEMPLATE_DURATION_OPTIONS.some((option) => option.value === positionDurationMonths)) {
      return 'Select a valid position duration.';
    }
    if (!positions.some((p) => p.id === positionId)) {
      return 'Selected position is invalid. Choose a position from the list.';
    }
    if (!isEdit && assignedPositionIds.includes(positionId)) {
      return 'This position already has a KPI template. Choose another position or edit the existing template.';
    }
    if (rows.length === 0) return 'Add at least one KPI row.';
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const hasCatalog = row.kpiItemId !== null;
      const hasLabel = row.kpiLabel.trim().length > 0;
      if (!hasCatalog && !hasLabel) return `Row ${i + 1}: choose a catalog KPI or enter a KPI label.`;
      const hasCategory = row.kpiCategoryId !== null || row.kpiCategoryLabel.trim().length > 0;
      const hasUnit = row.kpiUnitId !== null || row.kpiUnitLabel.trim().length > 0;
      if (!hasCategory || !hasUnit || row.target === null || row.weight === null) {
        return `Row ${i + 1}: category, unit, target, and weight are required.`;
      }
    }
    if ((submitStatus === 'ACTIVE' || submitStatus === 'FINALIZED') && totalWeight !== 100) {
      return 'Total weight must equal 100% for ACTIVE or FINALIZED templates.';
    }
    return null;
  };

  const rowLabel = (row: KpiTemplateRowDraft) => {
    const catalogName = row.kpiItemId != null ? items.find((item) => item.id === row.kpiItemId)?.name : null;
    return catalogName ?? (row.kpiLabel.trim() || 'New KPI row');
  };

  const handleReasonConfirm = (reason: string) => {
    if (reasonAction?.type === 'add') {
      setRows((prev) => [...prev, { ...newKpiTemplateRow(), changeReason: reason }]);
    }
    if (reasonAction?.type === 'remove') {
      const removed = reasonAction.row;
      setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.rowId !== removed.rowId) : prev));
      if (removed.id != null) {
        setRemovedItemReasons((prev) => ({ ...prev, [removed.id as number]: reason }));
      }
    }
    setReasonAction(null);
  };

  const showSaveError = (message: string) => {
    setValidationMessage(message);
    toast.error(message);
  };

  const showSuccessAlert = (action: 'draft' | 'use-in-cycle') => {
    if (action === 'use-in-cycle') {
      setSuccessAlert({
        title: 'Success',
        message: isEdit
          ? 'KPI template was saved and activated successfully.'
          : 'KPI template was created and activated successfully.',
      });
      return;
    }
    setSuccessAlert({
      title: 'Draft saved',
      message: isEdit
        ? 'Your KPI template draft was saved successfully.'
        : 'Your KPI template draft was created successfully.',
    });
  };

  const saveTemplate = async (action: 'draft' | 'use-in-cycle'): Promise<boolean> => {
    if (saveInFlightRef.current || savingAction !== null) {
      return false;
    }

    const submitStatus: KpiFormStatus = action === 'use-in-cycle' ? 'ACTIVE' : 'DRAFT';
    const message = validate(submitStatus);
    if (message) {
      showSaveError(message);
      return false;
    }
    if (positionId == null) {
      showSaveError('Select a position.');
      return false;
    }

    const payload = buildPayload(submitStatus);
    setValidationMessage(null);
    saveInFlightRef.current = true;
    setSavingAction(action);

    try {
      if (isEdit && !Number.isNaN(templateId)) {
        await kpiTemplateService.updateTemplate(templateId, payload);
      } else {
        const result = await saveKpiTemplateCreateOrUpdate({
          positionId,
          payload,
          onSwitchedToEdit: (existingId) => {
            navigate(`/hr/kpi-template/${existingId}/edit`, { replace: true });
          },
        });
        if (!result.created) {
          toast.success('KPI template updated for this position.');
        }
      }

      showSuccessAlert(action);
      return true;
    } catch (err) {
      const apiError = toApiRequestError(err, 'Could not save the KPI template.');
      if (isEdit && apiError.status === 409) {
        showSaveError(apiError.message);
        return false;
      }
      if (
        !(await handleKpiTemplateSaveError(err, navigate, positionId, isEdit ? templateId : undefined, {
          onConflict: refreshAfterConflict,
        }))
      ) {
        showSaveError(apiError.message);
      }
      return false;
    } finally {
      saveInFlightRef.current = false;
      setSavingAction(null);
    }
  };

  const handleSuccessAlertClose = () => {
    setSuccessAlert(null);
    navigate('/hr/kpi-template');
  };

  const confirmSaveDraft = () => {
    setDraftConfirmOpen(false);
    void saveTemplate('draft');
  };

  const handleUseFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveTemplate('use-in-cycle');
  };

  const positionPlaceholder = loading
    ? 'Loading positions...'
    : positions.length === 0
      ? 'No positions in system'
      : !isEdit && availablePositionCount === 0
        ? 'All positions already have a KPI template'
        : 'Select position...';

  const saveDisabled =
    loading || savingAction !== null || positions.length === 0 || (!isEdit && availablePositionCount === 0);

  if (loading && isEdit) {
    return (
      <div
        className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 text-slate-600"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" aria-hidden />
          <p className="text-sm font-medium">Loading editor…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 pb-16">
        <header className="rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_92%_16%,rgba(37,99,235,0.1),transparent_14rem),linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.05em] text-blue-700">
                <i className="bi bi-sliders text-sm" aria-hidden />
                {isEdit ? 'Edit template' : 'Create template'}
              </span>
              <h1 className="text-2xl font-bold leading-tight text-slate-950">
                {isEdit ? 'Update KPI structure' : 'New KPI template'}
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Align HR-defined KPI rows with positions. PM scoring columns stay read-only here.
              </p>
            </div>
            <Link to="/hr/kpi-template" className={`${btnSecondary} shrink-0 self-start`}>
              <i className="bi bi-arrow-left text-base" aria-hidden />
              Back to list
            </Link>
          </div>
        </header>

        <form noValidate className="mt-4 space-y-4" onSubmit={handleUseFormSubmit}>
          {validationMessage && (
            <div
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm"
              role="alert"
            >
              <i className="bi bi-exclamation-triangle-fill mt-0.5 text-red-500" aria-hidden />
              <span>{validationMessage}</span>
            </div>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-lg text-blue-700">
                <i className="bi bi-info-circle" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Basics</h2>
                <p className="text-sm text-slate-500">Template title and position assignment</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <FieldLabel>Title</FieldLabel>
                <input
                  required
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setValidationMessage(null);
                  }}
                  placeholder="e.g. Sales Manager KPIs"
                  className={fieldClass}
                />
              </label>

              <label className="flex flex-col gap-2">
                <FieldLabel>Position</FieldLabel>
                <div className="relative">
                  <i
                    className="bi bi-chevron-down pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <select
                    required
                    value={positionId ?? ''}
                    disabled={savingAction !== null || loading}
                    onChange={(event) => {
                      const next = event.target.value ? Number(event.target.value) : null;
                      setValidationMessage(null);
                      void handlePositionChange(next != null && Number.isNaN(next) ? null : next);
                    }}
                    className={`${fieldClass} cursor-pointer appearance-none pr-10`}
                    aria-label="Position"
                  >
                    {loading && <option value="">{positionPlaceholder}</option>}
                    <option value="">
                      {positions.length === 0
                        ? 'No positions in system'
                        : !isEdit && availablePositionCount === 0
                          ? 'All positions already have a KPI template'
                          : 'Select position…'}
                    </option>
                    {positionOptions.map((option) => (
                      <option key={option.position.id} value={option.position.id} disabled={option.disabled}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {!loading && positions.length > 0 && (
                  <p className="text-sm text-slate-500">
                    {!isEdit
                      ? `${availablePositionCount} of ${positions.length} position${positions.length === 1 ? '' : 's'} available for a new KPI template.`
                      : `${positions.length} position${positions.length === 1 ? '' : 's'} in the organization.`}
                  </p>
                )}
                {!loading && positions.length === 0 && (
                  <p className="text-sm text-amber-700">
                    No positions found.{' '}
                    <Link to="/hr/position/table" className="font-semibold underline">
                      Create positions
                    </Link>{' '}
                    before linking a KPI template.
                  </p>
                )}
                {!isEdit && existingTemplate && (
                  <KpiPositionExistingAlert
                    templateTitle={existingTemplate.templateTitle}
                    onEdit={() => navigate(`/hr/kpi-template/${existingTemplate.templateId}/edit`)}
                    onView={() => navigate(`/hr/kpi-template/${existingTemplate.templateId}`)}
                  />
                )}
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
                <FieldLabel>Position duration</FieldLabel>
                <div className="relative">
                  <i
                    className="bi bi-chevron-down pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <select
                    required
                    value={positionDurationMonths}
                    disabled={savingAction !== null || loading}
                    onChange={(event) => {
                      setValidationMessage(null);
                      setPositionDurationMonths(Number(event.target.value) as KpiTemplateDurationMonths);
                    }}
                    className={`${fieldClass} cursor-pointer appearance-none pr-10`}
                    aria-label="Position duration"
                  >
                    {KPI_TEMPLATE_DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-lg text-blue-700">
                  <i className="bi bi-table" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">KPI rows</h2>
                  <p className="mt-0.5 max-w-xl text-sm text-slate-500">
                    Blue columns are filled later by managers (actual, score, weighted score).
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total weight</p>
                <p
                  className={`text-3xl font-bold tabular-nums tracking-tight ${
                    (status === 'ACTIVE' || status === 'FINALIZED') && totalWeight !== 100
                      ? 'text-red-600'
                      : 'text-slate-950'
                  }`}
                >
                  {totalWeight}
                  <span className="text-xl font-semibold text-slate-400">%</span>
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <KpiTemplateRowsTable
                rows={rows}
                categories={categories}
                units={units}
                items={items}
                onAddRow={() => {
                  if (isEdit) {
                    setReasonAction({ type: 'add' });
                    return;
                  }
                  setRows((prev) => [...prev, newKpiTemplateRow()]);
                }}
                onRemoveRow={(rowId) => {
                  const row = rows.find((candidate) => candidate.rowId === rowId);
                  if (row && rows.length > 1) {
                    setReasonAction({ type: 'remove', row });
                  }
                }}
                onRowChange={(rowId, patch) => {
                  setValidationMessage(null);
                  setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
                }}
              />
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <Link to="/hr/kpi-template" className={btnSecondary}>
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => setDraftConfirmOpen(true)}
              disabled={saveDisabled}
              className={btnSecondary}
            >
              {savingAction === 'draft' ? 'Saving draft…' : 'Save Draft'}
            </button>
            <button
              type="submit"
              disabled={saveDisabled}
              className={btnPrimary}
              title="Save this form and return to the KPI template list"
            >
              {savingAction === 'use-in-cycle' ? (
                'Saving…'
              ) : (
                <>
                  Use Form
                  <i className="bi bi-check2-circle text-lg" aria-hidden />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <KpiRowReasonModal
        open={reasonAction !== null}
        title={reasonAction?.type === 'remove' ? 'Remove KPI row' : 'Add KPI row'}
        rowLabel={reasonAction?.type === 'remove' ? rowLabel(reasonAction.row) : undefined}
        confirmText={reasonAction?.type === 'remove' ? 'Remove row' : 'Add row'}
        onConfirm={handleReasonConfirm}
        onCancel={() => setReasonAction(null)}
      />

      <ConfirmModal
        open={draftConfirmOpen}
        title="Save as draft"
        message="Save this KPI template as a draft? You can activate it later using Use Form."
        confirmText="Save draft"
        cancelText="Cancel"
        loading={savingAction === 'draft'}
        onConfirm={confirmSaveDraft}
        onCancel={() => {
          if (savingAction !== 'draft') setDraftConfirmOpen(false);
        }}
      />

      <KpiAlertModal
        open={successAlert != null}
        title={successAlert?.title ?? 'Success'}
        message={successAlert?.message ?? ''}
        variant="success"
        onClose={handleSuccessAlertClose}
      />
    </div>
  );
};

export default KpiTemplateEditorPage;

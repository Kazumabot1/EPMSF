import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import { toApiRequestError } from '../../../services/apiError';
import type { KpiCategory } from '../../../types/kpiCategory';
import type { KpiItem } from '../../../types/kpiItem';
import type { KpiFormStatus, KpiTemplateRequest, KpiTemplateRowDraft } from '../../../types/kpiTemplate';
import type { KpiUnit } from '../../../types/kpiUnit';
import type { PositionResponse } from '../../../types/position';
import KpiPositionExistingAlert from './KpiPositionExistingAlert';
import KpiRowReasonModal from './KpiRowReasonModal';
import KpiTemplateRowsTable from './KpiTemplateRowsTable';
import { handleKpiTemplateSaveError } from './kpiTemplateConflict';
import {
  DEFAULT_KPI_TEMPLATE_DURATION_MONTHS,
  buildKpiPositionDropdownOptions,
  countAvailableKpiPositions,
} from './kpiTemplateUi';
import {
  findExistingTemplateForPosition,
  loadKpiTemplateEditorLookups,
  loadTemplateFormFields,
  newKpiTemplateRow,
  type ExistingKpiForPosition,
  type KpiTemplateFormFields,
} from './kpiTemplateWorkflow';

type Props = {
  open: boolean;
  mode: 'create' | 'view' | 'edit';
  templateId?: number | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const fieldClass =
  'kpi-tpl-input min-h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400';

const KpiTemplateCreateModal = ({ open, mode, templateId, onClose, onSaved }: Props) => {
  const navigate = useNavigate();
  const saveInFlightRef = useRef(false);

  const [workflowMode, setWorkflowMode] = useState<'create' | 'view' | 'edit'>(mode);
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(templateId ?? null);

  const isView = workflowMode === 'view';
  const isEdit = workflowMode === 'edit';
  const isCreate = workflowMode === 'create';

  const [title, setTitle] = useState('');
  const [, setStatus] = useState<KpiFormStatus>('DRAFT');
  const [positionId, setPositionId] = useState<number | null>(null);
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

  const isSubmitting = savingAction !== null;

  const applyFormFields = useCallback((fields: KpiTemplateFormFields) => {
    setTitle(fields.title);
    setStatus(fields.status);
    setPositionId(fields.positionId);
    setRows(fields.rows);
    setRemovedItemReasons({});
  }, []);

  const resetFormFields = useCallback(() => {
    setTitle('');
    setStatus('DRAFT');
    setPositionId(null);
    setRows([newKpiTemplateRow()]);
    setRemovedItemReasons({});
  }, []);

  const applyLookups = useCallback((lookups: Awaited<ReturnType<typeof loadKpiTemplateEditorLookups>>) => {
    setCategories(lookups.categories);
    setUnits(lookups.units);
    setItems(lookups.items);
    setPositions(lookups.positions);
    setAssignedPositionIds(lookups.assignedPositionIds);
  }, []);

  const refreshAfterConflict = useCallback(async () => {
    const excludeFormId = isEdit && activeTemplateId ? activeTemplateId : undefined;
    const lookups = await loadKpiTemplateEditorLookups(excludeFormId, { toastOnPartialFailure: false });
    setPositions(lookups.positions);
    setAssignedPositionIds(lookups.assignedPositionIds);
    setExistingTemplate(null);
    if (positionId != null && lookups.assignedPositionIds.includes(positionId)) {
      setPositionId(null);
    }
  }, [activeTemplateId, isEdit, positionId]);

  useEffect(() => {
    if (!open) {
      setWorkflowMode('create');
      setActiveTemplateId(null);
      return;
    }
    setWorkflowMode(mode);
    setActiveTemplateId(templateId ?? null);
  }, [open, mode, templateId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const bootstrap = async () => {
      try {
        setLoading(true);
        const excludeFormId = mode !== 'create' && templateId ? templateId : undefined;
        applyLookups(await loadKpiTemplateEditorLookups(excludeFormId));
        setExistingTemplate(null);

        if (mode !== 'create' && templateId) {
          const fields = await loadTemplateFormFields(templateId);
          applyFormFields(fields);
        } else {
          resetFormFields();
        }
      } catch (err) {
        toast.error(toApiRequestError(err, 'Failed to load form.').message);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [open, mode, templateId, applyFormFields, applyLookups, resetFormFields]);

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

  const totalWeight = useMemo(() => rows.reduce((sum, row) => sum + (row.weight ?? 0), 0), [rows]);

  const handlePositionChange = useCallback(
    async (nextPositionId: number | null) => {
      setPositionId(nextPositionId);
      if (!isCreate || nextPositionId == null) {
        setExistingTemplate(null);
        return;
      }
      const existing = await findExistingTemplateForPosition(nextPositionId);
      setExistingTemplate(existing);
    },
    [isCreate],
  );

  const buildPayload = (submitStatus: KpiFormStatus): KpiTemplateRequest => ({
    title: title.trim(),
    status: submitStatus,
    positionDurationMonths: DEFAULT_KPI_TEMPLATE_DURATION_MONTHS,
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
    if (!title.trim()) {
      return 'Title is required.';
    }
    if (positionId === null) {
      return 'Select a position.';
    }
    if (!positions.some((p) => p.id === positionId)) {
      return 'Selected position is invalid. Choose a position from the list.';
    }
    if (isCreate && assignedPositionIds.includes(positionId)) {
      return 'This position already has a KPI form. Choose another position or edit the existing form.';
    }
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const hasCatalog = row.kpiItemId !== null;
      const hasLabel = row.kpiLabel.trim().length > 0;
      if (!hasCatalog && !hasLabel) {
        return `Row ${i + 1}: choose a catalog KPI or enter a KPI label.`;
      }
      const hasCategory = row.kpiCategoryId !== null || row.kpiCategoryLabel.trim().length > 0;
      const hasUnit = row.kpiUnitId !== null || row.kpiUnitLabel.trim().length > 0;
      if (!hasCategory || !hasUnit || row.target === null || row.weight === null) {
        return `Row ${i + 1}: category, unit, target, and weight are required.`;
      }
      if (!Number.isFinite(row.target) || row.target < 1 || row.target > 100) {
        return `Row ${i + 1}: target must be between 1 and 100.`;
      }
      if (!Number.isFinite(row.weight) || row.weight < 1 || row.weight > 100) {
        return `Row ${i + 1}: weight must be between 1 and 100.`;
      }
    }
    if ((submitStatus === 'ACTIVE' || submitStatus === 'FINALIZED') && totalWeight !== 100) {
      return 'Total weight must equal 100% for ACTIVE or FINALIZED templates.';
    }
    return null;
  };

  const saveTemplate = async (action: 'draft' | 'use-in-cycle') => {
    if (saveInFlightRef.current || isSubmitting) {
      return;
    }

    const submitStatus: KpiFormStatus = action === 'use-in-cycle' ? 'ACTIVE' : 'DRAFT';
    const message = validate(submitStatus);
    if (message) {
      toast.error(message);
      return;
    }
    if (positionId == null) {
      toast.error('Select a position.');
      return;
    }

    const payload = buildPayload(submitStatus);
    saveInFlightRef.current = true;
    setSavingAction(action);

    try {
      if (isEdit && activeTemplateId) {
        const updated = await kpiTemplateService.updateTemplate(activeTemplateId, payload);
        await onSaved();
        resetFormFields();
        onClose();
        if (action === 'use-in-cycle') {
          toast.success('KPI form activated. Select it in the template cycle.');
          navigate('/hr/kpi-template-cycle/new', { state: { preselectFormId: updated.id } });
        } else {
          toast.success('KPI form draft saved.');
        }
        return;
      }

      if (isCreate) {
        if (existingTemplate) {
          toast.error('This position already has a KPI form.');
        } else {
          const serverExisting = await findExistingTemplateForPosition(positionId);
          if (serverExisting) {
            setExistingTemplate(serverExisting);
            toast.error('This position already has a KPI form.');
          } else {
            const created = await kpiTemplateService.createTemplate(payload);
            await onSaved();
            resetFormFields();
            onClose();

            if (action === 'use-in-cycle') {
              toast.success('KPI form created and activated. Select it in the template cycle.');
              navigate('/hr/kpi-template-cycle/new', { state: { preselectFormId: created.id } });
            } else {
              toast.success('KPI form draft created.');
            }
          }
        }
        return;
      }

      toast.error('Could not save the KPI form.');
    } catch (err) {
      const apiError = toApiRequestError(err, 'Could not save the KPI form.');
      if (isEdit && apiError.status === 409) {
        toast.error(apiError.message);
        return;
      }
      const handled = await handleKpiTemplateSaveError(
        err,
        navigate,
        positionId,
        activeTemplateId ?? undefined,
        { onConflict: refreshAfterConflict },
      );
      if (!handled) {
        toast.error(apiError.message);
      }
    } finally {
      saveInFlightRef.current = false;
      setSavingAction(null);
    }
  };

  if (!open) {
    return null;
  }

  const headerKicker = isCreate ? 'Create template' : isEdit ? 'Edit template' : 'View template';
  const headerTitle = isCreate ? 'New KPI Template' : isEdit ? 'Update KPI Template' : 'KPI Template Detail';

  return createPortal(
    <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
      <MotionlessModalShell
        headerKicker={headerKicker}
        headerTitle={headerTitle}
        onClose={onClose}
        loading={loading}
        isView={isView}
        isCreate={isCreate}
        title={title}
        setTitle={setTitle}
        fieldClass={fieldClass}
        positionOptions={positionOptions}
        availablePositionCount={availablePositionCount}
        positionsCount={positions.length}
        positionId={positionId}
        onPositionChange={handlePositionChange}
        existingTemplate={existingTemplate}
        onOpenExistingTemplate={(existing, nextMode) => {
          void (async () => {
            try {
              setLoading(true);
              const fields = await loadTemplateFormFields(existing.templateId);
              applyLookups(await loadKpiTemplateEditorLookups(existing.templateId, { toastOnPartialFailure: false }));
              applyFormFields(fields);
              setWorkflowMode(nextMode);
              setActiveTemplateId(existing.templateId);
              setExistingTemplate(null);
            } catch (err) {
              toast.error(toApiRequestError(err, 'Could not load the existing KPI form.').message);
            } finally {
              setLoading(false);
            }
          })();
        }}
        rows={rows}
        setRows={setRows}
        onRequestAddRow={() => {
          if (isEdit) {
            setReasonAction({ type: 'add' });
            return;
          }
          setRows((prev) => [...prev, newKpiTemplateRow()]);
        }}
        onRequestRemoveRow={(row) => setReasonAction({ type: 'remove', row })}
        categories={categories}
        units={units}
        items={items}
        totalWeight={totalWeight}
        isSubmitting={isSubmitting}
        saveTemplate={saveTemplate}
        savingAction={savingAction}
      />
      <KpiRowReasonModal
        open={reasonAction !== null}
        title={reasonAction?.type === 'remove' ? 'Remove KPI row' : 'Add KPI row'}
        rowLabel={
          reasonAction?.type === 'remove'
            ? formatRowLabel(reasonAction.row, items)
            : undefined
        }
        confirmText={reasonAction?.type === 'remove' ? 'Remove row' : 'Add row'}
        onConfirm={(reason) => {
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
        }}
        onCancel={() => setReasonAction(null)}
      />
    </div>,
    document.body,
  );
};

type ShellProps = {
  headerKicker: string;
  headerTitle: string;
  onClose: () => void;
  loading: boolean;
  isView: boolean;
  isCreate: boolean;
  title: string;
  setTitle: (value: string) => void;
  fieldClass: string;
  positionOptions: ReturnType<typeof buildKpiPositionDropdownOptions<PositionResponse>>;
  availablePositionCount: number;
  positionsCount: number;
  positionId: number | null;
  onPositionChange: (id: number | null) => void;
  existingTemplate: ExistingKpiForPosition | null;
  onOpenExistingTemplate: (existing: ExistingKpiForPosition, mode: 'edit' | 'view') => void;
  rows: KpiTemplateRowDraft[];
  setRows: React.Dispatch<React.SetStateAction<KpiTemplateRowDraft[]>>;
  onRequestAddRow: () => void;
  onRequestRemoveRow: (row: KpiTemplateRowDraft) => void;
  categories: KpiCategory[];
  units: KpiUnit[];
  items: KpiItem[];
  totalWeight: number;
  isSubmitting: boolean;
  saveTemplate: (action: 'draft' | 'use-in-cycle') => Promise<void>;
  savingAction: 'draft' | 'use-in-cycle' | null;
};

function MotionlessModalShell(props: ShellProps) {
  const {
    headerKicker,
    headerTitle,
    onClose,
    loading,
    isView,
    isCreate,
    title,
    setTitle,
    fieldClass,
    positionOptions,
    availablePositionCount,
    positionsCount,
    positionId,
    onPositionChange,
    existingTemplate,
    onOpenExistingTemplate,
    rows,
    setRows,
    onRequestAddRow,
    onRequestRemoveRow,
    categories,
    units,
    items,
    totalWeight,
    isSubmitting,
    saveTemplate,
    savingAction,
  } = props;

  return (
    <div className="kpi-tpl-modal">
      <div className="kpi-tpl-modal-header">
        <div>
          <p className="kpi-tpl-modal-kicker">{headerKicker}</p>
          <h2>{headerTitle}</h2>
        </div>
        <button type="button" onClick={onClose} className="kpi-tpl-btn-secondary">
          <i className="bi bi-x-lg" aria-hidden />
          Close
        </button>
      </div>

      {loading ? (
        <div className="kpi-tpl-modal-loading">
          <MotionlessModalLoadingShimmer />
          Loading form...
        </div>
      ) : (
        <form noValidate className="kpi-tpl-modal-body">
          <div className="kpi-tpl-modal-grid">
            <label>
              Title
              <input
                value={title}
                disabled={isView}
                onChange={(e) => setTitle(e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="kpi-tpl-modal-positions">
              <p>Position</p>
              <select
                required
                value={positionId ?? ''}
                disabled={isView || isSubmitting}
                onChange={(event) => {
                  const next = event.target.value ? Number(event.target.value) : null;
                  void onPositionChange(next != null && Number.isNaN(next) ? null : next);
                }}
                className={`${fieldClass} cursor-pointer`}
              >
                <option value="">
                  {positionsCount === 0
                    ? 'No positions in system'
                    : availablePositionCount === 0
                      ? 'All positions already have a KPI form'
                      : 'Select position...'}
                </option>
                {positionOptions.map((option) => (
                  <option key={option.position.id} value={option.position.id} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
              {positionsCount > 0 && isCreate && (
                <p className="mt-2 text-sm text-gray-500">
                  {availablePositionCount} of {positionsCount} position
                  {positionsCount === 1 ? '' : 's'} available for a new KPI form.
                </p>
              )}
              {isCreate && existingTemplate && (
                <KpiPositionExistingAlert
                  templateTitle={existingTemplate.templateTitle}
                  onEdit={() => onOpenExistingTemplate(existingTemplate, 'edit')}
                  onView={() => onOpenExistingTemplate(existingTemplate, 'view')}
                />
              )}
            </label>
          </div>

          <KpiTemplateRowsTable
            rows={rows}
            categories={categories}
            units={units}
            items={items}
            onAddRow={onRequestAddRow}
            onRemoveRow={(rowId) => {
              const row = rows.find((candidate) => candidate.rowId === rowId);
              if (row && rows.length > 1) {
                onRequestRemoveRow(row);
              }
            }}
            onRowChange={(rowId, patch) =>
              setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)))
            }
            readOnly={isView}
          />

          <div className="kpi-tpl-modal-footer">
            <p className={totalWeight !== 100 ? 'text-amber-700' : ''}>Total weight: {totalWeight}%</p>
            {!isView && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveTemplate('draft')}
                  disabled={
                    isSubmitting ||
                    positionsCount === 0 ||
                    (isCreate && (availablePositionCount === 0 || Boolean(existingTemplate)))
                  }
                  className="kpi-tpl-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingAction === 'draft' ? 'Saving…' : isCreate ? 'Save Draft' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => void saveTemplate('use-in-cycle')}
                  disabled={
                    isSubmitting ||
                    positionsCount === 0 ||
                    (isCreate && (availablePositionCount === 0 || Boolean(existingTemplate)))
                  }
                  className="kpi-tpl-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  title="Save and open KPI template cycle to include this form"
                >
                  {savingAction === 'use-in-cycle' ? 'Saving…' : 'Use Form'}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function MotionlessModalLoadingShimmer() {
  return <div className="kpi-tpl-shimmer h-10 w-10 rounded-xl bg-gradient-to-br from-blue-300 to-gray-200" />;
}

function formatRowLabel(row: KpiTemplateRowDraft, items: KpiItem[]) {
  const catalogName = row.kpiItemId != null ? items.find((item) => item.id === row.kpiItemId)?.name : null;
  return catalogName ?? (row.kpiLabel.trim() || 'New KPI row');
}

export default KpiTemplateCreateModal;
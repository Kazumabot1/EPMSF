import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import KpiPositionExistingAlert from '../../../components/hr/kpi-template/KpiPositionExistingAlert';
import KpiTemplateRowsTable from '../../../components/hr/kpi-template/KpiTemplateRowsTable';
import '../../../components/hr/kpi-template/kpi-template.css';
import { handleKpiTemplateSaveError } from '../../../components/hr/kpi-template/kpiTemplateConflict';
import {
  buildKpiPositionDropdownOptions,
  countAvailableKpiPositions,
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
  'kpi-tpl-input min-h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400';

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{children}</span>
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
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [assignedPositionIds, setAssignedPositionIds] = useState<number[]>([]);
  const [existingTemplate, setExistingTemplate] = useState<ExistingKpiForPosition | null>(null);
  const [rows, setRows] = useState<KpiTemplateRowDraft[]>([newKpiTemplateRow()]);

  const [categories, setCategories] = useState<KpiCategory[]>([]);
  const [units, setUnits] = useState<KpiUnit[]>([]);
  const [items, setItems] = useState<KpiItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [savingAction, setSavingAction] = useState<'draft' | 'use-in-cycle' | null>(null);

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
          setRows(fields.rows);
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
    positionIds: positionId != null ? [positionId] : [],
    items: rows.map((row, index) => ({
      kpiLabel: row.kpiItemId !== null ? null : row.kpiLabel.trim() || null,
      kpiItemId: row.kpiItemId,
      kpiCategoryId: row.kpiCategoryId,
      kpiUnitId: row.kpiUnitId,
      target: row.target,
      weight: row.weight,
      sortOrder: index,
      kpiCategoryName: null,
      kpiItemName: null,
      kpiUnitName: null,
      actual: null,
      score: null,
      weightedScore: null,
      id: null,
    })),
  });

  const validate = (submitStatus: KpiFormStatus): string | null => {
    if (!title.trim()) return 'Title is required.';
    if (positionId === null) return 'Select a position.';
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
      if (row.kpiCategoryId === null || row.kpiUnitId === null || row.target === null || row.weight === null) {
        return `Row ${i + 1}: category, unit, target, and weight are required.`;
      }
    }
    if ((submitStatus === 'ACTIVE' || submitStatus === 'FINALIZED') && totalWeight !== 100) {
      return 'Total weight must equal 100% for ACTIVE or FINALIZED templates.';
    }
    return null;
  };

  const saveTemplate = async (action: 'draft' | 'use-in-cycle'): Promise<number | null> => {
    if (saveInFlightRef.current || savingAction !== null) {
      return null;
    }

    const submitStatus: KpiFormStatus = 'DRAFT';
    const message = validate(submitStatus);
    if (message) {
      toast.error(message);
      return null;
    }
    if (positionId == null) {
      toast.error('Select a position.');
      return null;
    }

    const payload = buildPayload(submitStatus);
    saveInFlightRef.current = true;
    setSavingAction(action);

    try {
      let savedFormId: number;
      if (isEdit && !Number.isNaN(templateId)) {
        const updated = await kpiTemplateService.updateTemplate(templateId, payload);
        savedFormId = updated.id;
      } else {
        const result = await saveKpiTemplateCreateOrUpdate({
          positionId,
          payload,
          onSwitchedToEdit: (existingId) => {
            navigate(`/hr/kpi-template/${existingId}/edit`, { replace: true });
          },
        });
        savedFormId = result.templateId;
        if (!result.created) {
          toast.success('KPI template updated for this position.');
        }
      }

      if (action === 'use-in-cycle') {
        toast.success(isEdit ? 'KPI template updated.' : 'KPI template created.');
        navigate('/hr/kpi-template');
        return null;
      } else {
        toast.success(isEdit ? 'KPI template updated.' : 'KPI template created.');
        navigate('/hr/kpi-template');
        return null;
      }
    } catch (err) {
      if (
        !(await handleKpiTemplateSaveError(err, navigate, positionId, isEdit ? templateId : undefined, {
          onConflict: refreshAfterConflict,
        }))
      ) {
        toast.error(toApiRequestError(err, 'Could not save the KPI template.').message);
      }
      return null;
    } finally {
      saveInFlightRef.current = false;
      setSavingAction(null);
    }
  };

  const handleUseFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveTemplate('use-in-cycle');
  };

  if (loading) {
    return (
      <div className="kpi-tpl-page">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-28">
          <div className="kpi-tpl-shimmer mb-5 h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-300 to-gray-200" />
          <p className="text-sm font-medium text-gray-600">Loading editor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-20">
        <div className="mb-10 flex flex-col gap-6 border-b border-gray-200/90 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-2xl text-white shadow-lg shadow-violet-900/20 ring-4 ring-violet-500/10">
              <i className="bi bi-sliders" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">
                {isEdit ? 'Edit template' : 'Create template'}
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {isEdit ? 'Update KPI structure' : 'New KPI template'}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
                Align HR-defined KPI rows with positions. PM scoring columns stay read-only here.
              </p>
            </div>
          </div>
          <Link
            to="/hr/kpi-template"
            className="kpi-tpl-btn-secondary inline-flex shrink-0 self-start no-underline"
          >
            <i className="bi bi-arrow-left text-base" aria-hidden />
            Back to list
          </Link>
        </div>

        <form
          noValidate
          className="space-y-8"
          onSubmit={handleUseFormSubmit}
        >
          <section className="kpi-tpl-card overflow-hidden p-0">
            <div className="p-6 sm:p-8">
              <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-gray-100 pb-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                  <i className="bi bi-info-circle text-xl" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Basics</h2>
                  <p className="mt-0.5 text-sm text-gray-500">Template title and position assignment</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <FieldLabel>Title</FieldLabel>
                  <input
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Sales Manager KPIs"
                    className={fieldClass}
                  />
                </label>

              <label className="flex flex-col gap-2">
                <FieldLabel>Position</FieldLabel>
                <div className="relative">
                  <i className="bi bi-chevron-down pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
                  <select
                    required
                    value={positionId ?? ''}
                    disabled={savingAction !== null}
                    onChange={(event) => {
                      const next = event.target.value ? Number(event.target.value) : null;
                      void handlePositionChange(next != null && Number.isNaN(next) ? null : next);
                    }}
                    className={`${fieldClass} cursor-pointer appearance-none pr-10`}
                    aria-label="Position"
                  >
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
                {positions.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {!isEdit
                      ? `${availablePositionCount} of ${positions.length} position${positions.length === 1 ? '' : 's'} available for a new KPI template.`
                      : `${positions.length} position${positions.length === 1 ? '' : 's'} in the organization.`}
                  </p>
                )}
                {positions.length === 0 && (
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
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 border-y border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-6 sm:px-8">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                  <i className="bi bi-table text-xl" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">KPI rows</h2>
                  <p className="mt-1 max-w-xl text-sm text-gray-500">
                    Violet-tinted columns are filled later by PM (actual, score, weighted score).
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total weight</p>
                <p
                  className={`text-3xl font-bold tabular-nums tracking-tight ${
                    (status === 'ACTIVE' || status === 'FINALIZED') && totalWeight !== 100 ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {totalWeight}
                  <span className="text-xl font-semibold text-gray-400">%</span>
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <KpiTemplateRowsTable
                rows={rows}
                categories={categories}
                units={units}
                items={items}
                onAddRow={() => setRows((prev) => [...prev, newKpiTemplateRow()])}
                onRemoveRow={(rowId) =>
                  setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.rowId !== rowId) : prev))
                }
                onRowChange={(rowId, patch) =>
                  setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)))
                }
              />
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Link to="/hr/kpi-template" className="kpi-tpl-btn-secondary no-underline">
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void saveTemplate('draft')}
              disabled={savingAction !== null || positions.length === 0 || (!isEdit && availablePositionCount === 0)}
              className="kpi-tpl-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingAction === 'draft' ? (
                <>
                  <span className="kpi-tpl-shimmer inline-block h-4 w-4 rounded-full bg-white/90" />
                  Saving draft…
                </>
              ) : (
                'Save Draft'
              )}
            </button>
            <button
              type="submit"
              disabled={savingAction !== null || positions.length === 0 || (!isEdit && availablePositionCount === 0)}
              className="kpi-tpl-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              title="Save this form and return to the KPI template list"
            >
              {savingAction === 'use-in-cycle' ? (
                <>
                  <span className="kpi-tpl-shimmer inline-block h-4 w-4 rounded-full bg-white/90" />
                  Saving…
                </>
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
    </div>
  );
};

export default KpiTemplateEditorPage;

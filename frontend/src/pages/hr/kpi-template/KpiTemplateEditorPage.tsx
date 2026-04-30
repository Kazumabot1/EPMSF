import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import KpiTemplateRowsTable from '../../../components/hr/kpi-template/KpiTemplateRowsTable';
import '../../../components/hr/kpi-template/kpi-template.css';
import { kpiCategoryService } from '../../../services/kpiCategoryService';
import { kpiItemService } from '../../../services/kpiItemService';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import { kpiUnitService } from '../../../services/kpiUnitService';
import { positionService } from '../../../services/positionService';
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

const newRow = (): KpiTemplateRowDraft => ({
  rowId: crypto.randomUUID(),
  kpiItemId: null,
  kpiLabel: '',
  kpiCategoryId: null,
  kpiUnitId: null,
  target: null,
  weight: null,
});

const KpiTemplateEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && id !== 'new';
  const templateId = id && id !== 'new' ? Number(id) : NaN;

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<KpiFormStatus>('DRAFT');
  const [positionIds, setPositionIds] = useState<number[]>([]);
  const [rows, setRows] = useState<KpiTemplateRowDraft[]>([newRow()]);

  const [categories, setCategories] = useState<KpiCategory[]>([]);
  const [units, setUnits] = useState<KpiUnit[]>([]);
  const [items, setItems] = useState<KpiItem[]>([]);
  const [positions, setPositions] = useState<PositionResponse[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        const [cat, unit, kit, pos] = await Promise.all([
          kpiCategoryService.getAll(),
          kpiUnitService.getAll(),
          kpiItemService.getAll(),
          positionService.getPositions(),
        ]);
        setCategories(cat);
        setUnits(unit);
        setItems(kit);
        setPositions(pos);

        if (isEdit && !Number.isNaN(templateId)) {
          const tmpl = await kpiTemplateService.getTemplateById(templateId);
          setTitle(tmpl.title);
          setStartDate(tmpl.startDate?.slice(0, 10) ?? '');
          setEndDate(tmpl.endDate?.slice(0, 10) ?? '');
          setStatus(tmpl.status);
          setPositionIds(tmpl.positions.map((p) => p.positionId));
          setRows(
            tmpl.items.length > 0
              ? tmpl.items.map((line) => ({
                  rowId: crypto.randomUUID(),
                  kpiItemId: line.kpiItemId,
                  kpiLabel: line.kpiLabel ?? '',
                  kpiCategoryId: line.kpiCategoryId,
                  kpiUnitId: line.kpiUnitId,
                  target: line.target,
                  weight: line.weight,
                }))
              : [newRow()],
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load form.');
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [isEdit, templateId]);

  const totalWeight = useMemo(
    () => rows.reduce((sum, row) => sum + (row.weight ?? 0), 0),
    [rows],
  );

  const buildPayload = (): KpiTemplateRequest => ({
    title: title.trim(),
    startDate,
    endDate,
    status,
    positionIds,
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

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required.';
    if (!startDate || !endDate) return 'Start and end dates are required.';
    if (new Date(endDate) < new Date(startDate)) return 'End date must be on or after start date.';
    if (positionIds.length === 0) return 'Select at least one position.';
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
    if ((status === 'ACTIVE' || status === 'FINALIZED') && totalWeight !== 100) {
      return 'Total weight must equal 100% for ACTIVE or FINALIZED templates.';
    }
    return null;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = validate();
    if (message) {
      toast.error(message);
      return;
    }
    const payload = buildPayload();
    try {
      setSaving(true);
      if (isEdit && !Number.isNaN(templateId)) {
        await kpiTemplateService.updateTemplate(templateId, payload);
        toast.success('Template updated.');
      } else {
        await kpiTemplateService.createTemplate(payload);
        toast.success('Template created.');
      }
      navigate('/hr/kpi-template');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const addPositionFromDropdown = (rawId: string) => {
    if (!rawId) return;
    const pid = Number(rawId);
    if (Number.isNaN(pid)) return;
    setPositionIds((prev) => (prev.includes(pid) ? prev : [...prev, pid]));
  };

  const removePosition = (pid: number) => {
    setPositionIds((prev) => prev.filter((idValue) => idValue !== pid));
  };

  const positionTitleById = useMemo(() => {
    const map = new Map<number, string>();
    positions.forEach((p) => map.set(p.id, p.positionTitle));
    return map;
  }, [positions]);

  const availablePositions = useMemo(
    () => positions.filter((p) => !positionIds.includes(p.id)),
    [positions, positionIds],
  );

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

        <form noValidate onSubmit={onSubmit} className="space-y-8">
          <section className="kpi-tpl-card p-6 sm:p-8">
            <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-gray-100 pb-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <i className="bi bi-info-circle text-xl" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Basics</h2>
                <p className="mt-0.5 text-sm text-gray-500">Title, lifecycle status, and evaluation window</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <FieldLabel>Title</FieldLabel>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Q2 Sales KPIs"
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-2">
                <FieldLabel>Status</FieldLabel>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as KpiFormStatus)}
                  className={`${fieldClass} cursor-pointer`}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="FINALIZED">FINALIZED</option>
                  <option value="SENT">SENT</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <FieldLabel>Start date</FieldLabel>
                <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClass} />
              </label>
              <label className="flex flex-col gap-2">
                <FieldLabel>End date</FieldLabel>
                <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldClass} />
              </label>
            </div>
          </section>

          <section className="kpi-tpl-card p-6 sm:p-8">
            <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-gray-100 pb-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <i className="bi bi-briefcase text-xl" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Positions</h2>
                <p className="mt-0.5 text-sm text-gray-500">Add one or more roles this template applies to</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <FieldLabel>Assign positions</FieldLabel>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="relative w-full lg:max-w-md">
                  <i className="bi bi-chevron-down pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
                  <select
                    value=""
                    onChange={(event) => {
                      addPositionFromDropdown(event.target.value);
                      event.target.value = '';
                    }}
                    className={`${fieldClass} cursor-pointer appearance-none pr-10`}
                    aria-label="Add position"
                  >
                    <option value="">
                      {availablePositions.length === 0 ? 'All positions added' : 'Select position to add…'}
                    </option>
                    {availablePositions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.positionTitle}
                      </option>
                    ))}
                  </select>
                </div>
                {positionIds.length > 0 && (
                  <div className="flex min-h-11 flex-1 flex-wrap items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/90 px-4 py-3">
                    {positionIds.map((pid) => (
                      <span
                        key={pid}
                        className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-950 shadow-sm"
                      >
                        <i className="bi bi-person-badge text-violet-600" aria-hidden />
                        {positionTitleById.get(pid) ?? `Position #${pid}`}
                        <button
                          type="button"
                          onClick={() => removePosition(pid)}
                          className="rounded-full p-0.5 text-violet-800/70 transition hover:bg-violet-100 hover:text-violet-950"
                          title="Remove"
                          aria-label={`Remove ${positionTitleById.get(pid) ?? pid}`}
                        >
                          <i className="bi bi-x-lg text-sm" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="kpi-tpl-card overflow-hidden p-0">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-6 sm:px-8">
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
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-right shadow-sm">
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
                onAddRow={() => setRows((prev) => [...prev, newRow()])}
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
            <button type="submit" disabled={saving} className="kpi-tpl-btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? (
                <>
                  <span className="kpi-tpl-shimmer inline-block h-4 w-4 rounded-full bg-white/90" />
                  Saving…
                </>
              ) : (
                <>
                  Save template
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

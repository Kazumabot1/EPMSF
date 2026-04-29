import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { kpiCategoryService } from '../../../services/kpiCategoryService';
import { kpiItemService } from '../../../services/kpiItemService';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import { kpiUnitService } from '../../../services/kpiUnitService';
import { positionService } from '../../../services/positionService';
import type { KpiCategory } from '../../../types/kpiCategory';
import type { KpiItem } from '../../../types/kpiItem';
import type { KpiFormStatus, KpiTemplateRequest, KpiTemplateResponse, KpiTemplateRowDraft } from '../../../types/kpiTemplate';
import type { KpiUnit } from '../../../types/kpiUnit';
import type { PositionResponse } from '../../../types/position';
import KpiTemplateRowsTable from './KpiTemplateRowsTable';

type Props = {
  open: boolean;
  mode: 'create' | 'view' | 'edit';
  templateId?: number | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const fieldClass =
  'kpi-tpl-input min-h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400';

const newRow = (): KpiTemplateRowDraft => ({
  rowId: crypto.randomUUID(),
  kpiItemId: null,
  kpiLabel: '',
  kpiCategoryId: null,
  kpiUnitId: null,
  target: null,
  weight: null,
});

const KpiTemplateCreateModal = ({ open, mode, templateId, onClose, onSaved }: Props) => {
  const isCreate = mode === 'create';
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
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
    if (!open) return;
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
        if (!isCreate && templateId) {
          const tmpl: KpiTemplateResponse = await kpiTemplateService.getTemplateById(templateId);
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
        } else {
          resetForm();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load form.');
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [open, isCreate, templateId]);

  const totalWeight = useMemo(() => rows.reduce((sum, row) => sum + (row.weight ?? 0), 0), [rows]);

  const availablePositions = useMemo(
    () => positions.filter((p) => !positionIds.includes(p.id)),
    [positions, positionIds],
  );

  const positionTitleById = useMemo(() => {
    const map = new Map<number, string>();
    positions.forEach((p) => map.set(p.id, p.positionTitle));
    return map;
  }, [positions]);

  const resetForm = () => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setStatus('DRAFT');
    setPositionIds([]);
    setRows([newRow()]);
  };

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
    try {
      setSaving(true);
      if (isEdit && templateId) {
        await kpiTemplateService.updateTemplate(templateId, buildPayload());
        toast.success('Template updated.');
      } else {
        await kpiTemplateService.createTemplate(buildPayload());
        toast.success('Template created.');
      }
      await onSaved();
      resetForm();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
      <div className="kpi-tpl-modal">
        <div className="kpi-tpl-modal-header">
          <div>
            <p className="kpi-tpl-modal-kicker">{isCreate ? 'Create template' : isEdit ? 'Edit template' : 'View template'}</p>
            <h2>{isCreate ? 'New KPI Template' : isEdit ? 'Update KPI Template' : 'KPI Template Detail'}</h2>
          </div>
          <button type="button" onClick={onClose} className="kpi-tpl-btn-secondary">
            <i className="bi bi-x-lg" aria-hidden />
            Close
          </button>
        </div>

        {loading ? (
          <div className="kpi-tpl-modal-loading">
            <div className="kpi-tpl-shimmer h-10 w-10 rounded-xl bg-gradient-to-br from-violet-300 to-gray-200" />
            Loading form...
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="kpi-tpl-modal-body">
            <div className="kpi-tpl-modal-grid">
              <label>
                Title
                <input value={title} disabled={isView} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
              </label>
              <label>
                Status
                <select
                  value={status}
                  disabled={isView}
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
              <label>
                Start date
                <input type="date" disabled={isView} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClass} />
              </label>
              <label>
                End date
                <input type="date" disabled={isView} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldClass} />
              </label>
            </div>

            <div className="kpi-tpl-modal-positions">
              <p>Assign positions</p>
              <select
                value=""
                disabled={isView}
                onChange={(event) => {
                  const pid = Number(event.target.value);
                  if (!Number.isNaN(pid)) setPositionIds((prev) => (prev.includes(pid) ? prev : [...prev, pid]));
                  event.target.value = '';
                }}
                className={`${fieldClass} cursor-pointer`}
              >
                <option value="">{availablePositions.length === 0 ? 'All positions added' : 'Select position to add...'}</option>
                {availablePositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.positionTitle}
                  </option>
                ))}
              </select>
              {positionIds.length > 0 && (
                <div className="kpi-tpl-modal-chip-row">
                  {positionIds.map((pid) => (
                    <span key={pid}>
                      {positionTitleById.get(pid) ?? `Position #${pid}`}
                      {!isView && (
                        <button type="button" onClick={() => setPositionIds((prev) => prev.filter((i) => i !== pid))}>
                          <i className="bi bi-x-lg" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <KpiTemplateRowsTable
              rows={rows}
              categories={categories}
              units={units}
              items={items}
              onAddRow={() => setRows((prev) => [...prev, newRow()])}
              onRemoveRow={(rowId) => setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.rowId !== rowId) : prev))}
              onRowChange={(rowId, patch) => setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)))}
              readOnly={isView}
            />

            <div className="kpi-tpl-modal-footer">
              <p>Total weight: {totalWeight}%</p>
              {!isView && (
                <button type="submit" disabled={saving} className="kpi-tpl-btn-primary">
                  {saving ? 'Saving...' : isEdit ? 'Update template' : 'Save template'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default KpiTemplateCreateModal;

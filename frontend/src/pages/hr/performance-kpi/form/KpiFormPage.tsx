import { useEffect, useMemo, useState, type FormEvent } from 'react';
import KpiDynamicRowsTable from '../../../../components/hr/performance-kpi/KpiDynamicRowsTable';
import { kpiCategoryService } from '../../../../services/kpiCategoryService';
import { kpiFormService } from '../../../../services/kpiFormService';
import { kpiItemService } from '../../../../services/kpiItemService';
import { kpiUnitService } from '../../../../services/kpiUnitService';
import { positionService } from '../../../../services/positionService';
import type { KpiCategory } from '../../../../types/kpiCategory';
import type { KpiForm, KpiFormPresentation, KpiFormRequest, KpiFormRowDraft } from '../../../../types/kpiForm';
import type { KpiItem } from '../../../../types/kpiItem';
import type { KpiUnit } from '../../../../types/kpiUnit';
import type { PositionResponse } from '../../../../types/position';
import '../kpi-ui.css';

type KpiFormBundle = {
  bundleId: string;
  formName: string;
  positionId: number;
  positionName: string;
  createdBy: string;
  createdAt: string;
  kpiIds: number[];
  rowScores: Record<number, { actual: number | null; score: number | null }>;
};

const STORAGE_KEY = 'epms-kpi-form-bundles';

const newRow = (): KpiFormRowDraft => ({
  rowId: crypto.randomUUID(),
  kpiItemId: null,
  kpiCategoryId: null,
  kpiUnitId: null,
  target: null,
  actual: null,
  weight: null,
  score: null,
});

const parseBundles = (): KpiFormBundle[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored) as KpiFormBundle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const calculateWeightedScore = (score: number | null, weight: number | null): number => {
  if (score === null || weight === null) {
    return 0;
  }
  return Number(((score * weight) / 100).toFixed(2));
};

const KpiFormPage = () => {
  const [kpis, setKpis] = useState<KpiForm[]>([]);
  const [units, setUnits] = useState<KpiUnit[]>([]);
  const [categories, setCategories] = useState<KpiCategory[]>([]);
  const [items, setItems] = useState<KpiItem[]>([]);
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [bundles, setBundles] = useState<KpiFormBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [positionId, setPositionId] = useState('');
  const [createdBy, setCreatedBy] = useState(localStorage.getItem('epmsUserEmail') ?? '');
  const [rows, setRows] = useState<KpiFormRowDraft[]>([newRow()]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [positionFilter, setPositionFilter] = useState('');

  const saveBundles = (nextBundles: KpiFormBundle[]) => {
    setBundles(nextBundles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBundles));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [kpiResponse, unitResponse, categoryResponse, itemResponse, positionResponse] = await Promise.all([
        kpiFormService.getAll(),
        kpiUnitService.getAll(),
        kpiCategoryService.getAll(),
        kpiItemService.getAll(),
        positionService.getPositions(),
      ]);
      setKpis(kpiResponse);
      setUnits(unitResponse);
      setCategories(categoryResponse);
      setItems(itemResponse);
      setPositions(positionResponse);
      setBundles(parseBundles());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load KPI form data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const presentations = useMemo<KpiFormPresentation[]>(() => {
    return bundles.map((bundle) => {
      const totalScore = bundle.kpiIds.reduce((sum, kpiId) => {
        const kpi = kpis.find((item) => item.id === kpiId);
        const score = bundle.rowScores[kpiId]?.score ?? null;
        const weight = kpi?.weight ?? null;
        return sum + calculateWeightedScore(score, weight);
      }, 0);
      return {
        bundleId: bundle.bundleId,
        id: Number(bundle.bundleId.replaceAll('-', '').slice(0, 8)),
        title: bundle.formName,
        createdBy: bundle.createdBy,
        createdAt: bundle.createdAt,
        positionId: bundle.positionId,
        positionName: bundle.positionName,
        totalScore: Number(totalScore.toFixed(2)),
        rowCount: bundle.kpiIds.length,
      };
    });
  }, [bundles, kpis]);

  const filteredPresentations = useMemo(
    () =>
      presentations.filter((item) =>
        positionFilter ? String(item.positionId ?? '') === positionFilter : true,
      ),
    [positionFilter, presentations],
  );

  const totalDraftScore = useMemo(
    () => rows.reduce((sum, row) => sum + calculateWeightedScore(row.score, row.weight), 0),
    [rows],
  );

  const closeModal = () => {
    setShowModal(false);
    setEditingBundleId(null);
    setFormName('');
    setPositionId('');
    setRows([newRow()]);
    setFormError('');
  };

  const openCreate = () => {
    setEditingBundleId(null);
    setFormName('');
    setPositionId('');
    setRows([newRow()]);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (bundleId: string) => {
    const bundle = bundles.find((entry) => entry.bundleId === bundleId);
    if (!bundle) {
      return;
    }
    const mappedRows = bundle.kpiIds.map((kpiId) => {
      const kpi = kpis.find((entry) => entry.id === kpiId);
      return {
        rowId: crypto.randomUUID(),
        kpiItemId: kpi?.kpiItemId ?? null,
        kpiCategoryId: kpi?.kpiCategoryId ?? null,
        kpiUnitId: kpi?.kpiUnitId ?? null,
        target: kpi?.target ?? null,
        actual: bundle.rowScores[kpiId]?.actual ?? null,
        weight: kpi?.weight ?? null,
        score: bundle.rowScores[kpiId]?.score ?? null,
      } satisfies KpiFormRowDraft;
    });
    setEditingBundleId(bundleId);
    setFormName(bundle.formName);
    setPositionId(String(bundle.positionId));
    setCreatedBy(bundle.createdBy);
    setRows(mappedRows.length > 0 ? mappedRows : [newRow()]);
    setFormError('');
    setShowModal(true);
  };

  const validateForm = (): string => {
    if (!formName.trim()) {
      return 'KPI form name is required.';
    }
    if (!positionId) {
      return 'Position is required.';
    }
    if (!createdBy.trim()) {
      return 'Created by is required.';
    }
    if (rows.length === 0) {
      return 'At least one KPI row is required.';
    }
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row.kpiItemId || !row.kpiCategoryId || !row.kpiUnitId) {
        return `Row ${index + 1}: KPI item, category, and unit are required.`;
      }
      if (row.weight === null || Number.isNaN(row.weight)) {
        return `Row ${index + 1}: Weight is required.`;
      }
    }
    return '';
  };

  const buildPayload = (row: KpiFormRowDraft, rowIndex: number): KpiFormRequest => {
    const selectedItem = items.find((entry) => entry.id === row.kpiItemId);
    return {
      title: `${formName.trim()} - ${selectedItem?.name ?? `Row ${rowIndex + 1}`}`,
      target: row.target,
      weight: row.weight ?? 1,
      kpiUnitId: row.kpiUnitId ?? 0,
      kpiCategoryId: row.kpiCategoryId ?? 0,
      kpiItemId: row.kpiItemId ?? 0,
      createdBy: createdBy.trim(),
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const selectedPosition = positions.find((entry) => entry.id === Number(positionId));
    if (!selectedPosition) {
      setFormError('Selected position is invalid.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      if (editingBundleId) {
        const existingBundle = bundles.find((entry) => entry.bundleId === editingBundleId);
        if (!existingBundle) {
          throw new Error('KPI form bundle not found.');
        }

        const nextKpiIds: number[] = [];
        const nextRowScores: Record<number, { actual: number | null; score: number | null }> = {};
        const existingIds = [...existingBundle.kpiIds];

        for (let index = 0; index < rows.length; index += 1) {
          const payload = buildPayload(rows[index], index);
          const existingId = existingIds[index];
          const rowState = rows[index];
          if (existingId) {
            const updated = await kpiFormService.update(existingId, payload);
            nextKpiIds.push(updated.id);
            nextRowScores[updated.id] = { actual: rowState.actual, score: rowState.score };
          } else {
            const created = await kpiFormService.create(payload);
            nextKpiIds.push(created.id);
            nextRowScores[created.id] = { actual: rowState.actual, score: rowState.score };
          }
        }

        if (existingIds.length > rows.length) {
          const idsToDelete = existingIds.slice(rows.length);
          await Promise.all(idsToDelete.map((id) => kpiFormService.remove(id)));
        }

        const nextBundles = bundles.map((entry) =>
          entry.bundleId === editingBundleId
            ? {
                ...entry,
                formName: formName.trim(),
                positionId: selectedPosition.id,
                positionName: selectedPosition.positionTitle,
                createdBy: createdBy.trim(),
                kpiIds: nextKpiIds,
                rowScores: nextRowScores,
              }
            : entry,
        );
        saveBundles(nextBundles);
      } else {
        const kpiResults: KpiForm[] = [];
        for (let index = 0; index < rows.length; index += 1) {
          const payload = buildPayload(rows[index], index);
          const created = await kpiFormService.create(payload);
          kpiResults.push(created);
        }

        const rowScores = Object.fromEntries(
          kpiResults.map((kpi, index) => [kpi.id, { actual: rows[index].actual, score: rows[index].score }]),
        ) as Record<number, { actual: number | null; score: number | null }>;

        const newBundle: KpiFormBundle = {
          bundleId: crypto.randomUUID(),
          formName: formName.trim(),
          positionId: selectedPosition.id,
          positionName: selectedPosition.positionTitle,
          createdBy: createdBy.trim(),
          createdAt: new Date().toISOString(),
          kpiIds: kpiResults.map((kpi) => kpi.id),
          rowScores,
        };
        saveBundles([newBundle, ...bundles]);
      }

      closeModal();
      await loadData();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Failed to save KPI form.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    const bundle = bundles.find((entry) => entry.bundleId === bundleId);
    if (!bundle) {
      return;
    }
    if (!window.confirm('Delete this KPI form and all associated KPI rows?')) {
      return;
    }
    try {
      await Promise.all(bundle.kpiIds.map((kpiId) => kpiFormService.remove(kpiId)));
      const nextBundles = bundles.filter((entry) => entry.bundleId !== bundleId);
      saveBundles(nextBundles);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete KPI form.');
    }
  };

  return (
    <div className="kpi-page">
      <div className="kpi-hero">
        <div className="kpi-hero-top">
          <div>
            <h1>Performance KPI - Form</h1>
            <p>Create and manage dynamic KPI forms per position.</p>
          </div>
          <button type="button" onClick={openCreate} className="kpi-btn-primary">
            <i className="bi bi-plus-circle mr-2" />
            Create KPI Form
          </button>
        </div>
      </div>

      <div className="kpi-surface">
        <div className="kpi-toolbar">
          <select
            value={positionFilter}
            onChange={(event) => setPositionFilter(event.target.value)}
            className="kpi-select max-w-xs"
          >
            <option value="">All positions</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.positionTitle}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void loadData()} className="kpi-btn-ghost">
            <i className="bi bi-arrow-clockwise mr-1" />
            Refresh
          </button>
        </div>

        {loading && <p className="kpi-state info">Loading KPI forms...</p>}
        {error && <p className="kpi-state error">{error}</p>}
        {!loading && !error && filteredPresentations.length === 0 && (
          <p className="kpi-state info">No KPI forms found.</p>
        )}

        {!loading && !error && filteredPresentations.length > 0 && (
          <div className="kpi-table-wrap">
            <table className="kpi-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Form Name</th>
                  <th>Position</th>
                  <th>Rows</th>
                  <th>Total Score</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPresentations.map((item) => {
                  return (
                    <tr key={item.bundleId}>
                      <td>{item.title}</td>
                      <td>{item.positionName}</td>
                      <td>{item.rowCount}</td>
                      <td className="font-semibold">{item.totalScore.toFixed(2)}</td>
                      <td>{item.createdBy}</td>
                      <td>
                        <div className="kpi-row-actions">
                          <button
                            type="button"
                            onClick={() => openEdit(item.bundleId)}
                            className="kpi-icon-btn"
                          >
                            <i className="bi bi-pencil-square" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteBundle(item.bundleId)}
                            className="kpi-icon-btn danger"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="kpi-modal-backdrop overflow-y-auto">
          <div className="kpi-modal mx-auto w-full max-w-6xl">
            <h2 className="kpi-modal-title">{editingBundleId ? 'Edit KPI Form' : 'Create KPI Form'}</h2>
            <form onSubmit={(event) => void handleSubmit(event)} className="kpi-form">
              <div className="kpi-form-grid">
                <div className="kpi-field">
                  <label htmlFor="kpiFormName">
                    KPI Form Name <span className="kpi-required">*</span>
                  </label>
                  <input
                    id="kpiFormName"
                    type="text"
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    className="kpi-input-sm"
                  />
                </div>
                <div className="kpi-field">
                  <label htmlFor="kpiFormPosition">
                    Position <span className="kpi-required">*</span>
                  </label>
                  <select
                    id="kpiFormPosition"
                    value={positionId}
                    onChange={(event) => setPositionId(event.target.value)}
                    className="kpi-select-sm"
                  >
                    <option value="">Select position</option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.positionTitle}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="kpi-field">
                  <label htmlFor="kpiFormCreatedBy">
                    Created By <span className="kpi-required">*</span>
                  </label>
                  <input
                    id="kpiFormCreatedBy"
                    type="text"
                    value={createdBy}
                    onChange={(event) => setCreatedBy(event.target.value)}
                    className="kpi-input-sm"
                  />
                </div>
              </div>

              <KpiDynamicRowsTable
                rows={rows}
                items={items}
                categories={categories}
                units={units}
                onAddRow={() => setRows((prev) => [...prev, newRow()])}
                onRemoveRow={(rowId) => setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.rowId !== rowId) : prev))}
                onRowChange={(rowId, changes) =>
                  setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)))
                }
              />

              <div className="kpi-total-score">
                Total Score: {totalDraftScore.toFixed(2)}
              </div>

              {formError && <p className="kpi-state error">{formError}</p>}

              <div className="kpi-form-actions">
                <button type="button" onClick={closeModal} className="kpi-btn-ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="kpi-btn-primary"
                >
                  {saving ? 'Saving...' : editingBundleId ? 'Update KPI Form' : 'Create KPI Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiFormPage;

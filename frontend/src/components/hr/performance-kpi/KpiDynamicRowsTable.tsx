import type { KpiCategory } from '../../../types/kpiCategory';
import type { KpiItem } from '../../../types/kpiItem';
import type { KpiUnit } from '../../../types/kpiUnit';
import type { KpiFormRowDraft } from '../../../types/kpiForm';

type KpiDynamicRowsTableProps = {
  rows: KpiFormRowDraft[];
  items: KpiItem[];
  categories: KpiCategory[];
  units: KpiUnit[];
  /** When true, rows are display-only; add/remove/change handlers are not used. */
  readOnly?: boolean;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onRowChange: (rowId: string, changes: Partial<KpiFormRowDraft>) => void;
};

const calculateWeightedScore = (score: number | null, weight: number | null): number => {
  if (score === null || weight === null) {
    return 0;
  }
  return Number(((score * weight) / 100).toFixed(2));
};

const labelFor = (
  id: number | null,
  list: { id: number; name: string }[],
  fallback: string,
) => (id != null ? list.find((e) => e.id === id)?.name ?? fallback : fallback);

const KpiDynamicRowsTable = ({
  rows,
  items,
  categories,
  units,
  readOnly = false,
  onAddRow,
  onRemoveRow,
  onRowChange,
}: KpiDynamicRowsTableProps) => (
  <div>
    <div className="kpi-rows-head">
      <h3>KPI Rows</h3>
      {!readOnly && (
        <button type="button" onClick={onAddRow} className="kpi-add-row">
          <i className="bi bi-plus-circle" /> Add Row
        </button>
      )}
    </div>
    <div className="kpi-grid-table-wrap">
      <table className="kpi-grid-table">
        <thead>
          <tr>
            <th>KPI Item</th>
            <th>Category</th>
            <th>Target</th>
            <th>Unit</th>
            <th>Actual</th>
            <th>Weight (%)</th>
            <th>Score (%)</th>
            <th>Weighted Score</th>
            {!readOnly && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const weightedScore = calculateWeightedScore(row.score, row.weight);
            if (readOnly) {
              return (
                <tr key={row.rowId}>
                  <td>{labelFor(row.kpiItemId, items, '—')}</td>
                  <td>{labelFor(row.kpiCategoryId, categories, '—')}</td>
                  <td>{row.target ?? '—'}</td>
                  <td>{labelFor(row.kpiUnitId, units, '—')}</td>
                  <td>{row.actual ?? '—'}</td>
                  <td>{row.weight ?? '—'}</td>
                  <td>{row.score ?? '—'}</td>
                  <td className="kpi-weighted">{weightedScore.toFixed(2)}</td>
                </tr>
              );
            }
            return (
              <tr key={row.rowId}>
                <td>
                  <select
                    value={row.kpiItemId ?? ''}
                    onChange={(event) => {
                      const value = event.target.value ? Number(event.target.value) : null;
                      const selectedItem = items.find((item) => item.id === value);
                      onRowChange(row.rowId, {
                        kpiItemId: value,
                        kpiCategoryId: selectedItem?.kpiCategoryId ?? row.kpiCategoryId,
                      });
                    }}
                    className="kpi-select-sm"
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={row.kpiCategoryId ?? ''}
                    onChange={(event) => onRowChange(row.rowId, { kpiCategoryId: event.target.value ? Number(event.target.value) : null })}
                    className="kpi-select-sm"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={row.target ?? ''}
                    onChange={(event) => onRowChange(row.rowId, { target: event.target.value ? Number(event.target.value) : null })}
                    className="kpi-input-sm"
                  />
                </td>
                <td>
                  <select
                    value={row.kpiUnitId ?? ''}
                    onChange={(event) => onRowChange(row.rowId, { kpiUnitId: event.target.value ? Number(event.target.value) : null })}
                    className="kpi-select-sm"
                  >
                    <option value="">Select unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={row.actual ?? ''}
                    onChange={(event) => onRowChange(row.rowId, { actual: event.target.value ? Number(event.target.value) : null })}
                    className="kpi-input-sm"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={row.weight ?? ''}
                    onChange={(event) => onRowChange(row.rowId, { weight: event.target.value ? Number(event.target.value) : null })}
                    className="kpi-input-sm"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={row.score ?? ''}
                    onChange={(event) => onRowChange(row.rowId, { score: event.target.value ? Number(event.target.value) : null })}
                    className="kpi-input-sm"
                  />
                </td>
                <td className="kpi-weighted">{weightedScore.toFixed(2)}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => onRemoveRow(row.rowId)}
                    className="kpi-remove-row"
                    disabled={rows.length === 1}
                  >
                    <i className="bi bi-trash" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default KpiDynamicRowsTable;

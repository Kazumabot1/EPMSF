import type { KpiCategory } from '../../../types/kpiCategory';
import type { KpiItem } from '../../../types/kpiItem';
import type { KpiTemplateRowDraft } from '../../../types/kpiTemplate';
import type { KpiUnit } from '../../../types/kpiUnit';
import './kpi-template.css';

type Props = {
  rows: KpiTemplateRowDraft[];
  categories: KpiCategory[];
  units: KpiUnit[];
  items: KpiItem[];
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onRowChange: (rowId: string, patch: Partial<KpiTemplateRowDraft>) => void;
  readOnly?: boolean;
};

const cellInput =
  'kpi-tpl-input min-h-[38px] w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400';

const KpiTemplateRowsTable = ({ rows, categories, units, items, onAddRow, onRemoveRow, onRowChange, readOnly = false }: Props) => {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-gray-900/[0.03]">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="kpi-tpl-thead">
            <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <th className="min-w-[200px] px-3 py-3.5">KPI</th>
              <th className="min-w-[140px] px-3 py-3.5">Category</th>
              <th className="min-w-[90px] px-3 py-3.5">Target</th>
              <th className="min-w-[120px] px-3 py-3.5">Unit</th>
              <th className="min-w-[88px] bg-violet-50 px-3 py-3.5 text-violet-900">Actual</th>
              <th className="min-w-[88px] px-3 py-3.5">Weight %</th>
              <th className="min-w-[88px] bg-violet-50 px-3 py-3.5 text-violet-900">Score %</th>
              <th className="min-w-[96px] bg-violet-50 px-3 py-3.5 text-violet-900">Weighted</th>
              <th className="w-12 px-2 py-3.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, rowIndex) => (
              <tr key={row.rowId} className="align-top odd:bg-gray-50/40 transition-colors hover:bg-violet-50/30">
                <td className="px-3 py-3">
                  <span className="mb-2 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Row {rowIndex + 1}
                  </span>
                  <select
                    value={row.kpiItemId ?? ''}
                    disabled={readOnly}
                    onChange={(event) => {
                      const value = event.target.value;
                      const id = value === '' ? null : Number(value);
                      const selected = id !== null ? items.find((item) => item.id === id) : undefined;
                      onRowChange(row.rowId, {
                        kpiItemId: id,
                        kpiLabel: id !== null ? '' : row.kpiLabel,
                        kpiCategoryId: selected?.kpiCategoryId ?? row.kpiCategoryId,
                      });
                    }}
                    className={`${cellInput} mb-2 cursor-pointer`}
                  >
                    <option value="">Catalog KPI…</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.kpiLabel}
                    disabled={readOnly || row.kpiItemId !== null}
                    onChange={(event) => onRowChange(row.rowId, { kpiLabel: event.target.value })}
                    placeholder="Or custom KPI name"
                    className={`${cellInput} disabled:bg-gray-100 disabled:text-gray-500`}
                  />
                </td>
                <td className="px-3 py-3">
                  <select
                    value={row.kpiCategoryId ?? ''}
                    disabled={readOnly}
                    onChange={(event) => {
                      const v = event.target.value;
                      onRowChange(row.rowId, { kpiCategoryId: v === '' ? null : Number(v) });
                    }}
                    className={`${cellInput} cursor-pointer`}
                  >
                    <option value="">Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={row.target ?? ''}
                    disabled={readOnly}
                    onChange={(event) => {
                      const v = event.target.value;
                      onRowChange(row.rowId, { target: v === '' ? null : Number(v) });
                    }}
                    className={`${cellInput} tabular-nums`}
                  />
                </td>
                <td className="px-3 py-3">
                  <select
                    value={row.kpiUnitId ?? ''}
                    disabled={readOnly}
                    onChange={(event) => {
                      const v = event.target.value;
                      onRowChange(row.rowId, { kpiUnitId: v === '' ? null : Number(v) });
                    }}
                    className={`${cellInput} cursor-pointer`}
                  >
                    <option value="">Unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="bg-violet-50/60 px-3 py-3">
                  <div className="flex h-[72px] flex-col items-center justify-center rounded-lg border border-dashed border-violet-200 bg-white/70 px-2 text-center shadow-inner">
                    <i className="bi bi-lock text-violet-400" aria-hidden />
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-violet-700/85">PM</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={row.weight ?? ''}
                    disabled={readOnly}
                    onChange={(event) => {
                      const v = event.target.value;
                      onRowChange(row.rowId, { weight: v === '' ? null : Number(v) });
                    }}
                    className={`${cellInput} font-semibold tabular-nums`}
                  />
                </td>
                <td className="bg-violet-50/60 px-3 py-3">
                  <div className="flex h-[72px] flex-col items-center justify-center rounded-lg border border-dashed border-violet-200 bg-white/70 px-2 text-center shadow-inner">
                    <i className="bi bi-graph-up-arrow text-violet-400" aria-hidden />
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-violet-700/85">PM</span>
                  </div>
                </td>
                <td className="bg-violet-50/60 px-3 py-3 text-center">
                  <span className="inline-flex min-w-12 items-center justify-center rounded-md bg-gray-100 px-2 py-2 text-xs font-medium text-gray-400">
                    —
                  </span>
                </td>
                <td className="px-2 py-3">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveRow(row.rowId)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Remove row"
                      aria-label="Remove row"
                    >
                      <i className="bi bi-trash" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 via-violet-50/30 to-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        {!readOnly && (
          <button type="button" onClick={onAddRow} className="kpi-tpl-btn-primary w-full justify-center sm:w-auto">
            <i className="bi bi-plus-lg text-lg" aria-hidden />
            Add KPI row
          </button>
        )}
        <p className="max-w-md text-xs leading-relaxed text-gray-600">
          <span className="font-semibold text-gray-800">Weighted score</span> (PM phase):{' '}
          <code className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-gray-800 shadow-sm ring-1 ring-gray-200">
            (score × weight) ÷ 100
          </code>
        </p>
      </div>
    </div>
  );
};

export default KpiTemplateRowsTable;

import { Link } from 'react-router-dom';
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

type KpiNumberInputProps = {
  value: number | null;
  disabled: boolean;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  className?: string;
};

const blockedNumberKeys = new Set(['-', '+', 'e', 'E']);

function isNumericKpiNumberText(value: string) {
  if (value === '') {
    return true;
  }
  return /^\d+(\.\d*)?$/.test(value) && Number.isFinite(Number(value));
}

function isInvalidKpiNumberValue(value: number | null, min?: number, max?: number) {
  if (value === null) {
    return false;
  }
  return !Number.isFinite(value) || (min != null && value < min) || (max != null && value > max);
}

function KpiNumberInput({ value, disabled, onChange, min, max, className = '' }: KpiNumberInputProps) {
  const invalid = isInvalidKpiNumberValue(value, min, max);

  return (
    <div className={`kpi-tpl-number-box ${disabled ? 'is-disabled' : ''} ${invalid ? 'is-invalid' : ''}`}>
      <input
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        disabled={disabled}
        onKeyDown={(event) => {
          if (blockedNumberKeys.has(event.key)) {
            event.preventDefault();
          }
        }}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData('text');
          if (!isNumericKpiNumberText(pasted)) {
            event.preventDefault();
          }
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (!isNumericKpiNumberText(nextValue)) {
            return;
          }
          onChange(nextValue === '' ? null : Number(nextValue));
        }}
        className={`kpi-tpl-number-input ${className}`}
      />
    </div>
  );
}

const KpiTemplateRowsTable = ({ rows, categories, units, items, onAddRow, onRemoveRow, onRowChange, readOnly = false }: Props) => {
  const totalWeight = rows.reduce((sum, row) => sum + (row.weight ?? 0), 0);
  const catalogDataMissing = categories.length === 0 || items.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-gray-900/[0.03]">
      {catalogDataMissing && !readOnly && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Optional catalog data for KPI rows</p>
          <p className="mt-1 text-amber-800/90">
            {categories.length === 0 && (
              <>
                Catalog categories:{' '}
                <Link to="/hr/performance-kpi/category" className="font-semibold underline">
                  KPI Categories
                </Link>
                .{' '}
              </>
            )}
            {items.length === 0 && (
              <>
                Optional catalog items:{' '}
                <Link to="/hr/performance-kpi/item" className="font-semibold underline">
                  KPI Items
                </Link>
                .
              </>
            )}
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="kpi-tpl-thead">
            <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <th className="min-w-[200px] px-3 py-3.5">KPI</th>
              <th className="min-w-[140px] px-3 py-3.5">Category</th>
              <th className="min-w-[90px] px-3 py-3.5">Target %</th>
              <th className="min-w-[120px] px-3 py-3.5">Unit</th>
              <th className="min-w-[88px] bg-blue-50 px-3 py-3.5 text-blue-900">Actual %</th>
              <th className="min-w-[88px] px-3 py-3.5">Weight %</th>
              <th className="min-w-[88px] bg-blue-50 px-3 py-3.5 text-blue-900">Score %</th>
              <th className="min-w-[96px] bg-blue-50 px-3 py-3.5 text-blue-900">Weight Score</th>
              <th className="w-12 px-2 py-3.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, rowIndex) => (
                <tr
                  key={row.rowId}
                  className={`align-top odd:bg-gray-50/40 transition-colors hover:bg-blue-50/30 ${
                    row.id == null && row.changeReason ? 'kpi-tpl-row-added' : ''
                  }`}
                >
                <td className="px-3 py-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      Row {rowIndex + 1}
                    </span>
                    {row.id == null && row.changeReason && (
                      <span className="kpi-tpl-change-pill added">Added</span>
                    )}
                  </div>
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
                        kpiCategoryLabel: selected != null ? '' : row.kpiCategoryLabel,
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
                      const id = v === '' ? null : Number(v);
                      onRowChange(row.rowId, {
                        kpiCategoryId: id,
                        kpiCategoryLabel: id !== null ? '' : row.kpiCategoryLabel,
                      });
                    }}
                    className={`${cellInput} mb-2 cursor-pointer`}
                  >
                    <option value="">Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.kpiCategoryLabel}
                    maxLength={100}
                    disabled={readOnly || row.kpiCategoryId !== null}
                    onChange={(event) => onRowChange(row.rowId, { kpiCategoryLabel: event.target.value })}
                    placeholder="Or custom category"
                    className={`${cellInput} disabled:bg-gray-100 disabled:text-gray-500`}
                  />
                </td>
                <td className="px-3 py-3">
                  <KpiNumberInput
                    min={1}
                    max={100}
                    value={row.target}
                    disabled={readOnly}
                    onChange={(target) => onRowChange(row.rowId, { target })}
                    className="text-right tabular-nums"
                  />
                </td>
                <td className="px-3 py-3">
                  <select
                    value={row.kpiUnitId ?? ''}
                    disabled={readOnly}
                    onChange={(event) => {
                      const v = event.target.value;
                      const id = v === '' ? null : Number(v);
                      onRowChange(row.rowId, {
                        kpiUnitId: id,
                        kpiUnitLabel: id !== null ? '' : row.kpiUnitLabel,
                      });
                    }}
                    className={`${cellInput} mb-2 cursor-pointer`}
                  >
                    <option value="">Unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.kpiUnitLabel}
                    maxLength={100}
                    disabled={readOnly || row.kpiUnitId !== null}
                    onChange={(event) => onRowChange(row.rowId, { kpiUnitLabel: event.target.value })}
                    placeholder="Or custom unit"
                    className={`${cellInput} disabled:bg-gray-100 disabled:text-gray-500`}
                  />
                </td>
                <td className="bg-blue-50/60 px-3 py-3">
                  <div className="flex h-[72px] flex-col items-center justify-center rounded-lg border border-dashed border-blue-200 bg-white/70 px-2 text-center shadow-inner">
                    <i className="bi bi-lock text-blue-400" aria-hidden />
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-700/85">Manager</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <KpiNumberInput
                    min={1}
                    max={100}
                    value={row.weight}
                    disabled={readOnly}
                    onChange={(weight) => onRowChange(row.rowId, { weight })}
                    className="text-right font-semibold tabular-nums"
                  />
                </td>
                <td className="bg-blue-50/60 px-3 py-3">
                  <div className="flex h-[72px] flex-col items-center justify-center rounded-lg border border-dashed border-blue-200 bg-white/70 px-2 text-center shadow-inner">
                    <i className="bi bi-graph-up-arrow text-blue-400" aria-hidden />
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-700/85">PM</span>
                  </div>
                </td>
                <td className="bg-blue-50/60 px-3 py-3 text-center">
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
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td colSpan={5} className="px-3 py-3 text-right text-xs uppercase tracking-wide text-gray-600">
                Total weight
              </td>
              <td
                className={`px-3 py-3 tabular-nums ${
                  totalWeight !== 100 ? 'text-amber-700' : 'text-gray-900'
                }`}
              >
                {totalWeight}%
              </td>
              <td colSpan={2} className="bg-blue-50/60 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-blue-700/85">
                Total score (PM)
              </td>
              <td className="w-12" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 via-blue-50/30 to-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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

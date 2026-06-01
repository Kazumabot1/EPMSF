import { Link } from 'react-router-dom';
import type { KpiCategory } from '../../../types/kpiCategory';
import type { KpiItem } from '../../../types/kpiItem';
import type { KpiTemplateRowDraft } from '../../../types/kpiTemplate';
import type { KpiUnit } from '../../../types/kpiUnit';

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
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

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
  if (value === '') return true;
  return /^\d+(\.\d*)?$/.test(value) && Number.isFinite(Number(value));
}

function isInvalidKpiNumberValue(value: number | null, min?: number, max?: number) {
  if (value === null) return false;
  return !Number.isFinite(value) || (min != null && value < min) || (max != null && value > max);
}

function KpiNumberInput({ value, disabled, onChange, min, max, className = '' }: KpiNumberInputProps) {
  const invalid = isInvalidKpiNumberValue(value, min, max);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value ?? ''}
      disabled={disabled}
      onKeyDown={(event) => {
        if (blockedNumberKeys.has(event.key)) event.preventDefault();
      }}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData('text');
        if (!isNumericKpiNumberText(pasted)) event.preventDefault();
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (!isNumericKpiNumberText(nextValue)) return;
        onChange(nextValue === '' ? null : Number(nextValue));
      }}
      className={`${cellInput} text-right font-mono tabular-nums ${invalid ? 'border-red-400 ring-4 ring-red-100' : ''} ${className}`}
    />
  );
}

const KpiTemplateRowsTable = ({
  rows,
  categories,
  units,
  items,
  onAddRow,
  onRemoveRow,
  onRowChange,
  readOnly = false,
}: Props) => {
  const totalWeight = rows.reduce((sum, row) => sum + (row.weight ?? 0), 0);
  const catalogDataMissing = categories.length === 0 || items.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {catalogDataMissing && !readOnly && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Optional catalog data for KPI rows</p>
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
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="w-[72px] px-3 py-3 text-center">No.</th>
              <th className="min-w-[230px] px-3 py-3">KPI</th>
              <th className="min-w-[190px] px-3 py-3">Category</th>
              <th className="min-w-[108px] px-3 py-3 text-right">Target %</th>
              <th className="min-w-[175px] px-3 py-3">Unit</th>
              <th className="min-w-[100px] bg-blue-50 px-3 py-3 text-center text-blue-800">Actual %</th>
              <th className="min-w-[108px] px-3 py-3 text-right">Weight %</th>
              <th className="min-w-[100px] bg-blue-50 px-3 py-3 text-center text-blue-800">Score %</th>
              <th className="min-w-[112px] bg-blue-50 px-3 py-3 text-center text-blue-800">Weight Score</th>
              <th className="w-14 px-2 py-3 text-center" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, rowIndex) => (
              <tr
                key={row.rowId}
                className={`align-top transition-colors hover:bg-blue-50/40 ${
                  rowIndex % 2 === 1 ? 'bg-slate-50/50' : ''
                } ${row.id == null && row.changeReason ? 'bg-emerald-50/40' : ''}`}
              >
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                    {rowIndex + 1}
                  </span>
                  {row.id == null && row.changeReason && (
                    <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      Added
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-2">
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
                      className={`${cellInput} cursor-pointer`}
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
                      className={cellInput}
                    />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <select
                      value={row.kpiCategoryId ?? ''}
                      disabled={readOnly}
                      onChange={(event) => {
                        const value = event.target.value;
                        const id = value === '' ? null : Number(value);
                        onRowChange(row.rowId, {
                          kpiCategoryId: id,
                          kpiCategoryLabel: id !== null ? '' : row.kpiCategoryLabel,
                        });
                      }}
                      className={`${cellInput} cursor-pointer`}
                    >
                      <option value="">Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
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
                      className={cellInput}
                    />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <KpiNumberInput
                    min={1}
                    max={100}
                    value={row.target}
                    disabled={readOnly}
                    onChange={(target) => onRowChange(row.rowId, { target })}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <select
                      value={row.kpiUnitId ?? ''}
                      disabled={readOnly}
                      onChange={(event) => {
                        const value = event.target.value;
                        const id = value === '' ? null : Number(value);
                        onRowChange(row.rowId, {
                          kpiUnitId: id,
                          kpiUnitLabel: id !== null ? '' : row.kpiUnitLabel,
                        });
                      }}
                      className={`${cellInput} cursor-pointer`}
                    >
                      <option value="">Unit</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
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
                      className={cellInput}
                    />
                  </div>
                </td>
                <td className="bg-blue-50/60 px-3 py-3">
                  <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-blue-200 bg-blue-50/80 px-2 py-3 text-center text-xs font-semibold text-blue-700">
                    <i className="bi bi-lock text-blue-500" aria-hidden />
                    <span>Manager</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <KpiNumberInput
                    min={1}
                    max={100}
                    value={row.weight}
                    disabled={readOnly}
                    onChange={(weight) => onRowChange(row.rowId, { weight })}
                    className="font-semibold"
                  />
                </td>
                <td className="bg-blue-50/60 px-3 py-3">
                  <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-blue-200 bg-blue-50/80 px-2 py-3 text-center text-xs font-semibold text-blue-700">
                    <i className="bi bi-graph-up-arrow text-blue-500" aria-hidden />
                    <span>PM</span>
                  </div>
                </td>
                <td className="bg-blue-50/60 px-3 py-3 text-center">
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50/80 px-2 py-3 text-lg text-slate-400">
                    —
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveRow(row.rowId)}
                      disabled={rows.length <= 1}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
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
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td colSpan={6} className="px-3 py-3 text-right text-xs uppercase tracking-wide text-slate-600">
                Total weight
              </td>
              <td
                className={`px-3 py-3 text-right font-mono tabular-nums ${
                  totalWeight !== 100 ? 'text-amber-700' : 'text-slate-950'
                }`}
              >
                {totalWeight}%
              </td>
              <td
                colSpan={2}
                className="bg-blue-50/60 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-blue-700"
              >
                Total score (Manager)
              </td>
              <td className="w-14" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        {!readOnly && (
          <button
            type="button"
            onClick={onAddRow}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:from-blue-50 hover:to-blue-100 sm:w-auto"
          >
            <i className="bi bi-plus-lg text-lg" aria-hidden />
            Add KPI row
          </button>
        )}
        <p className="max-w-md text-xs leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Weighted score</span> (Manager phase):{' '}
          <code className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-slate-800 shadow-sm ring-1 ring-slate-200">
            (score × weight) ÷ 100
          </code>
        </p>
      </div>
    </div>
  );
};

export default KpiTemplateRowsTable;

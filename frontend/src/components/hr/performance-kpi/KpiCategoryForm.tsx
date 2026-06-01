import type { FormEvent } from 'react';

type KpiCategoryFormProps = {
  value: string;
  error: string;
  saving: boolean;
  submitLabel: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const fieldClass =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

const btnSecondary =
  'inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700';

const btnPrimary =
  'inline-flex min-h-10 items-center rounded-lg border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:from-blue-50 hover:to-blue-100 disabled:cursor-not-allowed disabled:opacity-50';

const KpiCategoryForm = ({
  value,
  error,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: KpiCategoryFormProps) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
      Category name <span className="text-red-600">*</span>
      <input
        id="kpiCategoryName"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
        placeholder="Enter KPI category name"
      />
    </label>
    {error && (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
        {error}
      </p>
    )}
    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
      <button type="button" onClick={onCancel} className={btnSecondary}>
        Cancel
      </button>
      <button type="submit" disabled={saving} className={btnPrimary}>
        {saving ? 'Saving…' : submitLabel}
      </button>
    </div>
  </form>
);

export default KpiCategoryForm;

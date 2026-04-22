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

const KpiCategoryForm = ({
  value,
  error,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: KpiCategoryFormProps) => (
  <form onSubmit={onSubmit} className="kpi-form">
    <div className="kpi-field">
      <label htmlFor="kpiCategoryName">
        Category Name <span className="kpi-required">*</span>
      </label>
      <input
        id="kpiCategoryName"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="kpi-input-sm"
        placeholder="Enter KPI category name"
      />
    </div>
    {error && <p className="kpi-state error">{error}</p>}
    <div className="kpi-form-actions">
      <button type="button" onClick={onCancel} className="kpi-btn-ghost">
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="kpi-btn-primary"
      >
        {saving ? 'Saving...' : submitLabel}
      </button>
    </div>
  </form>
);

export default KpiCategoryForm;

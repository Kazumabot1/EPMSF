import type { FormEvent } from 'react';

type KpiUnitFormProps = {
  value: string;
  error: string;
  saving: boolean;
  submitLabel: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const KpiUnitForm = ({
  value,
  error,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: KpiUnitFormProps) => (
  <form onSubmit={onSubmit} className="kpi-form">
    <div className="kpi-field">
      <label htmlFor="kpiUnitName">
        Unit Name <span className="kpi-required">*</span>
      </label>
      <input
        id="kpiUnitName"
        type="text"
        value={value}
        maxLength={100}
        onChange={(event) => onChange(event.target.value)}
        className="kpi-input-sm"
        placeholder="Enter KPI unit name"
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

export default KpiUnitForm;

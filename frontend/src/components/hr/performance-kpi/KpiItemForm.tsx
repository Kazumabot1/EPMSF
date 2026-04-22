import type { FormEvent } from 'react';
import type { KpiCategory } from '../../../types/kpiCategory';

type KpiItemFormProps = {
  name: string;
  categoryId: string;
  categories: KpiCategory[];
  error: string;
  saving: boolean;
  submitLabel: string;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const KpiItemForm = ({
  name,
  categoryId,
  categories,
  error,
  saving,
  submitLabel,
  onNameChange,
  onCategoryChange,
  onSubmit,
  onCancel,
}: KpiItemFormProps) => (
  <form onSubmit={onSubmit} className="kpi-form">
    <div className="kpi-field">
      <label htmlFor="kpiItemName">
        KPI Item Name <span className="kpi-required">*</span>
      </label>
      <input
        id="kpiItemName"
        type="text"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        className="kpi-input-sm"
        placeholder="Enter KPI item name"
      />
    </div>
    <div className="kpi-field">
      <label htmlFor="kpiItemCategory">
        KPI Category <span className="kpi-required">*</span>
      </label>
      <select
        id="kpiItemCategory"
        value={categoryId}
        onChange={(event) => onCategoryChange(event.target.value)}
        className="kpi-select-sm"
      >
        <option value="">Select category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
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

export default KpiItemForm;

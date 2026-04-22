import { useEffect, useState } from 'react';

export interface DepartmentFormValues {
  departmentName: string;
}

const DEFAULT_VALUES: DepartmentFormValues = { departmentName: '' };

interface DepartmentFormProps {
  initialValues?: DepartmentFormValues;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (values: DepartmentFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

const DepartmentForm = ({
  initialValues,
  submitLabel,
  loading = false,
  onSubmit,
  onCancel,
}: DepartmentFormProps) => {
  const [values, setValues] = useState<DepartmentFormValues>(initialValues ?? DEFAULT_VALUES);

  useEffect(() => {
    setValues(initialValues ?? DEFAULT_VALUES);
  }, [initialValues?.departmentName]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ departmentName: values.departmentName.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="department-form">
      <div className="department-form-group">
        <label htmlFor="departmentName">Department Name</label>
        <input
          id="departmentName"
          name="departmentName"
          type="text"
          value={values.departmentName}
          onChange={(event) => setValues({ departmentName: event.target.value })}
          placeholder="Enter department name"
          required
        />
      </div>

      <div className="department-form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="department-btn secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="department-btn primary"
        >
          {loading && <i className="bi bi-arrow-repeat animate-spin" />}
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default DepartmentForm;

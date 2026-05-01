import { useEffect, useState } from 'react';

export interface DepartmentFormValues {
  departmentName: string;
  departmentCode: string;
  headEmployee: string;
}

const DEFAULT_VALUES: DepartmentFormValues = {
  departmentName: '',
  departmentCode: '',
  headEmployee: '',
};

interface DepartmentFormProps {
  initialValues?: DepartmentFormValues;
  submitLabel?: string;
  loading?: boolean;
  onSubmit: (values: DepartmentFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

const DepartmentForm = ({
  initialValues,
  submitLabel = 'Save Department',
  loading = false,
  onSubmit,
  onCancel,
}: DepartmentFormProps) => {
  const [values, setValues] = useState<DepartmentFormValues>(initialValues ?? DEFAULT_VALUES);

  useEffect(() => {
    setValues(initialValues ?? DEFAULT_VALUES);
  }, [initialValues]);

  const updateField = (name: keyof DepartmentFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      departmentName: values.departmentName.trim(),
      departmentCode: values.departmentCode.trim(),
      headEmployee: values.headEmployee.trim(),
    });
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
          onChange={(event) => updateField('departmentName', event.target.value)}
          placeholder="Enter department name"
          required
        />
      </div>

      <div className="department-form-group">
        <label htmlFor="departmentCode">Department Code</label>
        <input
          id="departmentCode"
          name="departmentCode"
          type="text"
          value={values.departmentCode}
          onChange={(event) => updateField('departmentCode', event.target.value)}
          placeholder="Optional, for example HR or FIN"
        />
      </div>

      <div className="department-form-group">
        <label htmlFor="headEmployee">Head Employee</label>
        <input
          id="headEmployee"
          name="headEmployee"
          type="text"
          value={values.headEmployee}
          onChange={(event) => updateField('headEmployee', event.target.value)}
          placeholder="Optional department head name or employee code"
        />
      </div>

      <div className="department-form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} className="department-btn secondary">
            Cancel
          </button>
        )}
        <button type="submit" disabled={loading} className="department-btn primary">
          {loading && <i className="bi bi-arrow-repeat animate-spin" />}
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default DepartmentForm;

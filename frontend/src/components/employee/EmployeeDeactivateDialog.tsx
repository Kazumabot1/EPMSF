import { useState } from 'react';
import toast from 'react-hot-toast';
import { deactivateEmployee, parseApiError, type EmployeeResponse } from '../../services/employeeService';

type Props = {
  open: boolean;
  employee: EmployeeResponse | null;
  onClose: () => void;
  onDeactivated: () => void;
};

const EmployeeDeactivateDialog = ({ open, employee, onClose, onDeactivated }: Props) => {
  const [pending, setPending] = useState(false);

  if (!open || !employee) {
    return null;
  }

  const name =
    employee.fullName?.trim() ||
    [employee.firstName, employee.lastName].filter(Boolean).join(' ') ||
    `Employee #${employee.id}`;

  const runDeactivate = async () => {
    try {
      setPending(true);
      await deactivateEmployee(employee.id);
      toast.success('Employee deactivated');
      onDeactivated();
      onClose();
    } catch (e) {
      toast.error(parseApiError(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="epms-emp-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="epms-emp-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="emp-deact-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="epms-emp-confirm__warn" aria-hidden>
          <i className="bi bi-exclamation-triangle-fill" />
        </div>
        <h2 id="emp-deact-title" className="epms-emp-confirm__title">
          Deactivate this employee?
        </h2>
        <p className="epms-emp-confirm__msg">
          <strong className="text-slate-800">{name}</strong> will be marked inactive. This does not remove their
          record; you can include inactive people in the list by changing the status filter.
        </p>
        <div className="epms-emp-confirm__actions">
          <button type="button" className="epms-emp-confirm__btn" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className="epms-emp-confirm__btn epms-emp-confirm__btn--danger"
            onClick={runDeactivate}
            disabled={pending}
          >
            <i className="bi bi-person-x" aria-hidden />
            {pending ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDeactivateDialog;

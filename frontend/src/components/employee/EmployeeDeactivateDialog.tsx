import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  activateEmployee,
  deactivateEmployee,
  isEmployeeActive,
  parseApiError,
  type EmployeeResponse,
} from '../../services/employeeService';

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

  const active = isEmployeeActive(employee);
  const actionLabel = active ? 'Deactivate' : 'Activate';
  const pendingLabel = active ? 'Deactivating…' : 'Activating…';
  const title = active ? 'Deactivate this employee?' : 'Activate this employee?';
  const icon = active ? 'bi-person-x' : 'bi-person-check';
  const buttonClass = active
      ? 'epms-emp-confirm__btn epms-emp-confirm__btn--danger'
      : 'epms-emp-confirm__btn epms-emp-confirm__btn--success';

  const name =
      employee.fullName?.trim() ||
      [employee.firstName, employee.lastName].filter(Boolean).join(' ') ||
      `Employee #${employee.id}`;

  const runStatusChange = async () => {
    try {
      setPending(true);

      if (active) {
        await deactivateEmployee(employee.id);
        toast.success('Employee deactivated');
      } else {
        await activateEmployee(employee.id);
        toast.success('Employee activated');
      }

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
            aria-labelledby="emp-status-title"
            onClick={(ev) => ev.stopPropagation()}
        >
          <div
              className={`epms-emp-confirm__warn ${
                  active ? '' : 'epms-emp-confirm__warn--success'
              }`}
              aria-hidden
          >
            <i className={`bi ${active ? 'bi-exclamation-triangle-fill' : 'bi-person-check-fill'}`} />
          </div>
          <h2 id="emp-status-title" className="epms-emp-confirm__title">
            {title}
          </h2>
          <p className="epms-emp-confirm__msg">
            {active ? (
                <>
                  <strong className="text-slate-800">{name}</strong> will be marked inactive. Their linked login account
                  will also be disabled, but the employee record will remain available when inactive records are shown.
                </>
            ) : (
                <>
                  <strong className="text-slate-800">{name}</strong> will be marked active again. Their linked login
                  account will also be re-enabled when one exists.
                </>
            )}
          </p>
          <div className="epms-emp-confirm__actions">
            <button type="button" className="epms-emp-confirm__btn" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button
                type="button"
                className={buttonClass}
                onClick={runStatusChange}
                disabled={pending}
            >
              <i className={`bi ${icon}`} aria-hidden />
              {pending ? pendingLabel : actionLabel}
            </button>
          </div>
        </div>
      </div>
  );
};

export default EmployeeDeactivateDialog;

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { fetchDepartments, type Department } from '../../services/departmentService';
import { positionService } from '../../services/positionService';
import type { PositionResponse } from '../../types/position';
import {
  createEmployee,
  responseToFormDefaults,
  updateEmployee,
  parseApiError,
  type EmployeeResponse,
} from '../../services/employeeService';
import {
  defaultEmployeeFormValues,
  employeeFormSchema,
  formValuesToPayload,
  type EmployeeFormValues,
} from './employeeFormSchema';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  employee: EmployeeResponse | null;
  onClose: () => void;
  onSaved: () => void;
};

const EmployeeFormModal = ({ open, mode, employee, onClose, onSaved }: Props) => {
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [orgPickersLoading, setOrgPickersLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: defaultEmployeeFormValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === 'edit' && employee) {
      reset(responseToFormDefaults(employee));
    } else {
      reset(defaultEmployeeFormValues);
    }
  }, [open, mode, employee, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setOrgPickersLoading(true);
    Promise.all([positionService.getPositions(), fetchDepartments()])
      .then(([posList, deptList]) => {
        if (!cancelled) {
          setPositions(posList.filter((p) => p.status !== false));
          setDepartments(deptList);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPositions([]);
          setDepartments([]);
          toast.error('Could not load positions or departments.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrgPickersLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const onSubmit = async (values: EmployeeFormValues) => {
    const payload = formValuesToPayload(values);
    try {
      if (mode === 'create') {
        const res = await createEmployee(payload);
        if (res.accountProvisioningMessage) {
          const smtp = res.accountProvisioningSmtpError?.trim();
          const detail = `${res.accountProvisioningMessage}${smtp && !res.accountProvisioningMessage.includes(smtp) ? ` ${smtp}` : ''}`;
          if (res.accountProvisioningSuccess === false) {
            // DB save succeeded; only email failed — not a "hard" error, use warning
            toast(
              <div className="text-left text-sm text-slate-800">
                <p className="mb-1 font-semibold text-amber-900">Employee created — email not sent</p>
                <p>{detail}</p>
                <p className="mt-2 text-xs text-slate-600">
                  Set <code className="rounded bg-slate-100 px-1">SMTP_HOST</code>, <code className="rounded bg-slate-100 px-1">SMTP_USER</code>, <code className="rounded bg-slate-100 px-1">SMTP_PASS</code> (Gmail
                  app password) in <code className="rounded bg-slate-100 px-1">.env</code>, restart the API, then use{' '}
                  <code className="rounded bg-slate-100 px-1">POST /api/mail/test</code> to verify.
                </p>
              </div>,
              { icon: '⚠️', duration: 12_000, id: 'provision-mail' }
            );
          } else {
            toast.success(`Employee created. ${detail}`);
          }
        } else {
          toast.success('Employee created');
        }
      } else if (employee) {
        const res = await updateEmployee(employee.id, payload);
        if (res.accountProvisioningMessage) {
          const smtp = res.accountProvisioningSmtpError?.trim();
          const detail = `${res.accountProvisioningMessage}${smtp && !res.accountProvisioningMessage.includes(smtp) ? ` ${smtp}` : ''}`;
          if (res.accountProvisioningSuccess === false) {
            toast(
              <div className="text-left text-sm text-slate-800">
                <p className="mb-1 font-semibold text-amber-900">Employee updated — email not sent</p>
                <p>{detail}</p>
                <p className="mt-2 text-xs text-slate-600">
                  Check SMTP in <code className="rounded bg-slate-100 px-1">.env</code> and restart the backend.
                </p>
              </div>,
              { icon: '⚠️', duration: 12_000, id: 'provision-mail-update' }
            );
          } else {
            toast.success(`Employee updated. ${detail}`);
          }
        } else {
          toast.success('Employee updated');
        }
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(parseApiError(e));
    }
  };

  return (
    <div className="epms-emp-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="epms-emp-modal epms-emp-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emp-form-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="epms-emp-modal__accent" />
        <div className="epms-emp-modal__head">
          <h2 id="emp-form-title" className="epms-emp-modal__title">
            {mode === 'create' ? 'Add employee' : 'Edit employee'}
          </h2>
          <button type="button" className="epms-emp-modal__close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>

        <form className="epms-emp-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="epms-emp-form-body">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">
                  First name <span className="text-red-600">*</span>
                </span>
                <input
                  className="epms-emp-input-field"
                  autoComplete="given-name"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                )}
              </label>
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">
                  Last name <span className="text-red-600">*</span>
                </span>
                <input
                  className="epms-emp-input-field"
                  autoComplete="family-name"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                )}
              </label>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">Position</span>
                <select
                  className="epms-emp-input-field"
                  disabled={orgPickersLoading}
                  {...register('positionId')}
                >
                  <option value="">
                    {orgPickersLoading ? 'Loading…' : '—'}
                  </option>
                  {positions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.positionTitle}
                      {p.levelCode ? ` (${p.levelCode})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">Department</span>
                <select
                  className="epms-emp-input-field"
                  disabled={orgPickersLoading}
                  {...register('departmentId')}
                >
                  <option value="">
                    {orgPickersLoading ? 'Loading…' : '—'}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-person-vcard" aria-hidden />
                Contact &amp; identity
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Phone</span>
                  <input className="epms-emp-input-field" type="tel" {...register('phoneNumber')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Work email</span>
                  <input className="epms-emp-input-field" type="email" {...register('email')} />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Staff NRC</span>
                  <input className="epms-emp-input-field" {...register('staffNrc')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Gender</span>
                  <select className="epms-emp-input-field" {...register('gender')}>
                    <option value="">—</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Date of birth</span>
                  <input className="epms-emp-input-field" type="date" {...register('dateOfBirth')} />
                </label>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <label className="text-sm text-slate-700">
                  <input type="checkbox" className="mr-2" {...register('createLoginAccount')} />
                  Create login account automatically when email is provided
                </label>
                <label className="text-sm text-slate-700">
                  <input type="checkbox" className="mr-2" {...register('sendTemporaryPasswordEmail')} />
                  Send temporary password onboarding email
                </label>
              </div>
            </div>

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-globe2" aria-hidden />
                Background
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Race</span>
                  <input className="epms-emp-input-field" {...register('race')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Religion</span>
                  <input className="epms-emp-input-field" {...register('religion')} />
                </label>
                <label className="epms-emp-field col-span-1 sm:col-span-2 block">
                  <span className="epms-emp-field__label">Contact address</span>
                  <textarea className="epms-emp-input-field min-h-[72px]" rows={2} {...register('contactAddress')} />
                </label>
                <label className="epms-emp-field col-span-1 sm:col-span-2 block">
                  <span className="epms-emp-field__label">Permanent address</span>
                  <textarea className="epms-emp-input-field min-h-[72px]" rows={2} {...register('permanentAddress')} />
                </label>
              </div>
            </div>

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-people" aria-hidden />
                Family
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Marital status</span>
                  <input className="epms-emp-input-field" {...register('maritalStatus')} />
                </label>
                <div className="hidden sm:block" aria-hidden />
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Spouse name</span>
                  <input className="epms-emp-input-field" {...register('spouseName')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Spouse NRC</span>
                  <input className="epms-emp-input-field" {...register('spouseNrc')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Father name</span>
                  <input className="epms-emp-input-field" {...register('fatherName')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Father NRC</span>
                  <input className="epms-emp-input-field" {...register('fatherNrc')} />
                </label>
              </div>
            </div>
          </div>

          <div className="epms-emp-form-footer">
            <button type="button" className="epms-emp-btn epms-emp-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="epms-emp-btn epms-emp-btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="bi bi-hourglass-split" aria-hidden />
                  Saving…
                </>
              ) : mode === 'create' ? (
                <>
                  <i className="bi bi-check-lg" aria-hidden />
                  Create
                </>
              ) : (
                <>
                  <i className="bi bi-save" aria-hidden />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeFormModal;

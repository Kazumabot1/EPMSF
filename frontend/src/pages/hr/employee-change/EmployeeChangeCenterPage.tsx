import { useEffect, useMemo, useState } from 'react';
import { employeeChangeRequestService } from '../../../services/employeeChangeRequestService';
import EmployeeChangeProfileModal from './EmployeeChangeProfileModal';

import type {
  EmployeeChangeRequestType,
  EmployeeChangeSummary,
  WorkforceDepartment,
  WorkforceEmployee,
  WorkforcePosition,
} from '../../../types/employeeChangeRequest';

type ModalMode = 'POSITION_CHANGE' | 'DEPARTMENT_CHANGE' | null;

const getErrorMessage = (error: any) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Request failed.'
  );
};

const employeeName = (employee?: WorkforceEmployee | null) => {
  if (!employee) return '-';

  const fullName =
    employee.fullName ||
    employee.name ||
    `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();

  return fullName || employee.email || employee.workEmail || `Employee #${employee.id}`;
};

const employeeEmail = (employee?: WorkforceEmployee | null) =>
  employee?.email || employee?.workEmail || '-';

const positionName = (employee?: WorkforceEmployee | null) =>
  employee?.positionTitle || employee?.positionName || '-';

const currentDepartmentName = (employee?: WorkforceEmployee | null) =>
  employee?.currentDepartmentName || employee?.departmentName || '-';

const parentDepartmentName = (employee?: WorkforceEmployee | null) =>
  employee?.parentDepartmentName || '-';

const activeTeamName = (employee?: WorkforceEmployee | null) =>
  employee?.activeTeamName || employee?.teamName || 'No Active Team';

const formatDate = (value?: string) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRequestType = (type?: EmployeeChangeRequestType) => {
  if (type === 'POSITION_CHANGE') return 'Position Change';
  if (type === 'DEPARTMENT_CHANGE') return 'Department Change';
  return '-';
};

const statusClass = (status?: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 ring-amber-100';
    case 'APPROVED':
    case 'APPLIED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 ring-red-100';
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
};

const positionLabel = (position: WorkforcePosition) =>
  position.positionTitle || position.positionName || position.title || `Position #${position.id}`;

const departmentLabel = (department: WorkforceDepartment) =>
  department.departmentName || department.name || `Department #${department.id}`;

const EmployeeChangeCenterPage = () => {
  const [employees, setEmployees] = useState<WorkforceEmployee[]>([]);
  const [positions, setPositions] = useState<WorkforcePosition[]>([]);
  const [departments, setDepartments] = useState<WorkforceDepartment[]>([]);
  const [requests, setRequests] = useState<EmployeeChangeSummary[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [profileEmployeeId, setProfileEmployeeId] = useState<number | null>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [newPositionId, setNewPositionId] = useState('');
  const [newCurrentDepartmentId, setNewCurrentDepartmentId] = useState('');
  const [newParentDepartmentId, setNewParentDepartmentId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const filteredEmployees = useMemo(() => {
    const clean = query.trim().toLowerCase();

    if (!clean) return employees;

    return employees.filter((employee) => {
      const haystack = [
        employeeName(employee),
        employeeEmail(employee),
        positionName(employee),
        currentDepartmentName(employee),
        parentDepartmentName(employee),
        activeTeamName(employee),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(clean);
    });
  }, [employees, query]);

  const selectedEmployeeRequests = useMemo(() => {
    if (!selectedEmployee) return [];

    return requests.filter((request) => request.employeeId === selectedEmployee.id);
  }, [requests, selectedEmployee]);

  const loadPage = async () => {
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const [employeeData, positionData, departmentData, requestData] = await Promise.all([
        employeeChangeRequestService.getEmployees(),
        employeeChangeRequestService.getPositions(),
        employeeChangeRequestService.getDepartments(),
        employeeChangeRequestService.getHrRequests(),
      ]);

      setEmployees(employeeData);
      setPositions(positionData);
      setDepartments(departmentData);
      setRequests(requestData);

      setSelectedEmployeeId((previous) => {
        if (previous && employeeData.some((employee) => employee.id === previous)) {
          return previous;
        }

        return employeeData[0]?.id ?? null;
      });
    } catch (error) {
      setIsError(true);
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, []);

  const openModal = (mode: ModalMode) => {
    setModalMode(mode);
    setNewPositionId('');
    setNewCurrentDepartmentId('');
    setNewParentDepartmentId('');
    setReason('');
    setMessage('');
    setIsError(false);
  };

  const closeModal = () => {
    if (submitting) return;

    setModalMode(null);
    setNewPositionId('');
    setNewCurrentDepartmentId('');
    setNewParentDepartmentId('');
    setReason('');
  };

  const submitChangeRequest = async () => {
    if (!selectedEmployee || !modalMode) return;

    setSubmitting(true);
    setMessage('');
    setIsError(false);

    try {
      if (modalMode === 'POSITION_CHANGE') {
        if (!newPositionId) {
          throw new Error('Please choose the new position.');
        }

        await employeeChangeRequestService.createPositionChange({
          employeeId: selectedEmployee.id,
          newPositionId: Number(newPositionId),
          reason,
        });

        setMessage('Position change request submitted for CEO approval.');
      }

      if (modalMode === 'DEPARTMENT_CHANGE') {
        if (!newCurrentDepartmentId) {
          throw new Error('Please choose the new current department.');
        }

        await employeeChangeRequestService.createDepartmentChange({
          employeeId: selectedEmployee.id,
          newCurrentDepartmentId: Number(newCurrentDepartmentId),
          newParentDepartmentId: newParentDepartmentId
            ? Number(newParentDepartmentId)
            : null,
          reason,
        });

        setMessage('Department change request submitted for CEO approval.');
      }

      setIsError(false);
      closeModal();
      await loadPage();
    } catch (error) {
      setIsError(true);
      setMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-86px)] bg-slate-50 px-3 py-5 text-slate-950 sm:px-5 lg:px-7">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                HR Workforce Control
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                Workforce Changes
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Review employee details and submit position or department change requests for CEO approval.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadPage()}
              disabled={loading}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </section>

        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              isError
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {message}
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Search Employees
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, position, department..."
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {loading ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                Loading employees...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                No employees found.
              </div>
            ) : (
              <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
                {filteredEmployees.map((employee) => {
                  const active = selectedEmployeeId === employee.id;

                  return (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(employee.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-blue-200 bg-blue-50 text-blue-950'
                          : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {employeeName(employee)}
                          </p>
                          <p className="mt-1 truncate text-xs font-bold text-slate-500">
                            {employeeEmail(employee)}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.65rem] font-black text-slate-600">
                          {employee.active === false ? 'Inactive' : 'Active'}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-1 text-xs font-bold text-slate-500">
                        <span className="truncate">Position: {positionName(employee)}</span>
                        <span className="truncate">
                          Department: {currentDepartmentName(employee)}
                        </span>
                        <span className="truncate">Team: {activeTeamName(employee)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <main className="min-w-0">
            {!selectedEmployee ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
                Select an employee to review details.
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-slate-950">
                        {employeeName(selectedEmployee)}
                      </h2>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {employeeEmail(selectedEmployee)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setProfileEmployeeId(selectedEmployee.id)}
                        className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100"
                      >
                        See More
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal('POSITION_CHANGE')}
                        className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
                      >
                        Request Position Change
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal('DEPARTMENT_CHANGE')}
                        className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
                      >
                        Request Department Change
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InfoCard label="Current Position" value={positionName(selectedEmployee)} />
                    <InfoCard
                      label="Current Department"
                      value={currentDepartmentName(selectedEmployee)}
                    />
                    <InfoCard
                      label="Parent Department"
                      value={parentDepartmentName(selectedEmployee)}
                    />
                    <InfoCard label="Active Team" value={activeTeamName(selectedEmployee)} />
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                  <DetailCard
                    title="KPI Snapshot"
                    description="Current ongoing KPI will be shown first. If none exists, latest KPI will be shown."
                    buttonLabel="All KPIs"
                    onClick={() => setProfileEmployeeId(selectedEmployee.id)}
                  />
                  <DetailCard
                    title="PIP Snapshot"
                    description="Current active PIP will be shown first. If none exists, latest PIP will be shown."
                    buttonLabel="All PIPs"
                    onClick={() => setProfileEmployeeId(selectedEmployee.id)}
                  />
                  <DetailCard
                    title="Continuous Feedback"
                    description="Open this employee's feedback activity, team history, department history, and audit records."
                    buttonLabel="All Feedback"
                    onClick={() => setProfileEmployeeId(selectedEmployee.id)}
                  />
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-lg font-black text-slate-950">
                      Employee Change Request History
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Position and department change requests submitted for this employee.
                    </p>
                  </div>

                  {selectedEmployeeRequests.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                      No change requests found for this employee.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Requested By</th>
                            <th className="px-4 py-3">Requested At</th>
                            <th className="px-4 py-3">Change</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {selectedEmployeeRequests.map((request) => (
                            <tr key={request.id}>
                              <td className="px-4 py-3 font-black text-slate-800">
                                {formatRequestType(request.requestType)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusClass(
                                    request.status,
                                  )}`}
                                >
                                  {request.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-600">
                                {request.requestedByName || '-'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-600">
                                {formatDate(request.requestedAt)}
                              </td>
                              <td className="min-w-[260px] px-4 py-3 font-semibold text-slate-600">
                                {request.requestType === 'POSITION_CHANGE'
                                  ? `${request.oldPositionName || '-'} → ${
                                      request.newPositionName || '-'
                                    }`
                                  : `${request.oldCurrentDepartmentName || '-'} → ${
                                      request.newCurrentDepartmentName || '-'
                                    }`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-lg font-black text-slate-950">
                      Employee Audit History
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Use See More to view past position, department, team, KPI, PIP, feedback, and audit history.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setProfileEmployeeId(selectedEmployee.id)}
                    className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                  >
                    See More Employee Details
                  </button>
                </section>
              </div>
            )}
          </main>
        </section>
      </div>

      {modalMode && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-black text-slate-950">
                {modalMode === 'POSITION_CHANGE'
                  ? 'Request Position Change'
                  : 'Request Department Change'}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                This request will be sent to CEO for approval.
              </p>
            </div>

            <div className="grid gap-4 px-6 py-5">
              <InfoCard label="Employee" value={employeeName(selectedEmployee)} />
              <InfoCard label="Current Position" value={positionName(selectedEmployee)} />
              <InfoCard
                label="Current Department"
                value={currentDepartmentName(selectedEmployee)}
              />

              {modalMode === 'POSITION_CHANGE' && (
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  New Position <span className="sr-only">required</span>
                  <select
                    value={newPositionId}
                    onChange={(event) => setNewPositionId(event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Choose new position</option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {positionLabel(position)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {modalMode === 'DEPARTMENT_CHANGE' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    New Current Department
                    <select
                      value={newCurrentDepartmentId}
                      onChange={(event) => setNewCurrentDepartmentId(event.target.value)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Choose current department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {departmentLabel(department)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    New Parent Department
                    <select
                      value={newParentDepartmentId}
                      onChange={(event) => setNewParentDepartmentId(event.target.value)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">No parent department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {departmentLabel(department)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <label className="grid gap-2 text-sm font-black text-slate-700">
                Request Reason
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why this workforce change is needed..."
                  className="min-h-32 resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <span className="text-xs font-bold text-slate-500">
                  Reason is required and must be at least 10 characters.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitChangeRequest()}
                disabled={submitting}
                className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit for CEO Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileEmployeeId && (
        <EmployeeChangeProfileModal
          employeeId={profileEmployeeId}
          onClose={() => setProfileEmployeeId(null)}
        />
      )}
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 truncate text-sm font-black text-slate-950">{value || '-'}</p>
  </div>
);

const DetailCard = ({
  title,
  description,
  buttonLabel,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}) => (
  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-lg font-black text-slate-950">{title}</h3>
    <p className="mt-2 min-h-16 text-sm font-semibold leading-6 text-slate-500">
      {description}
    </p>
    <button
      type="button"
      onClick={onClick}
      className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100"
    >
      {buttonLabel}
    </button>
  </div>
);

export default EmployeeChangeCenterPage;
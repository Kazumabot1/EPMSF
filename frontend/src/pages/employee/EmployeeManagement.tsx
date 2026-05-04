import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EmployeeFormModal from '../../components/employee/EmployeeFormModal';
import EmployeeViewModal from '../../components/employee/EmployeeViewModal';
import EmployeeDeactivateDialog from '../../components/employee/EmployeeDeactivateDialog';
import '../../components/employee/employee-crud.css';
import { exportToExcel, todayStr } from '../../utils/exportExcel';
import {
  fetchEmployees,
  isEmployeeActive,
  type EmployeeResponse,
} from '../../services/employeeService';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | 'active' | 'inactive';

const sortByName = (a: EmployeeResponse, b: EmployeeResponse) => {
  const la = (a.lastName || '').toLowerCase();
  const lb = (b.lastName || '').toLowerCase();

  if (la !== lb) {
    return la.localeCompare(lb);
  }

  return (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
};

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<EmployeeResponse | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const includeInactive = statusFilter !== 'active';
      const data = await fetchEmployees(includeInactive);

      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
      setError('Failed to load employees. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    setPage(1);
  }, [search, genderFilter, statusFilter]);

  const filtered = useMemo(() => {
    let list = employees.filter((emp) => {
      const displayName =
        emp.fullName || [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || '';

      const q = search.trim().toLowerCase();

      const matchSearch =
        !q ||
        displayName.toLowerCase().includes(q) ||
        (emp.staffNrc || '').toLowerCase().includes(q);

      const matchGender = !genderFilter || emp.gender === genderFilter;

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? isEmployeeActive(emp)
            : !isEmployeeActive(emp);

      return matchSearch && matchGender && matchStatus;
    });

    list = [...list].sort(sortByName);

    return list;
  }, [employees, search, genderFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => isEmployeeActive(e)).length;
    const inactive = employees.length - active;

    return {
      active,
      inactive,
      total: employees.length,
    };
  }, [employees]);

  const openCreate = () => {
    setSelected(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const openView = (emp: EmployeeResponse) => {
    setSelected(emp);
    setViewOpen(true);
  };

  const openEdit = (emp: EmployeeResponse) => {
    setSelected(emp);
    setFormMode('edit');
    setFormOpen(true);
    setViewOpen(false);
  };

  const openDeactivate = (emp: EmployeeResponse) => {
    setSelected(emp);
    setDeactivateOpen(true);
  };

  const initials = (emp: EmployeeResponse) => {
    const parts = [emp.firstName, emp.lastName].filter(Boolean);

    if (parts.length === 0) {
      return '?';
    }

    return parts
      .map((p) => p!.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  return (
    <div className="epms-emp epms-emp-shell text-slate-800">
      <Toaster toastOptions={{ duration: 4000 }} />

      <div className="epms-emp-main relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-5">
        <header className="epms-emp-hero">
          <p className="epms-emp-eyebrow">
            <i className="bi bi-building" aria-hidden />
            HR — records
          </p>

          <h1 className="epms-emp-title">Employee records</h1>

          <p className="epms-emp-lead">
            View and manage employee master data. Use{' '}
            <Link
              to="/hr/employee/import"
              className="text-indigo-600 underline decoration-indigo-200 underline-offset-2"
            >
              Import Employees
            </Link>{' '}
            for Excel/CSV bulk employee onboarding.
          </p>

          <div className="epms-emp-hero-actions flex flex-wrap gap-2">
            <button
              type="button"
              className="epms-emp-btn epms-emp-btn--primary"
              onClick={openCreate}
            >
              <i className="bi bi-person-plus" aria-hidden />
              Add employee
            </button>

            <Link
              to="/hr/employee/import"
              className="epms-emp-btn epms-emp-btn--import no-underline"
            >
              <i className="bi bi-upload" aria-hidden />
              Import (Excel / CSV)
            </Link>

            <button
              type="button"
              className="epms-emp-btn epms-emp-btn--import"
              disabled={filtered.length === 0}
              title={`Export ${filtered.length} visible employee(s) to Excel`}
              onClick={() =>
                exportToExcel(
                  filtered.map((e) => ({
                    fullName:
                      e.fullName?.trim() ||
                      [e.firstName, e.lastName].filter(Boolean).join(' ').trim() ||
                      '',
                    position: e.positionTitle
                      ? `${e.positionTitle}${e.positionLevelCode ? ` (${e.positionLevelCode})` : ''}`
                      : '',
                    department: e.currentDepartment || e.parentDepartment || '',
                    phone: e.phoneNumber || '',
                    nrc: e.staffNrc || '',
                    gender: e.gender || '',
                    status: isEmployeeActive(e) ? 'Active' : 'Inactive',
                    email: e.email || '',
                  })) as any,
                  [
                    { header: 'Full Name',   key: 'fullName'    },
                    { header: 'Position',    key: 'position'    },
                    { header: 'Department',  key: 'department'  },
                    { header: 'Phone',       key: 'phone'       },
                    { header: 'NRC',         key: 'nrc'         },
                    { header: 'Gender',      key: 'gender'      },
                    { header: 'Status',      key: 'status'      },
                    { header: 'Email',       key: 'email'       },
                  ],
                  `hr_employees_${todayStr()}`
                )
              }
            >
              <i className="bi bi-file-earmark-excel" aria-hidden />
              Export Excel
            </button>
          </div>
        </header>

        <div className="epms-emp-stats">
          <div className="epms-emp-stat">
            <span className="epms-emp-stat__icon" aria-hidden>
              <i className="bi bi-people-fill" />
            </span>
            <div>
              <span className="epms-emp-stat__label">Total (loaded)</span>
              <span className="epms-emp-stat__value">{stats.total}</span>
            </div>
          </div>

          <div className="epms-emp-stat">
            <span className="epms-emp-stat__icon epms-emp-stat__icon--emerald" aria-hidden>
              <i className="bi bi-person-check-fill" />
            </span>
            <div>
              <span className="epms-emp-stat__label">Active</span>
              <span className="epms-emp-stat__value">{stats.active}</span>
            </div>
          </div>

          <div className="epms-emp-stat">
            <span className="epms-emp-stat__icon epms-emp-stat__icon--slate" aria-hidden>
              <i className="bi bi-person-x" />
            </span>
            <div>
              <span className="epms-emp-stat__label">Inactive</span>
              <span className="epms-emp-stat__value">{stats.inactive}</span>
            </div>
          </div>
        </div>

        <div className="epms-emp-toolbar">
          <div className="epms-emp-input-wrap w-full max-w-md">
            <i
              className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />

            <input
              type="search"
              className="epms-emp-input w-full"
              placeholder="Search name or NRC…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search employees"
            />
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
            <label className="flex min-w-[140px] flex-col text-sm text-slate-600">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Gender
              </span>

              <select
                className="epms-emp-input rounded-lg border border-slate-300 py-2 pl-2 pr-8"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </span>

              <div className="epms-emp-seg" role="group" aria-label="Filter by status">
                {(
                  [
                    ['active', 'Active'],
                    ['inactive', 'Inactive'],
                    ['all', 'All'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={statusFilter === key}
                    onClick={() => setStatusFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="epms-emp-error" role="alert">
            <i className="bi bi-exclamation-circle mt-0.5 shrink-0 text-lg" aria-hidden />
            <div>{error}</div>

            <button
              type="button"
              className="epms-emp-btn epms-emp-btn--ghost ml-auto text-sm"
              onClick={() => void loadEmployees()}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="epms-emp-skeleton">
            <i className="bi bi-arrow-repeat animate-spin text-xl" aria-hidden />
            Loading employees…
          </div>
        ) : filtered.length === 0 ? (
          <div className="epms-emp-empty">
            <div className="epms-emp-empty__icon" aria-hidden>
              <i className="bi bi-inbox" />
            </div>

            <p className="mb-1 text-base font-semibold text-slate-700">
              {error && employees.length === 0
                ? 'No data loaded'
                : 'No employees match your filters'}
            </p>

            <p className="m-0 text-sm">
              {error && employees.length === 0
                ? 'Use Retry above, or check that the server is running.'
                : 'Try clearing search, or show all statuses to see inactive records.'}
            </p>
          </div>
        ) : (
          <>
            <div className="epms-emp-table-wrap hidden overflow-x-auto md:block">
              <table className="epms-emp-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Position</th>
                    <th scope="col">Phone</th>
                    <th scope="col">NRC</th>
                    <th scope="col">Gender</th>
                    <th scope="col">Department</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paged.map((emp) => {
                    const active = isEmployeeActive(emp);

                    const name =
                      emp.fullName?.trim() ||
                      [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() ||
                      '—';

                    return (
                      <tr key={emp.id}>
                        <td>
                          <div className="epms-emp-name-cell">
                            <span
                              className={`epms-emp-avatar ${
                                !active ? 'epms-emp-avatar--inactive' : ''
                              }`}
                              aria-hidden
                            >
                              {initials(emp)}
                            </span>

                            <span className="epms-emp-name-text" title={name}>
                              {name}
                            </span>
                          </div>
                        </td>

                        <td className="max-w-[160px] truncate" title={emp.positionTitle || ''}>
                          {emp.positionTitle
                            ? `${emp.positionTitle}${
                                emp.positionLevelCode ? ` (${emp.positionLevelCode})` : ''
                              }`
                            : '—'}
                        </td>

                        <td>{emp.phoneNumber || '—'}</td>

                        <td className="max-w-[140px] truncate" title={emp.staffNrc || ''}>
                          {emp.staffNrc || '—'}
                        </td>

                        <td>{emp.gender || '—'}</td>

                        <td
                          className="max-w-[180px] truncate"
                          title={emp.currentDepartment || emp.parentDepartment || ''}
                        >
                          {emp.currentDepartment || emp.parentDepartment || '—'}
                        </td>

                        <td>
                          <span
                            className={`epms-emp-badge ${
                              active ? 'epms-emp-badge--on' : 'epms-emp-badge--off'
                            }`}
                          >
                            {active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="text-right">
                          <div className="epms-emp-actions float-right">
                            <button
                              type="button"
                              className="epms-emp-icon-btn"
                              title="View"
                              onClick={() => openView(emp)}
                            >
                              <i className="bi bi-eye" aria-hidden />
                              <span className="sr-only">View</span>
                            </button>

                            <button
                              type="button"
                              className="epms-emp-icon-btn"
                              title="Edit"
                              onClick={() => openEdit(emp)}
                            >
                              <i className="bi bi-pencil" aria-hidden />
                              <span className="sr-only">Edit</span>
                            </button>

                            <button
                              type="button"
                              className="epms-emp-icon-btn epms-emp-icon-btn--danger"
                              title="Deactivate"
                              disabled={!active}
                              onClick={() => openDeactivate(emp)}
                            >
                              <i className="bi bi-person-x" aria-hidden />
                              <span className="sr-only">Deactivate</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="epms-emp-pager hidden md:flex">
              <span>
                Page {currentPage} of {totalPages} · {filtered.length} row
                {filtered.length === 1 ? '' : 's'}
              </span>

              <div className="epms-emp-pager__nav">
                <button
                  type="button"
                  className="epms-emp-pager__btn"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <i className="bi bi-chevron-left" aria-hidden />
                </button>

                <button
                  type="button"
                  className="epms-emp-pager__btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <i className="bi bi-chevron-right" aria-hidden />
                </button>
              </div>
            </div>
          </>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3 md:hidden">
            {paged.map((emp) => {
              const active = isEmployeeActive(emp);

              const name =
                emp.fullName?.trim() ||
                [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() ||
                '—';

              return (
                <div key={`m-${emp.id}`} className="epms-emp-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`epms-emp-avatar shrink-0 ${
                          !active ? 'epms-emp-avatar--inactive' : ''
                        }`}
                        aria-hidden
                      >
                        {initials(emp)}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{name}</p>

                        <p className="truncate text-sm text-slate-500">
                          {emp.positionTitle
                            ? `${emp.positionTitle}${
                                emp.positionLevelCode ? ` · ${emp.positionLevelCode}` : ''
                              }`
                            : 'No position'}
                        </p>

                        <p className="truncate text-sm text-slate-400">
                          {emp.phoneNumber || '—'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`epms-emp-badge shrink-0 ${
                        active ? 'epms-emp-badge--on' : 'epms-emp-badge--off'
                      }`}
                    >
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      className="epms-emp-icon-btn"
                      onClick={() => openView(emp)}
                      title="View"
                    >
                      <i className="bi bi-eye" />
                    </button>

                    <button
                      type="button"
                      className="epms-emp-icon-btn"
                      onClick={() => openEdit(emp)}
                      title="Edit"
                    >
                      <i className="bi bi-pencil" />
                    </button>

                    <button
                      type="button"
                      className="epms-emp-icon-btn epms-emp-icon-btn--danger"
                      disabled={!active}
                      onClick={() => openDeactivate(emp)}
                      title="Deactivate"
                    >
                      <i className="bi bi-person-x" />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="epms-emp-pager flex md:hidden">
              <span>
                Page {currentPage} of {totalPages} · {filtered.length} row
                {filtered.length === 1 ? '' : 's'}
              </span>

              <div className="epms-emp-pager__nav">
                <button
                  type="button"
                  className="epms-emp-pager__btn"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <i className="bi bi-chevron-left" aria-hidden />
                </button>

                <button
                  type="button"
                  className="epms-emp-pager__btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <i className="bi bi-chevron-right" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <EmployeeFormModal
        open={formOpen}
        mode={formMode}
        employee={formMode === 'edit' ? selected : null}
        onClose={() => setFormOpen(false)}
        onSaved={() => void loadEmployees()}
      />

      <EmployeeViewModal
        open={viewOpen}
        employee={selected}
        onClose={() => setViewOpen(false)}
        onEdit={() => selected && openEdit(selected)}
      />

      <EmployeeDeactivateDialog
        open={deactivateOpen}
        employee={selected}
        onClose={() => setDeactivateOpen(false)}
        onDeactivated={() => void loadEmployees()}
      />
    </div>
  );
};

export default EmployeeManagement;
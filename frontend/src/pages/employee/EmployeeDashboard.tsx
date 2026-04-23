import { useEffect, useMemo, useState } from 'react';
import { fetchEmployees, type EmployeeResponse } from '../../services/employeeService';
import './employee-ui.css';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const EmployeeDashboard = () => {
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeResponse | null>(null);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchEmployees();
      setEmployees(data);
      setSelectedEmployee((prev) => prev ?? data[0] ?? null);
    } catch (err) {
      console.error(err);
      setError('Failed to load employees. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (employee.staffNrc ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (employee.phoneNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (employee.currentDepartment ?? '').toLowerCase().includes(search.toLowerCase());

      const matchesGender =
        genderFilter === 'ALL' ||
        (employee.gender ?? '').toUpperCase() === genderFilter;

      return matchesSearch && matchesGender;
    });
  }, [employees, search, genderFilter]);

  const stats = useMemo(() => {
    const total = employees.length;
    const male = employees.filter((e) => (e.gender ?? '').toUpperCase() === 'MALE').length;
    const female = employees.filter((e) => (e.gender ?? '').toUpperCase() === 'FEMALE').length;
    const assigned = employees.filter((e) => !!e.currentDepartment).length;

    return { total, male, female, assigned };
  }, [employees]);

  return (
    <div className="employee-page">
      <div className="employee-hero">
        <span className="employee-hero-badge">
          <i className="bi bi-person-badge" />
          Workforce Overview
        </span>
        <h1>Employee Dashboard</h1>
        <p>
          View employee records, current department assignment, and workforce summary
          from your existing EPMS employee structure.
        </p>
      </div>

      <section className="employee-stat-grid">
        <article className="employee-stat-card">
          <div className="employee-stat-head">
            <p>Total Employees</p>
            <span className="employee-stat-icon blue"><i className="bi bi-people" /></span>
          </div>
          <h3>{stats.total}</h3>
          <small>All employee records</small>
        </article>

        <article className="employee-stat-card">
          <div className="employee-stat-head">
            <p>Male Employees</p>
            <span className="employee-stat-icon indigo"><i className="bi bi-gender-male" /></span>
          </div>
          <h3>{stats.male}</h3>
          <small>Based on current data</small>
        </article>

        <article className="employee-stat-card">
          <div className="employee-stat-head">
            <p>Female Employees</p>
            <span className="employee-stat-icon pink"><i className="bi bi-gender-female" /></span>
          </div>
          <h3>{stats.female}</h3>
          <small>Based on current data</small>
        </article>

        <article className="employee-stat-card">
          <div className="employee-stat-head">
            <p>Assigned Departments</p>
            <span className="employee-stat-icon green"><i className="bi bi-building" /></span>
          </div>
          <h3>{stats.assigned}</h3>
          <small>Employees with current department</small>
        </article>
      </section>

      <div className="employee-grid">
        <div className="employee-surface">
          <div className="employee-surface-inner">
            <div className="employee-toolbar">
              <div className="employee-toolbar-left">
                <input
                  type="text"
                  placeholder="Search by name, NRC, phone, department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
                  <option value="ALL">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <button className="employee-btn secondary" onClick={loadEmployees}>
                <i className="bi bi-arrow-clockwise" />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="employee-state">
                <i className="bi bi-hourglass-split" />
                Loading employees...
              </div>
            ) : error ? (
              <div className="employee-state">
                <i className="bi bi-exclamation-triangle" />
                <div className="employee-alert error">{error}</div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="employee-state">
                <i className="bi bi-search" />
                <h3>No matching employees</h3>
                <p>Try changing the search text or filter.</p>
              </div>
            ) : (
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Gender</th>
                      <th>Phone</th>
                      <th>Current Department</th>
                      <th>History</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td>
                          <div className="employee-name-cell">
                            <strong>{employee.fullName || '-'}</strong>
                            <span>{employee.staffNrc || 'No NRC'}</span>
                          </div>
                        </td>
                        <td>{employee.gender || '-'}</td>
                        <td>{employee.phoneNumber || '-'}</td>
                        <td>{employee.currentDepartment || '-'}</td>
                        <td>{employee.departmentHistoryCount ?? 0} Records</td>
                        <td>
                          <button
                            className="employee-btn ghost"
                            onClick={() => setSelectedEmployee(employee)}
                          >
                            <i className="bi bi-eye" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="employee-detail-card">
          <div className="employee-detail-head">
            <h3>Employee Details</h3>
            <span>
              {selectedEmployee ? `ID #${selectedEmployee.id}` : 'No selection'}
            </span>
          </div>

          {!selectedEmployee ? (
            <div className="employee-empty-detail">
              <i className="bi bi-person-lines-fill" />
              <p>Select an employee to view details.</p>
            </div>
          ) : (
            <div className="employee-detail-body">
              <div className="employee-profile">
                <div className="employee-avatar">
                  {(selectedEmployee.firstName?.[0] || '')}
                  {(selectedEmployee.lastName?.[0] || '')}
                </div>
                <div>
                  <h4>{selectedEmployee.fullName || '-'}</h4>
                  <p>{selectedEmployee.currentDepartment || 'No department assigned'}</p>
                </div>
              </div>

              <div className="employee-detail-grid">
                <div>
                  <label>Phone Number</label>
                  <span>{selectedEmployee.phoneNumber || '-'}</span>
                </div>
                <div>
                  <label>Gender</label>
                  <span>{selectedEmployee.gender || '-'}</span>
                </div>
                <div>
                  <label>Staff NRC</label>
                  <span>{selectedEmployee.staffNrc || '-'}</span>
                </div>
                <div>
                  <label>Marital Status</label>
                  <span>{selectedEmployee.maritalStatus || '-'}</span>
                </div>
                <div>
                  <label>Date of Birth</label>
                  <span>{formatDate(selectedEmployee.dateOfBirth)}</span>
                </div>
                <div>
                  <label>Race</label>
                  <span>{selectedEmployee.race || '-'}</span>
                </div>
                <div>
                  <label>Religion</label>
                  <span>{selectedEmployee.religion || '-'}</span>
                </div>
                <div>
                  <label>Department History</label>
                  <span>{selectedEmployee.departmentHistoryCount ?? 0} Records</span>
                </div>
                <div>
                  <label>Parent Department</label>
                  <span>{selectedEmployee.parentDepartment || '-'}</span>
                </div>
                <div>
                  <label>Assigned By</label>
                  <span>{selectedEmployee.assignedBy || '-'}</span>
                </div>
                <div>
                  <label>Department Start</label>
                  <span>{formatDate(selectedEmployee.departmentStartDate)}</span>
                </div>
                <div>
                  <label>Department End</label>
                  <span>{formatDate(selectedEmployee.departmentEndDate)}</span>
                </div>
              </div>

              <div className="employee-address-block">
                <label>Contact Address</label>
                <p>{selectedEmployee.contactAddress || '-'}</p>
              </div>

              <div className="employee-address-block">
                <label>Permanent Address</label>
                <p>{selectedEmployee.permanentAddress || '-'}</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
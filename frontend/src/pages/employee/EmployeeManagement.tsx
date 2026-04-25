import { useEffect, useState } from "react";
import { getAllEmployees, type Employee } from "../../services/employeeService";
import "./employee-ui.css";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to load employees: ${errorMessage}`);
      console.error("Error loading employees:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    return (
      emp.name.toLowerCase().includes(search.toLowerCase()) &&
      (genderFilter ? emp.gender === genderFilter : true)
    );
  });

  return (
    <div className="employee-page">
      <div className="employee-hero">
        <span className="employee-hero-badge">
          <i className="bi bi-person" />
          Employee Management
        </span>
        <h1>Employee Management</h1>
        <p>Manage and view all employees in the system</p>
      </div>

      {loading && (
        <div className="employee-state">
          <i className="bi bi-hourglass-split" />
          Loading employees...
        </div>
      )}

      {error && (
        <div className="employee-state">
          <i className="bi bi-exclamation-triangle" />
          <div className="employee-alert error">{error}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="employee-surface">
          <div className="employee-surface-inner">
            {/* Filters */}
            <div className="employee-toolbar">
              <div className="employee-toolbar-left">
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select onChange={(e) => setGenderFilter(e.target.value)}>
                  <option value="">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <button className="employee-btn secondary" onClick={loadEmployees}>
                <i className="bi bi-arrow-clockwise" />
                Refresh
              </button>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="employee-state">
                <i className="bi bi-inbox" />
                <h3>No employees found</h3>
                <p>Try changing the search criteria or add employees to the system.</p>
              </div>
            ) : (
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Gender</th>
                      <th>Position</th>
                      <th>Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.name}</td>
                        <td>{emp.email}</td>
                        <td>{emp.gender || '-'}</td>
                        <td>{emp.position || '-'}</td>
                        <td>{emp.department || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;

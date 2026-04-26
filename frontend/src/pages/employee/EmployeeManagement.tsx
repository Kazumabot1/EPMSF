import { useEffect, useState } from "react";
import { fetchEmployees, type EmployeeResponse } from "../../services/employeeService";
import "./employee-ui.css";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
      setError("Failed to load employees.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const displayName = emp.fullName || [emp.firstName, emp.lastName].filter(Boolean).join(" ");

    return (
      displayName.toLowerCase().includes(search.toLowerCase()) &&
      (genderFilter ? emp.gender === genderFilter : true)
    );
  });

  return (
    <div className="employee-container">
      <h2>Employee list</h2>

      <div className="filters">
        <input
          type="text"
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
          <option value="">All Genders</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      </div>

      {loading ? (
        <p>Loading employees...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <table className="employee-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone Number</th>
              <th>Gender</th>
              <th>Staff NRC</th>
              <th>Department</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.fullName || `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || "-"}</td>
                  <td>{emp.phoneNumber || "-"}</td>
                  <td>{emp.gender || "-"}</td>
                  <td>{emp.staffNrc || "-"}</td>
                  <td>{emp.currentDepartment || emp.parentDepartment || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EmployeeManagement;
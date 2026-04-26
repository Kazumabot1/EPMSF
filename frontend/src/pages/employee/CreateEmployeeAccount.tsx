import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./employee-ui.css";

const defaultPassword = "ChangeMe123!";

const roleOptions = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "HR", label: "HR" },
  { value: "MANAGER", label: "Manager" },
];

const CreateEmployeeAccount = () => {
  const [form, setForm] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    departmentName: "",
    positionName: "",
    roleName: "EMPLOYEE",
    password: defaultPassword,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setMessage(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setMessage({ type: "error", text: "Email is required to create the account." });
      return;
    }

    setMessage(null);
    try {
      setLoading(true);
      await api.post("/hr/employee-accounts", { ...form, email: form.email.trim().toLowerCase() });
      setMessage({ type: "success", text: "Employee account was created. The user can sign in with the email and password you set." });
      setForm({
        employeeCode: "",
        fullName: "",
        email: "",
        departmentName: "",
        positionName: "",
        roleName: "EMPLOYEE",
        password: defaultPassword,
      });
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      setMessage({
        type: "error",
        text:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "We could not create the account. Check the details and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-page employee-form-create">
      <div className="employee-form-header-row">
        <Link to="/hr/employee" className="employee-back-link">
          <i className="bi bi-arrow-left" aria-hidden />
          <span>Employees</span>
        </Link>
      </div>

      <header className="employee-hero">
        <p className="employee-hero-badge">HR — onboarding</p>
        <h1>Create employee account</h1>
        <p>
          Add login credentials and basic assignment details. The department and position can match
          names already in the system, or will be created or linked as configured on the server.
        </p>
      </header>

      <div className="employee-surface">
        <div className="employee-surface-inner">
          {message && (
            <div
              className={
                message.type === "success" ? "employee-form-alert success" : "employee-form-alert error"
              }
              role="status"
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="employee-form" noValidate>
            <div className="employee-form-section">
              <h2 className="employee-form-section-title">
                <i className="bi bi-person-vcard" aria-hidden />
                Profile and access
              </h2>
              <p className="employee-form-section-desc">Identifiers and sign-in details for the new user.</p>

              <div className="employee-form-grid">
                <div className="employee-form-field">
                  <label htmlFor="employeeCode">
                    Employee code <span className="employee-form-optional">optional</span>
                  </label>
                  <input
                    id="employeeCode"
                    name="employeeCode"
                    className="employee-form-input"
                    value={form.employeeCode}
                    onChange={handleInputChange}
                    placeholder="e.g. EMP-1024"
                    autoComplete="off"
                  />
                </div>

                <div className="employee-form-field">
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    className="employee-form-input"
                    value={form.fullName}
                    onChange={handleInputChange}
                    placeholder="Name as it should appear in the system"
                    autoComplete="name"
                  />
                </div>

                <div className="employee-form-field employee-form-field-span-2">
                  <label htmlFor="email">
                    Work email <span className="employee-form-required">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="employee-form-input"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="name@company.com"
                    autoComplete="email"
                  />
                </div>

                <div className="employee-form-field">
                  <label htmlFor="roleName">System role</label>
                  <select
                    id="roleName"
                    name="roleName"
                    className="employee-form-select"
                    value={form.roleName}
                    onChange={handleInputChange}
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="employee-form-field">
                  <label htmlFor="password">Initial password</label>
                  <input
                    id="password"
                    name="password"
                    type="text"
                    className="employee-form-input"
                    value={form.password}
                    onChange={handleInputChange}
                    placeholder={defaultPassword}
                    autoComplete="new-password"
                  />
                  <p className="employee-form-hint">User should change this after first sign-in.</p>
                </div>
              </div>
            </div>

            <div className="employee-form-section-divider" />

            <div className="employee-form-section">
              <h2 className="employee-form-section-title">
                <i className="bi bi-building" aria-hidden />
                Work assignment
              </h2>
              <p className="employee-form-section-desc">Department and position labels as stored in EPMS.</p>

              <div className="employee-form-grid">
                <div className="employee-form-field">
                  <label htmlFor="departmentName">Department</label>
                  <input
                    id="departmentName"
                    name="departmentName"
                    className="employee-form-input"
                    value={form.departmentName}
                    onChange={handleInputChange}
                    placeholder="e.g. Engineering"
                  />
                </div>

                <div className="employee-form-field">
                  <label htmlFor="positionName">Position</label>
                  <input
                    id="positionName"
                    name="positionName"
                    className="employee-form-input"
                    value={form.positionName}
                    onChange={handleInputChange}
                    placeholder="e.g. Software Engineer"
                  />
                </div>
              </div>
            </div>

            <div className="employee-form-actions">
              <Link to="/hr/employee/import" className="employee-btn secondary">
                <i className="bi bi-upload" />
                Import instead
              </Link>
              <button type="submit" className="employee-btn primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="employee-form-spinner" aria-hidden />
                    Creating…
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg" />
                    Create account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEmployeeAccount;
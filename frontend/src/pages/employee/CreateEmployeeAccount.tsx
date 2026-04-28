import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./employee-ui.css";

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
    sendTemporaryPasswordEmail: true,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const emailRegex = /^[A-Za-z0-9+._-]+@[A-Za-z0-9._-]+\.[A-Za-z]{2,}$/;

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
    if (!emailRegex.test(form.email.trim())) {
      setMessage({ type: "error", text: "Please provide a valid email address." });
      return;
    }

    setMessage(null);
    try {
      setLoading(true);
      const response = await api.post("/users", { ...form, email: form.email.trim().toLowerCase() });
      const data = response?.data?.data as
        | {
            success?: boolean;
            message?: string;
            accountCreated?: boolean;
            temporaryPasswordEmailSent?: boolean;
            smtpErrorDetail?: string | null;
          }
        | undefined;
      const statusOk = data?.success !== false;
      const smtp = data?.smtpErrorDetail?.trim();
      const accountCreated = data?.accountCreated === true;
      const emailRequested = form.sendTemporaryPasswordEmail;
      const emailFailed = emailRequested && !data?.temporaryPasswordEmailSent;

      let text: string;
      if (accountCreated && emailRequested && emailFailed) {
        text =
          "Account was created, but email delivery failed. Please check SMTP credentials or resend later.";
        if (smtp) {
          text += ` ${smtp}`;
        }
      } else {
        const detail = data?.message || "Employee account processed.";
        const emailStatus = emailRequested
          ? data?.temporaryPasswordEmailSent
            ? " Email sent successfully."
            : ` Email could not be sent.${smtp ? ` ${smtp}` : " Check SMTP configuration."}`
          : "";
        text = `${detail}${emailStatus}`.trim();
      }

      setMessage({ type: statusOk ? "success" : "error", text });
      if (!statusOk) {
        return;
      }
      setForm({
        employeeCode: "",
        fullName: "",
        email: "",
        departmentName: "",
        positionName: "",
        roleName: "EMPLOYEE",
        sendTemporaryPasswordEmail: true,
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

                <div className="employee-form-field employee-form-field-span-2">
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      name="sendTemporaryPasswordEmail"
                      type="checkbox"
                      checked={form.sendTemporaryPasswordEmail}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, sendTemporaryPasswordEmail: e.target.checked }))
                      }
                    />
                    Send temporary password email and force first-login password change
                  </label>
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
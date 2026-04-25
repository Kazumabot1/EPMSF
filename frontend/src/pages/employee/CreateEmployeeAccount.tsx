import { useState } from "react";
import api from "../../services/api";
import "./employee-ui.css";

const CreateEmployeeAccount = () => {
  const [form, setForm] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    departmentName: "",
    positionName: "",
    roleName: "EMPLOYEE",
    password: "ChangeMe123!",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await api.post("/hr/employee-accounts", form);

      alert("Employee account created successfully");

      // reset form
      setForm({
        employeeCode: "",
        fullName: "",
        email: "",
        departmentName: "",
        positionName: "",
        roleName: "EMPLOYEE",
        password: "ChangeMe123!",
      });

    } catch (error) {
      console.error(error);
      alert("Failed to create employee account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-container">
      <h2>Create Employee Account</h2>

      <div className="filters">
        <input
          name="employeeCode"
          placeholder="Employee Code"
          value={form.employeeCode}
          onChange={handleChange}
        />

        <input
          name="fullName"
          placeholder="Full Name"
          value={form.fullName}
          onChange={handleChange}
        />

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          name="departmentName"
          placeholder="Department"
          value={form.departmentName}
          onChange={handleChange}
        />

        <input
          name="positionName"
          placeholder="Position"
          value={form.positionName}
          onChange={handleChange}
        />

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
      </div>
    </div>
  );
};

export default CreateEmployeeAccount;
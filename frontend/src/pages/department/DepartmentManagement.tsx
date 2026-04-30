import { useEffect, useState } from "react";
import DepartmentForm from "./DepartmentForm";

interface Department {
  id: number;
  departmentName?: string;
  name?: string;
  departmentCode?: string;
  headEmployee?: string | null;
  status?: boolean | number;
  createdAt?: string;
  createdBy?: string;
}

interface DepartmentRequest {
  departmentName: string;
}

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const extractDepartments = (body: any): Department[] => {
    console.log("RAW DEPARTMENT BODY:", body);

    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.data?.data)) return body.data.data;
    if (Array.isArray(body?.result)) return body.result;
    if (Array.isArray(body?.content)) return body.content;
    if (Array.isArray(body?.departments)) return body.departments;

    return [];
  };

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`/api/departments?t=${Date.now()}`);
      const body = await response.json();

      const list = extractDepartments(body);

      console.log("FINAL DEPARTMENT LIST:", list);

      setDepartments(list);
    } catch (error) {
      console.error("Failed to load departments:", error);
      setDepartments([]);
      setMessage("Unable to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleCreate = async (request: DepartmentRequest) => {
    try {
      setMessage("");

      const response = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departmentName: request.departmentName,
          departmentCode: "",
          headEmployee: null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create department");
      }

      await loadDepartments();
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create department:", error);
      setMessage("Unable to create department. Please check your input and try again.");
    }
  };

  const handleUpdate = async (request: DepartmentRequest) => {
    if (!editingDepartment) return;

    try {
      setMessage("");

      const response = await fetch(`/api/departments/${editingDepartment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departmentName: request.departmentName,
          departmentCode: editingDepartment.departmentCode || "",
          headEmployee: editingDepartment.headEmployee || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update department");
      }

      await loadDepartments();
      setEditingDepartment(null);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to update department:", error);
      setMessage("Unable to update department.");
    }
  };

  const handleDelete = async (department: Department) => {
    const name = department.departmentName || department.name || "this department";

    if (!window.confirm(`Delete ${name}?`)) return;

    try {
      setMessage("");

      const response = await fetch(`/api/departments/${department.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete department");
      }

      await loadDepartments();
    } catch (error) {
      console.error("Failed to delete department:", error);
      setMessage("Unable to delete department.");
    }
  };

  const openCreate = () => {
    setEditingDepartment(null);
    setShowForm(true);
    setMessage("");
  };

  const openEdit = (department: Department) => {
    setEditingDepartment(department);
    setShowForm(true);
    setMessage("");
  };

  const closeForm = () => {
    setEditingDepartment(null);
    setShowForm(false);
    setMessage("");
  };

  return (
    <div className="team-page">
      <div className="team-hero">
        <span className="team-hero-badge">
          <i className="bi bi-building" />
          Organization
        </span>
        <h1>Department</h1>
        <p>Create, update, and remove departments for your organization.</p>
      </div>

      {message && <div className="team-alert error">{message}</div>}

      <div className="team-surface">
        <div className="team-surface-inner">
          <div className="team-table-toolbar">
            <div>
              <h2>Department List</h2>
              <p className="text-muted">Total departments: {departments.length}</p>
            </div>

            <button className="team-btn primary" onClick={openCreate}>
              Create Department
            </button>
          </div>

          {showForm && (
            <DepartmentForm
              initialValues={{
                departmentName:
                  editingDepartment?.departmentName ||
                  editingDepartment?.name ||
                  "",
              }}
              onSubmit={editingDepartment ? handleUpdate : handleCreate}
              onCancel={closeForm}
            />
          )}

          {loading ? (
            <div className="team-state">Loading departments...</div>
          ) : departments.length === 0 ? (
            <div className="team-state">
              No departments yet. Click Create Department to add one.
            </div>
          ) : (
            <div className="team-table-wrap">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Department Name</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {departments.map((department) => (
                    <tr key={department.id}>
                      <td>{department.id}</td>
                      <td>{department.departmentName || department.name || "-"}</td>
                      <td>{department.departmentCode || "-"}</td>
                      <td>
                        {department.status === false || department.status === 0
                          ? "Inactive"
                          : "Active"}
                      </td>
                      <td>{department.createdBy || "-"}</td>
                      <td>
                        <button
                          className="team-btn ghost"
                          onClick={() => openEdit(department)}
                        >
                          Edit
                        </button>

                        <button
                          className="team-btn ghost danger"
                          onClick={() => handleDelete(department)}
                          style={{ marginLeft: 8 }}
                        >
                          Delete
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
    </div>
  );
};

export default DepartmentManagement;
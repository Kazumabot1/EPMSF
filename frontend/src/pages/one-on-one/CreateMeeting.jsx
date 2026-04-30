// added khn (chatgpt )
// CreateMeeting.jsx
/*
import { useState } from "react";
import { createMeeting } from "../../services/meetingService";

export default function CreateMeeting() {
  const [data, setData] = useState({
    employeeId: "",
    scheduledDate: "",
    notes: "",
  });

  const handleSubmit = async () => {
    try {
      await createMeeting(data);
      alert("Meeting created!");
    } catch (e) {
      const msg = e.response?.data?.message;

      if (msg && msg.includes("already")) {
        const confirm = window.confirm(
          msg + "\nDo you still want to continue?"
        );

        if (confirm) {
          await createMeeting(data);
          alert("Meeting created!");
        }
      } else {
        alert("Error creating meeting");
      }
    }
  };

  return (
    <div>
      <h2>Create Meeting</h2>

      <input
        placeholder="Employee ID"
        onChange={(e) =>
          setData({ ...data, employeeId: e.target.value })
        }
      />

      <br />

      <input
        type="datetime-local"
        onChange={(e) =>
          setData({ ...data, scheduledDate: e.target.value })
        }
      />

      <br />

      <textarea
        placeholder="Notes"
        onChange={(e) =>
          setData({ ...data, notes: e.target.value })
        }
      />

      <br />

      <button onClick={handleSubmit}>Schedule Meeting</button>
    </div>
  );
} */

import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  createMeeting,
  getUpcomingMeetings,
} from "../../services/meetingService";

export default function CreateMeeting() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);

  const [departmentId, setDepartmentId] = useState("");
  const [data, setData] = useState({
    employeeId: "",
    scheduledDate: "",
    notes: "",
  });

  const [warningMeeting, setWarningMeeting] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  useEffect(() => {
    loadDepartments();
    loadUpcomingMeetings();
  }, []);

  useEffect(() => {
    if (departmentId) {
      loadEmployeesByDepartment(departmentId);
    } else {
      setEmployees([]);
    }
  }, [departmentId]);

  const loadDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data.data ?? []);
    } catch (err) {
      console.error("Failed to load departments", err);
    }
  };

  const loadEmployeesByDepartment = async (deptId) => {
    try {
      const res = await api.get(`/employees/active-by-department/${deptId}`);
      setEmployees(res.data.data ?? []);
    } catch (err) {
      console.error("Failed to load employees", err);
    }
  };

  const loadUpcomingMeetings = async () => {
    try {
      const meetings = await getUpcomingMeetings();
      setUpcomingMeetings(meetings);
    } catch (err) {
      console.error("Failed to load upcoming meetings", err);
    }
  };

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => Number(e.id) === Number(data.employeeId));
  }, [employees, data.employeeId]);

  const selectedEmployeeExistingMeetings = useMemo(() => {
    if (!data.employeeId) return [];
    return upcomingMeetings.filter(
      (m) => Number(m.employeeId) === Number(data.employeeId)
    );
  }, [upcomingMeetings, data.employeeId]);

  const getSameDayMeeting = () => {
    if (!data.employeeId || !data.scheduledDate) return null;

    const selectedDate = new Date(data.scheduledDate);

    return upcomingMeetings.find((m) => {
      if (Number(m.employeeId) !== Number(data.employeeId)) return false;

      const meetingDate = new Date(m.scheduledDate);

      return (
        meetingDate.getFullYear() === selectedDate.getFullYear() &&
        meetingDate.getMonth() === selectedDate.getMonth() &&
        meetingDate.getDate() === selectedDate.getDate()
      );
    });
  };

  const getExactTimeMeeting = () => {
    if (!data.employeeId || !data.scheduledDate) return null;

    const selectedTime = new Date(data.scheduledDate).getTime();

    return upcomingMeetings.find((m) => {
      return (
        Number(m.employeeId) === Number(data.employeeId) &&
        new Date(m.scheduledDate).getTime() === selectedTime
      );
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const employeeTooltip = (employee) => {
    const meeting = upcomingMeetings.find(
      (m) => Number(m.employeeId) === Number(employee.id)
    );

    if (!meeting) return "";

    return `This ${employee.firstName} ${employee.lastName} already has a meeting at ${formatDateTime(
      meeting.scheduledDate
    )}`;
  };

  const submitMeeting = async () => {
    try {
      await createMeeting({
        employeeId: Number(data.employeeId),
        scheduledDate: data.scheduledDate,
        notes: data.notes,
      });

      alert("Meeting created successfully.");

      setData({
        employeeId: "",
        scheduledDate: "",
        notes: "",
      });

      setDepartmentId("");
      setShowWarningModal(false);
      setWarningMeeting(null);
      loadUpcomingMeetings();
    } catch (err) {
      console.error("Failed to create meeting", err);
      alert("Failed to create meeting. Please try again.");
    }
  };

  const handleScheduleClick = async () => {
    if (!data.employeeId || !data.scheduledDate) {
      alert("Please select employee and meeting date.");
      return;
    }

    const exactTimeMeeting = getExactTimeMeeting();

    if (exactTimeMeeting) {
      alert(
        `${selectedEmployee?.firstName ?? "This employee"} already has a meeting at ${formatDateTime(
          exactTimeMeeting.scheduledDate
        )}. Please choose another time.`
      );
      return;
    }

    const sameDayMeeting = getSameDayMeeting();

    if (sameDayMeeting) {
      setWarningMeeting(sameDayMeeting);
      setShowWarningModal(true);
      return;
    }

    await submitMeeting();
  };

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        Create One-on-One Meeting
      </h2>

      <div style={{ marginBottom: "14px" }}>
        <label>Department</label>
        <br />
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setData({ ...data, employeeId: "" });
          }}
          style={inputStyle}
        >
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.departmentName}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label>Employee</label>
        <br />
        <select
          value={data.employeeId}
          onChange={(e) => setData({ ...data, employeeId: e.target.value })}
          style={inputStyle}
        >
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id} title={employeeTooltip(e)}>
              {e.firstName} {e.lastName}
              {employeeTooltip(e) ? " ⚠" : ""}
            </option>
          ))}
        </select>

        {selectedEmployeeExistingMeetings.length > 0 && (
          <p style={{ color: "#b45309", marginTop: "6px" }}>
            This employee already has a meeting at{" "}
            {formatDateTime(selectedEmployeeExistingMeetings[0].scheduledDate)}
          </p>
        )}
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label>Meeting Date & Time</label>
        <br />
        <input
          type="datetime-local"
          value={data.scheduledDate}
          onChange={(e) => setData({ ...data, scheduledDate: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label>Notes</label>
        <br />
        <textarea
          value={data.notes}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
          rows={4}
          style={{ ...inputStyle, height: "90px" }}
        />
      </div>

      <button onClick={handleScheduleClick} style={primaryButton}>
        Schedule Meeting
      </button>

      {showWarningModal && warningMeeting && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ color: "#b45309" }}>Warning</h3>

            <p>
              {selectedEmployee?.firstName} {selectedEmployee?.lastName} already
              has a meeting at{" "}
              <strong>{formatDateTime(warningMeeting.scheduledDate)}</strong>.
            </p>

            <p>
              Are you sure you want to create another meeting at{" "}
              <strong>{formatDateTime(data.scheduledDate)}</strong>?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  setWarningMeeting(null);
                }}
                style={secondaryButton}
              >
                Cancel
              </button>

              <button onClick={submitMeeting} style={primaryButton}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  maxWidth: "420px",
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
};

const primaryButton = {
  backgroundColor: "#2563eb",
  color: "white",
  padding: "10px 16px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const secondaryButton = {
  backgroundColor: "#e5e7eb",
  color: "#111827",
  padding: "10px 16px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalStyle = {
  backgroundColor: "white",
  padding: "24px",
  borderRadius: "10px",
  width: "420px",
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
};

// import React, { useState, useEffect, useRef } from 'react';
// import './one-on-one.css';
// import { fetchDepartments } from '../services/departmentService';
// import type { Department } from '../services/departmentService';
// import {
//   getActiveEmployeesByDepartment,
//   createMeeting,
// } from '../services/oneOnOneService';
// import type { EmployeeOption } from '../services/oneOnOneService';
//
// const pad = (n: number) => String(n).padStart(2, '0');
//
// const OneOnOneMeetings: React.FC = () => {
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [employees, setEmployees] = useState<EmployeeOption[]>([]);
//   const [loadingDepts, setLoadingDepts] = useState(true);
//   const [loadingEmps, setLoadingEmps] = useState(false);
//
//   const [selectedDept, setSelectedDept] = useState('');
//   const [selectedEmp, setSelectedEmp] = useState('');
//
//   // Date parts
//   const [day, setDay] = useState('');
//   const [month, setMonth] = useState('');
//   const [year, setYear] = useState('');
//
//   // Time
//   const [hour, setHour] = useState('');
//   const [minute, setMinute] = useState('');
//   const [ampm, setAmPm] = useState<'AM' | 'PM'>('AM');
//
//   const [notes, setNotes] = useState('');
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//
//   const hiddenDateRef = useRef<HTMLInputElement>(null);
//
//   // ---- Load departments ----
//   useEffect(() => {
//     fetchDepartments()
//       .then(setDepartments)
//       .catch(() => setError('Failed to load departments.'))
//       .finally(() => setLoadingDepts(false));
//   }, []);
//
//   // ---- Load employees when department changes ----
//   useEffect(() => {
//     if (!selectedDept) {
//       setEmployees([]);
//       setSelectedEmp('');
//       return;
//     }
//     setLoadingEmps(true);
//     getActiveEmployeesByDepartment(Number(selectedDept))
//       .then((data) => {
//         setEmployees(data);
//         setSelectedEmp('');
//       })
//       .catch(() => setError('Failed to load employees.'))
//       .finally(() => setLoadingEmps(false));
//   }, [selectedDept]);
//
//   // ---- Sync calendar picker → DD/MM/YYYY inputs ----
//   const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const val = e.target.value; // "YYYY-MM-DD"
//     if (!val) return;
//     const [y, m, d] = val.split('-');
//     setYear(y);
//     setMonth(m);
//     setDay(d);
//   };
//
//   const openCalendar = () => {
//     hiddenDateRef.current?.showPicker?.();
//   };
//
//   // ---- Build a JS Date from the form fields ----
//   const buildDate = (): Date | null => {
//     const d = parseInt(day);
//     const m = parseInt(month);
//     const y = parseInt(year);
//     let h = parseInt(hour);
//     const min = parseInt(minute);
//     if (isNaN(d) || isNaN(m) || isNaN(y) || isNaN(h) || isNaN(min)) return null;
//     if (ampm === 'PM' && h < 12) h += 12;
//     if (ampm === 'AM' && h === 12) h = 0;
//     return new Date(y, m - 1, d, h, min, 0);
//   };
//
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setSuccess('');
//
//     if (!selectedEmp) {
//       setError('Please select an employee.');
//       return;
//     }
//
//     const scheduled = buildDate();
//     if (!scheduled) {
//       setError('Please fill in all date and time fields correctly.');
//       return;
//     }
//     if (scheduled <= new Date()) {
//       setError('Meeting date must be in the future.');
//       return;
//     }
//
//     const iso = `${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(
//       scheduled.getDate()
//     )}T${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}:00`;
//
//     setSubmitting(true);
//     try {
//       await createMeeting({
//         employeeId: Number(selectedEmp),
//         scheduledDate: iso,
//         notes,
//       });
//       setSuccess('1:1 Meeting scheduled successfully! 🎉');
//       // Reset
//       setSelectedDept('');
//       setSelectedEmp('');
//       setDay('');
//       setMonth('');
//       setYear('');
//       setHour('');
//       setMinute('');
//       setAmPm('AM');
//       setNotes('');
//     } catch (err: any) {
//       setError(
//         err.response?.data?.message || 'Failed to create meeting. Please try again.'
//       );
//     } finally {
//       setSubmitting(false);
//     }
//   };
//
//   // Min date for the hidden calendar input
//   const today = new Date().toISOString().split('T')[0];
//
//   return (
//     <div className="oom-page">
//       {/* ── Header ── */}
//       <div className="oom-header">
//         <h1>📅 Schedule 1:1 Meeting</h1>
//         <p>Create a new one-on-one meeting between HR and an employee.</p>
//       </div>
//
//       <div className="oom-card">
//         <form className="oom-form" onSubmit={handleSubmit}>
//
//           {/* ── 1. Department ── */}
//           <div className="oom-field">
//             <label className="oom-label">Department</label>
//             <select
//               id="oom-dept-select"
//               className="oom-select"
//               value={selectedDept}
//               onChange={(e) => setSelectedDept(e.target.value)}
//               required
//               disabled={loadingDepts}
//             >
//               <option value="">
//                 {loadingDepts ? 'Loading departments…' : '— Select Department —'}
//               </option>
//               {departments.map((d) => (
//                 <option key={d.id} value={d.id}>
//                   {d.departmentName}
//                 </option>
//               ))}
//             </select>
//           </div>
//
//           {/* ── 2. Employee ── */}
//           <div className="oom-field">
//             <label className="oom-label">Employee</label>
//             <select
//               id="oom-emp-select"
//               className="oom-select"
//               value={selectedEmp}
//               onChange={(e) => setSelectedEmp(e.target.value)}
//               required
//               disabled={!selectedDept || loadingEmps}
//             >
//               <option value="">
//                 {!selectedDept
//                   ? '— Select a department first —'
//                   : loadingEmps
//                   ? 'Loading employees…'
//                   : employees.length === 0
//                   ? 'No active employees in this department'
//                   : '— Select Employee —'}
//               </option>
//               {employees.map((emp) => (
//                 <option key={emp.id} value={emp.id}>
//                   {emp.firstName} {emp.lastName}
//                 </option>
//               ))}
//             </select>
//           </div>
//
//           {/* ── 3. Date ── */}
//           <div className="oom-field">
//             <label className="oom-label">Meeting Date</label>
//             <div className="oom-date-row">
//               <div className="oom-date-part oom-date-part--dd">
//                 <label>Day</label>
//                 <input
//                   id="oom-day"
//                   type="number"
//                   min={1}
//                   max={31}
//                   placeholder="DD"
//                   value={day}
//                   onChange={(e) => setDay(e.target.value.slice(0, 2))}
//                   required
//                 />
//               </div>
//               <span className="oom-date-sep">/</span>
//               <div className="oom-date-part oom-date-part--mm">
//                 <label>Month</label>
//                 <input
//                   id="oom-month"
//                   type="number"
//                   min={1}
//                   max={12}
//                   placeholder="MM"
//                   value={month}
//                   onChange={(e) => setMonth(e.target.value.slice(0, 2))}
//                   required
//                 />
//               </div>
//               <span className="oom-date-sep">/</span>
//               <div className="oom-date-part oom-date-part--yy">
//                 <label>Year</label>
//                 <input
//                   id="oom-year"
//                   type="number"
//                   min={2024}
//                   max={2099}
//                   placeholder="YYYY"
//                   value={year}
//                   onChange={(e) => setYear(e.target.value.slice(0, 4))}
//                   required
//                 />
//               </div>
//
//               {/* Calendar picker button */}
//               <button
//                 type="button"
//                 className="oom-cal-btn"
//                 onClick={openCalendar}
//                 title="Pick from calendar"
//               >
//                 🗓️
//               </button>
//               <input
//                 type="date"
//                 ref={hiddenDateRef}
//                 min={today}
//                 className="oom-hidden-date"
//                 onChange={handleCalendarChange}
//                 tabIndex={-1}
//               />
//             </div>
//           </div>
//
//           {/* ── 4. Time ── */}
//           <div className="oom-field">
//             <label className="oom-label">Meeting Time</label>
//             <div className="oom-time-row">
//               <div className="oom-date-part">
//                 <label>Hour</label>
//                 <input
//                   id="oom-hour"
//                   type="number"
//                   min={1}
//                   max={12}
//                   placeholder="HH"
//                   style={{ width: 58 }}
//                   value={hour}
//                   onChange={(e) => setHour(e.target.value.slice(0, 2))}
//                   required
//                 />
//               </div>
//               <span className="oom-date-sep" style={{ marginTop: 18 }}>
//                 :
//               </span>
//               <div className="oom-date-part">
//                 <label>Minute</label>
//                 <input
//                   id="oom-minute"
//                   type="number"
//                   min={0}
//                   max={59}
//                   placeholder="MM"
//                   style={{ width: 58 }}
//                   value={minute}
//                   onChange={(e) => setMinute(e.target.value.slice(0, 2))}
//                   required
//                 />
//               </div>
//               <div className="oom-ampm-toggle">
//                 <button
//                   type="button"
//                   className={ampm === 'AM' ? 'active' : ''}
//                   onClick={() => setAmPm('AM')}
//                 >
//                   AM
//                 </button>
//                 <button
//                   type="button"
//                   className={ampm === 'PM' ? 'active' : ''}
//                   onClick={() => setAmPm('PM')}
//                 >
//                   PM
//                 </button>
//               </div>
//             </div>
//           </div>
//
//           {/* ── 5. Notes ── */}
//           <div className="oom-field">
//             <label className="oom-label">Notes</label>
//             <textarea
//               id="oom-notes"
//               className="oom-textarea"
//               placeholder="Add agenda or notes for this meeting…"
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//             />
//           </div>
//
//           {error && <div className="oom-error">⚠ {error}</div>}
//           {success && <div className="oom-success">{success}</div>}
//
//           <div>
//             <button
//               id="oom-submit-btn"
//               type="submit"
//               className="oom-btn-primary"
//               disabled={submitting}
//             >
//               {submitting ? 'Scheduling…' : '✦ Schedule Meeting'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };
//
// export default OneOnOneMeetings;

// khn (chatgpt)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './one-on-one.css';
import { fetchDepartments } from '../services/departmentService';
import type { Department } from '../services/departmentService';
import {
  createMeeting,
  deleteMeeting,
  getActiveEmployeesByDepartment,
  getUpcomingMeetings,
  updateMeeting,
} from '../services/oneOnOneService';
import type { EmployeeOption, Meeting } from '../services/oneOnOneService';

const pad = (n: number) => String(n).padStart(2, '0');

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isSameHour = (a: Date, b: Date) =>
  isSameDay(a, b) && a.getHours() === b.getHours();

const OneOnOneMeetings: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);

  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingEmps, setLoadingEmps] = useState(false);

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [ampm, setAmPm] = useState<'AM' | 'PM'>('AM');

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [warningMeeting, setWarningMeeting] = useState<Meeting | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const [selectedUpcoming, setSelectedUpcoming] = useState<Meeting | null>(null);
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const hiddenDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch(() => setError('Failed to load departments.'))
      .finally(() => setLoadingDepts(false));

    loadUpcomingMeetings();
  }, []);

  useEffect(() => {
    if (!selectedDept) {
      setEmployees([]);
      setSelectedEmp('');
      return;
    }

    setLoadingEmps(true);
    getActiveEmployeesByDepartment(Number(selectedDept))
      .then((data) => {
        setEmployees(data);
        setSelectedEmp('');
      })
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setLoadingEmps(false));
  }, [selectedDept]);

  const loadUpcomingMeetings = async () => {
    try {
      const data = await getUpcomingMeetings();
      setUpcomingMeetings(data.filter((m) => m.status === false && !m.isFinalized));
    } catch {
      setError('Failed to load upcoming meetings.');
    }
  };

  const selectedEmployee = useMemo(() => {
    return employees.find((emp) => Number(emp.id) === Number(selectedEmp));
  }, [employees, selectedEmp]);

  const selectedEmployeeMeetings = useMemo(() => {
    if (!selectedEmp) return [];
    return upcomingMeetings.filter(
      (meeting) =>
        Number(meeting.employeeId) === Number(selectedEmp) &&
        meeting.status === false &&
        !meeting.isFinalized
    );
  }, [selectedEmp, upcomingMeetings]);

  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;

    const [y, m, d] = val.split('-');

    setYear(y);
    setMonth(m);
    setDay(d);
  };

  const openCalendar = () => {
    hiddenDateRef.current?.showPicker?.();
  };

  const buildDate = (): Date | null => {
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);
    let h = parseInt(hour);
    const min = parseInt(minute);

    if (isNaN(d) || isNaN(m) || isNaN(y) || isNaN(h) || isNaN(min)) return null;

    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    return new Date(y, m - 1, d, h, min, 0);
  };

  const buildIso = (scheduled: Date) => {
    return `${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(
      scheduled.getDate()
    )}T${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}:00`;
  };

  const findConflictMeeting = (scheduled: Date) => {
    return selectedEmployeeMeetings.find((meeting) => {
      const existing = new Date(meeting.scheduledDate);
      return isSameHour(existing, scheduled);
    });
  };

  const resetCreateForm = () => {
    setSelectedDept('');
    setSelectedEmp('');
    setDay('');
    setMonth('');
    setYear('');
    setHour('');
    setMinute('');
    setAmPm('AM');
    setNotes('');
  };

  const submitMeeting = async (forceCreate = false) => {
    const scheduled = buildDate();

    if (!scheduled || !selectedEmp) return;

    const iso = buildIso(scheduled);

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createMeeting({
        employeeId: Number(selectedEmp),
        scheduledDate: iso,
        notes,
        forceCreate,
      });

      setSuccess('1:1 Meeting scheduled successfully! 🎉');
      setShowWarningModal(false);
      setWarningMeeting(null);
      resetCreateForm();
      await loadUpcomingMeetings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create meeting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!selectedEmp) {
      setError('Please select an employee.');
      return;
    }

    const scheduled = buildDate();

    if (!scheduled) {
      setError('Please fill in all date and time fields correctly.');
      return;
    }

    if (scheduled <= new Date()) {
      setError('Meeting date must be in the future.');
      return;
    }

    const conflict = findConflictMeeting(scheduled);

    if (conflict) {
      setWarningMeeting(conflict);
      setShowWarningModal(true);
      return;
    }

    await submitMeeting(false);
  };

  const openUpcomingModal = (meeting: Meeting) => {
    setSelectedUpcoming(meeting);
    setEditScheduledDate(toDateTimeLocalValue(meeting.scheduledDate));
    setEditNotes(meeting.notes || '');
    setShowCancelConfirm(false);
  };

  const closeUpcomingModal = () => {
    setSelectedUpcoming(null);
    setEditScheduledDate('');
    setEditNotes('');
    setShowCancelConfirm(false);
  };

  const handleUpdateMeeting = async () => {
    if (!selectedUpcoming || !editScheduledDate) return;

    try {
      await updateMeeting(selectedUpcoming.id, {
        employeeId: selectedUpcoming.employeeId,
        scheduledDate: `${editScheduledDate}:00`,
        notes: editNotes,
      });

      setSuccess('Meeting updated successfully.');
      closeUpcomingModal();
      await loadUpcomingMeetings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update meeting.');
    }
  };

  const handleCancelMeeting = async () => {
    if (!selectedUpcoming) return;

    try {
      await deleteMeeting(selectedUpcoming.id);
      setSuccess('Meeting cancelled successfully.');
      closeUpcomingModal();
      await loadUpcomingMeetings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel meeting.');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="oom-page">
      <div className="oom-header">
        <h1>📅 Schedule 1:1 Meeting</h1>
        <p>Create a new one-on-one meeting between HR and an employee.</p>
      </div>

      <div className="oom-card">
        <form className="oom-form" onSubmit={handleSubmit}>
          <div className="oom-field">
            <label className="oom-label">Department</label>
            <select
              id="oom-dept-select"
              className="oom-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              required
              disabled={loadingDepts}
            >
              <option value="">
                {loadingDepts ? 'Loading departments…' : '— Select Department —'}
              </option>

              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div className="oom-field">
            <label className="oom-label">Employee</label>
            <select
              id="oom-emp-select"
              className="oom-select"
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              required
              disabled={!selectedDept || loadingEmps}
            >
              <option value="">
                {!selectedDept
                  ? '— Select a department first —'
                  : loadingEmps
                  ? 'Loading employees…'
                  : employees.length === 0
                  ? 'No active employees in this department'
                  : '— Select Employee —'}
              </option>

              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>

            {selectedEmp && selectedEmployeeMeetings.length > 0 && (
              <div className="oom-warning-list">
                <strong>
                  {selectedEmployee?.firstName} {selectedEmployee?.lastName} already has upcoming
                  one-on-one meetings:
                </strong>

                {selectedEmployeeMeetings.map((meeting) => (
                  <div key={meeting.id}>🕐 {formatDateTime(meeting.scheduledDate)}</div>
                ))}
              </div>
            )}
          </div>

          <div className="oom-field">
            <label className="oom-label">Meeting Date</label>

            <div className="oom-date-row">
              <div className="oom-date-part oom-date-part--dd">
                <label>Day</label>
                <input
                  id="oom-day"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="DD"
                  value={day}
                  onChange={(e) => setDay(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <span className="oom-date-sep">/</span>

              <div className="oom-date-part oom-date-part--mm">
                <label>Month</label>
                <input
                  id="oom-month"
                  type="number"
                  min={1}
                  max={12}
                  placeholder="MM"
                  value={month}
                  onChange={(e) => setMonth(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <span className="oom-date-sep">/</span>

              <div className="oom-date-part oom-date-part--yy">
                <label>Year</label>
                <input
                  id="oom-year"
                  type="number"
                  min={2024}
                  max={2099}
                  placeholder="YYYY"
                  value={year}
                  onChange={(e) => setYear(e.target.value.slice(0, 4))}
                  required
                />
              </div>

              <button
                type="button"
                className="oom-cal-btn"
                onClick={openCalendar}
                title="Pick from calendar"
              >
                🗓️
              </button>

              <input
                ref={hiddenDateRef}
                type="date"
                min={today}
                className="oom-hidden-date"
                onChange={handleCalendarChange}
              />
            </div>
          </div>

          <div className="oom-field">
            <label className="oom-label">Meeting Time</label>

            <div className="oom-time-row">
              <div className="oom-date-part oom-date-part--dd">
                <label>Hour</label>
                <input
                  id="oom-hour"
                  type="number"
                  min={1}
                  max={12}
                  placeholder="HH"
                  value={hour}
                  onChange={(e) => setHour(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <span className="oom-date-sep">:</span>

              <div className="oom-date-part oom-date-part--dd">
                <label>Minute</label>
                <input
                  id="oom-minute"
                  type="number"
                  min={0}
                  max={59}
                  placeholder="MM"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <div className="oom-ampm-toggle">
                <button
                  type="button"
                  className={ampm === 'AM' ? 'active' : ''}
                  onClick={() => setAmPm('AM')}
                >
                  AM
                </button>

                <button
                  type="button"
                  className={ampm === 'PM' ? 'active' : ''}
                  onClick={() => setAmPm('PM')}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          <div className="oom-field">
            <label className="oom-label">Notes</label>
            <textarea
              id="oom-notes"
              className="oom-textarea"
              placeholder="Add agenda or notes for this meeting…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <div className="oom-error">⚠ {error}</div>}
          {success && <div className="oom-success">{success}</div>}

          <div>
            <button
              id="oom-submit-btn"
              type="submit"
              className="oom-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Scheduling…' : '✦ Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>

      <div className="oom-header oom-upcoming-header">
        <h1>⏳ Upcoming</h1>
        <p>Click a meeting to view, edit, or cancel it.</p>
      </div>

      <div className="oom-upcoming-list">
        {upcomingMeetings.length === 0 ? (
          <div className="oom-empty">No upcoming meetings.</div>
        ) : (
          upcomingMeetings.map((meeting) => (
            <button
              key={meeting.id}
              type="button"
              className="oom-upcoming-card"
              onClick={() => openUpcomingModal(meeting)}
            >
              <strong>
                {meeting.employeeFirstName} {meeting.employeeLastName}
              </strong>

              <span>🕐 {formatDateTime(meeting.scheduledDate)}</span>

              {meeting.notes && <em>"{meeting.notes}"</em>}

              <small>
                Scheduled by: {meeting.managerFirstName} {meeting.managerLastName}
              </small>
            </button>
          ))
        )}
      </div>

      {showWarningModal && warningMeeting && (
        <div className="oom-modal-backdrop">
          <div className="oom-modal">
            <h2>⚠ Warning</h2>

            <p>
              {selectedEmployee?.firstName} {selectedEmployee?.lastName} already has a meeting at{' '}
              <strong>{formatDateTime(warningMeeting.scheduledDate)}</strong>.
            </p>

            <p>
              The meeting you are creating is in the same hour. Are you sure you want to create
              another meeting?
            </p>

            <div className="oom-modal-actions">
              <button
                type="button"
                className="oom-btn-secondary"
                onClick={() => {
                  setShowWarningModal(false);
                  setWarningMeeting(null);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="oom-btn-primary"
                disabled={submitting}
                onClick={() => submitMeeting(true)}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUpcoming && (
        <div className="oom-modal-backdrop">
          <div className="oom-modal">
            <h2>Meeting Information</h2>

            <p>
              <strong>Employee:</strong> {selectedUpcoming.employeeFirstName}{' '}
              {selectedUpcoming.employeeLastName}
            </p>

            <div className="oom-field">
              <label className="oom-label">Date & Time</label>
              <input
                className="oom-input"
                type="datetime-local"
                value={editScheduledDate}
                onChange={(e) => setEditScheduledDate(e.target.value)}
              />
            </div>

            <div className="oom-field">
              <label className="oom-label">Notes</label>
              <textarea
                className="oom-textarea"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <div className="oom-modal-actions">
              <button type="button" className="oom-btn-secondary" onClick={closeUpcomingModal}>
                Close
              </button>

              <button type="button" className="oom-btn-primary" onClick={handleUpdateMeeting}>
                Submit
              </button>

              <button
                type="button"
                className="oom-btn-danger"
                onClick={() => setShowCancelConfirm(true)}
              >
                ⚠ Cancel Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && selectedUpcoming && (
        <div className="oom-modal-backdrop">
          <div className="oom-modal oom-modal-danger">
            <h2>⚠ Cancel Meeting</h2>

            <p>Are you really going to cancel the meeting?</p>

            <div className="oom-modal-actions">
              <button
                type="button"
                className="oom-btn-secondary"
                onClick={() => setShowCancelConfirm(false)}
              >
                No
              </button>

              <button type="button" className="oom-btn-danger" onClick={handleCancelMeeting}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OneOnOneMeetings;
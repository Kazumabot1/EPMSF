/* OneOnOneMeetings.tsx file: */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './one-on-one.css';
import { fetchDepartments } from '../services/departmentService';
import type { Department } from '../services/departmentService';
import {
  createMeeting,
  getActiveEmployeesByDepartment,
  getUpcomingMeetings,
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

const isSameHour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate() &&
  a.getHours() === b.getHours();

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

  const hiddenDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDepartments()
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
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
        setEmployees(Array.isArray(data) ? data : []);
        setSelectedEmp('');
      })
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setLoadingEmps(false));
  }, [selectedDept]);

  const loadUpcomingMeetings = async () => {
    try {
      const data = await getUpcomingMeetings();
      setUpcomingMeetings(Array.isArray(data) ? data : []);
    } catch {
      setUpcomingMeetings([]);
    }
  };

  const selectedEmployee = useMemo(() => {
    return employees.find((emp) => Number(emp.id) === Number(selectedEmp));
  }, [employees, selectedEmp]);

  const selectedEmployeeMeetings = useMemo(() => {
    if (!selectedEmp) return [];
    return upcomingMeetings.filter(
      (meeting) => Number(meeting.employeeId) === Number(selectedEmp)
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

  const findSameHourMeeting = (scheduled: Date) => {
    return selectedEmployeeMeetings.find((meeting) =>
      isSameHour(new Date(meeting.scheduledDate), scheduled)
    );
  };

  const resetForm = () => {
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

  const submitMeeting = async () => {
    const scheduled = buildDate();

    if (!scheduled || !selectedEmp) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createMeeting({
        employeeId: Number(selectedEmp),
        scheduledDate: buildIso(scheduled),
        notes,
      });

      setSuccess('1:1 Meeting scheduled successfully! 🎉');
      setShowWarningModal(false);
      setWarningMeeting(null);
      resetForm();
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
      setError('Cannot create a meeting for a past time.');
      return;
    }

    if (notes.length > 1000) {
      setError('Notes cannot exceed 1000 letters.');
      return;
    }

    const conflict = findSameHourMeeting(scheduled);

    if (conflict) {
      setWarningMeeting(conflict);
      setShowWarningModal(true);
      return;
    }

    await submitMeeting();
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
              className="oom-textarea"
              placeholder="Add agenda or notes for this meeting…"
              value={notes}
              maxLength={1000}
              onChange={(e) => setNotes(e.target.value)}
            />
            <small>Cannot input more than 1000 letters.</small>
          </div>

          {error && <div className="oom-error">⚠ {error}</div>}
          {success && <div className="oom-success">{success}</div>}

          <div>
            <button type="submit" className="oom-btn-primary" disabled={submitting}>
              {submitting ? 'Scheduling…' : '✦ Schedule Meeting'}
            </button>
          </div>
        </form>
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
              The meeting you are creating is in the same hour. Are you sure you want to continue?
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

              <button type="button" className="oom-btn-primary" onClick={submitMeeting}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OneOnOneMeetings;
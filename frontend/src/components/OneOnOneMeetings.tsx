import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  OOM_FONT,
  formatOomDateTime,
  oomBtnPrimary,
  oomCard,
  oomCompactHeader,
  oomEyebrow,
  oomHeaderDesc,
  oomHeaderTitle,
  oomInput,
  oomLabel,
  oomPageWrap,
  oomTextarea,
} from './one-on-one/oneOnOneUi';

import { fetchDepartments } from '../services/departmentService';
import type { Department } from '../services/departmentService';

import {
  createMeeting,
  getActiveEmployeesByDepartment,
  getActiveEmployeesByTeam,
  getOngoingMeetings,
  getOneOnOneContext,
  getOneOnOneTeams,
  getUpcomingMeetings,
} from '../services/oneOnOneService';
import type {
  EmployeeOption,
  Meeting,
  OneOnOneAccessContext,
  TeamEmployeeOption,
  TeamOption,
} from '../services/oneOnOneService';

const pad = (n: number) => String(n).padStart(2, '0');

type SelectableEmployee = EmployeeOption | TeamEmployeeOption;

const getEmployeeId = (employee: SelectableEmployee) => {
  if ('employeeId' in employee && employee.employeeId) {
    return employee.employeeId;
  }

  return employee.id;
};

const getEmployeeName = (employee: SelectableEmployee | Meeting | null | undefined) => {
  if (!employee) return 'Employee';

  if ('employeeFirstName' in employee) {
    return `${employee.employeeFirstName || ''} ${employee.employeeLastName || ''}`.trim() || 'Employee';
  }

  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
};

const getMeetingCreatorName = (meeting: Meeting) => {
  if (meeting.creatorName && meeting.creatorName.trim()) {
    return meeting.creatorName.trim();
  }

  const managerName = `${meeting.managerFirstName || ''} ${meeting.managerLastName || ''}`.trim();
  return managerName || 'Unknown user';
};

const getMeetingDate = (meeting: Meeting) => {
  if (meeting.followUp && (meeting.followUpStartDate || meeting.followUpDate)) {
    return meeting.followUpStartDate || meeting.followUpDate || meeting.scheduledDate;
  }

  return meeting.scheduledDate;
};

const OneOnOneMeetings: React.FC = () => {
  const [context, setContext] = useState<OneOnOneAccessContext | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [employees, setEmployees] = useState<SelectableEmployee[]>([]);

  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [ongoingMeetings, setOngoingMeetings] = useState<Meeting[]>([]);

  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [ampm, setAmPm] = useState<'AM' | 'PM'>('AM');

  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hiddenDateRef = useRef<HTMLInputElement>(null);

  const canCreate = context?.canCreate !== false;
  const canSelectDepartment = Boolean(context?.canSelectDepartment);
  const canSelectTeam = Boolean(context?.canSelectTeam);
  const teamRequired = Boolean(context?.teamRequired);
  const canUseDepartmentEmployeeScope = Boolean(context?.canUseDepartmentEmployeeScope);
  const hasDefaultDepartment = Boolean(!canSelectDepartment && context?.departmentId);

  const selectedTeamOption = useMemo(
    () => teams.find((team) => String(team.id) === selectedTeam) ?? null,
    [teams, selectedTeam],
  );

  const selectedEmployee = useMemo(() => {
    return employees.find((emp) => String(getEmployeeId(emp)) === selectedEmp) ?? null;
  }, [employees, selectedEmp]);

  const selectedEmployeeMeeting = useMemo(() => {
    if (!selectedEmp) return null;

    const employeeId = Number(selectedEmp);
    return [...ongoingMeetings, ...upcomingMeetings]
      .filter((meeting) => Number(meeting.employeeId) === employeeId)
      .sort((a, b) => new Date(getMeetingDate(a)).getTime() - new Date(getMeetingDate(b)).getTime())[0] ?? null;
  }, [ongoingMeetings, selectedEmp, upcomingMeetings]);

  const selectedEmployeeWarning = selectedEmployeeMeeting
    ? `This employee already has a meeting with ${getMeetingCreatorName(selectedEmployeeMeeting)} at ${formatOomDateTime(getMeetingDate(selectedEmployeeMeeting))}.`
    : '';

  const loadActiveMeetingChecks = async () => {
    try {
      const [upcoming, ongoing] = await Promise.all([getUpcomingMeetings(), getOngoingMeetings()]);
      setUpcomingMeetings(Array.isArray(upcoming) ? upcoming : []);
      setOngoingMeetings(Array.isArray(ongoing) ? ongoing : []);
    } catch {
      setUpcomingMeetings([]);
      setOngoingMeetings([]);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadContext = async () => {
      setLoadingContext(true);
      setError('');

      try {
        const data = await getOneOnOneContext();

        if (!mounted) return;

        setContext(data);

        if (!data.canSelectDepartment && data.departmentId) {
          setSelectedDept(String(data.departmentId));
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.response?.data?.message || 'Failed to load one-on-one access context.');
        }
      } finally {
        if (mounted) {
          setLoadingContext(false);
        }
      }
    };

    void loadContext();
    void loadActiveMeetingChecks();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadDepartments = async () => {
      if (!canSelectDepartment) {
        setDepartments([]);
        return;
      }

      setLoadingDepts(true);
      setError('');

      try {
        const data = await fetchDepartments();
        if (mounted) setDepartments(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (mounted) {
          setDepartments([]);
          setError(err?.response?.data?.message || 'Failed to load departments.');
        }
      } finally {
        if (mounted) setLoadingDepts(false);
      }
    };

    void loadDepartments();

    return () => {
      mounted = false;
    };
  }, [canSelectDepartment]);

  useEffect(() => {
    let mounted = true;

    const loadTeams = async () => {
      setTeams([]);
      setSelectedTeam('');

      if (!canCreate || !canSelectTeam) return;
      if (canSelectDepartment && !selectedDept) return;

      const departmentId = selectedDept ? Number(selectedDept) : context?.departmentId ?? undefined;

      setLoadingTeams(true);
      setError('');

      try {
        const data = await getOneOnOneTeams(teamRequired ? undefined : departmentId);
        if (mounted) setTeams(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (mounted) {
          setTeams([]);
          setError(err?.response?.data?.message || 'Failed to load teams.');
        }
      } finally {
        if (mounted) setLoadingTeams(false);
      }
    };

    void loadTeams();

    return () => {
      mounted = false;
    };
  }, [canCreate, canSelectTeam, canSelectDepartment, selectedDept, context?.departmentId, teamRequired]);

  useEffect(() => {
    let mounted = true;

    const loadEmployees = async () => {
      setEmployees([]);
      setSelectedEmp('');
      setError('');
      setSuccess('');

      if (!canCreate) return;

      const departmentId = selectedDept ? Number(selectedDept) : context?.departmentId ?? undefined;

      if (selectedTeam) {
        setLoadingEmps(true);

        try {
          const data = await getActiveEmployeesByTeam(Number(selectedTeam), teamRequired ? undefined : departmentId);
          if (mounted) setEmployees(Array.isArray(data) ? data : []);
        } catch (err: any) {
          if (mounted) setError(err?.response?.data?.message || 'Failed to load team employees.');
        } finally {
          if (mounted) setLoadingEmps(false);
        }

        return;
      }

      if (teamRequired || !canUseDepartmentEmployeeScope || !departmentId) return;

      setLoadingEmps(true);

      try {
        const data = await getActiveEmployeesByDepartment(departmentId);
        if (mounted) setEmployees(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.message || 'Failed to load employees.');
      } finally {
        if (mounted) setLoadingEmps(false);
      }
    };

    void loadEmployees();

    return () => {
      mounted = false;
    };
  }, [canCreate, selectedDept, selectedTeam, context?.departmentId, teamRequired, canUseDepartmentEmployeeScope]);

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
    const d = Number.parseInt(day, 10);
    const m = Number.parseInt(month, 10);
    const y = Number.parseInt(year, 10);
    let h = Number.parseInt(hour, 10);
    const min = Number.parseInt(minute, 10);

    if (
      Number.isNaN(d) ||
      Number.isNaN(m) ||
      Number.isNaN(y) ||
      Number.isNaN(h) ||
      Number.isNaN(min)
    ) {
      return null;
    }

    if (d < 1 || d > 31) return null;
    if (m < 1 || m > 12) return null;
    if (y < 2024 || y > 2099) return null;
    if (h < 1 || h > 12) return null;
    if (min < 0 || min > 59) return null;

    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    const date = new Date(y, m - 1, d, h, min, 0);

    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return null;
    }

    return date;
  };

  const buildIso = (scheduled: Date) => {
    return `${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(
      scheduled.getDate(),
    )}T${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}:00`;
  };

  const resetForm = () => {
    setSelectedEmp('');
    setDay('');
    setMonth('');
    setYear('');
    setHour('');
    setMinute('');
    setAmPm('AM');
    setLocation('');
    setNotes('');
    setSelectedTeam('');

    if (canSelectDepartment) {
      setSelectedDept('');
      setEmployees([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!canCreate) {
      setError('Your position does not have permission to create 1:1 meetings.');
      return;
    }

    if (canSelectDepartment && !selectedDept) {
      setError('Please select a department.');
      return;
    }

    if (teamRequired && !selectedTeam) {
      setError('Please select a team first.');
      return;
    }

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

    if (location.length > 500) {
      setError('Location cannot exceed 500 letters.');
      return;
    }

    if (notes.length > 1000) {
      setError('Notes cannot exceed 1000 letters.');
      return;
    }

    setSubmitting(true);

    try {
      await createMeeting({
        employeeId: Number(selectedEmp),
        departmentId: selectedDept ? Number(selectedDept) : undefined,
        teamId: selectedTeam ? Number(selectedTeam) : undefined,
        scheduledDate: buildIso(scheduled),
        location: location.trim(),
        notes: notes.trim(),
      });

      setSuccess(
        selectedEmployee
          ? `1:1 Meeting scheduled successfully for ${getEmployeeName(selectedEmployee)}.`
          : '1:1 Meeting scheduled successfully.',
      );

      resetForm();
      await loadActiveMeetingChecks();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create meeting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const teamPlaceholder = loadingTeams
    ? 'Loading teams...'
    : canSelectDepartment && !selectedDept
      ? '- Select department first -'
      : teams.length === 0
        ? teamRequired
          ? 'No managed active teams found'
          : 'No active teams found'
        : teamRequired
          ? '- Select Team -'
          : 'Optional - Select Team';

  const employeePlaceholder = selectedTeam
    ? loadingEmps
      ? 'Loading team employees...'
      : employees.length === 0
        ? 'No active employees found in this team'
        : '- Select Employee -'
    : teamRequired
      ? '- Select team first -'
      : canSelectDepartment && !selectedDept
        ? '- Select department first -'
        : loadingEmps
          ? 'Loading department employees...'
          : employees.length === 0
            ? 'No active employees found in this department'
            : '- Select Employee -';

  const headerDescription =
    context?.accessMode === 'DEPARTMENT_HEAD_SCOPE'
      ? 'Your department is fixed. Choose any team in your department or pick an employee from the full department list.'
      : canSelectDepartment
        ? 'Choose a department, optionally narrow the list by team, then schedule a meeting.'
        : teamRequired
          ? 'Choose one of the active teams you lead or manage, then select an employee from that team.'
          : hasDefaultDepartment
            ? 'Your default department is auto-selected. Team is optional; skip it to see all active employees in your department.'
            : 'Create one-on-one meetings with employees.';

  const renderHeader = () => (
    <header className={oomCompactHeader}>
      <p className={oomEyebrow}>One-on-One Meetings</p>
      <h1 className={oomHeaderTitle}>Create 1:1 Meeting</h1>
      <p className={oomHeaderDesc}>{headerDescription}</p>
    </header>
  );

  if (!loadingContext && context && !canCreate) {
    return (
      <div className={oomPageWrap} style={{ fontFamily: OOM_FONT }}>
        <header className={oomCompactHeader}>
          <p className={oomEyebrow}>One-on-One Meetings</p>
          <h1 className={oomHeaderTitle}>Create 1:1 Meeting</h1>
          <p className={oomHeaderDesc}>
            Your current position does not have permission to create one-on-one meetings.
          </p>
        </header>
        <div className={oomCard}>
          <h2 className="text-base font-bold text-[#0f172a]">Creation Locked</h2>
          <p className="mt-1 text-sm text-[#64748b]">
            Ask an administrator to enable the 1:1 Meetings → Creation permission for your position.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={oomPageWrap} style={{ fontFamily: OOM_FONT }}>
      {renderHeader()}

      {(error || success) && (
        <div className="mb-4 space-y-2">
          {error && (
            <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-semibold text-[#991b1b]">
              <i className="bi bi-exclamation-triangle me-2" aria-hidden />
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-[#bbf7d0] bg-[#ecfdf5] px-4 py-3 text-sm font-semibold text-[#065f46]">
              <i className="bi bi-check-circle me-2" aria-hidden />
              {success}
            </div>
          )}
        </div>
      )}

      <div className={oomCard}>
        <div className="mb-5 border-b border-[#e5e7eb] pb-4">
          <h2 className="text-base font-bold text-[#0f172a] sm:text-lg">Schedule a New Meeting</h2>
          <p className="mt-1 text-xs text-[#64748b] sm:text-sm">
            Action Items now owns Upcoming, Ongoing, and Past meeting views.
          </p>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="col-span-full rounded-xl border border-[#dbe7f6] bg-gradient-to-br from-[#eff6ff] to-white p-4 sm:p-5">
            <div>
              <span className="inline-flex rounded-full bg-[#2563eb] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Scope
              </span>
              <h3 className="mt-2 text-sm font-bold text-[#0f172a] sm:text-base">
                {context?.accessMode === 'DEPARTMENT_HEAD_SCOPE'
                  ? 'Department head scope'
                  : canSelectDepartment
                    ? 'Department selection enabled'
                    : teamRequired
                      ? 'Managed team scope'
                      : 'Default department applied'}
              </h3>
              <p>
                {context?.accessMode === 'DEPARTMENT_HEAD_SCOPE'
                  ? `${context?.departmentName || 'Your department'} is locked. Teams and employees are limited to that department.`
                  : canSelectDepartment
                    ? 'Choose an allowed department. Team is optional and only narrows the employee list.'
                    : teamRequired
                      ? 'Select one of the teams you lead or manage before choosing an employee.'
                      : `Using ${context?.departmentName || 'your default department'}. Team is optional.`}
              </p>
            </div>
          </div>

          <div className="col-span-full grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={oomLabel}>Department</label>

              {canSelectDepartment ? (
                <select
                  className={oomInput}
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setSelectedTeam('');
                  }}
                  required
                  disabled={loadingDepts}
                >
                  <option value="">
                    {loadingDepts ? 'Loading departments...' : '- Select Department -'}
                  </option>

                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.departmentName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={oomInput}
                  value={context?.departmentName || `Department #${context?.departmentId || ''}`}
                  disabled
                  placeholder="Default department"
                />
              )}
            </div>

            {canSelectTeam && (
              <div className="flex flex-col gap-1.5">
                <label className={oomLabel}>
                  Team{' '}
                  {!teamRequired && (
                    <span className="ml-1.5 rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                      Optional
                    </span>
                  )}
                </label>
                <select
                  className={oomInput}
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  required={teamRequired}
                  disabled={
                    loadingContext ||
                    loadingTeams ||
                    teams.length === 0 ||
                    (canSelectDepartment && !selectedDept)
                  }
                >
                  <option value="">{teamPlaceholder}</option>

                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.teamName}
                    </option>
                  ))}
                </select>
                {selectedTeamOption?.departmentName && (
                  <small className="text-xs text-[#64748b]">Department: {selectedTeamOption.departmentName}</small>
                )}
              </div>
            )}
          </div>

          <div className="col-span-full flex flex-col gap-1.5">
            <label className={oomLabel}>Employee</label>

            <select
              className={oomInput}
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              required
              disabled={loadingEmps || (teamRequired ? !selectedTeam : !selectedTeam && !selectedDept)}
            >
              <option value="">{employeePlaceholder}</option>

              {employees.map((employee) => {
                const employeeId = getEmployeeId(employee);

                return (
                  <option key={employeeId} value={employeeId}>
                    {getEmployeeName(employee)}
                  </option>
                );
              })}
            </select>

            {selectedEmployeeWarning && (
              <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3.5 py-2.5 text-sm text-[#92400e]">
                <strong className="flex items-center gap-1.5 font-bold">
                  <i className="bi bi-exclamation-triangle" aria-hidden />
                  Warning
                </strong>
                <span className="mt-1 block">{selectedEmployeeWarning}</span>
              </div>
            )}
          </div>

          <div className="col-span-full flex flex-col gap-1.5 sm:col-span-1">
            <label className={oomLabel}>Meeting Date</label>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#64748b]">Day</label>
                <input
                  className={`${oomInput} w-[72px] text-center`}
                  type="number"
                  min={1}
                  max={31}
                  placeholder="DD"
                  value={day}
                  onChange={(e) => setDay(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <span className="pb-3 font-bold text-[#94a3b8]">/</span>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#64748b]">Month</label>
                <input
                  className={`${oomInput} w-[72px] text-center`}
                  type="number"
                  min={1}
                  max={12}
                  placeholder="MM"
                  value={month}
                  onChange={(e) => setMonth(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <span className="pb-3 font-bold text-[#94a3b8]">/</span>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#64748b]">Year</label>
                <input
                  className={`${oomInput} w-[88px] text-center`}
                  type="number"
                  min={2024}
                  max={2099}
                  placeholder="YYYY"
                  value={year}
                  onChange={(e) => setYear(e.target.value.slice(0, 4))}
                  required
                />
              </div>

              <button type="button" className={oomBtnPrimary} onClick={openCalendar}>
                <i className="bi bi-calendar3" aria-hidden />
                Calendar
              </button>

              <input
                ref={hiddenDateRef}
                type="date"
                min={today}
                onChange={handleCalendarChange}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                tabIndex={-1}
              />
            </div>
          </div>

          <div className="col-span-full flex flex-col gap-1.5 sm:col-span-1">
            <label className={oomLabel}>Meeting Time</label>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${oomInput} w-[76px] text-center`}
                type="number"
                min={1}
                max={12}
                placeholder="HH"
                value={hour}
                onChange={(e) => setHour(e.target.value.slice(0, 2))}
                required
              />
              <span className="font-bold text-[#94a3b8]">:</span>
              <input
                className={`${oomInput} w-[76px] text-center`}
                type="number"
                min={0}
                max={59}
                placeholder="MM"
                value={minute}
                onChange={(e) => setMinute(e.target.value.slice(0, 2))}
                required
              />
              <select
                className={`${oomInput} w-[92px]`}
                value={ampm}
                onChange={(e) => setAmPm(e.target.value as 'AM' | 'PM')}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

          <div className="col-span-full flex flex-col gap-1.5 sm:col-span-1">
            <label className={oomLabel}>Location</label>
            <input
              className={oomInput}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Meeting room, online link, or office location"
              maxLength={500}
            />
            <small className="text-xs text-[#64748b]">Optional. Cannot exceed 500 letters.</small>
          </div>

          <div className="col-span-full flex flex-col gap-1.5">
            <label className={oomLabel}>Notes</label>
            <textarea
              className={oomTextarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agenda or meeting notes"
              rows={4}
              maxLength={1000}
            />
            <small className="text-xs text-[#64748b]">Cannot exceed 1000 letters.</small>
          </div>

          <button type="submit" className={`${oomBtnPrimary} col-span-full`} disabled={submitting || loadingContext}>
            <i className="bi bi-calendar-plus" aria-hidden />
            {submitting ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OneOnOneMeetings;
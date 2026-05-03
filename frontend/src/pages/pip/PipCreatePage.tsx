// PipCreatePage.tsx file:

/*
  Why this file exists:
  - This is the PIP creation screen.
  - Team Leader/Manager can create PIP only for employees in their own team.
  - Department Head can create PIP for employees in their department.
  - HR should not use this screen.
  - Employee dropdown disables employees who already have an active PIP.
  - Phase boxes are generated based on selected phase count.
*/

import React, { useEffect, useMemo, useState } from "react";
import { pipService } from "../../services/pipService";
import type { PipCreateRequest, PipEligibleEmployee, PipPhaseRequest } from "../../types/pip";
import "./pip.css";

const WORD_LIMIT = 1000;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function trimToWordLimit(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= WORD_LIMIT) {
    return value;
  }
  return words.slice(0, WORD_LIMIT).join(" ");
}

function addDays(dateText: string, days: number): string {
  if (!dateText) return "";
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeError(error: any): string {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong."
  );
}

export default function PipCreatePage() {
  const [employees, setEmployees] = useState<PipEligibleEmployee[]>([]);
  const [employeeUserId, setEmployeeUserId] = useState("");
  const [goal, setGoal] = useState("");
  const [expectedOutcomes, setExpectedOutcomes] = useState("");
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState(addDays(todayString(), 7));
  const [phaseCount, setPhaseCount] = useState(3);
  const [phases, setPhases] = useState<PipPhaseRequest[]>([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    const next: PipPhaseRequest[] = Array.from({ length: phaseCount }, (_, index) => {
      const previous = phases[index];
      const phaseNumber = index + 1;

      if (previous) {
        return {
          ...previous,
          phaseNumber,
          startDate: previous.startDate || (phaseNumber === 1 ? startDate : ""),
        };
      }

      const autoStart =
        phaseNumber === 1
          ? startDate
          : phases[index - 1]?.endDate
          ? phases[index - 1].endDate
          : startDate;

      return {
        phaseNumber,
        phaseGoal: "",
        startDate: autoStart,
        endDate: autoStart ? addDays(autoStart, 1) : "",
      };
    });

    setPhases(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseCount, startDate]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.userId) === employeeUserId),
    [employees, employeeUserId]
  );

  async function loadEmployees() {
    try {
      setEmployeesLoading(true);
      setError("");
      const data = await pipService.getEligibleEmployees();
      setEmployees(data);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setEmployeesLoading(false);
    }
  }

  function handleLimitedText(
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    label: string
  ) {
    if (countWords(value) > WORD_LIMIT) {
      setter(trimToWordLimit(value));
      setWarning(`${label}: Words cannot be exceed 1000`);
      return;
    }

    setter(value);
    setWarning("");
  }

  function updatePhase(index: number, patch: Partial<PipPhaseRequest>) {
    setPhases((current) =>
      current.map((phase, phaseIndex) =>
        phaseIndex === index
          ? {
              ...phase,
              ...patch,
            }
          : phase
      )
    );
  }

  function updatePhaseGoal(index: number, value: string) {
    if (countWords(value) > WORD_LIMIT) {
      updatePhase(index, { phaseGoal: trimToWordLimit(value) });
      setWarning(`Phase ${index + 1} Goal: Words cannot be exceed 1000`);
      return;
    }

    updatePhase(index, { phaseGoal: value });
    setWarning("");
  }

  function validate(): string | null {
    const today = todayString();

    if (!employeeUserId) {
      return "Please select an employee.";
    }

    if (selectedEmployee?.alreadyHasActivePip) {
      return "Selected employee already has an active PIP.";
    }

    if (!goal.trim()) {
      return "PIP goal is required.";
    }

    if (!expectedOutcomes.trim()) {
      return "Expected outcomes are required.";
    }

    if (countWords(goal) > WORD_LIMIT) {
      return "PIP goal cannot exceed 1000 words.";
    }

    if (countWords(expectedOutcomes) > WORD_LIMIT) {
      return "Expected outcomes cannot exceed 1000 words.";
    }

    if (!startDate || startDate < today) {
      return "PIP start date cannot be in the past.";
    }

    if (!endDate || endDate <= startDate) {
      return "PIP end date must be after start date.";
    }

    for (let index = 0; index < phases.length; index += 1) {
      const phase = phases[index];

      if (!phase.phaseGoal.trim()) {
        return `Phase ${index + 1} goal is required.`;
      }

      if (countWords(phase.phaseGoal) > WORD_LIMIT) {
        return `Phase ${index + 1} goal cannot exceed 1000 words.`;
      }

      if (!phase.startDate || phase.startDate < today) {
        return `Phase ${index + 1} start date cannot be in the past.`;
      }

      if (!phase.endDate || phase.endDate <= phase.startDate) {
        return `Phase ${index + 1} end date must be after phase start date.`;
      }

      if (phase.startDate < startDate || phase.endDate > endDate) {
        return `Phase ${index + 1} dates must be inside the PIP start and end dates.`;
      }

      const previous = phases[index - 1];
      if (previous && phase.startDate < previous.endDate) {
        return `Phase ${index + 1} start date cannot be before previous phase end date.`;
      }
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      setSuccess("");
      return;
    }

    const payload: PipCreateRequest = {
      employeeUserId: Number(employeeUserId),
      goal: goal.trim(),
      expectedOutcomes: expectedOutcomes.trim(),
      startDate,
      endDate,
      phases: phases.map((phase, index) => ({
        phaseNumber: index + 1,
        phaseGoal: phase.phaseGoal.trim(),
        startDate: phase.startDate,
        endDate: phase.endDate,
      })),
    };

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await pipService.createPip(payload);
      setSuccess("PIP created successfully.");
      setEmployeeUserId("");
      setGoal("");
      setExpectedOutcomes("");
      setStartDate(todayString());
      setEndDate(addDays(todayString(), 7));
      setPhaseCount(3);
      await loadEmployees();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pip-page">
      <div className="pip-page-header">
        <div>
          <p className="pip-eyebrow">Performance Improvement Plan</p>
          <h1>Create PIP</h1>
          <p className="pip-muted">
            Create a structured plan with phases, expected outcomes, and clear dates.
          </p>
        </div>
      </div>

      <form className="pip-card pip-form" onSubmit={handleSubmit}>
        {error && <div className="pip-alert pip-alert-error">{error}</div>}
        {success && <div className="pip-alert pip-alert-success">{success}</div>}
        {warning && <div className="pip-alert pip-alert-warning">{warning}</div>}

        <div className="pip-grid two">
          <label className="pip-field">
            <span>Employee</span>
            <select
              value={employeeUserId}
              onChange={(event) => setEmployeeUserId(event.target.value)}
              disabled={employeesLoading}
            >
              <option value="">{employeesLoading ? "Loading employees..." : "Select employee"}</option>
              {employees.map((employee) => (
                <option
                  key={employee.userId}
                  value={employee.userId}
                  disabled={employee.alreadyHasActivePip}
                >
                  {employee.employeeName}
                  {employee.alreadyHasActivePip ? " (Already have PIP currently)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="pip-field">
            <span>Phase Number</span>
            <select
              value={phaseCount}
              onChange={(event) => setPhaseCount(Number(event.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="pip-field">
          <span>PIP Goal</span>
          <textarea
            value={goal}
            onChange={(event) => handleLimitedText(event.target.value, setGoal, "PIP Goal")}
            rows={4}
            placeholder="Example: To master the Java language"
          />
          <small>{countWords(goal)} / {WORD_LIMIT} words</small>
        </label>

        <label className="pip-field">
          <span>Expected Outcomes</span>
          <textarea
            value={expectedOutcomes}
            onChange={(event) =>
              handleLimitedText(event.target.value, setExpectedOutcomes, "Expected Outcomes")
            }
            rows={4}
            placeholder="Example: Employee can work independently on backend Java tasks."
          />
          <small>{countWords(expectedOutcomes)} / {WORD_LIMIT} words</small>
        </label>

        <div className="pip-grid two">
          <label className="pip-field">
            <span>Start Date</span>
            <input
              type="date"
              min={todayString()}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="pip-field">
            <span>End Date</span>
            <input
              type="date"
              min={addDays(startDate, 1)}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        <div className="pip-section-title">
          <h2>Phases</h2>
          <p>Status and reason/note can be updated after the PIP is created.</p>
        </div>

        <div className="pip-phase-list">
          {phases.map((phase, index) => (
            <div className="pip-phase-create-card" key={phase.phaseNumber}>
              <h3>Phase {index + 1}</h3>

              <div className="pip-grid two">
                <label className="pip-field">
                  <span>Start Date</span>
                  <input
                    type="date"
                    min={index === 0 ? todayString() : phases[index - 1]?.endDate || todayString()}
                    value={phase.startDate}
                    onChange={(event) => updatePhase(index, { startDate: event.target.value })}
                  />
                </label>

                <label className="pip-field">
                  <span>End Date</span>
                  <input
                    type="date"
                    min={addDays(phase.startDate, 1)}
                    value={phase.endDate}
                    onChange={(event) => updatePhase(index, { endDate: event.target.value })}
                  />
                </label>
              </div>

              <label className="pip-field">
                <span>Phase {index + 1} Goal</span>
                <textarea
                  value={phase.phaseGoal}
                  onChange={(event) => updatePhaseGoal(index, event.target.value)}
                  rows={3}
                  placeholder="Put the goal/note for this phase."
                />
                <small>{countWords(phase.phaseGoal)} / {WORD_LIMIT} words</small>
              </label>
            </div>
          ))}
        </div>

        <div className="pip-actions">
          <button
            type="button"
            className="pip-button secondary"
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
          <button type="submit" className="pip-button primary" disabled={loading}>
            {loading ? "Starting..." : "Start"}
          </button>
        </div>
      </form>
    </div>
  );
}
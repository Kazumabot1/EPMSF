// PipPastPlansPage.tsx

/*
  Why this file exists:
  - Shows PIP plans in two tabs: Ongoing and Past.
  - Ongoing PIPs are needed so the creator can update phase status/reason and finish the PIP.
  - Past PIPs are ended/finished plans.
  - Clicking a card opens a full detail modal.
*/

import React, { useEffect, useMemo, useState } from "react";
import { pipService } from "../../services/pipService";
import type { PipDetail, PipPhase, PipPhaseStatus } from "../../types/pip";
import "./pip.css";

const STATUS_OPTIONS: { value: PipPhaseStatus; label: string }[] = [
  { value: "HASNT_STARTED_YET", label: "Hasn't Started Yet" },
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
];

const WORD_LIMIT = 1000;

function normalizeError(error: any): string {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong."
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function phaseStatusLabel(status: PipPhaseStatus): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function trimToWordLimit(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= WORD_LIMIT) return value;
  return words.slice(0, WORD_LIMIT).join(" ");
}

type TabKey = "ongoing" | "past";

export default function PipPastPlansPage() {
  const [tab, setTab] = useState<TabKey>("ongoing");
  const [ongoing, setOngoing] = useState<PipDetail[]>([]);
  const [past, setPast] = useState<PipDetail[]>([]);
  const [selected, setSelected] = useState<PipDetail | null>(null);
  const [phaseDrafts, setPhaseDrafts] = useState<Record<number, { status: PipPhaseStatus; reasonNote: string }>>({});
  const [finishComments, setFinishComments] = useState("");
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPips();
  }, []);

  useEffect(() => {
    if (!selected) {
      setPhaseDrafts({});
      return;
    }

    const drafts: Record<number, { status: PipPhaseStatus; reasonNote: string }> = {};
    selected.phases.forEach((phase) => {
      drafts[phase.id] = {
        status: phase.status,
        reasonNote: phase.reasonNote || "",
      };
    });
    setPhaseDrafts(drafts);
  }, [selected]);

  const list = useMemo(() => (tab === "ongoing" ? ongoing : past), [tab, ongoing, past]);

  async function loadPips() {
    try {
      setLoading(true);
      setError("");
      const [ongoingData, pastData] = await Promise.all([
        pipService.getOngoingPips(),
        pipService.getPastPips(),
      ]);
      setOngoing(ongoingData);
      setPast(pastData);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(pipId: number) {
    try {
      setModalLoading(true);
      setModalError("");
      const detail = await pipService.getPipById(pipId);
      setSelected(detail);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setSelected(null);
    setModalError("");
    setMessage("");
    setFinishComments("");
    setShowFinishConfirm(false);
  }

  function updateDraft(phaseId: number, patch: Partial<{ status: PipPhaseStatus; reasonNote: string }>) {
    setPhaseDrafts((current) => ({
      ...current,
      [phaseId]: {
        ...current[phaseId],
        ...patch,
      },
    }));
  }

  function updateReason(phaseId: number, value: string) {
    if (countWords(value) > WORD_LIMIT) {
      updateDraft(phaseId, { reasonNote: trimToWordLimit(value) });
      setModalError("Reason/Note: Words cannot be exceed 1000");
      return;
    }

    updateDraft(phaseId, { reasonNote: value });
    setModalError("");
  }

  async function savePhase(phase: PipPhase) {
    if (!selected) return;

    const draft = phaseDrafts[phase.id];
    if (!draft) return;

    if (countWords(draft.reasonNote) > WORD_LIMIT) {
      setModalError("Reason/Note cannot exceed 1000 words.");
      return;
    }

    try {
      setModalLoading(true);
      setModalError("");
      const updated = await pipService.updatePhase(selected.id, phase.id, {
        status: draft.status,
        reasonNote: draft.reasonNote,
      });
      setSelected(updated);
      setMessage("Phase updated successfully.");
      await loadPips();
    } catch (err) {
      setModalError(normalizeError(err));
    } finally {
      setModalLoading(false);
    }
  }

  function handleFinishText(value: string) {
    if (countWords(value) > WORD_LIMIT) {
      setFinishComments(trimToWordLimit(value));
      setModalError("Final comments: Words cannot be exceed 1000");
      return;
    }

    setFinishComments(value);
    setModalError("");
  }

  async function finishPip() {
    if (!selected) return;

    if (!finishComments.trim()) {
      setModalError("Final comments are required.");
      return;
    }

    if (countWords(finishComments) > WORD_LIMIT) {
      setModalError("Final comments cannot exceed 1000 words.");
      return;
    }

    try {
      setModalLoading(true);
      setModalError("");
      const updated = await pipService.finishPip(selected.id, {
        comments: finishComments.trim(),
      });
      setSelected(updated);
      setShowFinishConfirm(false);
      setFinishComments("");
      setMessage("PIP finished successfully.");
      await loadPips();
      setTab("past");
    } catch (err) {
      setModalError(normalizeError(err));
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <div className="pip-page">
      <div className="pip-page-header">
        <div>
          <p className="pip-eyebrow">Performance Improvement Plan</p>
          <h1>Past Plans</h1>
          <p className="pip-muted">
            View ongoing PIPs, update phase progress, and review finished plans.
          </p>
        </div>
      </div>

      <div className="pip-tabs">
        <button
          className={tab === "ongoing" ? "active" : ""}
          onClick={() => setTab("ongoing")}
          type="button"
        >
          Ongoing
        </button>
        <button
          className={tab === "past" ? "active" : ""}
          onClick={() => setTab("past")}
          type="button"
        >
          Past
        </button>
      </div>

      {error && <div className="pip-alert pip-alert-error">{error}</div>}

      {loading ? (
        <div className="pip-card">Loading PIPs...</div>
      ) : list.length === 0 ? (
        <div className="pip-card pip-empty">
          No {tab === "ongoing" ? "ongoing" : "past"} PIPs found.
        </div>
      ) : (
        <div className="pip-plan-grid">
          {list.map((pip) => (
            <button
              key={pip.id}
              className="pip-plan-card"
              onClick={() => openDetail(pip.id)}
              type="button"
            >
              <div className="pip-plan-card-top">
                <span className={pip.status ? "pip-badge ongoing" : "pip-badge past"}>
                  {pip.status ? "Ongoing" : "Past"}
                </span>
                <span className="pip-muted">#{pip.id}</span>
              </div>
              <h3>To whom: {pip.employeeName}</h3>
              <p>{pip.goal}</p>
              <div className="pip-card-meta">
                <span>Started: {formatDate(pip.startDate)}</span>
                <span>Ended: {formatDate(pip.endDate)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {modalLoading && !selected && <div className="pip-modal-backdrop">Loading...</div>}

      {selected && (
        <div className="pip-modal-backdrop" role="dialog" aria-modal="true">
          <div className="pip-modal">
            <div className="pip-modal-header">
              <div>
                <p className="pip-eyebrow">PIP Details</p>
                <h2>{selected.goal}</h2>
                <p className="pip-muted">
                  Created By: {selected.createdByName} ({selected.createdByPosition})
                </p>
              </div>
              <button className="pip-icon-button" type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            {modalError && <div className="pip-alert pip-alert-error">{modalError}</div>}
            {message && <div className="pip-alert pip-alert-success">{message}</div>}

            <div className="pip-detail-grid">
              <div>
                <strong>Employee</strong>
                <span>{selected.employeeName}</span>
              </div>
              <div>
                <strong>Status</strong>
                <span>{selected.status ? "Ongoing" : "Finished"}</span>
              </div>
              <div>
                <strong>Start Date</strong>
                <span>{formatDate(selected.startDate)}</span>
              </div>
              <div>
                <strong>End Date</strong>
                <span>{formatDate(selected.endDate)}</span>
              </div>
            </div>

            <div className="pip-detail-section">
              <h3>Expected Outcomes</h3>
              <p>{selected.expectedOutcomes}</p>
            </div>

            {selected.comments && (
              <div className="pip-detail-section">
                <h3>Final Comments</h3>
                <p>{selected.comments}</p>
              </div>
            )}

            <div className="pip-detail-section">
              <h3>Phases</h3>
              <div className="pip-phase-list">
                {selected.phases.map((phase) => {
                  const draft = phaseDrafts[phase.id] || {
                    status: phase.status,
                    reasonNote: phase.reasonNote || "",
                  };

                  return (
                    <div className="pip-phase-detail-card" key={phase.id}>
                      <div className="pip-phase-header">
                        <div>
                          <h4>Phase {phase.phaseNumber}: {phase.phaseGoal}</h4>
                          <p className="pip-muted">
                            Duration: {formatDate(phase.startDate)} to {formatDate(phase.endDate)}
                          </p>
                        </div>
                        <span className="pip-badge">{phaseStatusLabel(phase.status)}</span>
                      </div>

                      {selected.canEdit ? (
                        <>
                          <div className="pip-grid two">
                            <label className="pip-field">
                              <span>Status</span>
                              <select
                                value={draft.status}
                                onChange={(event) =>
                                  updateDraft(phase.id, {
                                    status: event.target.value as PipPhaseStatus,
                                  })
                                }
                              >
                                {STATUS_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="pip-field">
                              <span>Updated By</span>
                              <input value={phase.updatedByName || "-"} readOnly />
                            </label>
                          </div>

                          <label className="pip-field">
                            <span>Reason / Note</span>
                            <textarea
                              rows={3}
                              value={draft.reasonNote}
                              onChange={(event) => updateReason(phase.id, event.target.value)}
                              placeholder="Write progress note or reason."
                            />
                            <small>{countWords(draft.reasonNote)} / {WORD_LIMIT} words</small>
                          </label>

                          <button
                            type="button"
                            className="pip-button primary small"
                            onClick={() => savePhase(phase)}
                            disabled={modalLoading}
                          >
                            Save Phase
                          </button>
                        </>
                      ) : (
                        <>
                          <p>
                            <strong>Progress Note:</strong>{" "}
                            {phase.reasonNote || "No progress note yet."}
                          </p>
                          <p>
                            <strong>Status:</strong> {phaseStatusLabel(phase.status)}
                          </p>
                          {phase.updatedByName && (
                            <p className="pip-muted">
                              Last updated by {phase.updatedByName} at {formatDateTime(phase.updatedAt)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selected.updates?.length > 0 && (
              <div className="pip-detail-section">
                <h3>Update History</h3>
                <div className="pip-history-list">
                  {selected.updates.map((update) => (
                    <div className="pip-history-item" key={update.id}>
                      <strong>{update.actionType || "Update"}</strong>
                      <span>
                        {update.updatedByName || "Unknown"} · {formatDateTime(update.updatedAt)}
                      </span>
                      {update.comments && <p>{update.comments}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.canEdit && selected.status && (
              <div className="pip-finish-area">
                <label className="pip-field">
                  <span>Final Comments</span>
                  <textarea
                    rows={3}
                    value={finishComments}
                    onChange={(event) => handleFinishText(event.target.value)}
                    placeholder="Required before finishing this PIP."
                  />
                  <small>{countWords(finishComments)} / {WORD_LIMIT} words</small>
                </label>

                <button
                  type="button"
                  className="pip-button danger"
                  disabled={!selected.canFinish || modalLoading}
                  onClick={() => setShowFinishConfirm(true)}
                  title={
                    selected.canFinish
                      ? "Finish PIP"
                      : "FINISH is available only after the PIP end date."
                  }
                >
                  FINISH
                </button>

                {!selected.canFinish && (
                  <p className="pip-muted">
                    FINISH becomes available after the PIP end date.
                  </p>
                )}
              </div>
            )}

            {showFinishConfirm && (
              <div className="pip-confirm-box">
                <p>Are you sure you are going to end this PIP?</p>
                <div className="pip-actions">
                  <button
                    type="button"
                    className="pip-button secondary"
                    onClick={() => setShowFinishConfirm(false)}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className="pip-button danger"
                    onClick={finishPip}
                    disabled={modalLoading}
                  >
                    Yes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/*
  Why this file exists:
  - Shows PIP records in two filters: Ongoing and Past, with search.
  - Shows department name in the card and detail modal.
  - Employee can view their own PIP here.
  - Creator can update phases and finish ongoing PIP.
*/

import { useEffect, useMemo, useState } from "react";
import { formatDate, formatDateTimeParen } from "../../components/hr/kpi-template/kpiTemplateDateFormat";
import { pipService } from "../../services/pipService";
import type { PipDetail, PipPhase, PipPhaseStatus } from "../../types/pip";

const FONT = '"Times New Roman", Times, serif';

const STATUS_OPTIONS: { value: PipPhaseStatus; label: string }[] = [
  { value: "HASNT_STARTED_YET", label: "Hasn't Started Yet" },
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
];

const WORD_LIMIT = 1000;

const btnBase =
  "inline-flex min-h-10 items-center justify-center rounded-lg border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondary = `${btnBase} border-[#c5d4e3] bg-white text-[#4a6278] shadow-sm hover:border-[#9eb5ca] hover:bg-[#f4f8fc]`;

const btnPrimary = `${btnBase} border-[#9eb5ca] bg-[linear-gradient(135deg,#f8fbfd_0%,#dce8f2_100%)] text-[#3d5a73] shadow-sm hover:border-[#7a9bb8] hover:from-[#eef4f9] hover:to-[#d0dfe9]`;

const btnDanger = `${btnBase} border-[#e8b4b4] bg-[linear-gradient(135deg,#fff8f8_0%,#f5dede_100%)] text-[#8b4545] shadow-sm hover:border-[#d49898]`;

const inputClass =
  "w-full min-h-11 rounded-lg border border-[#c5d4e3] bg-white px-3.5 text-[#2c3e50] shadow-sm outline-none transition focus:border-[#7a9bb8] focus:ring-2 focus:ring-[#7a9bb8]/20";

function normalizeError(error: unknown): string {
  const err = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Something went wrong."
  );
}

/** Date-only values show midnight; datetimes use `DD-MM-YYYY (hh:mm AM/PM)`. */
function formatPipDateTime(value?: string | null): string {
  if (!value) return "—";
  const raw = String(value).trim();
  if (!raw) return "—";
  if (/[T\s]\d{1,2}:\d{2}/.test(raw)) {
    return formatDateTimeParen(value);
  }
  return `${formatDate(value)} (12:00 AM)`;
}

function todayText(): string {
  return new Date().toISOString().slice(0, 10);
}

function hasDateArrived(value?: string | null): boolean {
  if (!value) return true;
  return value <= todayText();
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
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  const list = useMemo(() => {
    const source = tab === "ongoing" ? ongoing : past;
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return source;
    }

    return source.filter((pip) =>
      [pip.createdByName, pip.employeeName, pip.employeeDepartmentName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [tab, ongoing, past, searchQuery]);

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
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
      style={{ fontFamily: FONT }}
    >
      {/* Compact header */}
      <header className="mb-5 rounded-xl border border-[#d4e1ed] bg-gradient-to-br from-white via-[#f8fbfd] to-[#eef4f9] px-5 py-3.5 shadow-sm">
        <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b8ba8]">
          Performance Improvement Plan
        </p>
        <h1 className="text-xl font-bold tracking-tight text-[#2c3e50] sm:text-2xl">All PIP Views</h1>
        <p className="mt-1 max-w-3xl text-sm leading-snug text-[#6b7f92]">
          Search and view PIPs by creator, employee, or department. Past PIPs are only those finished with final comments.
        </p>
      </header>

      {/* Search toolbar */}
      <div className="mb-4 grid gap-3 rounded-xl border border-[#d4e1ed] bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-[#4a6278]">Search PIP records</span>
          <input
            className={inputClass}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Creator name, employee name, or department"
          />
        </label>
        <button className={btnSecondary} type="button" onClick={loadPips} disabled={loading}>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div
        className="mb-5 inline-flex rounded-xl border border-[#d4e1ed] bg-[#eef4f9] p-1 shadow-sm"
        role="tablist"
      >
        {(["ongoing", "past"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`rounded-lg px-5 py-2 text-sm font-bold capitalize transition ${
              tab === key
                ? "bg-[#7a9bb8] text-white shadow-sm"
                : "text-[#5a7288] hover:bg-white/60"
            }`}
            onClick={() => setTab(key)}
          >
            {key}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[#e8c4c4] bg-[#fdf5f5] px-4 py-3 text-sm font-semibold text-[#8b4545]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#d4e1ed] bg-white px-6 py-10 text-center text-[#5a7288] shadow-sm">
          Loading PIPs...
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#c5d4e3] bg-[#f8fbfd] px-6 py-12 text-center text-[#6b7f92]">
          No {tab === "ongoing" ? "ongoing" : "past"} PIPs found
          {searchQuery.trim() ? " for this search." : "."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((pip) => (
            <button
              key={pip.id}
              type="button"
              onClick={() => openDetail(pip.id)}
              className="group flex flex-col rounded-xl border border-[#d4e1ed] bg-white p-4 text-left shadow-sm transition hover:border-[#9eb5ca] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7a9bb8]/40"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    pip.status
                      ? "bg-[#e4f0e8] text-[#4a6b55]"
                      : "bg-[#eef2f6] text-[#5a7288]"
                  }`}
                >
                  {pip.status ? "Ongoing" : "Past"}
                </span>
                <span className="text-xs text-[#8a9bab]">#{pip.id}</span>
              </div>
              <h3 className="mb-1 text-base font-bold text-[#2c3e50] group-hover:text-[#4a6278]">
                To whom: {pip.employeeName}
              </h3>
              <p className="mb-3 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-[#6b7f92]">{pip.goal}</p>
              <dl className="mt-auto grid gap-1 text-xs text-[#6b7f92]">
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold text-[#5a7288]">Creator</dt>
                  <dd className="truncate text-right">{pip.createdByName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold text-[#5a7288]">Department</dt>
                  <dd className="truncate text-right">{pip.employeeDepartmentName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold text-[#5a7288]">Started</dt>
                  <dd>{formatPipDateTime(pip.startDate)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold text-[#5a7288]">Ended</dt>
                  <dd>{formatPipDateTime(pip.endDate)}</dd>
                </div>
              </dl>
            </button>
          ))}
        </div>
      )}

      {modalLoading && !selected && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-[#2c3e50]/40 backdrop-blur-[2px]"
          style={{ fontFamily: FONT }}
        >
          <div className="rounded-xl border border-[#d4e1ed] bg-white px-8 py-6 text-[#4a6278] shadow-xl">
            Loading...
          </div>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[#2c3e50]/45 px-4 py-8 backdrop-blur-[2px] sm:px-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pip-detail-title"
          style={{ fontFamily: FONT }}
          onClick={closeModal}
        >
          <div
            className="my-auto w-full max-w-3xl rounded-2xl border border-[#d4e1ed] bg-gradient-to-b from-white to-[#f8fbfd] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#e4edf4] px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b8ba8]">PIP Details</p>
                <h2 id="pip-detail-title" className="mt-0.5 truncate text-lg font-bold text-[#2c3e50] sm:text-xl">
                  {selected.goal}
                </h2>
                <p className="mt-1 text-sm text-[#6b7f92]">
                  Created By: {selected.createdByName} ({selected.createdByPosition})
                </p>
                <p className="text-sm text-[#6b7f92]">
                  Employee: {selected.employeeName} · Department: {selected.employeeDepartmentName || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4e1ed] bg-[#f4f8fc] text-lg leading-none text-[#5a7288] transition hover:bg-[#e8eef4] hover:text-[#2c3e50]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-5 py-4 sm:px-6">
              {modalError && (
                <div className="mb-3 rounded-lg border border-[#e8c4c4] bg-[#fdf5f5] px-4 py-2.5 text-sm font-semibold text-[#8b4545]">
                  {modalError}
                </div>
              )}
              {message && (
                <div className="mb-3 rounded-lg border border-[#c5dcc8] bg-[#f2f8f4] px-4 py-2.5 text-sm font-semibold text-[#4a6b55]">
                  {message}
                </div>
              )}
              {!selected.canEdit && selected.status && (
                <div className="mb-4 rounded-lg border border-[#e8dcc4] bg-[#fdf9f2] px-4 py-3 text-sm leading-relaxed text-[#7a6548]">
                  This PIP is view-only for your current position. To update phases or finish the PIP, enable Edit PIP for
                  this position or open a PIP that you created with Create PIP permission.
                </div>
              )}

              {/* Detail stat cards */}
              <div className="mb-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Employee", value: selected.employeeName },
                  { label: "Department", value: selected.employeeDepartmentName || "—" },
                  { label: "Status", value: selected.status ? "Ongoing" : "Finished" },
                  { label: "Start Date", value: formatPipDateTime(selected.startDate) },
                  { label: "End Date", value: formatPipDateTime(selected.endDate) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-[#e4edf4] bg-[#f4f8fc] px-3 py-2.5"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#6b8ba8]">{item.label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#2c3e50]">{item.value}</p>
                  </div>
                ))}
              </div>

              <section className="mb-5">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#5a7288]">Expected Outcomes</h3>
                <p className="rounded-lg border border-[#e4edf4] bg-white px-4 py-3 text-sm leading-relaxed text-[#4a6278]">
                  {selected.expectedOutcomes}
                </p>
              </section>

              {selected.comments && (
                <section className="mb-5">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#5a7288]">Final Comments</h3>
                  <p className="rounded-lg border border-[#e4edf4] bg-white px-4 py-3 text-sm leading-relaxed text-[#4a6278]">
                    {selected.comments}
                  </p>
                </section>
              )}

              <section className="mb-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#5a7288]">Phases</h3>
                <div className="flex flex-col gap-3">
                  {selected.phases.map((phase) => {
                    const draft = phaseDrafts[phase.id] || {
                      status: phase.status,
                      reasonNote: phase.reasonNote || "",
                    };
                    const phaseHasStarted = hasDateArrived(phase.startDate);

                    return (
                      <article
                        key={phase.id}
                        className="rounded-xl border border-[#d4e1ed] bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-[#2c3e50]">
                              Phase {phase.phaseNumber}: {phase.phaseGoal}
                            </h4>
                            <p className="mt-0.5 text-xs text-[#6b7f92]">
                              Duration: {formatPipDateTime(phase.startDate)} to {formatPipDateTime(phase.endDate)}
                            </p>
                          </div>
                          <span className="inline-flex rounded-full bg-[#e8eef4] px-2.5 py-0.5 text-xs font-bold text-[#4a6278]">
                            {phaseStatusLabel(phase.status)}
                          </span>
                        </div>

                        {selected.canEdit ? (
                          <>
                            <div className="mb-3 grid gap-3 sm:grid-cols-2">
                              <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-bold text-[#5a7288]">Status</span>
                                <select
                                  className={inputClass}
                                  value={draft.status}
                                  disabled={!phaseHasStarted}
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

                              <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-bold text-[#5a7288]">Updated By</span>
                                <input className={inputClass} value={phase.updatedByName || "—"} readOnly />
                              </label>
                            </div>

                            <label className="mb-3 flex flex-col gap-1.5">
                              <span className="text-xs font-bold text-[#5a7288]">Reason / Note</span>
                              <textarea
                                className={`${inputClass} min-h-[88px] resize-y py-2.5`}
                                rows={3}
                                value={draft.reasonNote}
                                disabled={!phaseHasStarted}
                                onChange={(event) => updateReason(phase.id, event.target.value)}
                                placeholder="Write progress note or reason."
                              />
                              <small className="self-end text-xs text-[#8a9bab]">
                                {countWords(draft.reasonNote)} / {WORD_LIMIT} words
                              </small>
                            </label>

                            {!phaseHasStarted && (
                              <div className="mb-3 rounded-lg border border-[#e8dcc4] bg-[#fdf9f2] px-3 py-2.5 text-sm font-semibold text-[#7a6548]">
                                This phase has not started yet. You can update it from {formatPipDateTime(phase.startDate)}.
                              </div>
                            )}

                            <button
                              type="button"
                              className={`${btnPrimary} text-xs`}
                              onClick={() => savePhase(phase)}
                              disabled={modalLoading || !phaseHasStarted}
                            >
                              Save Phase
                            </button>
                          </>
                        ) : (
                          <div className="space-y-2 text-sm text-[#4a6278]">
                            <p>
                              <strong className="text-[#2c3e50]">Progress Note:</strong>{" "}
                              {phase.reasonNote || "No progress note yet."}
                            </p>
                            <p>
                              <strong className="text-[#2c3e50]">Status:</strong> {phaseStatusLabel(phase.status)}
                            </p>
                            {phase.updatedByName && (
                              <p className="text-xs text-[#6b7f92]">
                                Last updated by {phase.updatedByName} at {formatPipDateTime(phase.updatedAt)}
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              {selected.updates?.length > 0 && (
                <section className="mb-5">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#5a7288]">Update History</h3>
                  <div className="flex flex-col gap-2">
                    {selected.updates.map((update) => (
                      <div
                        key={update.id}
                        className="rounded-lg border-l-4 border-[#9eb5ca] bg-[#f4f8fc] px-4 py-3"
                      >
                        <strong className="text-sm text-[#2c3e50]">{update.actionType || "Update"}</strong>
                        <span className="mt-0.5 block text-xs text-[#6b7f92]">
                          {update.updatedByName || "Unknown"} · {formatPipDateTime(update.updatedAt)}
                        </span>
                        {update.comments && (
                          <p className="mt-1 text-sm text-[#4a6278]">{update.comments}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selected.canEdit && selected.status && (
                <div className="border-t border-[#e4edf4] pt-4">
                  <label className="mb-3 flex flex-col gap-1.5">
                    <span className="text-sm font-bold text-[#4a6278]">Final Comments</span>
                    <textarea
                      className={`${inputClass} min-h-[88px] resize-y py-2.5`}
                      rows={3}
                      value={finishComments}
                      onChange={(event) => handleFinishText(event.target.value)}
                      placeholder="Required before finishing this PIP."
                    />
                    <small className="self-end text-xs text-[#8a9bab]">
                      {countWords(finishComments)} / {WORD_LIMIT} words
                    </small>
                  </label>

                  <button
                    type="button"
                    className={btnDanger}
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
                    <p className="mt-2 text-sm text-[#6b7f92]">
                      FINISH becomes available after the PIP end date.
                    </p>
                  )}
                </div>
              )}

              {showFinishConfirm && (
                <div className="mt-4 rounded-xl border border-[#e8c4c4] bg-[#fdf8f8] p-4">
                  <p className="mb-3 text-sm font-semibold text-[#4a6278]">
                    Are you sure you are going to end this PIP?
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => setShowFinishConfirm(false)}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className={btnDanger}
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
        </div>
      )}
    </div>
  );
}

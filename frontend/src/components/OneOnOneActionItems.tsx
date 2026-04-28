import React, { useState, useEffect, useCallback } from 'react';
import './one-on-one.css';
import {
  getUpcomingMeetings,
  getOngoingMeetings,
  getPastMeetings,
  finishMeeting,
  createMeeting,
  saveActionItem,
} from '../services/oneOnOneService';
import type { Meeting } from '../services/oneOnOneService';

// ── Helpers ──────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

const fmtDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const buildIso = (
  day: string, month: string, year: string,
  hour: string, minute: string, ampm: 'AM' | 'PM'
): string | null => {
  const d = parseInt(day), m = parseInt(month), y = parseInt(year);
  let h = parseInt(hour), min = parseInt(minute);
  if (isNaN(d) || isNaN(m) || isNaN(y) || isNaN(h) || isNaN(min)) return null;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const dt = new Date(y, m - 1, d, h, min, 0);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
};

type Tab = 'upcoming' | 'ongoing' | 'past';

// ── Component ────────────────────────────────────────────────────
const OneOnOneActionItems: React.FC = () => {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [ongoing, setOngoing] = useState<Meeting[]>([]);
  const [past, setPast] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalMeeting, setModalMeeting] = useState<Meeting | null>(null);
  const [description, setDescription] = useState('');
  const [fuDay, setFuDay] = useState('');
  const [fuMonth, setFuMonth] = useState('');
  const [fuYear, setFuYear] = useState('');
  const [fuHour, setFuHour] = useState('');
  const [fuMinute, setFuMinute] = useState('');
  const [fuAmPm, setFuAmPm] = useState<'AM' | 'PM'>('AM');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Past-view modal
  const [pastModal, setPastModal] = useState<Meeting | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [up, on, pa] = await Promise.all([
        getUpcomingMeetings(),
        getOngoingMeetings(),
        getPastMeetings(),
      ]);
      setUpcoming(up);
      setOngoing(on);
      setPast(pa);
    } catch {
      // silently ignore — individual tab errors shown inline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Open ongoing modal ──────────────────────────────────────────
  const openModal = (m: Meeting) => {
    setModalMeeting(m);
    setDescription(m.actionItem?.description ?? '');
    setFuDay(''); setFuMonth(''); setFuYear('');
    setFuHour(''); setFuMinute(''); setFuAmPm('AM');
    setModalError('');
  };

  const closeModal = () => {
    setModalMeeting(null);
    setModalError('');
  };

  // ── Save action item description ────────────────────────────────
  const handleSaveDescription = async () => {
    if (!modalMeeting) return;
    await saveActionItem({ meetingId: modalMeeting.id, description });
  };

  // ── END: finish meeting, no follow-up ───────────────────────────
  const handleEnd = async () => {
    if (!modalMeeting) return;
    setModalSaving(true);
    setModalError('');
    try {
      if (description.trim()) {
        await saveActionItem({ meetingId: modalMeeting.id, description });
      }
      await finishMeeting(modalMeeting.id);
      closeModal();
      await loadAll();
    } catch {
      setModalError('Failed to finish meeting. Please try again.');
    } finally {
      setModalSaving(false);
    }
  };

  // ── FINISH with follow-up: create new follow-up meeting + finish current ──
  const handleFinishWithFollowUp = async () => {
    if (!modalMeeting) return;
    const fuIso = buildIso(fuDay, fuMonth, fuYear, fuHour, fuMinute, fuAmPm);
    if (!fuIso) {
      setModalError('Please fill in all follow-up date and time fields.');
      return;
    }
    if (new Date(fuIso) <= new Date()) {
      setModalError('Follow-up date must be in the future.');
      return;
    }
    setModalSaving(true);
    setModalError('');
    try {
      // Save description first
      if (description.trim()) {
        await saveActionItem({ meetingId: modalMeeting.id, description });
      }
      // Create the follow-up meeting
      await createMeeting({
        employeeId: modalMeeting.employeeId,
        scheduledDate: fuIso,
        notes: '',
        parentMeetingId: modalMeeting.id,
      });
      // Finalize the current meeting
      await finishMeeting(modalMeeting.id);
      closeModal();
      await loadAll();
    } catch {
      setModalError('Failed to set follow-up. Please try again.');
    } finally {
      setModalSaving(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────
  const renderUpcoming = () => {
    if (loading) return <Spinner />;
    if (upcoming.length === 0) return <Empty text="No upcoming meetings at the moment." />;
    return (
      <div className="oom-cards">
        {upcoming.map((m) => (
          <div key={m.id} className="oom-meeting-card" style={{ cursor: 'default' }}>
            <div className="oom-card-left">
              <h3>{m.employeeFirstName} {m.employeeLastName}</h3>
              <p>🕐 {fmtDateTime(m.scheduledDate)}</p>
              {m.notes && <p style={{ fontStyle: 'italic', fontSize: 12 }}>"{m.notes}"</p>}
              <p style={{ fontSize: 12 }}>
                Scheduled by: {m.managerFirstName} {m.managerLastName}
              </p>
            </div>
            <div className="oom-card-right">
              <span className={`oom-badge ${m.followUp ? 'oom-badge--followup' : 'oom-badge--upcoming'}`}>
                {m.followUp ? '🔁 Follow Up' : '⏳ Upcoming'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOngoing = () => {
    if (loading) return <Spinner />;
    if (ongoing.length === 0) return <Empty text="No ongoing meetings right now." />;
    return (
      <div className="oom-cards">
        {ongoing.map((m) => (
          <div key={m.id} className="oom-meeting-card" onClick={() => openModal(m)}>
            <div className="oom-card-left">
              <h3>{m.employeeFirstName} {m.employeeLastName}</h3>
              <p>🕐 {fmtDateTime(m.scheduledDate)}</p>
              {m.notes && <p style={{ fontStyle: 'italic', fontSize: 12 }}>"{m.notes}"</p>}
              <p style={{ fontSize: 12 }}>Click to manage →</p>
            </div>
            <div className="oom-card-right">
              <span className="oom-badge oom-badge--ongoing">🟢 Ongoing</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPast = () => {
    if (loading) return <Spinner />;
    if (past.length === 0) return <Empty text="No past meetings yet." />;
    return (
      <div className="oom-cards">
        {past.map((m) => (
          <div key={m.id} className="oom-meeting-card past-card" onClick={() => setPastModal(m)}>
            <div className="oom-card-left">
              <h3>{m.employeeFirstName} {m.employeeLastName}</h3>
              <p>🕐 {fmtDateTime(m.scheduledDate)}</p>
              <p style={{ fontSize: 12 }}>
                ✅ Finalized: {fmtDateTime(m.isFinalized)}
              </p>
            </div>
            <div className="oom-card-right">
              <span className="oom-badge oom-badge--past">✓ Past</span>
              {m.followUp && (
                <span className="oom-badge oom-badge--followup" style={{ fontSize: 10 }}>
                  🔁 Follow Up
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="oom-page">
      {/* ── Header ── */}
      <div className="oom-header">
        <h1>🗒️ Action Items</h1>
        <p>Track all your 1:1 meetings — upcoming, ongoing, and past.</p>
      </div>

      {/* ── Tabs ── */}
      <div className="oom-tabs">
        {(['upcoming', 'ongoing', 'past'] as Tab[]).map((t) => (
          <button
            key={t}
            id={`oom-tab-${t}`}
            className={`oom-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'upcoming' ? '⏳ Upcoming' : t === 'ongoing' ? '🟢 Ongoing' : '✓ Past'}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'upcoming' && renderUpcoming()}
      {tab === 'ongoing' && renderOngoing()}
      {tab === 'past' && renderPast()}

      {/* ── Ongoing Meeting Modal ── */}
      {modalMeeting && (
        <div className="oom-modal-overlay" onClick={closeModal}>
          <div className="oom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oom-modal-header">
              <h2>
                {modalMeeting.followUp ? '🔁 Follow-Up Meeting' : '🟢 Ongoing Meeting'}
              </h2>
              <button className="oom-modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="oom-modal-body">
              {/* Meeting info */}
              <div className="oom-modal-info-row">
                <span>Employee</span>
                <span>{modalMeeting.employeeFirstName} {modalMeeting.employeeLastName}</span>
              </div>
              <div className="oom-modal-info-row">
                <span>Scheduled</span>
                <span>{fmtDateTime(modalMeeting.scheduledDate)}</span>
              </div>
              {modalMeeting.notes && (
                <div className="oom-modal-info-row">
                  <span>Notes</span>
                  <span style={{ maxWidth: 260, textAlign: 'right' }}>{modalMeeting.notes}</span>
                </div>
              )}
              <hr className="oom-modal-divider" />

              {/* Action item description */}
              <div className="oom-field">
                <label className="oom-label">Meeting Description / Action Items</label>
                <textarea
                  id="oom-description"
                  className="oom-textarea"
                  style={{ minHeight: 110 }}
                  placeholder="Write the outcome, decisions, or action items from this meeting…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Follow-up date (only allowed if this is NOT already a follow-up) */}
              {!modalMeeting.followUp && (
                <>
                  <hr className="oom-modal-divider" />
                  <div className="oom-field">
                    <label className="oom-label">
                      Follow-Up Date &amp; Time{' '}
                      <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        (optional — leave blank to fully end the meeting)
                      </span>
                    </label>
                    <div className="oom-date-row" style={{ flexWrap: 'wrap' }}>
                      <div className="oom-date-part oom-date-part--dd">
                        <label>Day</label>
                        <input
                          id="oom-fu-day"
                          type="number" min={1} max={31} placeholder="DD"
                          value={fuDay} onChange={(e) => setFuDay(e.target.value.slice(0, 2))}
                        />
                      </div>
                      <span className="oom-date-sep">/</span>
                      <div className="oom-date-part oom-date-part--mm">
                        <label>Month</label>
                        <input
                          id="oom-fu-month"
                          type="number" min={1} max={12} placeholder="MM"
                          value={fuMonth} onChange={(e) => setFuMonth(e.target.value.slice(0, 2))}
                        />
                      </div>
                      <span className="oom-date-sep">/</span>
                      <div className="oom-date-part oom-date-part--yy">
                        <label>Year</label>
                        <input
                          id="oom-fu-year"
                          type="number" min={2024} max={2099} placeholder="YYYY"
                          value={fuYear} onChange={(e) => setFuYear(e.target.value.slice(0, 4))}
                        />
                      </div>
                      <div className="oom-date-part">
                        <label>Hour</label>
                        <input
                          id="oom-fu-hour"
                          type="number" min={1} max={12} placeholder="HH"
                          style={{ width: 56 }}
                          value={fuHour} onChange={(e) => setFuHour(e.target.value.slice(0, 2))}
                        />
                      </div>
                      <span className="oom-date-sep" style={{ marginTop: 18 }}>:</span>
                      <div className="oom-date-part">
                        <label>Min</label>
                        <input
                          id="oom-fu-minute"
                          type="number" min={0} max={59} placeholder="MM"
                          style={{ width: 56 }}
                          value={fuMinute} onChange={(e) => setFuMinute(e.target.value.slice(0, 2))}
                        />
                      </div>
                      <div className="oom-ampm-toggle">
                        <button type="button" className={fuAmPm === 'AM' ? 'active' : ''} onClick={() => setFuAmPm('AM')}>AM</button>
                        <button type="button" className={fuAmPm === 'PM' ? 'active' : ''} onClick={() => setFuAmPm('PM')}>PM</button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalError && <div className="oom-error">⚠ {modalError}</div>}
            </div>

            <div className="oom-modal-footer">
              <button id="oom-modal-cancel" className="oom-btn-ghost" onClick={closeModal} disabled={modalSaving}>
                Cancel
              </button>

              <button
                id="oom-modal-end"
                className="oom-btn-teal"
                onClick={handleEnd}
                disabled={modalSaving}
              >
                {modalSaving ? 'Saving…' : '✓ END Meeting'}
              </button>

              {!modalMeeting.followUp && (
                <button
                  id="oom-modal-followup"
                  className="oom-btn-primary"
                  onClick={handleFinishWithFollowUp}
                  disabled={modalSaving}
                >
                  {modalSaving ? 'Saving…' : '🔁 Finish + Follow-Up'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Past Meeting View Modal (read-only) ── */}
      {pastModal && (
        <div className="oom-modal-overlay" onClick={() => setPastModal(null)}>
          <div className="oom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oom-modal-header">
              <h2>✓ Past Meeting Details</h2>
              <button className="oom-modal-close" onClick={() => setPastModal(null)}>×</button>
            </div>
            <div className="oom-modal-body">
              <InfoRow label="Employee" value={`${pastModal.employeeFirstName} ${pastModal.employeeLastName}`} />
              <InfoRow label="Creator" value={`${pastModal.managerFirstName} ${pastModal.managerLastName}`} />
              <InfoRow label="Scheduled" value={fmtDateTime(pastModal.scheduledDate)} />
              <InfoRow label="Finalized" value={fmtDateTime(pastModal.isFinalized)} />
              {pastModal.followUpDate && (
                <InfoRow label="Follow-up Date" value={fmtDateTime(pastModal.followUpDate)} />
              )}
              {pastModal.followUp && (
                <InfoRow label="Type" value="🔁 Follow-Up Meeting" />
              )}
              <hr className="oom-modal-divider" />
              <div className="oom-field">
                <label className="oom-label">Notes</label>
                <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6 }}>
                  {pastModal.notes || '—'}
                </p>
              </div>
              <div className="oom-field">
                <label className="oom-label">Action Items / Description</label>
                <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {pastModal.actionItem?.description || '— No description recorded —'}
                </p>
              </div>
            </div>
            <div className="oom-modal-footer">
              <button className="oom-btn-ghost" onClick={() => setPastModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────
const Spinner: React.FC = () => (
  <div className="oom-spinner-wrap">
    <div className="oom-spinner" />
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="oom-empty">
    <div className="oom-empty-icon">📭</div>
    <p>{text}</p>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="oom-modal-info-row">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default OneOnOneActionItems;

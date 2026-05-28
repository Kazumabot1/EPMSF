import React, { useCallback, useEffect, useState } from 'react';
import './one-on-one.css';
import {
  deleteMeeting,
  finishMeeting,
  getOngoingMeetings,
  getPastMeetings,
  getUpcomingMeetings,
  saveActionItem,
  setFollowUp,
  updateMeeting,
} from '../services/oneOnOneService';
import type { Meeting } from '../services/oneOnOneService';
import { useNotificationsWebSocket } from '../hooks/useNotificationsWebSocket';

const pad = (n: number) => String(n).padStart(2, '0');

const fmtDateTime = (iso?: string | null): string => {
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

const displayText = (value?: string | null) => {
  const clean = value?.trim();
  return clean ? clean : '—';
};

const getCreatorName = (meeting: Meeting) => {
  const creatorName = meeting.creatorName?.trim();

  if (creatorName) {
    return creatorName;
  }

  const managerName = `${meeting.managerFirstName ?? ''} ${meeting.managerLastName ?? ''}`.trim();

  if (managerName) {
    return managerName;
  }

  return 'HR';
};

const isFollowUpStage = (meeting: Meeting) =>
  Boolean(
    meeting.followUp ||
      (meeting.firstMeetingEndDate && meeting.followUpDate && !meeting.isFinalized)
  );

const hasFollowUpMeeting = (meeting: Meeting) => Boolean(meeting.followUpDate);

const stageDate = (meeting: Meeting) =>
  isFollowUpStage(meeting) ? meeting.followUpDate : meeting.scheduledDate;

const stageLocation = (meeting: Meeting) =>
  isFollowUpStage(meeting) ? meeting.followUpLocation : meeting.location;

const stageGoal = (meeting: Meeting) =>
  isFollowUpStage(meeting) ? meeting.followUpGoal : meeting.notes;

const buildIso = (
  day: string,
  month: string,
  year: string,
  hour: string,
  minute: string,
  ampm: 'AM' | 'PM'
): string | null => {
  const d = parseInt(day);
  const m = parseInt(month);
  const y = parseInt(year);
  let h = parseInt(hour);
  const min = parseInt(minute);

  if (isNaN(d) || isNaN(m) || isNaN(y) || isNaN(h) || isNaN(min)) return null;

  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  const dt = new Date(y, m - 1, d, h, min, 0);

  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours()
  )}:${pad(dt.getMinutes())}:00`;
};

type Tab = 'upcoming' | 'ongoing' | 'past';

const OneOnOneActionItems: React.FC = () => {
  const [tab, setTab] = useState<Tab>('upcoming');

  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [ongoing, setOngoing] = useState<Meeting[]>([]);
  const [past, setPast] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);

  const [upcomingModal, setUpcomingModal] = useState<Meeting | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [modalMeeting, setModalMeeting] = useState<Meeting | null>(null);
  const [description, setDescription] = useState('');
  const [followUpGoal, setFollowUpGoal] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const [fuDay, setFuDay] = useState('');
  const [fuMonth, setFuMonth] = useState('');
  const [fuYear, setFuYear] = useState('');
  const [fuHour, setFuHour] = useState('');
  const [fuMinute, setFuMinute] = useState('');
  const [fuAmPm, setFuAmPm] = useState<'AM' | 'PM'>('AM');
  const [fuLocation, setFuLocation] = useState('');

  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [pastModal, setPastModal] = useState<Meeting | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);

    try {
      const [up, on, pa] = await Promise.all([
        getUpcomingMeetings(),
        getOngoingMeetings(),
        getPastMeetings(),
      ]);

      setUpcoming(Array.isArray(up) ? up : []);
      setOngoing(Array.isArray(on) ? on : []);
      setPast(Array.isArray(pa) ? pa : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useNotificationsWebSocket(() => {
    /* This page listens for meeting events; notification payloads are handled by shared layout UI. */
  });

  useEffect(() => {
    const onOneOnOneMeetingsChanged = () => {
      void loadAll();
    };

    window.addEventListener('epms:one-on-one-meetings-changed', onOneOnOneMeetingsChanged);

    return () => {
      window.removeEventListener('epms:one-on-one-meetings-changed', onOneOnOneMeetingsChanged);
    };
  }, [loadAll]);

  const openUpcomingModal = (m: Meeting) => {
    setUpcomingModal(m);
    setShowCancelConfirm(false);
  };

  const closeUpcomingModal = () => {
    setUpcomingModal(null);
    setShowCancelConfirm(false);
  };

  const handleCancelUpcoming = async () => {
    if (!upcomingModal) return;

    try {
      await deleteMeeting(upcomingModal.id);
      closeUpcomingModal();
      await loadAll();
    } catch {
      alert('Failed to cancel meeting.');
    }
  };

  const openOngoingModal = (m: Meeting) => {
    setModalMeeting(m);
    setDescription(m.actionItem?.description ?? '');
    setFollowUpGoal(m.followUpGoal ?? '');
    setFollowUpNotes(m.followUpNotes ?? '');

    setFuDay('');
    setFuMonth('');
    setFuYear('');
    setFuHour('');
    setFuMinute('');
    setFuAmPm('AM');
    setFuLocation('');

    setModalError('');
  };

  const closeOngoingModal = () => {
    setModalMeeting(null);
    setModalError('');
  };

  const handleEnd = async () => {
    if (!modalMeeting) return;

    const followUpStage = isFollowUpStage(modalMeeting);

    if (!followUpStage && description.length > 1000) {
      setModalError('Meeting Description / Action Items cannot exceed 1000 letters.');
      return;
    }

    if (followUpStage && followUpNotes.length > 1000) {
      setModalError('Follow-up meeting note cannot exceed 1000 letters.');
      return;
    }

    setModalSaving(true);
    setModalError('');

    try {
      if (followUpStage) {
        await updateMeeting(modalMeeting.id, {
          scheduledDate: modalMeeting.scheduledDate,
          followUpNotes: followUpNotes.trim(),
        });
      } else if (description.trim()) {
        await saveActionItem({
          meetingId: modalMeeting.id,
          description: description.trim(),
        });
      }

      await finishMeeting(modalMeeting.id);

      closeOngoingModal();
      await loadAll();
    } catch {
      setModalError('Failed to finish meeting. Please try again.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleFinishWithFollowUp = async () => {
    if (!modalMeeting) return;

    if (description.length > 1000) {
      setModalError('Meeting Description / Action Items cannot exceed 1000 letters.');
      return;
    }

    if (followUpGoal.length > 1000) {
      setModalError('Follow-up goal cannot exceed 1000 letters.');
      return;
    }

    if (fuLocation.length > 500) {
      setModalError('Follow-up meeting location cannot exceed 500 letters.');
      return;
    }

    const fuIso = buildIso(fuDay, fuMonth, fuYear, fuHour, fuMinute, fuAmPm);

    if (!fuIso) {
      setModalError('Please fill in all follow-up date and time fields.');
      return;
    }

    if (new Date(fuIso) <= new Date()) {
      setModalError('Cannot create a follow-up meeting for a past time.');
      return;
    }

    if (!followUpGoal.trim()) {
      setModalError('Please add the goal of the follow-up meeting.');
      return;
    }

    setModalSaving(true);
    setModalError('');

    try {
      if (description.trim()) {
        await saveActionItem({
          meetingId: modalMeeting.id,
          description: description.trim(),
        });
      }

      await setFollowUp(modalMeeting.id, {
        followUpDate: fuIso,
        location: fuLocation.trim(),
        followUpGoal: followUpGoal.trim(),
      });

      closeOngoingModal();
      await loadAll();
    } catch {
      setModalError('Failed to set follow-up. Please try again.');
    } finally {
      setModalSaving(false);
    }
  };

  const renderUpcoming = () => {
    if (loading) return <Spinner />;
    if (upcoming.length === 0) return <Empty text="No upcoming meetings at the moment." />;

    return (
      <div className="oom-cards">
        {upcoming.map((m) => {
          const followUpStage = isFollowUpStage(m);

          return (
            <button
              key={m.id}
              type="button"
              className="oom-meeting-card"
              onClick={() => openUpcomingModal(m)}
            >
              <div className="oom-card-left">
                <h3>
                  {followUpStage ? '🔁 Follow-Up Meeting | ' : ''}
                  {m.employeeFirstName} {m.employeeLastName}
                </h3>

                <p>🕐 {fmtDateTime(stageDate(m))}</p>
                {stageLocation(m) && <p style={{ fontSize: 12 }}>📍 {stageLocation(m)}</p>}
                {stageGoal(m) && <p style={{ fontStyle: 'italic', fontSize: 12 }}>"{stageGoal(m)}"</p>}

                <p style={{ fontSize: 12 }}>
                  Scheduled by: {getCreatorName(m)}
                </p>
              </div>

              <div className="oom-card-right">
                <span className={`oom-badge ${followUpStage ? 'oom-badge--followup' : 'oom-badge--upcoming'}`}>
                  {followUpStage ? '🔁 Follow Up' : '⏳ Upcoming'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderOngoing = () => {
    if (loading) return <Spinner />;
    if (ongoing.length === 0) return <Empty text="No ongoing meetings right now." />;

    return (
      <div className="oom-cards">
        {ongoing.map((m) => {
          const followUpStage = isFollowUpStage(m);

          return (
            <button
              key={m.id}
              type="button"
              className="oom-meeting-card"
              onClick={() => openOngoingModal(m)}
            >
              <div className="oom-card-left">
                <h3>
                  {followUpStage ? '🔁 Follow-Up Meeting | ' : ''}
                  {m.employeeFirstName} {m.employeeLastName}
                </h3>

                <p>🕐 {fmtDateTime(stageDate(m))}</p>
                {stageLocation(m) && <p style={{ fontSize: 12 }}>📍 {stageLocation(m)}</p>}
                {stageGoal(m) && <p style={{ fontStyle: 'italic', fontSize: 12 }}>"{stageGoal(m)}"</p>}
                <p style={{ fontSize: 12 }}>Click to manage →</p>
              </div>

              <div className="oom-card-right">
                <span className="oom-badge oom-badge--ongoing">🟢 Ongoing</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderPast = () => {
    if (loading) return <Spinner />;
    if (past.length === 0) return <Empty text="No past meetings yet." />;

    return (
      <div className="oom-cards">
        {past.map((m) => (
          <button
            key={m.id}
            type="button"
            className="oom-meeting-card past-card"
            onClick={() => setPastModal(m)}
          >
            <div className="oom-card-left">
              <h3>
                {m.employeeFirstName} {m.employeeLastName}
              </h3>

              <p>🕐 {fmtDateTime(m.scheduledDate)}</p>
              {m.location && <p style={{ fontSize: 12 }}>📍 {m.location}</p>}
              <p style={{ fontSize: 12 }}>✅ Finalized: {fmtDateTime(m.isFinalized)}</p>

              {hasFollowUpMeeting(m) && (
                <p style={{ fontSize: 12 }}>
                  🔁 Follow-up: {fmtDateTime(m.followUpDate)}
                  {m.followUpLocation ? ` · ${m.followUpLocation}` : ''}
                </p>
              )}
            </div>

            <div className="oom-card-right">
              <span className="oom-badge oom-badge--past">✓ Past</span>

              {hasFollowUpMeeting(m) && (
                <span className="oom-badge oom-badge--followup" style={{ fontSize: 10 }}>
                  🔁 Has Follow Up
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="oom-page">
      <div className="oom-header">
        <h1>🗒️ Action Items</h1>
        <p>Track all your 1:1 meetings: upcoming, ongoing, and past.</p>
      </div>

      <div className="oom-tabs">
        {(['upcoming', 'ongoing', 'past'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`oom-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'upcoming' ? '⏳ Upcoming' : t === 'ongoing' ? '🟢 Ongoing' : '✓ Past'}
          </button>
        ))}
      </div>

      {tab === 'upcoming' && renderUpcoming()}
      {tab === 'ongoing' && renderOngoing()}
      {tab === 'past' && renderPast()}

      {upcomingModal && (
        <div className="oom-modal-overlay" onClick={closeUpcomingModal}>
          <div className="oom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oom-modal-header">
              <h2>{isFollowUpStage(upcomingModal) ? '🔁 Upcoming Follow-Up Meeting' : 'Upcoming Meeting'}</h2>
              <button className="oom-modal-close" onClick={closeUpcomingModal}>×</button>
            </div>

            <div className="oom-modal-body">
              <InfoRow label="Employee" value={`${upcomingModal.employeeFirstName} ${upcomingModal.employeeLastName}`} />
              <InfoRow label="Creator" value={getCreatorName(upcomingModal)} />
              <InfoRow label="Scheduled" value={fmtDateTime(stageDate(upcomingModal))} />
              <InfoRow label="Location" value={displayText(stageLocation(upcomingModal))} />

              <hr className="oom-modal-divider" />

              <div className="oom-field">
                <label className="oom-label">{isFollowUpStage(upcomingModal) ? 'Follow-Up Goal' : 'Goal / Notes'}</label>
                <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {stageGoal(upcomingModal) || '—'}
                </p>
              </div>
            </div>

            <div className="oom-modal-footer">
              <button className="oom-btn-ghost" onClick={closeUpcomingModal}>Close</button>
              <button className="oom-btn-danger" onClick={() => setShowCancelConfirm(true)}>
                ⚠ Cancel Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && upcomingModal && (
        <div className="oom-modal-overlay">
          <div className="oom-modal oom-modal-danger">
            <div className="oom-modal-header">
              <h2>⚠ Cancel Meeting</h2>
              <button className="oom-modal-close" onClick={() => setShowCancelConfirm(false)}>×</button>
            </div>

            <div className="oom-modal-body">
              <p>Are you really going to cancel the meeting?</p>
            </div>

            <div className="oom-modal-footer">
              <button className="oom-btn-ghost" onClick={() => setShowCancelConfirm(false)}>No</button>
              <button className="oom-btn-danger" onClick={handleCancelUpcoming}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {modalMeeting && (
        <div className="oom-modal-overlay" onClick={closeOngoingModal}>
          <div className="oom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oom-modal-header">
              <h2>{isFollowUpStage(modalMeeting) ? 'Follow-Up Meeting' : 'Ongoing Meeting'}</h2>
              <button className="oom-modal-close" onClick={closeOngoingModal}>×</button>
            </div>

            <div className="oom-modal-body">
              <InfoRow label="Employee" value={`${modalMeeting.employeeFirstName} ${modalMeeting.employeeLastName}`} />
              <InfoRow label="Creator" value={getCreatorName(modalMeeting)} />

              {isFollowUpStage(modalMeeting) ? (
                <>
                  <hr className="oom-modal-divider" />

                  <InfoRow label="First Meeting Start Date" value={fmtDateTime(modalMeeting.scheduledDate)} />
                  <InfoRow label="First Meeting End Date" value={fmtDateTime(modalMeeting.firstMeetingEndDate)} />
                  <InfoRow label="First Meeting Location" value={displayText(modalMeeting.location)} />

                  <div className="oom-field">
                    <label className="oom-label">First Meeting Goal / Notes</label>
                    <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {modalMeeting.notes || '—'}
                    </p>
                  </div>

                  <div className="oom-field">
                    <label className="oom-label">First Meeting Description / Action Items</label>
                    <p style={{ fontSize: 13, color: '#c0c0d8', whiteSpace: 'pre-wrap' }}>
                      {modalMeeting.actionItem?.description || '— No previous description recorded —'}
                    </p>
                  </div>

                  <hr className="oom-modal-divider" />

                  <InfoRow label="Follow-Up Start Date" value={fmtDateTime(modalMeeting.followUpDate)} />
                  <InfoRow label="Follow-Up Location" value={displayText(modalMeeting.followUpLocation)} />

                  <div className="oom-field">
                    <label className="oom-label">Follow-Up Goal</label>
                    <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {modalMeeting.followUpGoal || '—'}
                    </p>
                  </div>

                  <div className="oom-field">
                    <label className="oom-label">Follow-Up Meeting Note</label>
                    <textarea
                      className="oom-textarea"
                      maxLength={1000}
                      placeholder="Write the result or notes from the follow-up meeting…"
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                    />
                    <small>Cannot input more than 1000 letters.</small>
                  </div>
                </>
              ) : (
                <>
                  <hr className="oom-modal-divider" />

                  <InfoRow label="Scheduled" value={fmtDateTime(modalMeeting.scheduledDate)} />
                  <InfoRow label="Location" value={displayText(modalMeeting.location)} />

                  <div className="oom-field">
                    <label className="oom-label">Goal / Notes</label>
                    <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {modalMeeting.notes || '—'}
                    </p>
                  </div>

                  <div className="oom-field">
                    <label className="oom-label">Meeting Description / Action Items</label>
                    <textarea
                      className="oom-textarea"
                      style={{ minHeight: 110 }}
                      maxLength={1000}
                      placeholder="Write the outcome, decisions, or action items from this meeting…"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <small>Cannot input more than 1000 letters.</small>
                  </div>

                  <hr className="oom-modal-divider" />

                  <div className="oom-field">
                    <label className="oom-label">Follow-Up Date &amp; Time</label>

                    <div className="oom-date-row" style={{ flexWrap: 'wrap' }}>
                      <div className="oom-date-part oom-date-part--dd">
                        <label>Day</label>
                        <input type="number" min={1} max={31} placeholder="DD" value={fuDay} onChange={(e) => setFuDay(e.target.value.slice(0, 2))} />
                      </div>

                      <span className="oom-date-sep">/</span>

                      <div className="oom-date-part oom-date-part--mm">
                        <label>Month</label>
                        <input type="number" min={1} max={12} placeholder="MM" value={fuMonth} onChange={(e) => setFuMonth(e.target.value.slice(0, 2))} />
                      </div>

                      <span className="oom-date-sep">/</span>

                      <div className="oom-date-part oom-date-part--yy">
                        <label>Year</label>
                        <input type="number" min={2024} max={2099} placeholder="YYYY" value={fuYear} onChange={(e) => setFuYear(e.target.value.slice(0, 4))} />
                      </div>

                      <div className="oom-date-part">
                        <label>Hour</label>
                        <input type="number" min={1} max={12} placeholder="HH" style={{ width: 56 }} value={fuHour} onChange={(e) => setFuHour(e.target.value.slice(0, 2))} />
                      </div>

                      <span className="oom-date-sep" style={{ marginTop: 18 }}>:</span>

                      <div className="oom-date-part">
                        <label>Min</label>
                        <input type="number" min={0} max={59} placeholder="MM" style={{ width: 56 }} value={fuMinute} onChange={(e) => setFuMinute(e.target.value.slice(0, 2))} />
                      </div>

                      <div className="oom-ampm-toggle">
                        <button type="button" className={fuAmPm === 'AM' ? 'active' : ''} onClick={() => setFuAmPm('AM')}>AM</button>
                        <button type="button" className={fuAmPm === 'PM' ? 'active' : ''} onClick={() => setFuAmPm('PM')}>PM</button>
                      </div>
                    </div>
                  </div>

                  <div className="oom-field">
                    <label className="oom-label">Follow-Up Location</label>
                    <input
                      className="oom-select"
                      type="text"
                      placeholder="Example: ACE 3rd Building, 4th floor"
                      value={fuLocation}
                      maxLength={500}
                      onChange={(e) => setFuLocation(e.target.value)}
                    />
                    <small>Optional. Cannot input more than 500 letters.</small>
                  </div>

                  <div className="oom-field">
                    <label className="oom-label">Follow-Up Goal</label>
                    <textarea
                      className="oom-textarea"
                      maxLength={1000}
                      placeholder="Add the goal or agenda for the follow-up meeting…"
                      value={followUpGoal}
                      onChange={(e) => setFollowUpGoal(e.target.value)}
                    />
                    <small>Required when creating a follow-up. Cannot input more than 1000 letters.</small>
                  </div>
                </>
              )}

              {modalError && <div className="oom-error">⚠ {modalError}</div>}
            </div>

            <div className="oom-modal-footer">
              <button className="oom-btn-ghost" onClick={closeOngoingModal} disabled={modalSaving}>
                Cancel
              </button>

              <button className="oom-btn-teal" onClick={handleEnd} disabled={modalSaving}>
                {modalSaving
                  ? 'Saving…'
                  : isFollowUpStage(modalMeeting)
                  ? '✓ END Follow-Up Meeting'
                  : '✓ END Meeting'}
              </button>

              {!isFollowUpStage(modalMeeting) && (
                <button className="oom-btn-primary" onClick={handleFinishWithFollowUp} disabled={modalSaving}>
                  {modalSaving ? 'Saving…' : 'Finish + Follow-Up'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pastModal && (
        <div className="oom-modal-overlay" onClick={() => setPastModal(null)}>
          <div className="oom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oom-modal-header">
              <h2>✓ Past Meeting Details</h2>
              <button className="oom-modal-close" onClick={() => setPastModal(null)}>×</button>
            </div>

            <div className="oom-modal-body">
              <InfoRow label="Employee" value={`${pastModal.employeeFirstName} ${pastModal.employeeLastName}`} />
              <InfoRow label="Creator" value={getCreatorName(pastModal)} />

              <hr className="oom-modal-divider" />

              <InfoRow label="Start Date" value={fmtDateTime(pastModal.scheduledDate)} />
              <InfoRow label="First Meeting End Date" value={fmtDateTime(pastModal.firstMeetingEndDate || pastModal.isFinalized)} />
              <InfoRow label="Location" value={displayText(pastModal.location)} />

              <div className="oom-field">
                <label className="oom-label">Goal / Notes</label>
                <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {pastModal.notes || '—'}
                </p>
              </div>

              <div className="oom-field">
                <label className="oom-label">Notes / Action Items / Description</label>
                <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {pastModal.actionItem?.description || '— No description recorded —'}
                </p>
              </div>

              {hasFollowUpMeeting(pastModal) && (
                <>
                  <hr className="oom-modal-divider" />

                  <InfoRow label="Follow-Up Start Date" value={fmtDateTime(pastModal.followUpDate)} />
                  <InfoRow label="Follow-Up End Date" value={fmtDateTime(pastModal.followUpEndDate)} />
                  <InfoRow label="Follow-Up Location" value={displayText(pastModal.followUpLocation)} />

                  <div className="oom-field">
                    <label className="oom-label">Follow-Up Goal</label>
                    <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {pastModal.followUpGoal || '—'}
                    </p>
                  </div>

                  <div className="oom-field">
                    <label className="oom-label">Follow-Up Meeting Note</label>
                    <p style={{ fontSize: 13, color: '#c0c0d8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {pastModal.followUpNotes || '—'}
                    </p>
                  </div>
                </>
              )}
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

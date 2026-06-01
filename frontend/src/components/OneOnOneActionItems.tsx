import React, { useCallback, useEffect, useState } from 'react';
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
import { OomInfoRow, OomModal, OomTextBlock } from './one-on-one/OomModalParts';
import {
  OOM_FONT,
  formatOomDateTime,
  oomBtnDanger,
  oomBtnPrimary,
  oomBtnSecondary,
  oomBtnTeal,
  oomCompactHeader,
  oomEyebrow,
  oomHeaderDesc,
  oomHeaderTitle,
  oomInput,
  oomLabel,
  oomMeetingCardBtn,
  oomPageWrap,
  oomTabActive,
  oomTabIdle,
  oomTextarea,
} from './one-on-one/oneOnOneUi';

const pad = (n: number) => String(n).padStart(2, '0');

const displayText = (value?: string | null) => {
  const clean = value?.trim();
  return clean ? clean : '—';
};

const getCreatorName = (meeting: Meeting) => {
  const creatorName = meeting.creatorName?.trim();
  if (creatorName) return creatorName;
  const managerName = `${meeting.managerFirstName ?? ''} ${meeting.managerLastName ?? ''}`.trim();
  if (managerName) return managerName;
  return 'HR';
};

const isFollowUpStage = (meeting: Meeting) =>
  Boolean(
    meeting.followUp ||
      (meeting.firstMeetingEndDate && meeting.followUpDate && !meeting.isFinalized),
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
  ampm: 'AM' | 'PM',
): string | null => {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  let h = parseInt(hour, 10);
  const min = parseInt(minute, 10);

  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y) || Number.isNaN(h) || Number.isNaN(min)) {
    return null;
  }

  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  const dt = new Date(y, m - 1, d, h, min, 0);

  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours(),
  )}:${pad(dt.getMinutes())}:00`;
};

type Tab = 'upcoming' | 'ongoing' | 'past';

type OneOnOneActionItemsProps = {
  readOnly?: boolean;
};

const badgeClass = {
  upcoming: 'bg-[#e0f2fe] text-[#075985]',
  ongoing: 'bg-[#dcfce7] text-[#166534]',
  past: 'bg-[#f1f5f9] text-[#475569]',
  followup: 'bg-[#dbeafe] text-[#1e40af]',
} as const;

const OneOnOneActionItems: React.FC<OneOnOneActionItemsProps> = ({ readOnly = false }) => {
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

  const renderMeetingCard = (
    m: Meeting,
    onClick: () => void,
    badge: { label: string; tone: keyof typeof badgeClass; icon: string },
    extra?: React.ReactNode,
  ) => {
    const followUpStage = isFollowUpStage(m);

    return (
      <button type="button" className={oomMeetingCardBtn} onClick={onClick}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[#0f172a] group-hover:text-[#2563eb]">
              {followUpStage && (
                <i className="bi bi-arrow-repeat me-1.5 text-[#2563eb]" aria-hidden />
              )}
              {followUpStage ? 'Follow-Up Meeting | ' : ''}
              {m.employeeFirstName} {m.employeeLastName}
            </h3>

            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#64748b]">
              <i className="bi bi-clock" aria-hidden />
              {formatOomDateTime(stageDate(m))}
            </p>

            {stageLocation(m) && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]">
                <i className="bi bi-geo-alt" aria-hidden />
                {stageLocation(m)}
              </p>
            )}

            {stageGoal(m) && (
              <p className="mt-1 text-xs italic text-[#64748b]">&ldquo;{stageGoal(m)}&rdquo;</p>
            )}

            {extra}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badgeClass[badge.tone]}`}
            >
              <i className={`bi ${badge.icon}`} aria-hidden />
              {badge.label}
            </span>
          </div>
        </div>
      </button>
    );
  };

  const renderUpcoming = () => {
    if (loading) return <Spinner />;
    if (upcoming.length === 0) return <Empty text="No upcoming meetings at the moment." />;

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((m) => (
          <React.Fragment key={m.id}>
            {renderMeetingCard(
            m,
            () => openUpcomingModal(m),
            {
              label: isFollowUpStage(m) ? 'Follow Up' : 'Upcoming',
              tone: isFollowUpStage(m) ? 'followup' : 'upcoming',
              icon: isFollowUpStage(m) ? 'bi-arrow-repeat' : 'bi-hourglass-split',
            },
            (
              <p className="mt-1.5 text-xs text-[#64748b]">
                Scheduled by: {getCreatorName(m)}
              </p>
            ),
          )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderOngoing = () => {
    if (loading) return <Spinner />;
    if (ongoing.length === 0) return <Empty text="No ongoing meetings right now." />;

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ongoing.map((m) => (
          <React.Fragment key={m.id}>
            {renderMeetingCard(m, () => openOngoingModal(m), {
            label: 'Ongoing',
            tone: 'ongoing',
            icon: 'bi-play-circle',
          }, (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-[#2563eb]">
              <i className="bi bi-eye" aria-hidden />
              {readOnly ? 'Click to view details' : 'Click to manage'}
            </p>
          ))}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderPast = () => {
    if (loading) return <Spinner />;
    if (past.length === 0) return <Empty text="No past meetings yet." />;

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {past.map((m) => (
          <React.Fragment key={m.id}>
            {renderMeetingCard(
            m,
            () => setPastModal(m),
            { label: 'Past', tone: 'past', icon: 'bi-check-circle' },
            (
              <>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#64748b]">
                  <i className="bi bi-check2-circle" aria-hidden />
                  Finalized: {formatOomDateTime(m.isFinalized)}
                </p>
                {hasFollowUpMeeting(m) && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]">
                    <i className="bi bi-arrow-repeat" aria-hidden />
                    Follow-up: {formatOomDateTime(m.followUpDate)}
                    {m.followUpLocation ? ` · ${m.followUpLocation}` : ''}
                  </p>
                )}
              </>
            )
          )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const datePartInput = `${oomInput} text-center`;
  const datePartLabel = 'text-[10px] font-bold uppercase text-[#64748b]';

  return (
    <div className={oomPageWrap} style={{ fontFamily: OOM_FONT }}>
      <header className={oomCompactHeader}>
        <p className={oomEyebrow}>One-on-One Meetings</p>
        <h1 className={`${oomHeaderTitle} flex items-center gap-2`}>
          {!readOnly && <i className="bi bi-list-check text-[#2563eb]" aria-hidden />}
          {readOnly ? 'One-on-One Meetings' : 'Action Items'}
        </h1>
        <p className={oomHeaderDesc}>
          {readOnly
            ? 'View your upcoming, ongoing, and past one-on-one meetings. Employees cannot create or manage meetings.'
            : 'Track all your 1:1 meetings: upcoming, ongoing, and past.'}
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {(
          [
            { key: 'upcoming' as const, label: 'Upcoming', icon: 'bi-hourglass-split' },
            { key: 'ongoing' as const, label: 'Ongoing', icon: 'bi-play-circle' },
            { key: 'past' as const, label: 'Past', icon: 'bi-check-circle' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? oomTabActive : oomTabIdle}
            onClick={() => setTab(t.key)}
          >
            <i className={`bi ${t.icon} me-1.5`} aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'upcoming' && renderUpcoming()}
      {tab === 'ongoing' && renderOngoing()}
      {tab === 'past' && renderPast()}

      {upcomingModal && (
        <OomModal
          subtitle="Meeting Details"
          title={isFollowUpStage(upcomingModal) ? 'Upcoming Follow-Up Meeting' : 'Upcoming Meeting'}
          onClose={closeUpcomingModal}
          footer={
            <>
              <button type="button" className={oomBtnSecondary} onClick={closeUpcomingModal}>
                Close
              </button>
              {!readOnly && (
                <button type="button" className={oomBtnDanger} onClick={() => setShowCancelConfirm(true)}>
                  <i className="bi bi-x-circle" aria-hidden />
                  Cancel Meeting
                </button>
              )}
            </>
          }
        >
          <OomInfoRow
            label="Employee"
            value={`${upcomingModal.employeeFirstName} ${upcomingModal.employeeLastName}`}
          />
          <OomInfoRow label="Creator" value={getCreatorName(upcomingModal)} />
          <OomInfoRow label="Scheduled" value={formatOomDateTime(stageDate(upcomingModal))} />
          <OomInfoRow label="Location" value={displayText(stageLocation(upcomingModal))} />
          <hr className="my-3 border-[#e5e7eb]" />
          <OomTextBlock
            label={isFollowUpStage(upcomingModal) ? 'Follow-Up Goal' : 'Goal / Notes'}
            value={stageGoal(upcomingModal) || '—'}
          />
        </OomModal>
      )}

      {showCancelConfirm && upcomingModal && (
        <OomModal
          subtitle="Confirm"
          title="Cancel Meeting"
          danger
          onClose={() => setShowCancelConfirm(false)}
          footer={
            <>
              <button type="button" className={oomBtnSecondary} onClick={() => setShowCancelConfirm(false)}>
                No
              </button>
              <button type="button" className={oomBtnDanger} onClick={handleCancelUpcoming}>
                Yes
              </button>
            </>
          }
        >
          <p className="text-sm text-[#475569]">Are you really going to cancel the meeting?</p>
        </OomModal>
      )}

      {modalMeeting && (
        <OomModal
          subtitle="Manage Meeting"
          title={isFollowUpStage(modalMeeting) ? 'Follow-Up Meeting' : 'Ongoing Meeting'}
          onClose={closeOngoingModal}
          footer={
            <>
              <button type="button" className={oomBtnSecondary} onClick={closeOngoingModal} disabled={modalSaving}>
                Close
              </button>
              {!readOnly && (
                <>
                  <button type="button" className={oomBtnTeal} onClick={handleEnd} disabled={modalSaving}>
                    <i className="bi bi-check-lg" aria-hidden />
                    {modalSaving
                      ? 'Saving…'
                      : isFollowUpStage(modalMeeting)
                        ? 'END Follow-Up Meeting'
                        : 'END Meeting'}
                  </button>
                  {!isFollowUpStage(modalMeeting) && (
                    <button type="button" className={oomBtnPrimary} onClick={handleFinishWithFollowUp} disabled={modalSaving}>
                      <i className="bi bi-arrow-repeat" aria-hidden />
                      {modalSaving ? 'Saving…' : 'Finish + Follow-Up'}
                    </button>
                  )}
                </>
              )}
            </>
          }
        >
          <OomInfoRow
            label="Employee"
            value={`${modalMeeting.employeeFirstName} ${modalMeeting.employeeLastName}`}
          />
          <OomInfoRow label="Creator" value={getCreatorName(modalMeeting)} />

          {isFollowUpStage(modalMeeting) ? (
            <>
              <hr className="my-3 border-[#e5e7eb]" />
              <OomInfoRow label="First Meeting Start" value={formatOomDateTime(modalMeeting.scheduledDate)} />
              <OomInfoRow label="First Meeting End" value={formatOomDateTime(modalMeeting.firstMeetingEndDate)} />
              <OomInfoRow label="First Meeting Location" value={displayText(modalMeeting.location)} />
              <OomTextBlock label="First Meeting Goal / Notes" value={modalMeeting.notes || '—'} />
              <OomTextBlock
                label="First Meeting Description / Action Items"
                value={modalMeeting.actionItem?.description || '— No previous description recorded —'}
              />
              <hr className="my-3 border-[#e5e7eb]" />
              <OomInfoRow label="Follow-Up Start" value={formatOomDateTime(modalMeeting.followUpDate)} />
              <OomInfoRow label="Follow-Up Location" value={displayText(modalMeeting.followUpLocation)} />
              <OomTextBlock label="Follow-Up Goal" value={modalMeeting.followUpGoal || '—'} />
              <label className="mb-3 flex flex-col gap-1.5">
                <span className={oomLabel}>Follow-Up Meeting Note</span>
                <textarea
                  className={oomTextarea}
                  maxLength={1000}
                  placeholder="Write the result or notes from the follow-up meeting…"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                />
                <small className="text-xs text-[#64748b]">Cannot input more than 1000 letters.</small>
              </label>
            </>
          ) : (
            <>
              <hr className="my-3 border-[#e5e7eb]" />
              <OomInfoRow label="Scheduled" value={formatOomDateTime(modalMeeting.scheduledDate)} />
              <OomInfoRow label="Location" value={displayText(modalMeeting.location)} />
              <OomTextBlock label="Goal / Notes" value={modalMeeting.notes || '—'} />
              <label className="mb-3 flex flex-col gap-1.5">
                <span className={oomLabel}>Meeting Description / Action Items</span>
                <textarea
                  className={oomTextarea}
                  style={{ minHeight: 110 }}
                  maxLength={1000}
                  placeholder="Write the outcome, decisions, or action items from this meeting…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <small className="text-xs text-[#64748b]">Cannot input more than 1000 letters.</small>
              </label>

              <hr className="my-3 border-[#e5e7eb]" />

              <label className="mb-3 flex flex-col gap-1.5">
                <span className={oomLabel}>Follow-Up Date &amp; Time</span>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <label className={datePartLabel}>Day</label>
                    <input
                      className={`${datePartInput} w-[72px]`}
                      type="number"
                      min={1}
                      max={31}
                      placeholder="DD"
                      value={fuDay}
                      onChange={(e) => setFuDay(e.target.value.slice(0, 2))}
                    />
                  </div>
                  <span className="pb-3 font-bold text-[#94a3b8]">/</span>
                  <div className="flex flex-col gap-1">
                    <label className={datePartLabel}>Month</label>
                    <input
                      className={`${datePartInput} w-[72px]`}
                      type="number"
                      min={1}
                      max={12}
                      placeholder="MM"
                      value={fuMonth}
                      onChange={(e) => setFuMonth(e.target.value.slice(0, 2))}
                    />
                  </div>
                  <span className="pb-3 font-bold text-[#94a3b8]">/</span>
                  <div className="flex flex-col gap-1">
                    <label className={datePartLabel}>Year</label>
                    <input
                      className={`${datePartInput} w-[88px]`}
                      type="number"
                      min={2024}
                      max={2099}
                      placeholder="YYYY"
                      value={fuYear}
                      onChange={(e) => setFuYear(e.target.value.slice(0, 4))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={datePartLabel}>Hour</label>
                    <input
                      className={`${datePartInput} w-[56px]`}
                      type="number"
                      min={1}
                      max={12}
                      placeholder="HH"
                      value={fuHour}
                      onChange={(e) => setFuHour(e.target.value.slice(0, 2))}
                    />
                  </div>
                  <span className="pb-3 font-bold text-[#94a3b8]">:</span>
                  <div className="flex flex-col gap-1">
                    <label className={datePartLabel}>Min</label>
                    <input
                      className={`${datePartInput} w-[56px]`}
                      type="number"
                      min={0}
                      max={59}
                      placeholder="MM"
                      value={fuMinute}
                      onChange={(e) => setFuMinute(e.target.value.slice(0, 2))}
                    />
                  </div>
                  <div className="inline-flex overflow-hidden rounded-lg border border-[#d7e4f5]">
                    <button
                      type="button"
                      className={`min-w-[48px] px-3 py-2 text-xs font-bold ${fuAmPm === 'AM' ? 'bg-[#2563eb] text-white' : 'bg-white text-[#475569]'}`}
                      onClick={() => setFuAmPm('AM')}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      className={`min-w-[48px] px-3 py-2 text-xs font-bold ${fuAmPm === 'PM' ? 'bg-[#2563eb] text-white' : 'bg-white text-[#475569]'}`}
                      onClick={() => setFuAmPm('PM')}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </label>

              <label className="mb-3 flex flex-col gap-1.5">
                <span className={oomLabel}>Follow-Up Location</span>
                <input
                  className={oomInput}
                  type="text"
                  placeholder="Example: ACE 3rd Building, 4th floor"
                  value={fuLocation}
                  maxLength={500}
                  onChange={(e) => setFuLocation(e.target.value)}
                />
                <small className="text-xs text-[#64748b]">Optional. Cannot input more than 500 letters.</small>
              </label>

              <label className="mb-3 flex flex-col gap-1.5">
                <span className={oomLabel}>Follow-Up Goal</span>
                <textarea
                  className={oomTextarea}
                  maxLength={1000}
                  placeholder="Add the goal or agenda for the follow-up meeting…"
                  value={followUpGoal}
                  onChange={(e) => setFollowUpGoal(e.target.value)}
                />
                <small className="text-xs text-[#64748b]">
                  Required when creating a follow-up. Cannot input more than 1000 letters.
                </small>
              </label>
            </>
          )}

          {modalError && (
            <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-sm font-semibold text-[#991b1b]">
              <i className="bi bi-exclamation-triangle me-1.5" aria-hidden />
              {modalError}
            </div>
          )}
        </OomModal>
      )}

      {pastModal && (
        <OomModal
          subtitle="View Details"
          title="Past Meeting Details"
          onClose={() => setPastModal(null)}
          footer={
            <button type="button" className={oomBtnSecondary} onClick={() => setPastModal(null)}>
              Close
            </button>
          }
        >
          <OomInfoRow
            label="Employee"
            value={`${pastModal.employeeFirstName} ${pastModal.employeeLastName}`}
          />
          <OomInfoRow label="Creator" value={getCreatorName(pastModal)} />
          <hr className="my-3 border-[#e5e7eb]" />
          <OomInfoRow label="Start Date" value={formatOomDateTime(pastModal.scheduledDate)} />
          <OomInfoRow
            label="First Meeting End"
            value={formatOomDateTime(pastModal.firstMeetingEndDate || pastModal.isFinalized)}
          />
          <OomInfoRow label="Location" value={displayText(pastModal.location)} />
          <OomTextBlock label="Goal / Notes" value={pastModal.notes || '—'} />
          <OomTextBlock
            label="Notes / Action Items / Description"
            value={pastModal.actionItem?.description || '— No description recorded —'}
          />

          {hasFollowUpMeeting(pastModal) && (
            <>
              <hr className="my-3 border-[#e5e7eb]" />
              <OomInfoRow label="Follow-Up Start" value={formatOomDateTime(pastModal.followUpDate)} />
              <OomInfoRow label="Follow-Up End" value={formatOomDateTime(pastModal.followUpEndDate)} />
              <OomInfoRow label="Follow-Up Location" value={displayText(pastModal.followUpLocation)} />
              <OomTextBlock label="Follow-Up Goal" value={pastModal.followUpGoal || '—'} />
              <OomTextBlock label="Follow-Up Meeting Note" value={pastModal.followUpNotes || '—'} />
            </>
          )}
        </OomModal>
      )}
    </div>
  );
};

const Spinner: React.FC = () => (
  <div className="flex min-h-[180px] items-center justify-center">
    <div
      className="h-9 w-9 animate-spin rounded-full border-4 border-[#dbeafe] border-t-[#2563eb]"
      role="status"
      aria-label="Loading"
    />
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-xl border border-dashed border-[#dbe7f6] bg-[#f8fafc] px-6 py-12 text-center">
    <i className="bi bi-inbox mb-3 block text-3xl text-[#93c5fd]" aria-hidden />
    <p className="text-sm font-semibold text-[#64748b]">{text}</p>
  </div>
);

export default OneOnOneActionItems;

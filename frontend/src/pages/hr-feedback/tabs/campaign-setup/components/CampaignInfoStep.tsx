import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getTodayInputDate, timeToMinutes } from '../utils/campaignSetupValidation';


type StateSetter = Dispatch<SetStateAction<any>>;
type Meridiem = 'AM' | 'PM';

type TimeParts = {
    hour: string;
    minute: string;
    meridiem: Meridiem | '';
};

interface Props {
    selectedCampaign: any;
    statusClass: any;
    statusLabels: any;
    setCampaignInfoOpen: StateSetter;
    campaignInfoOpen: any;
    formatWindow: any;
    targetsResponse: any;
    savedAssignmentCount: any;
    handleSave: any;
    currentUser: any;
    errors: any;
    form: any;
    canEditSelected: any;
    setForm: StateSetter;
    DESCRIPTION_LIMIT: any;
    deleting: any;
    handleDeleteDraft: any;
    setErrors: StateSetter;
    saving: any;
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const MERIDIEM_OPTIONS: Meridiem[] = ['AM', 'PM'];

const emptyTimeParts = (): TimeParts => ({ hour: '', minute: '', meridiem: '' });

const timeValueToParts = (value: string): TimeParts => {
    if (!value || !value.includes(':')) return emptyTimeParts();
    const [hourRaw, minuteRaw] = value.split(':').map(Number);
    if (!Number.isFinite(hourRaw) || !Number.isFinite(minuteRaw)) return emptyTimeParts();
    const meridiem: Meridiem = hourRaw >= 12 ? 'PM' : 'AM';
    const displayHour = hourRaw % 12 === 0 ? 12 : hourRaw % 12;
    return {
        hour: String(displayHour).padStart(2, '0'),
        minute: String(minuteRaw).padStart(2, '0'),
        meridiem,
    };
};

const timePartsToValue = (parts: TimeParts) => {
    if (!parts.hour || !parts.minute || !parts.meridiem) return '';
    const hourNumber = Number(parts.hour);
    const minuteNumber = Number(parts.minute);
    if (!Number.isFinite(hourNumber) || !Number.isFinite(minuteNumber)) return '';
    let normalizedHour = hourNumber % 12;
    if (parts.meridiem === 'PM') normalizedHour += 12;
    return `${String(normalizedHour).padStart(2, '0')}:${String(minuteNumber).padStart(2, '0')}`;
};

type CampaignTimePickerProps = {
    date: string;
    value: string;
    disabled: boolean;
    hasError: boolean;
    onChange: (value: string) => void;
    isTimeDisabled: (date: string, time: string) => boolean;
    label: string;
};

function CampaignTimePicker({
                                date,
                                value,
                                disabled,
                                hasError,
                                onChange,
                                isTimeDisabled,
                                label,
                            }: CampaignTimePickerProps) {
    const [draftParts, setDraftParts] = useState<TimeParts>(() => timeValueToParts(value));

    useEffect(() => {
        setDraftParts(timeValueToParts(value));
    }, [value]);

    const hasValidMinuteFor = (candidateParts: TimeParts) => MINUTE_OPTIONS.some((minute) => {
        const candidateValue = timePartsToValue({ ...candidateParts, minute });
        return candidateValue ? !isTimeDisabled(date, candidateValue) : false;
    });

    const isMeridiemDisabled = (meridiem: Meridiem) => {
        if (!date) return false;
        const hoursToCheck = draftParts.hour ? [draftParts.hour] : HOUR_OPTIONS;
        return !hoursToCheck.some((hour) => hasValidMinuteFor({ ...draftParts, hour, meridiem }));
    };

    const isHourDisabled = (hour: string) => {
        if (!date || !draftParts.meridiem) return false;
        return !hasValidMinuteFor({ ...draftParts, hour });
    };

    const isMinuteDisabled = (minute: string) => {
        if (!date || !draftParts.hour || !draftParts.meridiem) return false;
        const candidateValue = timePartsToValue({ ...draftParts, minute });
        return candidateValue ? isTimeDisabled(date, candidateValue) : false;
    };

    const updateParts = (partial: Partial<TimeParts>) => {
        const nextParts = { ...draftParts, ...partial };
        const nextValue = timePartsToValue(nextParts);
        setDraftParts(nextParts);
        onChange(nextValue && !isTimeDisabled(date, nextValue) ? nextValue : '');
    };

    return (
        <div className="hfdc-time-picker" aria-label={label}>
            <select
                className={`hfd-input hfdc-time-select ${hasError ? 'error' : ''}`}
                value={draftParts.hour}
                disabled={disabled}
                onChange={(event) => updateParts({ hour: event.target.value })}
                aria-label={`${label} hour`}
            >
                <option value="">Hour</option>
                {HOUR_OPTIONS.map((hour) => <option key={hour} value={hour} disabled={isHourDisabled(hour)}>{hour}</option>)}
            </select>
            <select
                className={`hfd-input hfdc-time-select ${hasError ? 'error' : ''}`}
                value={draftParts.minute}
                disabled={disabled}
                onChange={(event) => updateParts({ minute: event.target.value })}
                aria-label={`${label} minute`}
            >
                <option value="">Minute</option>
                {MINUTE_OPTIONS.map((minute) => <option key={minute} value={minute} disabled={isMinuteDisabled(minute)}>{minute}</option>)}
            </select>
            <select
                className={`hfd-input hfdc-time-select ${hasError ? 'error' : ''}`}
                value={draftParts.meridiem}
                disabled={disabled}
                onChange={(event) => updateParts({ meridiem: event.target.value as Meridiem | '' })}
                aria-label={`${label} AM or PM`}
            >
                <option value="">AM/PM</option>
                {MERIDIEM_OPTIONS.map((meridiem) => <option key={meridiem} value={meridiem} disabled={isMeridiemDisabled(meridiem)}>{meridiem}</option>)}
            </select>
        </div>
    );
}

export function CampaignInfoStep({
                                     selectedCampaign,
                                     statusClass,
                                     statusLabels,
                                     setCampaignInfoOpen,
                                     campaignInfoOpen,
                                     formatWindow,
                                     targetsResponse,
                                     savedAssignmentCount,
                                     handleSave,
                                     currentUser,
                                     errors,
                                     form,
                                     canEditSelected,
                                     setForm,
                                     DESCRIPTION_LIMIT,
                                     deleting,
                                     handleDeleteDraft,
                                     setErrors,
                                     saving,
                                 }: Props) {
    const now = new Date();
    const todayInputDate = getTodayInputDate(now);
    const currentMinuteOfDay = (now.getHours() * 60) + now.getMinutes();
    const endDateMin = form.startDate && form.startDate > todayInputDate ? form.startDate : todayInputDate;

    const isStartTimeDisabled = (date: string, time: string) => {
        if (!date || !time) return false;
        if (date < todayInputDate) return true;
        return date === todayInputDate && timeToMinutes(time) < currentMinuteOfDay;
    };

    const isEndTimeDisabled = (date: string, time: string, startDate = form.startDate, startTime = form.startTime) => {
        if (!date || !time) return false;
        const candidateMinutes = timeToMinutes(time);
        if (date < todayInputDate) return true;
        if (date === todayInputDate && candidateMinutes < currentMinuteOfDay) return true;
        if (date === startDate && startTime && candidateMinutes <= timeToMinutes(startTime)) return true;
        return false;
    };

    return (
        <section className="hfdq-table-card hfdc-info-card hfdc-details-redesign">
            <div className="hfdc-card-head hfdc-details-head">
                <div>
                    <span className="hfdq-kicker">Step 1</span>
                    <h3>Campaign Details</h3>
                    <p>Set the campaign name, review year, collection window, announcement, and feedback visibility before selecting recipients.</p>
                </div>
                <div className="hfdc-info-head-actions">
                    {selectedCampaign ? <span className={statusClass(selectedCampaign.status)}>{statusLabels[selectedCampaign.status] ?? selectedCampaign.status}</span> : <span className="hfd-status-badge DRAFT">New Draft</span>}
                    <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => setCampaignInfoOpen((current: any) => !current)}>
                        <i className={`bi ${campaignInfoOpen ? 'bi-chevron-up' : 'bi-pencil-square'}`} /> {campaignInfoOpen ? 'Close' : selectedCampaign ? 'Edit Details' : 'Create Draft'}
                    </button>
                </div>
            </div>

            {!campaignInfoOpen ? (
                <div className="hfdc-info-summary hfdc-details-summary">
                    <div className="hfdc-info-summary-main">
                        <span className="hfdc-info-summary-icon"><i className="bi bi-megaphone" /></span>
                        <div>
                            <strong>{selectedCampaign?.name || 'Campaign details are not saved yet'}</strong>
                            <p>{selectedCampaign ? formatWindow(selectedCampaign) : 'Create a draft campaign before selecting recipients and evaluator rules.'}</p>
                        </div>
                    </div>
                    <div className="hfdc-info-summary-grid">
                        <span><small>Review year</small><strong>{selectedCampaign?.reviewYear ?? 'Not set'}</strong></span>
                        <span><small>Recipients</small><strong>{targetsResponse.targetCount}</strong></span>
                        <span><small>Assignments</small><strong>{savedAssignmentCount}</strong></span>
                        <span><small>Status</small><strong>{selectedCampaign ? (statusLabels[selectedCampaign.status] ?? selectedCampaign.status) : 'Draft not saved'}</strong></span>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSave} noValidate>
                    <div className="hfdc-details-shell">
                        <div className="hfdc-details-main">
                            <div className="hfdc-section-title">
                                <span><i className="bi bi-calendar2-week" /> Basic setup</span>
                                <small>Only the required campaign information is shown here.</small>
                            </div>

                            <label className="hfdc-field full">
                                <span>Campaign Name <em>*</em></span>
                                <input
                                    className={`hfd-input ${errors.name ? 'error' : ''}`}
                                    value={form.name}
                                    disabled={!canEditSelected}
                                    onChange={(e: any) => setForm((current: any) => ({ ...current, name: e.target.value }))}
                                    placeholder="Example: Q2 Leadership 360 Review"
                                />
                                {errors.name ? <small className="hfd-error-msg">{errors.name}</small> : <small>Use a clear name employees and HR can recognize later.</small>}
                            </label>

                            <label className="hfdc-field">
                                <span>Review Year <em>*</em></span>
                                <input
                                    type="number"
                                    min="2000"
                                    max="2100"
                                    className={`hfd-input ${errors.reviewYear ? 'error' : ''}`}
                                    value={form.reviewYear}
                                    disabled={!canEditSelected}
                                    onChange={(e: any) => setForm((current: any) => ({ ...current, reviewYear: e.target.value === '' ? '' : Number(e.target.value) }))}
                                    placeholder="Example: 2026"
                                />
                                {errors.reviewYear ? <small className="hfd-error-msg">{errors.reviewYear}</small> : <small>Used for filtering, reporting, and comparison.</small>}
                            </label>

                            <div className="hfdc-field hfdc-owner-card">
                                <span>Campaign Owner</span>
                                <div>
                                    <strong>{currentUser?.fullName ?? 'Current HR user'}</strong>
                                    <small>{currentUser?.email ?? 'Owner is recorded from the signed-in HR account.'}</small>
                                </div>
                            </div>

                            <div className="hfdc-date-time-field full">
                                <span>Start Date & Time <em>*</em></span>
                                <div className="hfdc-date-time-grid hfdc-date-time-grid-expanded">
                                    <input
                                        type="date"
                                        min={todayInputDate}
                                        className={`hfd-input ${errors.startAt ? 'error' : ''}`}
                                        value={form.startDate}
                                        disabled={!canEditSelected}
                                        onChange={(event: any) => {
                                            const nextStartDate = event.target.value;
                                            setForm((current: any) => {
                                                const nextEndDate = current.endDate && current.endDate < nextStartDate ? nextStartDate : current.endDate;
                                                const nextStartTime = isStartTimeDisabled(nextStartDate, current.startTime) ? '' : current.startTime;
                                                const nextEndTime = isEndTimeDisabled(nextEndDate, current.endTime, nextStartDate, nextStartTime) ? '' : current.endTime;
                                                return { ...current, startDate: nextStartDate, startTime: nextStartTime, endDate: nextEndDate, endTime: nextEndTime };
                                            });
                                        }}
                                        aria-label="Start date"
                                    />
                                    <CampaignTimePicker
                                        date={form.startDate}
                                        value={form.startTime}
                                        disabled={!canEditSelected}
                                        hasError={Boolean(errors.startAt)}
                                        isTimeDisabled={isStartTimeDisabled}
                                        onChange={(nextStartTime) => {
                                            setForm((current: any) => {
                                                const nextEndTime = isEndTimeDisabled(current.endDate, current.endTime, current.startDate, nextStartTime) ? '' : current.endTime;
                                                return { ...current, startTime: nextStartTime, endTime: nextEndTime };
                                            });
                                        }}
                                        label="Start time"
                                    />
                                </div>
                                {errors.startAt ? <small className="hfd-error-msg">{errors.startAt}</small> : <small>Choose any valid hour and minute. Past date/time values are not selectable.</small>}
                            </div>

                            <div className="hfdc-date-time-field full">
                                <span>End Date & Time <em>*</em></span>
                                <div className="hfdc-date-time-grid hfdc-date-time-grid-expanded">
                                    <input
                                        type="date"
                                        min={endDateMin}
                                        className={`hfd-input ${errors.endAt ? 'error' : ''}`}
                                        value={form.endDate}
                                        disabled={!canEditSelected}
                                        onChange={(event: any) => {
                                            const nextEndDate = event.target.value;
                                            setForm((current: any) => ({
                                                ...current,
                                                endDate: nextEndDate,
                                                endTime: isEndTimeDisabled(nextEndDate, current.endTime, current.startDate, current.startTime) ? '' : current.endTime,
                                            }));
                                        }}
                                        aria-label="End date"
                                    />
                                    <CampaignTimePicker
                                        date={form.endDate}
                                        value={form.endTime}
                                        disabled={!canEditSelected}
                                        hasError={Boolean(errors.endAt)}
                                        isTimeDisabled={(date, time) => isEndTimeDisabled(date, time)}
                                        onChange={(nextEndTime) => setForm((current: any) => ({ ...current, endTime: nextEndTime }))}
                                        label="End time"
                                    />
                                </div>
                                {errors.endAt ? <small className="hfd-error-msg">{errors.endAt}</small> : <small>End date/time must be after the start date/time.</small>}
                            </div>

                            <div className="hfdc-section-title hfdc-section-title-spaced">
                                <span><i className="bi bi-megaphone" /> Participant Announcement</span>
                            </div>

                            <label className="hfdc-field full">
                                <textarea
                                    className={`hfd-input hfdc-textarea ${errors.description ? 'error' : ''}`}
                                    rows={3}
                                    value={form.description}
                                    disabled={!canEditSelected}
                                    onChange={(e: any) => setForm((current: any) => ({ ...current, description: e.target.value }))}
                                    placeholder="Example: This cycle focuses on practical feedback that helps employees understand strengths and growth opportunities."
                                />
                                <small className={form.description.length > DESCRIPTION_LIMIT ? 'hfd-error-msg' : ''}>{form.description.length}/{DESCRIPTION_LIMIT.toLocaleString()} characters</small>
                                {errors.description ? <small className="hfd-error-msg">{errors.description}</small> : null}
                            </label>

                            <div className="hfdc-visibility-card full">
                                <div className="hfdc-visibility-head">
                                    <span><i className="bi bi-shield-lock" /> Feedback Visibility</span>
                                </div>
                                <div className="hfdc-visibility-grid">
                                    <label className="hfdc-toggle-card compact">
                                        <input type="checkbox" checked={form.peerFeedbackAnonymous} disabled={!canEditSelected} onChange={(e: any) => setForm((current: any) => ({ ...current, peerFeedbackAnonymous: e.target.checked }))} />
                                        <span><strong>Peer feedback anonymous</strong><small>Recipient will not see individual peer names.</small></span>
                                    </label>
                                    <label className="hfdc-toggle-card compact">
                                        <input type="checkbox" checked={form.subordinateFeedbackAnonymous} disabled={!canEditSelected} onChange={(e: any) => setForm((current: any) => ({ ...current, subordinateFeedbackAnonymous: e.target.checked }))} />
                                        <span><strong>Direct report feedback anonymous</strong><small>Recipient will not see individual direct report names.</small></span>
                                    </label>
                                </div>
                                <p className="hfdc-visibility-note">HR or HR Admin can still view evaluator identity for audit and assignment management.</p>
                            </div>
                        </div>
                    </div>

                    <div className="hfdc-form-actions">
                        {selectedCampaign?.status === 'DRAFT' && (
                            <button className="hfd-btn hfd-btn-danger" disabled={deleting} type="button" onClick={handleDeleteDraft}>
                                <i className="bi bi-trash" /> {deleting ? 'Deleting...' : 'Delete Draft'}
                            </button>
                        )}
                        <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => { setCampaignInfoOpen(false); setErrors({}); }}>Cancel</button>
                        <button id="btn-save-campaign-draft" type="submit" className="hfd-btn hfd-btn-primary" disabled={saving || !canEditSelected}>
                            <i className="bi bi-save2" /> {saving ? 'Saving...' : selectedCampaign ? 'Save Changes' : 'Save Draft'}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

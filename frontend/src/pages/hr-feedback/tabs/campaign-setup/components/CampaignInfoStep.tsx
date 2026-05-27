import type { Dispatch, SetStateAction } from 'react';


type StateSetter = Dispatch<SetStateAction<any>>;

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
    localTimeZone: any;
    errors: any;
    form: any;
    canEditSelected: any;
    setForm: StateSetter;
    TIME_OPTIONS: any;
    formatTimeLabel: any;
    DESCRIPTION_LIMIT: any;
    INSTRUCTIONS_LIMIT: any;
    INSTRUCTION_TEMPLATE: any;
    deleting: any;
    handleDeleteDraft: any;
    setErrors: StateSetter;
    saving: any;
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
                                     localTimeZone,
                                     errors,
                                     form,
                                     canEditSelected,
                                     setForm,
                                     TIME_OPTIONS,
                                     formatTimeLabel,
                                     DESCRIPTION_LIMIT,
                                     INSTRUCTIONS_LIMIT,
                                     INSTRUCTION_TEMPLATE,
                                     deleting,
                                     handleDeleteDraft,
                                     setErrors,
                                     saving,
                                 }: Props) {
    return (
        <section className="hfdq-table-card hfdc-info-card">
            <div className="hfdc-card-head">
                <div>
                    <span className="hfdq-kicker">Step 1</span>
                    <h3>Campaign Info</h3>
                    <p>Set the campaign identity, review year, feedback window, participant message, and privacy policy before choosing targets.</p>
                </div>
                <div className="hfdc-info-head-actions">
                    {selectedCampaign ? <span className={statusClass(selectedCampaign.status)}>{statusLabels[selectedCampaign.status] ?? selectedCampaign.status}</span> : <span className="hfd-status-badge DRAFT">New Draft</span>}
                    <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => setCampaignInfoOpen((current: any) => !current)}>
                        <i className={`bi ${campaignInfoOpen ? 'bi-chevron-up' : 'bi-pencil-square'}`} /> {campaignInfoOpen ? 'Close' : selectedCampaign ? 'Edit Campaign Info' : 'Create Campaign Info'}
                    </button>
                </div>
            </div>

            {!campaignInfoOpen ? (
                <div className="hfdc-info-summary">
                    <div className="hfdc-info-summary-main">
                        <span className="hfdc-info-summary-icon"><i className="bi bi-megaphone" /></span>
                        <div>
                            <strong>{selectedCampaign?.name || 'No campaign information saved'}</strong>
                            <p>{selectedCampaign ? formatWindow(selectedCampaign) : 'Create a draft campaign to continue target selection and evaluator setup.'}</p>
                        </div>
                    </div>
                    <div className="hfdc-info-summary-grid">
                        <span><small>Review year</small><strong>{selectedCampaign?.reviewYear ?? 'Not set'}</strong></span>
                        <span><small>Targets</small><strong>{targetsResponse.targetCount}</strong></span>
                        <span><small>Assignments</small><strong>{savedAssignmentCount}</strong></span>
                        <span><small>Status</small><strong>{selectedCampaign ? (statusLabels[selectedCampaign.status] ?? selectedCampaign.status) : 'Draft not saved'}</strong></span>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSave} noValidate>
                    <div className="hfdc-form-section hfdc-form-section-collapsible">
                        <div className="hfdc-context-card">
                            <span className="hfdc-context-icon"><i className="bi bi-person-badge" /></span>
                            <div>
                                <strong>Campaign owner</strong>
                                <small>{currentUser?.fullName ?? 'Current HR user'}{currentUser?.email ? ` · ${currentUser.email}` : ''}</small>
                            </div>
                        </div>

                        <div className="hfdc-context-card">
                            <span className="hfdc-context-icon"><i className="bi bi-globe2" /></span>
                            <div>
                                <strong>Timezone</strong>
                                <small>{localTimeZone}. All schedule times use this timezone.</small>
                            </div>
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
                            {errors.name ? <small className="hfd-error-msg">{errors.name}</small> : <small>Visible in setup screens, evaluator tasks, and campaign reports.</small>}
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
                            {errors.reviewYear ? <small className="hfd-error-msg">{errors.reviewYear}</small> : <small>Used for filtering, reporting, and historical comparison.</small>}
                        </label>

                        <div className="hfdc-date-time-field">
                            <span>Start Date & Time <em>*</em></span>
                            <div className="hfdc-date-time-grid">
                                <input
                                    type="date"
                                    className={`hfd-input ${errors.startAt ? 'error' : ''}`}
                                    value={form.startDate}
                                    disabled={!canEditSelected}
                                    onChange={(event: any) => setForm((current: any) => ({ ...current, startDate: event.target.value }))}
                                    aria-label="Start date"
                                />
                                <select
                                    className={`hfd-input ${errors.startAt ? 'error' : ''}`}
                                    value={form.startTime}
                                    disabled={!canEditSelected}
                                    onChange={(event: any) => setForm((current: any) => ({ ...current, startTime: event.target.value }))}
                                    aria-label="Start time"
                                >
                                    <option value="">Select time</option>
                                    {TIME_OPTIONS.map((time: any) => <option key={time} value={time}>{formatTimeLabel(time)}</option>)}
                                </select>
                            </div>
                            {errors.startAt ? <small className="hfd-error-msg">{errors.startAt}</small> : <small>Feedback collection opens at this date and time.</small>}
                        </div>

                        <div className="hfdc-date-time-field">
                            <span>End Date & Time <em>*</em></span>
                            <div className="hfdc-date-time-grid">
                                <input
                                    type="date"
                                    className={`hfd-input ${errors.endAt ? 'error' : ''}`}
                                    value={form.endDate}
                                    disabled={!canEditSelected}
                                    onChange={(event: any) => setForm((current: any) => ({ ...current, endDate: event.target.value }))}
                                    aria-label="End date"
                                />
                                <select
                                    className={`hfd-input ${errors.endAt ? 'error' : ''}`}
                                    value={form.endTime}
                                    disabled={!canEditSelected}
                                    onChange={(event: any) => setForm((current: any) => ({ ...current, endTime: event.target.value }))}
                                    aria-label="End time"
                                >
                                    <option value="">Select time</option>
                                    {TIME_OPTIONS.map((time: any) => <option key={time} value={time}>{formatTimeLabel(time)}</option>)}
                                </select>
                            </div>
                            {errors.endAt ? <small className="hfd-error-msg">{errors.endAt}</small> : <small>Feedback collection closes after this date and time.</small>}
                        </div>

                        <div className="hfdc-window-validation full">
                            <i className="bi bi-calendar2-check" />
                            <span>Campaign window conflicts are checked when the draft is saved.</span>
                        </div>

                        <label className="hfdc-field full">
                            <span>Participant Announcement</span>
                            <textarea
                                className={`hfd-input hfdc-textarea ${errors.description ? 'error' : ''}`}
                                rows={3}
                                value={form.description}
                                disabled={!canEditSelected}
                                onChange={(e: any) => setForm((current: any) => ({ ...current, description: e.target.value }))}
                                placeholder="Example: Share concise feedback that helps employees understand strengths and growth opportunities for this review cycle."
                            />
                            <small className={form.description.length > DESCRIPTION_LIMIT ? 'hfd-error-msg' : ''}>{form.description.length}/{DESCRIPTION_LIMIT.toLocaleString()} characters · Shown to selected participants before they begin feedback.</small>
                            {errors.description ? <small className="hfd-error-msg">{errors.description}</small> : null}
                        </label>

                        <label className="hfdc-field full hfdc-template-field">
                            <span>Evaluator Instructions</span>
                            <textarea
                                className={`hfd-input hfdc-textarea ${errors.instructions ? 'error' : ''}`}
                                rows={3}
                                value={form.instructions}
                                disabled={!canEditSelected}
                                onChange={(e: any) => setForm((current: any) => ({ ...current, instructions: e.target.value }))}
                                placeholder="Example: Rate recent, observable work behavior and include specific examples where helpful."
                            />
                            <div className="hfdc-field-footer">
                                <small className={form.instructions.length > INSTRUCTIONS_LIMIT ? 'hfd-error-msg' : ''}>{form.instructions.length}/{INSTRUCTIONS_LIMIT.toLocaleString()} characters · Displayed before evaluators submit feedback.</small>
                                <button className="hfd-btn hfd-btn-ghost" type="button" disabled={!canEditSelected} onClick={() => setForm((current: any) => ({ ...current, instructions: current.instructions.trim() ? current.instructions : INSTRUCTION_TEMPLATE }))}>
                                    <i className="bi bi-magic" /> Use template
                                </button>
                            </div>
                            {errors.instructions ? <small className="hfd-error-msg">{errors.instructions}</small> : null}
                        </label>

                        <details className="hfdc-advanced-policy full">
                            <summary>
                                <span><i className="bi bi-shield-lock" /> Privacy policy</span>
                                <small>Optional relationship-level anonymity settings</small>
                            </summary>
                            <div className="hfdc-policy-grid full">
                                <label className="hfdc-toggle-card compact">
                                    <input type="checkbox" checked={form.managerFeedbackAnonymous} disabled={!canEditSelected} onChange={(e: any) => setForm((current: any) => ({ ...current, managerFeedbackAnonymous: e.target.checked }))} />
                                    <span><strong>Manager feedback anonymous</strong><small>Manager identity is hidden from the subject.</small></span>
                                </label>
                                <label className="hfdc-toggle-card compact">
                                    <input type="checkbox" checked={form.peerFeedbackAnonymous} disabled={!canEditSelected} onChange={(e: any) => setForm((current: any) => ({ ...current, peerFeedbackAnonymous: e.target.checked }))} />
                                    <span><strong>Peer feedback anonymous</strong><small>Peer identity is hidden from the subject.</small></span>
                                </label>
                                <label className="hfdc-toggle-card compact">
                                    <input type="checkbox" checked={form.subordinateFeedbackAnonymous} disabled={!canEditSelected} onChange={(e: any) => setForm((current: any) => ({ ...current, subordinateFeedbackAnonymous: e.target.checked }))} />
                                    <span><strong>Subordinate feedback anonymous</strong><small>Direct report identity is hidden from the subject.</small></span>
                                </label>
                                <label className="hfdc-toggle-card compact">
                                    <input type="checkbox" checked={form.selfFeedbackAnonymous} disabled={!canEditSelected} onChange={(e: any) => setForm((current: any) => ({ ...current, selfFeedbackAnonymous: e.target.checked }))} />
                                    <span><strong>Self feedback anonymous</strong><small>Self feedback identity is hidden in reports.</small></span>
                                </label>
                            </div>
                        </details>
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

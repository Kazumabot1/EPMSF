import type { FeedbackCompetencyItem, FeedbackQuestionQualityIssue } from '../../../../../api/hrFeedbackApi';
import type { QuestionEditorFormState } from '../questionBankConfig';
import { getStatusLabel, PUBLISHABLE_STATUSES } from '../questionBankConfig';

type Props = {
    open: boolean;
    mode: 'create' | 'edit';
    form: QuestionEditorFormState;
    competencies: FeedbackCompetencyItem[];
    issues: FeedbackQuestionQualityIssue[];
    busy: boolean;
    onChange: (patch: Partial<QuestionEditorFormState>) => void;
    onClose: () => void;
    onSaveDraft: () => void;
    onPublish: () => void;
};

const isDuplicateIssue = (issue: FeedbackQuestionQualityIssue) =>
    ['DUPLICATE_QUESTION', 'SIMILAR_QUESTION'].includes(issue.code);

const isBlockingIssue = (issue: FeedbackQuestionQualityIssue) => issue.severity === 'ERROR';

const reviewIssues = (issues: FeedbackQuestionQualityIssue[]) =>
    issues.filter((issue) => isBlockingIssue(issue) || isDuplicateIssue(issue));

export default function QuestionEditorDrawer({
                                                 open,
                                                 mode,
                                                 form,
                                                 competencies,
                                                 issues,
                                                 busy,
                                                 onChange,
                                                 onClose,
                                                 onSaveDraft,
                                                 onPublish,
                                             }: Props) {
    if (!open) return null;

    const visibleIssues = reviewIssues(issues);
    const hasErrors = visibleIssues.some((issue) => issue.severity === 'ERROR');
    const isHistorical = form.status === 'RETIRED' || form.status === 'ARCHIVED';
    const canPublish = PUBLISHABLE_STATUSES.has(form.status || 'DRAFT');
    const title = mode === 'create' ? 'Create question' : `Edit question${form.questionCode ? ` · ${form.questionCode}` : ''}`;
    const hasCompetency = Boolean(form.competencyCode);
    const duplicateIssue = visibleIssues.find(isDuplicateIssue);

    return (
        <div className="hfdqb-drawer-shell hfdqb-clean-modal-shell" role="dialog" aria-modal="true" aria-labelledby="hfdqb-question-editor-title">
            <button type="button" className="hfdqb-drawer-backdrop" aria-label="Close question editor" onClick={onClose} />
            <section className="hfdqb-clean-modal hfdqb-clean-question-modal">
                <header className="hfdqb-clean-modal-head">
                    <div>
                        <h3 id="hfdqb-question-editor-title">{title}</h3>
                        <p>{mode === 'create' ? 'New questions are saved as draft until published.' : `Current status: ${getStatusLabel(form.status)}`}</p>
                    </div>
                    <button type="button" className="hfdqb-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div className="hfdqb-question-form-clean">
                    {isHistorical ? (
                        <div className="hfd-alert hfd-alert-warning">
                            <i className="bi bi-archive" />
                            {getStatusLabel(form.status)} questions are kept for history. Restore the question before editing.
                        </div>
                    ) : null}

                    <section className="hfdqb-question-fields">
                        <label className="hfd-field">
                            <span className="hfd-label">Question text <span>*</span></span>
                            <textarea
                                className="hfd-input hfd-textarea hfdqb-question-textarea"
                                rows={5}
                                minLength={20}
                                maxLength={500}
                                value={form.questionText}
                                disabled={busy || isHistorical}
                                onChange={(event) => onChange({ questionText: event.target.value })}
                                placeholder="Example: Communicates clearly and effectively with others."
                            />
                            <small className="hfdqb-field-helper">Required · 20–500 characters · {form.questionText.length}/500</small>
                        </label>

                        <label className="hfd-field">
                            <span className="hfd-label">Competency <span>*</span></span>
                            <select
                                className="hfd-input"
                                value={form.competencyCode}
                                disabled={busy || isHistorical}
                                onChange={(event) => onChange({ competencyCode: event.target.value })}
                            >
                                <option value="">Select competency</option>
                                {competencies.map((competency, index) => (
                                    <option key={`question-editor-competency-${competency.id && competency.id > 0 ? `id-${competency.id}` : `fallback-${index}`}-${competency.code || competency.name || 'unknown'}`} value={competency.code}>{competency.name}</option>
                                ))}
                            </select>
                        </label>

                        <label className="hfd-field">
                            <span className="hfd-label">Evaluator guidance <em>optional</em></span>
                            <textarea
                                className="hfd-input hfd-textarea"
                                rows={3}
                                maxLength={400}
                                value={form.helpText}
                                disabled={busy || isHistorical}
                                onChange={(event) => onChange({ helpText: event.target.value })}
                                placeholder="Add short guidance shown beside this question while evaluators answer."
                            />
                            <small className="hfdqb-field-helper">Shown on the evaluator form only when guidance exists · {form.helpText.length}/400</small>
                        </label>
                    </section>

                    <aside className="hfdqb-question-review">
                        <h4>Review before saving</h4>
                        <div className="hfdqb-review-row">
                            <span className={hasCompetency ? 'complete' : 'incomplete'} />
                            <div>
                                <strong>Mapped to competency</strong>
                                <p>{hasCompetency ? 'Selected' : 'Required before saving'}</p>
                            </div>
                        </div>
                        <div className="hfdqb-review-row">
                            <span className={duplicateIssue ? 'warning' : 'pending'} />
                            <div>
                                <strong>Duplicate / similar question check</strong>
                                <p>{duplicateIssue?.message ?? 'Checked when you save or publish.'}</p>
                            </div>
                        </div>

                        {visibleIssues.length ? (
                            <div className="hfdqb-review-issues">
                                {visibleIssues.map((issue) => (
                                    <p key={`${issue.code}-${issue.message}`} className={issue.severity === 'ERROR' ? 'error' : 'warning'}>
                                        {issue.message}
                                    </p>
                                ))}
                            </div>
                        ) : null}
                    </aside>
                </div>

                <footer className="hfdqb-drawer-actions hfdqb-clean-modal-actions">
                    <button type="button" className="hfd-btn hfd-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
                    {!isHistorical ? (
                        <>
                            <button type="button" className="hfd-btn hfd-btn-secondary" onClick={onSaveDraft} disabled={busy || hasErrors}>
                                {busy ? 'Saving...' : 'Save draft'}
                            </button>
                            {canPublish ? (
                                <button type="button" className="hfd-btn hfd-btn-primary" onClick={onPublish} disabled={busy || hasErrors}>
                                    {busy ? 'Saving...' : form.status === 'ACTIVE' ? 'Save question' : 'Publish question'}
                                </button>
                            ) : null}
                        </>
                    ) : null}
                </footer>
            </section>
        </div>
    );
}

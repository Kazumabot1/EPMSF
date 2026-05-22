import type { FeedbackCompetencyItem, FeedbackQuestionQualityIssue } from '../../../../../api/hrFeedbackApi';
import type { QuestionEditorFormState } from '../questionBankConfig';
import { getStatusLabel, PUBLISHABLE_STATUSES } from '../questionBankConfig';
import QualityChecklist from './QualityChecklist';

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

    const hasErrors = issues.some((issue) => issue.severity === 'ERROR');
    const isHistorical = form.status === 'RETIRED' || form.status === 'ARCHIVED';
    const canPublish = PUBLISHABLE_STATUSES.has(form.status || 'DRAFT');
    const title = mode === 'create' ? 'Create Question' : `Edit Question${form.questionCode ? ` · ${form.questionCode}` : ''}`;

    return (
        <div className="hfdqb-drawer-shell" role="dialog" aria-modal="true" aria-labelledby="hfdqb-question-editor-title">
            <button type="button" className="hfdqb-drawer-backdrop" aria-label="Close question editor" onClick={onClose} />
            <section className="hfdqb-drawer hfdqb-modal">
                <header className="hfdqb-drawer-head">
                    <div>
                        <p>{mode === 'create' ? 'New question starts as draft' : `Current status: ${getStatusLabel(form.status)}`}</p>
                        <h3 id="hfdqb-question-editor-title">{title}</h3>
                    </div>
                    <button type="button" className="hfdqb-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div className="hfdqb-drawer-body hfdqb-modal-body">
                    <div className="hfdqb-editor-main">
                        {isHistorical ? (
                            <div className="hfd-alert hfd-alert-warning">
                                <i className="bi bi-archive" />
                                {getStatusLabel(form.status)} questions are kept for history. Create a duplicate or restore it from a lifecycle action before editing.
                            </div>
                        ) : null}

                        <section className="hfdqb-form-section">
                            <div className="hfdqb-form-section-head">
                                <h4>Question Details</h4>
                                <span className={`hfdqb-status ${String(form.status || 'DRAFT').toLowerCase()}`}>{getStatusLabel(form.status || 'DRAFT')}</span>
                            </div>

                            <label className="hfd-field">
                                <span className="hfd-label">Question Text <span>*</span></span>
                                <textarea
                                    className="hfd-input hfd-textarea hfdqb-question-textarea hfdqb-polished-input"
                                    rows={6}
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
                                    className="hfd-input hfdqb-polished-input"
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
                                <span className="hfd-label">Evaluator Guidance</span>
                                <textarea
                                    className="hfd-input hfd-textarea hfdqb-polished-input"
                                    rows={4}
                                    maxLength={400}
                                    value={form.helpText}
                                    disabled={busy || isHistorical}
                                    onChange={(event) => onChange({ helpText: event.target.value })}
                                    placeholder="Optional guidance shown to evaluators when answering this question."
                                />
                                <small className="hfdqb-field-helper">Optional · up to 400 characters · {form.helpText.length}/400</small>
                            </label>
                        </section>
                    </div>

                    <aside className="hfdqb-editor-side">
                        <QualityChecklist form={form} competencies={competencies} issues={issues} />

                        <section className="hfdqb-form-section">
                            <h4>Fixed Response Policy</h4>
                            <div className="hfdqb-locked-response">
                                <i className="bi bi-lock-fill" />
                                <div>
                                    <strong>Rating 1–5 + Required Comment</strong>
                                    <span>Every respondent must provide both a rating and a comment. The comment explains the rating but does not affect the numeric score.</span>
                                </div>
                            </div>
                        </section>

                        <section className="hfdqb-form-section hfdqb-lifecycle-note">
                            <h4>Question Lifecycle</h4>
                            <p>Use <strong>Save Draft</strong> while preparing the question. Use <strong>Publish Question</strong> when it is ready for rules and campaigns. Retire or archive an existing question from the question table actions.</p>
                        </section>
                    </aside>
                </div>

                <footer className="hfdqb-drawer-actions">
                    <button type="button" className="hfd-btn hfd-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
                    {!isHistorical ? (
                        <>
                            <button type="button" className="hfd-btn hfd-btn-secondary" onClick={onSaveDraft} disabled={busy}>
                                {busy ? 'Saving...' : 'Save Draft'}
                            </button>
                            {canPublish ? (
                                <button type="button" className="hfd-btn hfd-btn-primary" onClick={onPublish} disabled={busy || hasErrors}>
                                    {busy ? 'Saving...' : form.status === 'ACTIVE' ? 'Save Published Question' : 'Publish Question'}
                                </button>
                            ) : null}
                        </>
                    ) : null}
                </footer>
            </section>
        </div>
    );
}

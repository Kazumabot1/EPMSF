import type { FeedbackCompetencyItem, FeedbackQuestionQualityIssue } from '../../../../../api/hrFeedbackApi';
import type { QuestionEditorFormState } from '../questionBankConfig';
import { getStatusLabel, PUBLISHABLE_STATUSES, normalizeQuestionStatus } from '../questionBankConfig';

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

const fieldClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'text-xs font-bold uppercase tracking-[0.14em] text-slate-500';

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
    const normalizedStatus = normalizeQuestionStatus(form.status);
    const isHistorical = normalizedStatus === 'INACTIVE' || normalizedStatus === 'ARCHIVED';
    const canPublish = PUBLISHABLE_STATUSES.has(normalizedStatus || 'DRAFT');
    const title = mode === 'create' ? 'Create question' : `Edit question${form.questionCode ? ` · ${form.questionCode}` : ''}`;
    const hasCompetency = Boolean(form.competencyCode);
    const duplicateIssue = visibleIssues.find(isDuplicateIssue);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="question-bank-editor-title">
            <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-label="Close question editor" onClick={onClose} />
            <section className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <h3 id="question-bank-editor-title" className="text-xl font-bold tracking-tight text-slate-950">{title}</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            {mode === 'create' ? 'New questions are saved as draft until activated.' : `Current status: ${getStatusLabel(normalizedStatus)}`}
                        </p>
                    </div>
                    <button type="button" className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={onClose} disabled={busy} aria-label="Close">
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {isHistorical ? (
                        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                            <i className="bi bi-archive mt-0.5" />
                            <span>{getStatusLabel(normalizedStatus)} questions are kept for history. Change the status before editing.</span>
                        </div>
                    ) : null}

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <section className="grid gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                            <label className="grid gap-2">
                                <span className={labelClass}>Question text <span className="text-red-500">*</span></span>
                                <textarea
                                    className={`${fieldClass} min-h-40 resize-y`}
                                    rows={5}
                                    minLength={20}
                                    maxLength={500}
                                    value={form.questionText}
                                    disabled={busy || isHistorical}
                                    onChange={(event) => onChange({ questionText: event.target.value })}
                                    placeholder="Example: Communicates clearly and effectively with others."
                                />
                                <small className="text-xs font-semibold text-slate-500">Required · 20–500 characters · {form.questionText.length}/500</small>
                            </label>

                            <label className="grid gap-2">
                                <span className={labelClass}>Competency <span className="text-red-500">*</span></span>
                                <select
                                    className={fieldClass}
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

                            <label className="grid gap-2">
                                <span className={labelClass}>Evaluator guidance <em className="normal-case tracking-normal text-slate-400">optional</em></span>
                                <textarea
                                    className={`${fieldClass} min-h-28 resize-y`}
                                    rows={3}
                                    maxLength={400}
                                    value={form.helpText}
                                    disabled={busy || isHistorical}
                                    onChange={(event) => onChange({ helpText: event.target.value })}
                                    placeholder="Add short guidance shown beside this question while evaluators answer."
                                />
                                <small className="text-xs font-semibold text-slate-500">Shown on the evaluator form only when guidance exists · {form.helpText.length}/400</small>
                            </label>
                        </section>

                        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h4 className="text-base font-bold text-slate-950">Review before saving</h4>
                            <div className="mt-4 grid gap-3">
                                <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${hasCompetency ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                    <div>
                                        <strong className="text-sm font-bold text-slate-900">Mapped to competency</strong>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{hasCompetency ? 'Selected' : 'Required before saving'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${duplicateIssue ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                    <div>
                                        <strong className="text-sm font-bold text-slate-900">Duplicate / similar question check</strong>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{duplicateIssue?.message ?? 'Checked when you save or activate.'}</p>
                                    </div>
                                </div>
                            </div>

                            {visibleIssues.length ? (
                                <div className="mt-4 grid gap-2">
                                    {visibleIssues.map((issue) => (
                                        <p key={`${issue.code}-${issue.message}`} className={`rounded-2xl px-3 py-2 text-xs font-bold ${issue.severity === 'ERROR' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {issue.message}
                                        </p>
                                    ))}
                                </div>
                            ) : null}
                        </aside>
                    </div>
                </div>

                <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
                    <button type="button" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={onClose} disabled={busy}>Cancel</button>
                    {!isHistorical ? (
                        <>
                            <button type="button" className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60" onClick={onSaveDraft} disabled={busy || hasErrors}>
                                {busy ? 'Saving...' : 'Save draft'}
                            </button>
                            {canPublish ? (
                                <button type="button" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={onPublish} disabled={busy || hasErrors}>
                                    {busy ? 'Saving...' : normalizedStatus === 'ACTIVE' ? 'Save question' : 'Save as active'}
                                </button>
                            ) : null}
                        </>
                    ) : null}
                </footer>
            </section>
        </div>
    );
}

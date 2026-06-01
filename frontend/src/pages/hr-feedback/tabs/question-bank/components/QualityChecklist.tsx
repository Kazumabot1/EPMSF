import type { FeedbackCompetencyItem, FeedbackQuestionQualityIssue } from '../../../../../api/hrFeedbackApi';
import type { QuestionEditorFormState } from '../questionBankConfig';
import { qualityChecklistRows, type QualityChecklistStatus } from '../utils/questionQuality';

type Props = {
    form: QuestionEditorFormState;
    competencies: FeedbackCompetencyItem[];
    issues: FeedbackQuestionQualityIssue[];
};

const statusIcon: Record<QualityChecklistStatus, string> = {
    pending: 'bi-circle',
    pass: 'bi-check-circle-fill',
    review: 'bi-exclamation-triangle-fill',
    blocked: 'bi-x-circle-fill',
};

const statusLabel: Record<QualityChecklistStatus, string> = {
    pending: 'Pending',
    pass: 'Pass',
    review: 'Review',
    blocked: 'Blocked',
};

const statusClass: Record<QualityChecklistStatus, string> = {
    pending: 'bg-slate-50 text-slate-500 ring-slate-200',
    pass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    review: 'bg-amber-50 text-amber-700 ring-amber-200',
    blocked: 'bg-red-50 text-red-700 ring-red-200',
};

export default function QualityChecklist({ form, competencies, issues }: Props) {
    const rows = qualityChecklistRows(form, competencies, issues);
    const blockedCount = rows.filter((row) => row.status === 'blocked').length;
    const reviewCount = rows.filter((row) => row.status === 'review').length;
    const summaryClass = blockedCount ? statusClass.blocked : reviewCount ? statusClass.review : statusClass.pass;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h4 className="text-base font-bold text-slate-950">Quality Checks</h4>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Rule-based checks only. Final duplicate check runs on save.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${summaryClass}`}>
                    {blockedCount ? `${blockedCount} blocked` : reviewCount ? `${reviewCount} review` : 'Ready'}
                </span>
            </div>
            <ul className="mt-4 grid gap-2">
                {rows.map((row) => (
                    <li key={row.code} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset ${statusClass[row.status]}`} title={row.note}>
                        <i className={`bi ${statusIcon[row.status]}`} />
                        <span className="min-w-0 flex-1 truncate">{row.label}</span>
                        <em className="not-italic text-xs font-bold">{statusLabel[row.status]}</em>
                    </li>
                ))}
            </ul>
            <div className="mt-4 grid gap-2">
                {rows.filter((row) => row.status === 'blocked' || row.status === 'review').slice(0, 4).map((row) => (
                    <p key={row.code} className={`rounded-2xl px-3 py-2 text-xs font-bold ${row.status === 'blocked' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{row.note}</p>
                ))}
            </div>
        </section>
    );
}

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

export default function QualityChecklist({ form, competencies, issues }: Props) {
    const rows = qualityChecklistRows(form, competencies, issues);
    const blockedCount = rows.filter((row) => row.status === 'blocked').length;
    const reviewCount = rows.filter((row) => row.status === 'review').length;

    return (
        <section className="hfdqb-quality-card">
            <div className="hfdqb-quality-head">
                <div>
                    <h4>Quality Checks</h4>
                    <p>Rule-based checks only. Final duplicate check runs on save.</p>
                </div>
                <span className={`hfdqb-quality-summary ${blockedCount ? 'blocked' : reviewCount ? 'review' : 'pass'}`}>
          {blockedCount ? `${blockedCount} blocked` : reviewCount ? `${reviewCount} review` : 'Ready'}
        </span>
            </div>
            <ul>
                {rows.map((row) => (
                    <li key={row.code} className={row.status} title={row.note}>
                        <i className={`bi ${statusIcon[row.status]}`} />
                        <span>{row.label}</span>
                        <em>{statusLabel[row.status]}</em>
                    </li>
                ))}
            </ul>
            <div className="hfdqb-quality-issues">
                {rows.filter((row) => row.status === 'blocked' || row.status === 'review').slice(0, 4).map((row) => (
                    <p key={row.code} className={row.status === 'blocked' ? 'error' : 'warning'}>{row.note}</p>
                ))}
            </div>
        </section>
    );
}

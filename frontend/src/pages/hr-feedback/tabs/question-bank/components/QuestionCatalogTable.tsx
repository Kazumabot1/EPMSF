import type { FeedbackCompetencyItem, QuestionBankItem } from '../../../../../api/hrFeedbackApi';
import { formatDate, getCompetencyName, getStatusLabel } from '../questionBankConfig';

type QuestionLifecycleStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED' | 'ARCHIVED';

type Props = {
    questions: QuestionBankItem[];
    competencies: FeedbackCompetencyItem[];
    selectedQuestionId?: number | null;
    onSelectQuestion: (question: QuestionBankItem) => void;
    onChangeStatus: (question: QuestionBankItem, status: QuestionLifecycleStatus) => void;
};

const statusTone = (status: string) => {
    if (status === 'ACTIVE') return 'active';
    if (status === 'DRAFT') return 'draft';
    if (status === 'RETIRED') return 'retired';
    if (status === 'ARCHIVED') return 'archived';
    return 'inactive';
};

const lifecycleActions = (question: QuestionBankItem): { label: string; status: QuestionLifecycleStatus; tone?: string }[] => {
    if (question.status === 'DRAFT') {
        return [
            { label: 'Publish', status: 'ACTIVE' },
            { label: 'Archive', status: 'ARCHIVED', tone: 'muted' },
        ];
    }

    if (question.status === 'ACTIVE') {
        return [{ label: 'Retire', status: 'RETIRED', tone: 'warning' }];
    }

    if (question.status === 'RETIRED') {
        return [
            { label: 'Restore', status: 'ACTIVE' },
            { label: 'Archive', status: 'ARCHIVED', tone: 'muted' },
        ];
    }

    return [{ label: 'Restore as draft', status: 'DRAFT' }];
};

export default function QuestionCatalogTable({
                                                 questions,
                                                 competencies,
                                                 selectedQuestionId,
                                                 onSelectQuestion,
                                                 onChangeStatus,
                                             }: Props) {
    if (questions.length === 0) {
        return (
            <div className="hfdqb-empty-table hfdqb-clean-empty">
                <i className="bi bi-search" />
                <strong>No questions found</strong>
                <span>Adjust the filters or add a new question.</span>
            </div>
        );
    }

    return (
        <div className="hfdqb-clean-table-wrap">
            <table className="hfdqb-clean-table">
                <thead>
                <tr>
                    <th>Question</th>
                    <th>Competency</th>
                    <th>Status</th>
                    <th>Guidance</th>
                    <th>Version</th>
                    <th>Updated</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {questions.map((question) => {
                    const actions = lifecycleActions(question);
                    const guidanceExists = Boolean(question.helpText?.trim());
                    const isSelected = selectedQuestionId === question.id;

                    return (
                        <tr key={question.id} className={isSelected ? 'selected' : undefined}>
                            <td data-label="Question">
                                <button type="button" className="hfdqb-question-link" onClick={() => onSelectQuestion(question)}>
                                    <span>{question.questionCode || `Question ${question.id}`}</span>
                                    <strong>{question.questionText}</strong>
                                </button>
                            </td>
                            <td data-label="Competency">
                                <span className="hfdqb-chip hfdqb-chip-neutral">{getCompetencyName(question.competencyCode, competencies)}</span>
                            </td>
                            <td data-label="Status">
                                <span className={`hfdqb-status ${statusTone(question.status)}`}>{getStatusLabel(question.status)}</span>
                            </td>
                            <td data-label="Guidance">
                                <span className={`hfdqb-guidance-label ${guidanceExists ? 'has-guidance' : 'no-guidance'}`}>
                                    {guidanceExists ? 'Guidance added' : 'No guidance'}
                                </span>
                            </td>
                            <td data-label="Version">
                                <span className="hfdqb-muted-value">v{question.activeVersionNumber ?? 1}</span>
                            </td>
                            <td data-label="Updated">
                                <span className="hfdqb-muted-value">{formatDate(question.updatedAt ?? question.createdAt)}</span>
                            </td>
                            <td data-label="Actions">
                                <div className="hfdqb-row-actions">
                                    <button type="button" className="hfdqb-row-action primary" onClick={() => onSelectQuestion(question)}>Edit</button>
                                    {actions.slice(0, 2).map((action) => (
                                        <button
                                            key={`${question.id}-${action.status}`}
                                            type="button"
                                            className={`hfdqb-row-action ${action.tone ?? ''}`}
                                            onClick={() => onChangeStatus(question, action.status)}
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}

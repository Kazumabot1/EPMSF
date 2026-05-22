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
            { label: 'Restore', status: 'DRAFT' },
            { label: 'Archive', status: 'ARCHIVED', tone: 'muted' },
        ];
    }
    return [{ label: 'Restore', status: 'DRAFT' }];
};

export default function QuestionCatalogTable({ questions, competencies, selectedQuestionId, onSelectQuestion, onChangeStatus }: Props) {
    if (questions.length === 0) {
        return (
            <div className="hfdqb-empty-table">
                <i className="bi bi-search" />
                <strong>No questions found</strong>
                <span>Try clearing filters or create a new performance feedback question.</span>
            </div>
        );
    }

    return (
        <div className="hfdqb-question-list" role="table" aria-label="Question library">
            <div className="hfdqb-question-list-head" role="row">
                <span>Question</span>
                <span>Competency</span>
                <span>Status</span>
                <span>Version</span>
                <span>Updated</span>
                <span>Actions</span>
            </div>

            {questions.map((question, index) => {
                const version = question.activeVersionNumber ?? 1;
                const updated = formatDate(question.updatedAt);
                const rowKey = question.id && question.id > 0
                    ? `question-row-id-${question.id}`
                    : `question-row-${question.questionCode || 'uncoded'}-${index}`;

                return (
                    <article
                        key={rowKey}
                        className={`hfdqb-question-row ${selectedQuestionId === question.id ? 'selected' : ''}`}
                        role="row"
                        onClick={() => onSelectQuestion(question)}
                    >
                        <div className="hfdqb-question-cell hfdqb-question-main" role="cell">
                            <small>{question.questionCode ?? 'New code'}</small>
                            <strong>{question.questionText}</strong>
                            <span className="hfdqb-mobile-meta">v{version} · {updated}</span>
                        </div>

                        <div className="hfdqb-question-competency" role="cell">
              <span className="hfdqb-competency-chip">
                <i className="bi bi-circle-fill" /> {getCompetencyName(question.competencyCode, competencies)}
              </span>
                        </div>

                        <div className="hfdqb-question-status" role="cell">
                            <span className={`hfdqb-status ${statusTone(question.status)}`}>{getStatusLabel(question.status)}</span>
                        </div>

                        <div className="hfdqb-question-version" role="cell">v{version}</div>
                        <div className="hfdqb-question-updated" role="cell">{updated}</div>

                        <div className="hfdqb-row-actions" role="cell" onClick={(event) => event.stopPropagation()}>
                            <button type="button" className="hfdqb-row-action" onClick={() => onSelectQuestion(question)}>Edit</button>
                            {lifecycleActions(question).map((action) => (
                                <button
                                    type="button"
                                    key={`question-action-${rowKey}-${action.status}`}
                                    className={`hfdqb-row-action ${action.tone ?? ''}`}
                                    onClick={() => onChangeStatus(question, action.status)}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

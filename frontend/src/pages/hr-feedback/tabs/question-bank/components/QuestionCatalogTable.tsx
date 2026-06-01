import type { FeedbackCompetencyItem, QuestionBankItem } from '../../../../../api/hrFeedbackApi';
import { formatDate, getCompetencyName, getStatusLabel, normalizeQuestionStatus, type QuestionLifecycleStatus } from '../questionBankConfig';

type Props = {
    questions: QuestionBankItem[];
    competencies: FeedbackCompetencyItem[];
    selectedQuestionId?: number | null;
    onSelectQuestion: (question: QuestionBankItem) => void;
    onChangeStatus: (question: QuestionBankItem, status: QuestionLifecycleStatus) => void;
};

const statusClasses: Record<QuestionLifecycleStatus, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    DRAFT: 'bg-amber-50 text-amber-700 ring-amber-200',
    INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-200',
    RETIRED: 'bg-slate-100 text-slate-600 ring-slate-200',
    ARCHIVED: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
};

const lifecycleActions = (question: QuestionBankItem): { label: string; status: QuestionLifecycleStatus; className: string }[] => {
    const status = normalizeQuestionStatus(question.status);

    if (status === 'DRAFT') {
        return [
            { label: 'Active', status: 'ACTIVE', className: 'text-blue-700 hover:bg-blue-50' },
            { label: 'Archive', status: 'ARCHIVED', className: 'text-slate-600 hover:bg-slate-50' },
        ];
    }

    if (status === 'ACTIVE') {
        return [{ label: 'Inactive', status: 'INACTIVE', className: 'text-amber-700 hover:bg-amber-50' }];
    }

    if (status === 'INACTIVE') {
        return [{ label: 'Active', status: 'ACTIVE', className: 'text-blue-700 hover:bg-blue-50' }];
    }

    return [{ label: 'Draft', status: 'DRAFT', className: 'text-blue-700 hover:bg-blue-50' }];
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
            <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                    <i className="bi bi-search" />
                </div>
                <strong className="mt-4 text-base font-bold text-slate-900">No questions found</strong>
                <span className="mt-1 text-sm font-medium text-slate-500">Adjust the filters or add a new question.</span>
            </div>
        );
    }

    return (
        <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm xl:min-w-0">
                    <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                        <th className="px-5 py-4">Question</th>
                        <th className="px-5 py-4">Competency</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Guidance</th>
                        <th className="px-5 py-4">Version</th>
                        <th className="px-5 py-4">Updated</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {questions.map((question) => {
                        const actions = lifecycleActions(question);
                        const guidanceExists = Boolean(question.helpText?.trim());
                        const isSelected = selectedQuestionId === question.id;
                        const status = normalizeQuestionStatus(question.status);

                        return (
                            <tr key={question.id} className={isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'}>
                                <td className="px-5 py-4 align-top">
                                    <button
                                        type="button"
                                        className="block max-w-xl text-left"
                                        onClick={() => onSelectQuestion(question)}
                                    >
                                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
                                            {question.questionCode || `Question ${question.id}`}
                                        </span>
                                        <strong className="mt-1 block text-sm font-semibold leading-6 text-slate-900">
                                            {question.questionText}
                                        </strong>
                                    </button>
                                </td>
                                <td className="px-5 py-4 align-top">
                                    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-100">
                                        {getCompetencyName(question.competencyCode, competencies)}
                                    </span>
                                </td>
                                <td className="px-5 py-4 align-top">
                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${statusClasses[status]}`}>
                                        {getStatusLabel(status)}
                                    </span>
                                </td>
                                <td className="px-5 py-4 align-top">
                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${guidanceExists ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
                                        {guidanceExists ? 'Guidance added' : 'No guidance'}
                                    </span>
                                </td>
                                <td className="px-5 py-4 align-top font-semibold text-slate-500">v{question.activeVersionNumber ?? 1}</td>
                                <td className="px-5 py-4 align-top font-semibold text-slate-500">{formatDate(question.updatedAt ?? question.createdAt)}</td>
                                <td className="px-5 py-4 align-top">
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <button
                                            type="button"
                                            className="whitespace-nowrap rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            onClick={() => onSelectQuestion(question)}
                                        >
                                            Edit
                                        </button>
                                        {actions.slice(0, 2).map((action) => (
                                            <button
                                                key={`${question.id}-${action.status}`}
                                                type="button"
                                                className={`whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${action.className}`}
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
        </div>
    );
}

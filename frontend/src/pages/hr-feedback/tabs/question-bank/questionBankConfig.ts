import type { FeedbackCompetencyItem, QuestionBankItem, QuestionBankPayload } from '../../../../api/hrFeedbackApi';

export const REQUIRED_RESPONSE_TYPE = 'RATING_WITH_COMMENT' as const;
export const REQUIRED_SCORING_BEHAVIOR = 'SCORED' as const;
export const MIN_COMMENT_LENGTH = 10;

export type QuestionLifecycleStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'ARCHIVED';

export const normalizeQuestionStatus = (status?: string | null): QuestionLifecycleStatus => {
    const value = (status ?? 'DRAFT').trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
    if (value === 'RETIRED' || value === 'INACTIVE') return 'INACTIVE';
    if (value === 'ACTIVE' || value === 'DRAFT' || value === 'ARCHIVED') return value;
    return 'DRAFT';
};

export const QUESTION_STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft', description: 'Work in progress. Not available for new forms.' },
    { value: 'ACTIVE', label: 'Active', description: 'Ready to use in Form Setup and campaigns.' },
    { value: 'INACTIVE', label: 'Inactive', description: 'Hidden from new forms but retained for history.' },
    { value: 'ARCHIVED', label: 'Archived', description: 'Audit/history only.' },
] as const;

export const PUBLISHABLE_STATUSES = new Set(['DRAFT', 'ACTIVE']);

export type QuestionEditorFormState = {
    id?: number | null;
    questionCode?: string;
    competencyCode: string;
    questionText: string;
    helpText: string;
    status: QuestionLifecycleStatus;
};

export const emptyQuestionForm = (defaultCompetencyCode = ''): QuestionEditorFormState => ({
    id: null,
    questionCode: '',
    competencyCode: defaultCompetencyCode,
    questionText: '',
    helpText: '',
    status: 'DRAFT',
});

export const toQuestionPayload = (form: QuestionEditorFormState): QuestionBankPayload => ({
    questionCode: form.questionCode || undefined,
    competencyCode: form.competencyCode,
    questionText: form.questionText.trim(),
    responseType: REQUIRED_RESPONSE_TYPE,
    scoringBehavior: REQUIRED_SCORING_BEHAVIOR,
    ratingScaleId: null,
    weight: 1,
    required: true,
    helpText: form.helpText.trim() || null,
    status: normalizeQuestionStatus(form.status),
});

export const toQuestionForm = (question: QuestionBankItem): QuestionEditorFormState => ({
    id: question.id,
    questionCode: question.questionCode ?? '',
    competencyCode: question.competencyCode,
    questionText: question.questionText,
    helpText: question.helpText ?? '',
    status: normalizeQuestionStatus(question.status),
});

export const normalizeText = (value?: string | null) => (value ?? '').trim().toLowerCase();

export const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getCompetencyName = (code: string | null | undefined, competencies: FeedbackCompetencyItem[]) => {
    if (!code) return 'Unmapped';
    return competencies.find((competency) => competency.code === code)?.name ?? code.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const getStatusLabel = (status: string) => {
    const normalized = normalizeQuestionStatus(status);
    return QUESTION_STATUS_OPTIONS.find((option) => option.value === normalized)?.label ?? normalized;
};

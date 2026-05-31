import type { FeedbackCompetencyItem, FeedbackQuestionQualityIssue } from '../../../../../api/hrFeedbackApi';
import type { QuestionEditorFormState } from '../questionBankConfig';

const error = (code: string, message: string): FeedbackQuestionQualityIssue => ({ severity: 'ERROR', code, message });

export const buildLocalQualityIssues = (
    form: QuestionEditorFormState,
    competencies: FeedbackCompetencyItem[],
): FeedbackQuestionQualityIssue[] => {
    const issues: FeedbackQuestionQualityIssue[] = [];
    const text = form.questionText.trim();

    if (!text) {
        issues.push(error('QUESTION_TEXT_REQUIRED', 'Question text is required.'));
    } else {
        if (text.length < 20) issues.push(error('QUESTION_TEXT_TOO_SHORT', 'Question text must be at least 20 characters.'));
        if (text.length > 500) issues.push(error('QUESTION_TEXT_TOO_LONG', 'Question text cannot exceed 500 characters.'));
    }

    const competency = competencies.find((item) => item.code === form.competencyCode);
    if (!form.competencyCode) {
        issues.push(error('COMPETENCY_REQUIRED', 'Select a competency before saving.'));
    } else if (!competency) {
        issues.push(error('COMPETENCY_NOT_FOUND', 'Selected competency no longer exists.'));
    }

    if (form.helpText.length > 400) {
        issues.push(error('GUIDANCE_TOO_LONG', 'Evaluator guidance must be 400 characters or fewer.'));
    }

    return issues;
};

export type QualityChecklistStatus = 'pending' | 'pass' | 'review' | 'blocked';

export type QualityChecklistRow = {
    code: string;
    label: string;
    status: QualityChecklistStatus;
    note: string;
};

const issueSet = (issues: FeedbackQuestionQualityIssue[]) => new Set(issues.map((issue) => issue.code));

export const qualityChecklistRows = (
    form: QuestionEditorFormState,
    competencies: FeedbackCompetencyItem[],
    issues: FeedbackQuestionQualityIssue[],
): QualityChecklistRow[] => {
    const codes = issueSet(issues);
    const competencyExists = Boolean(form.competencyCode && competencies.some((item) => item.code === form.competencyCode));
    const questionLength = form.questionText.trim().length;

    return [
        {
            code: 'QUESTION_TEXT',
            label: 'Question wording',
            status: codes.has('QUESTION_TEXT_REQUIRED') || codes.has('QUESTION_TEXT_TOO_SHORT') || codes.has('QUESTION_TEXT_TOO_LONG') ? 'blocked' : questionLength ? 'pass' : 'pending',
            note: questionLength ? 'Question wording is within the allowed length.' : 'Enter a clear rating question before saving.',
        },
        {
            code: 'COMPETENCY',
            label: 'Competency selected',
            status: codes.has('COMPETENCY_REQUIRED') || codes.has('COMPETENCY_NOT_FOUND') ? 'blocked' : competencyExists ? 'pass' : 'pending',
            note: competencyExists ? 'Selected competency is valid.' : 'Select a valid competency for this question.',
        },
        {
            code: 'GUIDANCE',
            label: 'Evaluator guidance',
            status: codes.has('GUIDANCE_TOO_LONG') ? 'review' : 'pass',
            note: codes.has('GUIDANCE_TOO_LONG') ? 'Evaluator guidance should be shortened.' : 'Guidance is optional and within the allowed length.',
        },
        {
            code: 'SCORING',
            label: 'Rating format',
            status: 'pass',
            note: '360 feedback questions use the standard 1–5 rating with required comment.',
        },
    ];
};

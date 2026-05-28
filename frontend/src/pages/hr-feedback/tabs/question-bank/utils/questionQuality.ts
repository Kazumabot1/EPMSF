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

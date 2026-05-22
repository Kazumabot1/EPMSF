import type { FeedbackCompetencyItem, FeedbackQuestionQualityIssue } from '../../../../../api/hrFeedbackApi';
import type { QuestionEditorFormState } from '../questionBankConfig';
import { MIN_COMMENT_LENGTH } from '../questionBankConfig';

const warning = (code: string, message: string): FeedbackQuestionQualityIssue => ({ severity: 'WARNING', code, message });
const error = (code: string, message: string): FeedbackQuestionQualityIssue => ({ severity: 'ERROR', code, message });

export type QualityChecklistStatus = 'pending' | 'pass' | 'review' | 'blocked';

export type QualityChecklistRow = {
    code: string;
    label: string;
    status: QualityChecklistStatus;
    note: string;
};

const normalizeForChecks = (value: string) => ` ${value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;

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
        if (text.length > 220) issues.push(warning('QUESTION_TEXT_LONG', 'Question is long. Consider making it shorter for evaluator clarity.'));
    }

    const competency = competencies.find((item) => item.code === form.competencyCode);
    if (!form.competencyCode) {
        issues.push(error('COMPETENCY_REQUIRED', 'Question must be linked to a competency.'));
    } else if (!competency) {
        issues.push(error('COMPETENCY_NOT_FOUND', 'Question must use an existing competency.'));
    }

    if (text) {
        const normalized = normalizeForChecks(text);
        if ([' good ', ' bad ', ' nice ', ' poor ', ' great ', ' okay '].some((word) => normalized.includes(word))) {
            issues.push(warning('VAGUE_WORDING', 'Question may contain vague wording. Use observable behavior.'));
        }
        if ([' always ', ' never ', ' everyone ', ' no one ', ' every time '].some((word) => normalized.includes(word))) {
            issues.push(warning('ABSOLUTE_WORDING', 'Avoid absolute wording such as always or never unless required.'));
        }
        const connectors = [' and ', ' or ', '/', ','].filter((connector) => normalized.includes(connector)).length;
        const behaviorWords = ['communicates', 'collaborates', 'delivers', 'demonstrates', 'shows', 'takes', 'supports', 'provides', 'solves', 'analyzes', 'learns', 'improves', 'adapts', 'listens', 'shares', 'leads', 'follows', 'meets'];
        const behaviorCount = behaviorWords.filter((word) => normalized.includes(` ${word} `)).length;
        if (connectors >= 2 || (connectors >= 1 && behaviorCount >= 2)) {
            issues.push(warning('POSSIBLE_DOUBLE_BARRELED', 'This question may measure more than one behavior. Consider splitting it.'));
        }
        if (behaviorCount === 0) {
            issues.push(warning('BEHAVIOR_ORIENTATION', 'Question may not be behavior-oriented. Prefer observable work behaviors.'));
        }
    }

    return issues;
};

const issueByCode = (issues: FeedbackQuestionQualityIssue[], codes: string[]) =>
    issues.find((issue) => codes.includes(issue.code));

const statusFromIssue = (issue?: FeedbackQuestionQualityIssue): QualityChecklistStatus => {
    if (!issue) return 'pass';
    return issue.severity === 'ERROR' ? 'blocked' : 'review';
};

export const qualityChecklistRows = (
    form: QuestionEditorFormState,
    competencies: FeedbackCompetencyItem[],
    issues: FeedbackQuestionQualityIssue[],
): QualityChecklistRow[] => {
    const text = form.questionText.trim();
    const hasText = text.length > 0;
    const competency = competencies.find((item) => item.code === form.competencyCode);
    const hasCompetency = Boolean(form.competencyCode);

    const textIssue = issueByCode(issues, ['QUESTION_TEXT_REQUIRED', 'QUESTION_TEXT_TOO_SHORT', 'QUESTION_TEXT_TOO_LONG', 'QUESTION_TEXT_LONG']);
    const conceptIssue = issueByCode(issues, ['POSSIBLE_DOUBLE_BARRELED']);
    const wordingIssue = issueByCode(issues, ['VAGUE_WORDING', 'ABSOLUTE_WORDING', 'BEHAVIOR_ORIENTATION']);
    const competencyIssue = issueByCode(issues, ['COMPETENCY_REQUIRED', 'COMPETENCY_NOT_FOUND']);
    const duplicateIssue = issueByCode(issues, ['DUPLICATE_QUESTION', 'SIMILAR_QUESTION']);

    return [
        {
            code: 'TEXT_CLARITY',
            label: 'Clear, specific question text',
            status: hasText ? statusFromIssue(textIssue) : 'pending',
            note: hasText ? (textIssue?.message ?? 'Pass') : 'Enter question text',
        },
        {
            code: 'COMPETENCY_ALIGNMENT',
            label: 'Mapped to competency',
            status: hasCompetency ? statusFromIssue(competencyIssue) : 'pending',
            note: hasCompetency ? (competency?.name ?? competencyIssue?.message ?? 'Pass') : 'Select competency',
        },
        {
            code: 'SINGLE_BEHAVIOR',
            label: 'Measures one observable behavior',
            status: hasText ? statusFromIssue(conceptIssue) : 'pending',
            note: hasText ? (conceptIssue?.message ?? 'Pass') : 'Waiting for text',
        },
        {
            code: 'NEUTRAL_WORDING',
            label: 'Neutral and behavior-based wording',
            status: hasText ? statusFromIssue(wordingIssue) : 'pending',
            note: hasText ? (wordingIssue?.message ?? 'Pass') : 'Waiting for text',
        },
        {
            code: 'DUPLICATE_CHECK',
            label: 'Duplicate/similar question check',
            status: duplicateIssue ? statusFromIssue(duplicateIssue) : 'pending',
            note: duplicateIssue?.message ?? 'Checked by backend before saving',
        },
        {
            code: 'RESPONSE_LOCK',
            label: 'Rating 1–5 with required comment',
            status: 'pass',
            note: `Locked. Respondents must enter a rating and a comment of at least ${MIN_COMMENT_LENGTH} characters.`,
        },
    ];
};

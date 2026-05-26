import type { DragEvent } from 'react';
import type { FeedbackCampaignQuestionGroup } from '../../../../../types/feedbackCampaign';
import type { QuestionCompetencyGroup, QuestionDragPayload } from '../types/campaignSetupTypes';

export const questionDragMime = 'application/x-epms-question-review';

export const sortQuestionItems = <T extends { sectionOrder?: number | null; displayOrder?: number | null; questionCode?: string | null }>(items: T[]) =>
    [...items].sort((left, right) =>
        Number(left.sectionOrder ?? 9999) - Number(right.sectionOrder ?? 9999)
        || Number(left.displayOrder ?? 9999) - Number(right.displayOrder ?? 9999)
        || String(left.questionCode ?? '').localeCompare(String(right.questionCode ?? '')),
    );

export const normalizeCompetencyTitle = (title?: string | null, code?: string | null) => {
    const cleanTitle = String(title ?? '').trim();
    const genericTitle = !cleanTitle || cleanTitle === 'Questions' || /^competency\s*\d+$/i.test(cleanTitle);
    if (!genericTitle) return cleanTitle;
    const cleanCode = String(code ?? '').trim();
    return cleanCode || 'Unmapped competency';
};

export const getQuestionSectionCode = (question: FeedbackCampaignQuestionGroup['questions'][number]) =>
    String(question.competencyCode || question.sectionCode || 'UNMAPPED').trim();

export const buildQuestionCompetencies = (questions: FeedbackCampaignQuestionGroup['questions'] = []): QuestionCompetencyGroup[] => {
    const bySection = new Map<string, QuestionCompetencyGroup>();
    sortQuestionItems(questions).forEach((question) => {
        const sectionCode = getQuestionSectionCode(question);
        const existing = bySection.get(sectionCode) ?? {
            sectionCode,
            sectionTitle: normalizeCompetencyTitle(question.competencyName || question.sectionTitle, question.competencyCode),
            sectionOrder: Number(question.sectionOrder ?? bySection.size + 1),
            questions: [],
        };
        existing.sectionTitle = normalizeCompetencyTitle(question.competencyName || question.sectionTitle || existing.sectionTitle, question.competencyCode);
        existing.sectionOrder = Math.min(existing.sectionOrder, Number(question.sectionOrder ?? existing.sectionOrder));
        existing.questions = sortQuestionItems([...existing.questions, question]);
        bySection.set(sectionCode, existing);
    });
    return Array.from(bySection.values()).sort((left, right) => left.sectionOrder - right.sectionOrder || left.sectionTitle.localeCompare(right.sectionTitle));
};

export const isReviewQuestionScored = (question: FeedbackCampaignQuestionGroup['questions'][number]) => {
    const responseType = String(question.responseType ?? '').toUpperCase();
    const scoringBehavior = String(question.scoringBehavior ?? '').toUpperCase();
    return scoringBehavior === 'SCORED' && (responseType === 'RATING' || responseType === 'RATING_WITH_COMMENT');
};

export const writeQuestionDragData = (event: DragEvent<HTMLElement>, payload: QuestionDragPayload) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(questionDragMime, JSON.stringify(payload));
};

export const readQuestionDragData = (event: DragEvent<HTMLElement>): QuestionDragPayload | null => {
    try {
        const raw = event.dataTransfer.getData(questionDragMime);
        return raw ? JSON.parse(raw) as QuestionDragPayload : null;
    } catch {
        return null;
    }
};

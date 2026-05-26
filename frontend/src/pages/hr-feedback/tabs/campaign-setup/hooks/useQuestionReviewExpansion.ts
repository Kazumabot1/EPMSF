import { useEffect, useMemo, useState } from 'react';
import type { FeedbackCampaignQuestionGroup } from '../../../../../types/feedbackCampaign';
import { sameStringSet } from '../utils/campaignSetupCollections';
import { buildQuestionCompetencies } from '../utils/campaignSetupQuestionUtils';

export const useQuestionReviewExpansion = (selectedQuestionGroup: FeedbackCampaignQuestionGroup | null) => {
    const [expandedQuestionCompetencies, setExpandedQuestionCompetencies] = useState<Set<string>>(() => new Set());
    const [expandedQuestionPreviews, setExpandedQuestionPreviews] = useState<Set<string>>(() => new Set());

    const selectedQuestionCompetencies = useMemo(
        () => buildQuestionCompetencies(selectedQuestionGroup?.questions ?? []),
        [selectedQuestionGroup],
    );

    const selectedQuestionCompetencyKeys = useMemo(
        () => selectedQuestionCompetencies.map(competency => competency.sectionCode).join('|'),
        [selectedQuestionCompetencies],
    );

    useEffect(() => {
        if (!selectedQuestionGroup || selectedQuestionCompetencies.length === 0) return;
        const currentKeys = selectedQuestionCompetencies.map(competency => `${selectedQuestionGroup.groupKey}:${competency.sectionCode}`);
        setExpandedQuestionCompetencies(current => {
            const stillValid = new Set(Array.from(current).filter(key => currentKeys.includes(key)));
            const next = stillValid.size > 0 ? stillValid : new Set([currentKeys[0]]);
            return sameStringSet(current, next) ? current : next;
        });
    }, [selectedQuestionGroup?.groupKey, selectedQuestionCompetencyKeys, selectedQuestionCompetencies]);

    const isQuestionCompetencyExpanded = (groupKey: string, sectionCode: string) =>
        expandedQuestionCompetencies.has(`${groupKey}:${sectionCode}`);

    const toggleQuestionCompetency = (groupKey: string, sectionCode: string) => {
        const key = `${groupKey}:${sectionCode}`;
        setExpandedQuestionCompetencies(current => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const questionPreviewKey = (groupKey: string, questionCode: string) => `${groupKey}:${questionCode}`;

    const isQuestionPreviewExpanded = (groupKey: string, questionCode: string) =>
        expandedQuestionPreviews.has(questionPreviewKey(groupKey, questionCode));

    const toggleQuestionPreview = (groupKey: string, questionCode: string) => {
        const key = questionPreviewKey(groupKey, questionCode);
        setExpandedQuestionPreviews(current => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return {
        selectedQuestionCompetencies,
        selectedQuestionCompetencyKeys,
        isQuestionCompetencyExpanded,
        toggleQuestionCompetency,
        isQuestionPreviewExpanded,
        toggleQuestionPreview,
    };
};

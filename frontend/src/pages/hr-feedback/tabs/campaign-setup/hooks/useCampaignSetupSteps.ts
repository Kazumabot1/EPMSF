import { useMemo } from 'react';
import type { FeedbackCampaign } from '../../../../../types/feedbackCampaign';
import type { SetupStepKey } from '../types/campaignSetupTypes';

export type CampaignSetupStep = {
    key: SetupStepKey;
    label: string;
    note: string;
    status: string;
    icon: string;
    unlocked: boolean;
    done: boolean;
};

type CampaignSetupStepsParams = {
    selectedCampaign: FeedbackCampaign | null;
    selectedTargetCount: number;
    savedTargetCount: number;
    hasUnsavedTargetChanges: boolean;
    hasUnavailableSelection: boolean;
    savedAssignmentCount: number;
    questionReviewReady: boolean;
    includedQuestionCount: number;
};

export function useCampaignSetupSteps({
                                          selectedCampaign,
                                          selectedTargetCount,
                                          savedTargetCount,
                                          hasUnsavedTargetChanges,
                                          hasUnavailableSelection,
                                          savedAssignmentCount,
                                          questionReviewReady,
                                          includedQuestionCount,
                                      }: CampaignSetupStepsParams) {
    const setupSteps = useMemo<CampaignSetupStep[]>(() => [
        {
            key: 'foundation',
            label: 'Foundation',
            note: 'Campaign info and policy',
            status: selectedCampaign ? 'Saved' : 'Start here',
            icon: 'bi-pencil-square',
            unlocked: true,
            done: Boolean(selectedCampaign),
        },
        {
            key: 'targets',
            label: 'Targets',
            note: 'Select employees',
            status: selectedCampaign ? `${selectedTargetCount} selected` : 'Save draft first',
            icon: 'bi-people',
            unlocked: Boolean(selectedCampaign),
            done: savedTargetCount > 0 && !hasUnsavedTargetChanges && !hasUnavailableSelection,
        },
        {
            key: 'evaluators',
            label: 'Evaluators',
            note: 'Generate review network',
            status: savedTargetCount > 0 ? (savedAssignmentCount > 0 ? `${savedAssignmentCount} generated` : 'Ready to configure') : 'Save targets first',
            icon: 'bi-diagram-3',
            unlocked: savedTargetCount > 0 && !hasUnsavedTargetChanges && !hasUnavailableSelection,
            done: savedAssignmentCount > 0,
        },
        {
            key: 'questions',
            label: 'Question Review',
            note: 'Campaign question set',
            status: savedAssignmentCount > 0 ? (questionReviewReady ? `${includedQuestionCount} saved` : 'Ready to review') : 'Generate evaluators first',
            icon: 'bi-ui-checks-grid',
            unlocked: savedAssignmentCount > 0,
            done: questionReviewReady,
        },
        {
            key: 'launch',
            label: 'Review & Launch',
            note: 'Final check before launch',
            status: questionReviewReady ? 'Ready for validation' : 'Save questions first',
            icon: 'bi-rocket-takeoff',
            unlocked: questionReviewReady || ['READY_TO_ACTIVATE', 'ACTIVE', 'CLOSED', 'PUBLISHED'].includes(selectedCampaign?.status ?? ''),
            done: ['READY_TO_ACTIVATE', 'ACTIVE', 'CLOSED', 'PUBLISHED'].includes(selectedCampaign?.status ?? ''),
        },
    ], [
        hasUnavailableSelection,
        hasUnsavedTargetChanges,
        includedQuestionCount,
        questionReviewReady,
        savedAssignmentCount,
        savedTargetCount,
        selectedCampaign,
        selectedTargetCount,
    ]);

    const lastUnlockedStep = useMemo(() => [...setupSteps].reverse().find((step) => step.unlocked)?.key ?? 'foundation', [setupSteps]);

    return { setupSteps, lastUnlockedStep };
}

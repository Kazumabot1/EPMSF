import type {
    FeedbackCampaignQuestionGroup,
    FeedbackRelationshipType,
    ManualAssignmentInput,
} from '../../../../../types/feedbackCampaign';

export type FieldErrors = Record<string, string>;
export type ReadinessFilter = 'ALL' | 'AVAILABLE' | 'READY' | 'WARNINGS' | 'BLOCKED';
export type SetupStepKey = 'foundation' | 'targets' | 'evaluators' | 'questions' | 'launch';

export type CampaignInfoForm = {
    name: string;
    reviewYear: number | '';
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    description: string;
    instructions: string;
    autoSubmitCompletedDraftsOnClose: boolean;
    managerFeedbackAnonymous: boolean;
    peerFeedbackAnonymous: boolean;
    subordinateFeedbackAnonymous: boolean;
    selfFeedbackAnonymous: boolean;
    redistributeMissingRelationshipWeight: boolean;
};

export type QuestionDragPayload =
    | { kind: 'competency'; groupKey: string; sectionCode: string }
    | { kind: 'question'; groupKey: string; sectionCode: string; questionCode: string };

export type QuestionCompetencyGroup = {
    sectionCode: string;
    sectionTitle: string;
    sectionOrder: number;
    questions: FeedbackCampaignQuestionGroup['questions'];
};

export type DraftEvaluatorAddition = ManualAssignmentInput & { draftId: string };

export type RelationshipOption = {
    value: Exclude<FeedbackRelationshipType, 'SELF'>;
    label: string;
};

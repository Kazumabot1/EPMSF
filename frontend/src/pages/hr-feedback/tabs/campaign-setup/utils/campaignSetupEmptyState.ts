import type {
    FeedbackAssignmentGenerationResponse,
    FeedbackCampaign,
    FeedbackCampaignActivationReadiness,
    FeedbackCampaignQuestionReview,
    FeedbackCampaignScoringConfig,
    FeedbackCampaignTargetsResponse,
} from '../../../../../types/feedbackCampaign';

export const emptyTargetsResponse = (campaign?: FeedbackCampaign | null): FeedbackCampaignTargetsResponse => ({
    campaignId: campaign?.id ?? 0,
    campaignName: campaign?.name ?? '',
    campaignStatus: campaign?.status ?? 'DRAFT',
    targetCount: 0,
    readyCount: 0,
    warningCount: 0,
    blockedCount: 0,
    targets: [],
    warnings: [],
});

export const emptyAssignmentPreview = (campaign?: FeedbackCampaign | null): FeedbackAssignmentGenerationResponse => ({
    campaignId: campaign?.id ?? 0,
    totalTargets: 0,
    totalEvaluatorsGenerated: 0,
    evaluatorConfig: null,
    requests: [],
    assignmentDetails: [],
    warnings: [],
});

export const emptyActivationReadiness = (campaign?: FeedbackCampaign | null): FeedbackCampaignActivationReadiness => ({
    campaignId: campaign?.id ?? 0,
    campaignName: campaign?.name ?? '',
    campaignStatus: campaign?.status ?? 'DRAFT',
    ready: false,
    canMarkReady: false,
    canActivate: false,
    summary: {
        targetCount: 0,
        assignmentCount: 0,
        questionSelectionCount: 0,
        assignmentQuestionSnapshotCount: 0,
        pendingAssignmentCount: 0,
        inProgressAssignmentCount: 0,
        submittedAssignmentCount: 0,
        completionPercent: 0,
    },
    checks: [],
    blockingIssues: [],
    warnings: [],
});

export const emptyScoringConfig = (campaign?: FeedbackCampaign | null): FeedbackCampaignScoringConfig => ({
    campaignId: campaign?.id ?? 0,
    campaignName: campaign?.name ?? '',
    campaignStatus: campaign?.status ?? 'DRAFT',
    redistributeMissingRelationshipWeight: campaign?.redistributeMissingRelationshipWeight !== false,
    totalRelationshipWeight: 100,
    relationshipWeightsReady: true,
    relationshipWeights: [
        { relationshipType: 'MANAGER', label: 'Manager', weightPercent: 40, assignmentCount: 0, targetCountWithRole: 0, currentlyAvailable: false },
        { relationshipType: 'PEER', label: 'Peer', weightPercent: 30, assignmentCount: 0, targetCountWithRole: 0, currentlyAvailable: false },
        { relationshipType: 'SUBORDINATE', label: 'Subordinate', weightPercent: 20, assignmentCount: 0, targetCountWithRole: 0, currentlyAvailable: false },
        { relationshipType: 'SELF', label: 'Self', weightPercent: 10, assignmentCount: 0, targetCountWithRole: 0, currentlyAvailable: false },
    ],
    warnings: [],
});

export const emptyQuestionReview = (campaign?: FeedbackCampaign | null): FeedbackCampaignQuestionReview => ({
    campaignId: campaign?.id ?? 0,
    campaignName: campaign?.name ?? '',
    campaignStatus: campaign?.status ?? 'DRAFT',
    saved: false,
    targetCount: 0,
    assignmentCount: 0,
    groupCount: 0,
    questionCount: 0,
    includedQuestionCount: 0,
    scoredQuestionCount: 0,
    includedScoredQuestionCount: 0,
    totalCompetencyWeight: 0,
    competencyWeightsReady: false,
    lastSavedAt: null,
    warnings: [],
    competencyWeights: [],
    groups: [],
});

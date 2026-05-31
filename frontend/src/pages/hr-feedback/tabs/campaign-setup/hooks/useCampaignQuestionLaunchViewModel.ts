import { useMemo } from 'react';
import type {
    FeedbackCampaign,
    FeedbackCampaignActivationReadiness,
    FeedbackCampaignQuestionReview,
    FeedbackCampaignScoringConfig,
    FeedbackCampaignTargetsResponse,
    FeedbackRelationshipType,
} from '../../../../../types/feedbackCampaign';
import { useQuestionReviewExpansion } from './useQuestionReviewExpansion';
import { roundPercent } from '../utils/campaignSetupCollections';
import { relationshipLabel } from '../utils/campaignSetupFormatters';
import { getLaunchBannerCopy } from '../utils/campaignSetupMessages';
import { buildQuestionCompetencies } from '../utils/campaignSetupQuestionUtils';

type UseCampaignQuestionLaunchViewModelParams = {
    questionReview: FeedbackCampaignQuestionReview;
    selectedQuestionGroupKey: string;
    selectedCampaign: FeedbackCampaign | null;
    activationReadiness: FeedbackCampaignActivationReadiness;
    targetsResponse: FeedbackCampaignTargetsResponse;
    savedAssignmentCount: number;
    scoringConfig: FeedbackCampaignScoringConfig;
    savingQuestionReview: boolean;
};

export function useCampaignQuestionLaunchViewModel({
                                                       questionReview,
                                                       selectedQuestionGroupKey,
                                                       selectedCampaign,
                                                       activationReadiness,
                                                       targetsResponse,
                                                       savedAssignmentCount,
                                                       scoringConfig,
                                                       savingQuestionReview,
                                                   }: UseCampaignQuestionLaunchViewModelParams) {
    const questionGroups = questionReview.groups ?? [];
    const competencyWeights = questionReview.competencyWeights ?? [];
    const competencyWeightTotal = useMemo(() => roundPercent(competencyWeights.reduce((sum, item) => sum + Number(item.weightPercent ?? 0), 0)), [competencyWeights]);
    const competencyWeightDelta = roundPercent(100 - competencyWeightTotal);
    const competencyWeightsReady = competencyWeights.length > 0
        && Math.abs(competencyWeightTotal - 100) <= 0.01
        && competencyWeights.every(item => (item.warnings ?? []).length === 0);

    const selectedQuestionGroup = questionGroups.find(group => group.groupKey === selectedQuestionGroupKey) ?? questionGroups[0] ?? null;
    const {
        selectedQuestionCompetencies,
        isQuestionCompetencyExpanded,
        toggleQuestionCompetency,
        isQuestionPreviewExpanded,
        toggleQuestionPreview,
    } = useQuestionReviewExpansion(selectedQuestionGroup);

    const selectedQuestionIncludedCompetencyCount = selectedQuestionCompetencies.filter(competency => competency.questions.some(question => question.included)).length;
    const selectedQuestionIncludedQuestionCount = selectedQuestionCompetencies.flatMap(competency => competency.questions).filter(question => question.included).length;
    const selectedQuestionTotalCompetencyCount = selectedQuestionCompetencies.length;
    const selectedQuestionTotalQuestionCount = selectedQuestionGroup?.questionCount ?? selectedQuestionCompetencies.flatMap(competency => competency.questions).length;
    const activeQuestionFormTitle = selectedQuestionGroup ? `${relationshipLabel(selectedQuestionGroup.relationshipType as FeedbackRelationshipType)} Feedback Form` : 'Feedback Form';
    const hasQuestionReview = questionGroups.length > 0;
    const questionSaveDisabled = savingQuestionReview || !hasQuestionReview || !competencyWeightsReady || selectedCampaign?.status !== 'DRAFT';
    const questionReviewReady = Boolean(questionReview.saved && questionReview.includedQuestionCount > 0 && competencyWeightsReady && questionGroups.every(group => group.includedQuestionCount > 0));

    const activationBlocked = activationReadiness.blockingIssues.length > 0;
    const setupReady = Boolean(selectedCampaign && activationReadiness.ready && !activationBlocked);
    const campaignReadyToActivate = selectedCampaign?.status === 'READY_TO_ACTIVATE';
    const canValidateSetup = Boolean(selectedCampaign && selectedCampaign.status === 'DRAFT' && activationReadiness.canMarkReady && setupReady);
    const canActivate = Boolean(selectedCampaign && campaignReadyToActivate && activationReadiness.canActivate && setupReady);
    const campaignLaunched = Boolean(selectedCampaign && ['ACTIVE', 'CLOSED', 'PUBLISHED'].includes(selectedCampaign.status));
    const launchReady = Boolean(selectedCampaign && campaignReadyToActivate && setupReady);
    const { title: launchBannerTitle, message: launchBannerMessage } = getLaunchBannerCopy({
        launchReady,
        setupReady,
        campaignStatus: selectedCampaign?.status,
    });

    const launchTargetCount = activationReadiness.summary.targetCount || targetsResponse.targetCount || selectedCampaign?.targetCount || 0;
    const launchAssignmentCount = activationReadiness.summary.assignmentCount || selectedCampaign?.assignmentCount || savedAssignmentCount;
    const questionCountsByForm = questionGroups.map(group => Number(group.includedQuestionCount || group.questionCount || 0)).filter(count => count > 0);
    const uniqueQuestionCounts = Array.from(new Set(questionCountsByForm));
    const questionsPerFormLabel = questionGroups.length === 0
        ? 'No forms ready'
        : uniqueQuestionCounts.length === 1
            ? `${uniqueQuestionCounts[0]} questions per form`
            : `${Math.min(...questionCountsByForm)}–${Math.max(...questionCountsByForm)} questions per form`;
    const competencyCountsByForm = useMemo(() => questionGroups
        .map(group => buildQuestionCompetencies(group.questions ?? []).filter(competency => competency.questions.some(question => question.included)).length)
        .filter(count => count > 0), [questionGroups]);
    const uniqueCompetencyCounts = Array.from(new Set(competencyCountsByForm));
    const competencyCountLabel = competencyCountsByForm.length === 0
        ? 'No competencies ready'
        : uniqueCompetencyCounts.length === 1
            ? `${uniqueCompetencyCounts[0]} competencies`
            : `${Math.min(...competencyCountsByForm)}–${Math.max(...competencyCountsByForm)} competencies`;

    const roleAssignmentSummary = scoringConfig.relationshipWeights
        .filter(item => Number(item.assignmentCount ?? 0) > 0)
        .map(item => `${relationshipLabel(item.relationshipType)} ${item.assignmentCount}`);

    const anonymousRoleLabels = selectedCampaign ? [
        selectedCampaign.peerFeedbackAnonymous ? 'Peer' : '',
        selectedCampaign.subordinateFeedbackAnonymous ? 'Subordinate' : '',
    ].filter(Boolean) : [];
    const privacySummary = anonymousRoleLabels.length > 0
        ? `Peer and subordinate feedback are grouped without showing individual evaluator names to recipients.`
        : 'Peer and subordinate evaluator names are visible to recipients.';

    const launchChecklist = useMemo(() => {
        const checks = activationReadiness.checks.map(check => ({ ...check }));
        if (selectedCampaign && !checks.some(check => String(check.key).toUpperCase() === 'PRIVACY_POLICY')) {
            checks.push({
                key: 'PRIVACY_POLICY',
                label: 'Privacy settings',
                status: 'PASS',
                message: privacySummary,
            });
        }
        return checks;
    }, [activationReadiness.checks, privacySummary, selectedCampaign]);

    const launchQuestionFormSummaries = useMemo(() => questionGroups.map(group => ({
        key: group.groupKey,
        relationshipLabel: relationshipLabel(group.relationshipType),
        includedQuestionCount: Number(group.includedQuestionCount ?? 0),
        questionCount: Number(group.questionCount ?? 0),
        competencyCount: buildQuestionCompetencies(group.questions ?? [])
            .filter(competency => competency.questions.some(question => question.included)).length,
    })), [questionGroups]);

    return {
        questionGroups,
        competencyWeights,
        competencyWeightTotal,
        competencyWeightDelta,
        competencyWeightsReady,
        selectedQuestionGroup,
        selectedQuestionCompetencies,
        isQuestionCompetencyExpanded,
        toggleQuestionCompetency,
        isQuestionPreviewExpanded,
        toggleQuestionPreview,
        selectedQuestionIncludedCompetencyCount,
        selectedQuestionIncludedQuestionCount,
        selectedQuestionTotalCompetencyCount,
        selectedQuestionTotalQuestionCount,
        activeQuestionFormTitle,
        questionSaveDisabled,
        questionReviewReady,
        setupReady,
        canValidateSetup,
        canActivate,
        campaignLaunched,
        launchReady,
        launchBannerTitle,
        launchBannerMessage,
        launchTargetCount,
        launchAssignmentCount,
        questionsPerFormLabel,
        competencyCountLabel,
        roleAssignmentSummary,
        privacySummary,
        launchChecklist,
        launchQuestionFormSummaries,
    };
}

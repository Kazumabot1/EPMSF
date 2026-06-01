import type { Dispatch, SetStateAction } from 'react';
import { feedbackCampaignApi } from '../../../../../api/feedbackCampaignApi';
import {
    DEFAULT_EVALUATOR_CONFIG,
    hasAnyEvaluatorSource,
    normalizeEvaluatorConfig,
} from '../../../../../types/feedbackCampaign';
import type {
    EvaluatorConfigInput,
    FeedbackAssignmentDetailItem,
    FeedbackAssignmentGenerationResponse,
    FeedbackCampaign,
    FeedbackCampaignQuestionReview,
    ManualAssignmentInput,
} from '../../../../../types/feedbackCampaign';
import type { DraftEvaluatorAddition } from '../types/campaignSetupTypes';
import { assignmentKey } from '../utils/campaignSetupFormatters';
import { emptyQuestionReview } from '../utils/campaignSetupEmptyState';

type Setter<T> = Dispatch<SetStateAction<T>>;

type CampaignEvaluatorActionsParams = {
    selectedCampaign: FeedbackCampaign | null;
    savedTargetIds: number[];
    hasUnsavedTargetChanges: boolean;
    evaluatorConfig: EvaluatorConfigInput;
    hasAssignmentPreview: boolean;
    activeEvaluatorTargetId: number;
    manualForm: ManualAssignmentInput;
    manualEvaluatorEligibilityError: string;
    displayedAssignmentDetails: FeedbackAssignmentDetailItem[];
    hasSavedEvaluatorAssignments: boolean;
    canEditEvaluators: boolean;
    draftRemovedEvaluatorKeys: Set<string>;
    draftManualAdditions: DraftEvaluatorAddition[];
    setEvaluatorConfig: Setter<EvaluatorConfigInput>;
    setAssignmentPreview: Setter<FeedbackAssignmentGenerationResponse>;
    setSelectedEvaluatorTargetId: Setter<number>;
    setPreviewingAssignments: Setter<boolean>;
    setGeneratingAssignments: Setter<boolean>;
    setAddingEvaluator: Setter<boolean>;
    setRemovingAssignmentId: Setter<number | null>;
    setManualForm: Setter<ManualAssignmentInput>;
    setEvaluatorSearch: Setter<string>;
    setDraftRemovedEvaluatorKeys: Setter<Set<string>>;
    setDraftManualAdditions: Setter<DraftEvaluatorAddition[]>;
    setQuestionReview: Setter<FeedbackCampaignQuestionReview>;
    setSelectedQuestionGroupKey: Setter<string>;
    setError: Setter<string>;
    setSuccess: Setter<string>;
    loadCampaignSnapshot: (campaignId: number, fallback?: FeedbackCampaign | null) => Promise<FeedbackCampaign | null>;
    refreshCampaigns: () => Promise<FeedbackCampaign[]>;
    loadQuestionReview: (campaignId: number) => Promise<void>;
    loadScoringConfig: (campaignId: number) => Promise<void>;
    loadActivationState: (campaignId: number) => Promise<void>;
};

export function useCampaignEvaluatorActions({
                                                selectedCampaign,
                                                savedTargetIds,
                                                hasUnsavedTargetChanges,
                                                evaluatorConfig,
                                                hasAssignmentPreview,
                                                activeEvaluatorTargetId,
                                                manualForm,
                                                manualEvaluatorEligibilityError,
                                                displayedAssignmentDetails,
                                                hasSavedEvaluatorAssignments,
                                                canEditEvaluators,
                                                draftRemovedEvaluatorKeys,
                                                draftManualAdditions,
                                                setEvaluatorConfig,
                                                setAssignmentPreview,
                                                setSelectedEvaluatorTargetId,
                                                setPreviewingAssignments,
                                                setGeneratingAssignments,
                                                setAddingEvaluator,
                                                setRemovingAssignmentId,
                                                setManualForm,
                                                setEvaluatorSearch,
                                                setDraftRemovedEvaluatorKeys,
                                                setDraftManualAdditions,
                                                setQuestionReview,
                                                setSelectedQuestionGroupKey,
                                                setError,
                                                setSuccess,
                                                loadCampaignSnapshot,
                                                refreshCampaigns,
                                                loadQuestionReview,
                                                loadScoringConfig,
                                                loadActivationState,
                                            }: CampaignEvaluatorActionsParams) {
    const setPeerReviewerCount = (value: number) => {
        const nextCount = Math.max(1, Math.min(8, value));
        setEvaluatorConfig(current => normalizeEvaluatorConfig({
            ...current,
            includePeers: true,
            peerMinCount: Math.min(current.peerMinCount ?? DEFAULT_EVALUATOR_CONFIG.peerMinCount, nextCount),
            peerMaxCount: nextCount,
            peerCount: nextCount,
        }));
    };

    const buildEvaluatorPayload = (): EvaluatorConfigInput => normalizeEvaluatorConfig(evaluatorConfig);

    const validateEvaluatorRules = () => {
        if (!selectedCampaign) {
            setError('Save campaign info before preparing evaluators.');
            return false;
        }
        if (selectedCampaign.status !== 'DRAFT') {
            setError('Evaluators can be prepared only while the campaign is in draft.');
            return false;
        }
        if (savedTargetIds.length === 0 || hasUnsavedTargetChanges) {
            setError(hasUnsavedTargetChanges ? 'Save recipient changes before preparing evaluators.' : 'Select and save recipients before preparing evaluators.');
            return false;
        }
        const payload = buildEvaluatorPayload();
        if (!hasAnyEvaluatorSource(payload)) {
            setError('At least one evaluator group is required.');
            return false;
        }
        if (payload.includePeers && payload.peerMinCount > payload.peerMaxCount) {
            setError('Peer reviewer count is not valid.');
            return false;
        }
        if (payload.includeSubordinates && payload.subordinateMinCount > payload.subordinateMaxCount) {
            setError('Subordinate reviewer count is not valid.');
            return false;
        }
        return true;
    };

    const refreshAfterAssignmentChange = async (campaign: FeedbackCampaign) => {
        await loadCampaignSnapshot(campaign.id, campaign);
        await refreshCampaigns();
        await loadQuestionReview(campaign.id);
        await loadScoringConfig(campaign.id);
        await loadActivationState(campaign.id);
    };

    const previewEvaluatorRules = async () => {
        if (!validateEvaluatorRules() || !selectedCampaign) return;
        setPreviewingAssignments(true);
        setError('');
        setSuccess('');
        try {
            const preview = await feedbackCampaignApi.previewAssignments(selectedCampaign.id, buildEvaluatorPayload());
            setAssignmentPreview(preview);
            setSelectedEvaluatorTargetId(current => current || preview.requests[0]?.targetEmployeeId || 0);
            setSuccess(`${preview.totalEvaluatorsGenerated} evaluator${preview.totalEvaluatorsGenerated === 1 ? '' : 's'} prepared for review.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Evaluator preview could not be prepared.');
        } finally {
            setPreviewingAssignments(false);
        }
    };

    const generateEvaluatorAssignments = async () => {
        if (!validateEvaluatorRules() || !selectedCampaign) return;
        if (!hasAssignmentPreview) {
            setError('Preview evaluators before saving.');
            return;
        }
        setGeneratingAssignments(true);
        setError('');
        setSuccess('');
        try {
            let response = await feedbackCampaignApi.generateAssignments(selectedCampaign.id, buildEvaluatorPayload());

            if (draftRemovedEvaluatorKeys.size > 0) {
                const assignmentsToRemove = (response.assignmentDetails ?? [])
                    .filter(assignment => assignment.assignmentId != null && draftRemovedEvaluatorKeys.has(assignmentKey(assignment)));
                for (const assignment of assignmentsToRemove) {
                    response = await feedbackCampaignApi.removeAssignment(selectedCampaign.id, assignment.assignmentId as number);
                }
            }

            for (const addition of draftManualAdditions) {
                response = await feedbackCampaignApi.addManualAssignment(selectedCampaign.id, {
                    targetEmployeeId: addition.targetEmployeeId,
                    evaluatorEmployeeId: addition.evaluatorEmployeeId,
                    relationshipType: addition.relationshipType,
                    anonymous: addition.anonymous,
                    reason: addition.reason?.trim(),
                });
            }

            setAssignmentPreview(response);
            setSelectedEvaluatorTargetId(current => current || response.requests[0]?.targetEmployeeId || 0);
            setDraftRemovedEvaluatorKeys(new Set());
            setDraftManualAdditions([]);
            setQuestionReview(emptyQuestionReview(selectedCampaign));
            setSelectedQuestionGroupKey('');
            setSuccess(`${response.totalEvaluatorsGenerated} evaluator${response.totalEvaluatorsGenerated === 1 ? '' : 's'} saved for review.`);
            await refreshAfterAssignmentChange(selectedCampaign);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Evaluators could not be saved.');
        } finally {
            setGeneratingAssignments(false);
        }
    };

    const addEvaluator = async () => {
        if (!selectedCampaign) return;
        if (!canEditEvaluators) {
            setError('Evaluators can be changed only while the campaign is in draft.');
            return;
        }
        if (!hasAssignmentPreview) {
            setError('Preview evaluators before adding someone.');
            return;
        }
        const targetEmployeeId = activeEvaluatorTargetId;
        if (!targetEmployeeId || !manualForm.evaluatorEmployeeId) {
            setError('Choose an evaluator to add.');
            return;
        }
        if (!manualForm.reason || manualForm.reason.trim().length < 5) {
            setError('Add a short reason before saving this evaluator.');
            return;
        }
        if (manualEvaluatorEligibilityError) {
            setError(manualEvaluatorEligibilityError);
            return;
        }
        const payload: ManualAssignmentInput = {
            ...manualForm,
            targetEmployeeId,
            reason: manualForm.reason.trim(),
            anonymous:
                manualForm.relationshipType === 'PEER'
                    ? selectedCampaign.peerFeedbackAnonymous !== false
                    : manualForm.relationshipType === 'SUBORDINATE'
                        ? selectedCampaign.subordinateFeedbackAnonymous !== false
                        : selectedCampaign.managerFeedbackAnonymous === true,
        };
        const key = `${payload.targetEmployeeId}:${payload.evaluatorEmployeeId}:${payload.relationshipType}`;
        if (displayedAssignmentDetails.some(item => assignmentKey(item) === key)) {
            setError('This evaluator is already included for the selected recipient.');
            return;
        }

        if (!hasSavedEvaluatorAssignments) {
            setDraftRemovedEvaluatorKeys(current => {
                const next = new Set(current);
                next.delete(key);
                return next;
            });
            setDraftManualAdditions(current => [...current, { ...payload, draftId: `${Date.now()}-${payload.evaluatorEmployeeId}` }]);
            setManualForm(current => ({ ...current, evaluatorEmployeeId: 0, reason: '' }));
            setEvaluatorSearch('');
            setSuccess('Evaluator added to the prepared list.');
            return;
        }

        setAddingEvaluator(true);
        setError('');
        setSuccess('');
        try {
            const response = await feedbackCampaignApi.addManualAssignment(selectedCampaign.id, payload);
            setAssignmentPreview(response);
            setManualForm(current => ({ ...current, evaluatorEmployeeId: 0, reason: '' }));
            setEvaluatorSearch('');
            setSuccess('Evaluator added.');
            await refreshAfterAssignmentChange(selectedCampaign);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Evaluator could not be added.';
            setError(message || 'Evaluator could not be added. Review the selected role and eligibility rules.');
        } finally {
            setAddingEvaluator(false);
        }
    };

    const removeEvaluator = async (assignment: FeedbackAssignmentDetailItem) => {
        if (!selectedCampaign || !canEditEvaluators) return;
        if (assignment.status === 'SUBMITTED') {
            setError('Submitted feedback cannot be changed.');
            return;
        }
        const key = assignmentKey(assignment);
        if (assignment.assignmentId == null) {
            setDraftManualAdditions(current => current.filter(item => `${item.targetEmployeeId}:${item.evaluatorEmployeeId}:${item.relationshipType}` !== key));
            setDraftRemovedEvaluatorKeys(current => new Set(current).add(key));
            setSuccess('Evaluator removed from the prepared list.');
            return;
        }

        setRemovingAssignmentId(assignment.assignmentId);
        setError('');
        setSuccess('');
        try {
            const response = await feedbackCampaignApi.removeAssignment(selectedCampaign.id, assignment.assignmentId);
            setAssignmentPreview(response);
            setSuccess('Evaluator removed.');
            await refreshAfterAssignmentChange(selectedCampaign);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Evaluator could not be removed.');
        } finally {
            setRemovingAssignmentId(null);
        }
    };


    return {
        setPeerReviewerCount,
        previewEvaluatorRules,
        generateEvaluatorAssignments,
        addEvaluator,
        removeEvaluator,
    };
}

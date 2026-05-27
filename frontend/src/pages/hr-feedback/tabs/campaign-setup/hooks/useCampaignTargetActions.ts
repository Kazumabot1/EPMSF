import type { Dispatch, SetStateAction } from 'react';
import { feedbackCampaignApi } from '../../../../../api/feedbackCampaignApi';
import type {
    FeedbackAssignmentGenerationResponse,
    FeedbackCampaign,
    FeedbackCampaignTargetsResponse,
    FeedbackTargetCandidate,
} from '../../../../../types/feedbackCampaign';
import type { DraftEvaluatorAddition, SetupStepKey } from '../types/campaignSetupTypes';
import { normalizeList } from '../utils/campaignSetupCollections';
import { emptyAssignmentPreview } from '../utils/campaignSetupEmptyState';

type Setter<T> = Dispatch<SetStateAction<T>>;

type CampaignTargetActionsParams = {
    selectedCampaign: FeedbackCampaign | null;
    targetIdsNormalized: number[];
    setSelectedTargetIds: Setter<number[]>;
    setTargetsResponse: Setter<FeedbackCampaignTargetsResponse>;
    setAssignmentPreview: Setter<FeedbackAssignmentGenerationResponse>;
    setDraftRemovedEvaluatorKeys: Setter<Set<string>>;
    setDraftManualAdditions: Setter<DraftEvaluatorAddition[]>;
    setSavingTargets: Setter<boolean>;
    setError: Setter<string>;
    setSuccess: Setter<string>;
    setActiveStepKey: Setter<SetupStepKey>;
    loadCampaignSnapshot: (campaignId: number, fallback?: FeedbackCampaign | null) => Promise<FeedbackCampaign | null>;
    refreshCampaigns: () => Promise<FeedbackCampaign[]>;
    loadActivationState: (campaignId: number) => Promise<void>;
};

export function useCampaignTargetActions({
                                             selectedCampaign,
                                             targetIdsNormalized,
                                             setSelectedTargetIds,
                                             setTargetsResponse,
                                             setAssignmentPreview,
                                             setDraftRemovedEvaluatorKeys,
                                             setDraftManualAdditions,
                                             setSavingTargets,
                                             setError,
                                             setSuccess,
                                             setActiveStepKey,
                                             loadCampaignSnapshot,
                                             refreshCampaigns,
                                             loadActivationState,
                                         }: CampaignTargetActionsParams) {
    const toggleTarget = (candidate: FeedbackTargetCandidate) => {
        if (!selectedCampaign || selectedCampaign.status !== 'DRAFT' || !candidate.eligible) return;
        setSelectedTargetIds((current) => {
            if (current.includes(candidate.employeeId)) {
                return current.filter(id => id !== candidate.employeeId);
            }
            return normalizeList([...current, candidate.employeeId]);
        });
    };

    const removeSelectedTarget = (employeeId: number) => {
        if (!selectedCampaign || selectedCampaign.status !== 'DRAFT') return;
        setSelectedTargetIds((current) => current.filter(id => id !== employeeId));
    };

    const saveTargets = async () => {
        if (!selectedCampaign) {
            setError('Save the campaign draft before selecting targets.');
            return;
        }
        if (selectedCampaign.status !== 'DRAFT') {
            setError('Targets can be changed only while the campaign is DRAFT.');
            return;
        }
        if (targetIdsNormalized.length === 0) {
            setError('Select at least one feedback recipient.');
            return;
        }

        setSavingTargets(true);
        setError('');
        setSuccess('');
        try {
            const response = await feedbackCampaignApi.updateCampaignTargets(selectedCampaign.id, {
                employeeIds: targetIdsNormalized,
            });
            setTargetsResponse(response);
            setSelectedTargetIds(normalizeList(response.targets.map(target => target.employeeId)));
            setAssignmentPreview(emptyAssignmentPreview(selectedCampaign));
            setDraftRemovedEvaluatorKeys(new Set());
            setDraftManualAdditions([]);
            setSuccess(`${response.targetCount} feedback recipient${response.targetCount === 1 ? '' : 's'} saved for "${selectedCampaign.name}".`);
            setActiveStepKey('evaluators');
            const latest = await loadCampaignSnapshot(selectedCampaign.id, selectedCampaign);
            if (latest) setAssignmentPreview(emptyAssignmentPreview(latest));
            await refreshCampaigns();
            await loadActivationState(selectedCampaign.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Recipients could not be saved.');
        } finally {
            setSavingTargets(false);
        }
    };

    return {
        toggleTarget,
        removeSelectedTarget,
        saveTargets,
    };
}

import type { Dispatch, SetStateAction } from 'react';
import { feedbackCampaignApi } from '../../../../../api/feedbackCampaignApi';
import type { FeedbackCampaign } from '../../../../../types/feedbackCampaign';

type Setter<T> = Dispatch<SetStateAction<T>>;

type CampaignLifecycleActionsParams = {
    selectedCampaign: FeedbackCampaign | null;
    setActivatingCampaign: Setter<boolean>;
    setError: Setter<string>;
    setSuccess: Setter<string>;
    loadCampaignSnapshot: (campaignId: number, fallback?: FeedbackCampaign | null) => Promise<FeedbackCampaign | null>;
    refreshCampaigns: () => Promise<FeedbackCampaign[]>;
    loadScoringConfig: (campaignId: number) => Promise<void>;
    loadActivationState: (campaignId: number) => Promise<void>;
    onCampaignCreated: (campaign: FeedbackCampaign) => void;
};

export function useCampaignLifecycleActions({
                                                selectedCampaign,
                                                setActivatingCampaign,
                                                setError,
                                                setSuccess,
                                                loadCampaignSnapshot,
                                                refreshCampaigns,
                                                loadScoringConfig,
                                                loadActivationState,
                                                onCampaignCreated,
                                            }: CampaignLifecycleActionsParams) {
    const refreshActivationAfterLifecycle = async (campaignId: number) => {
        await loadCampaignSnapshot(campaignId, selectedCampaign);
        await refreshCampaigns();
        await loadScoringConfig(campaignId);
        await loadActivationState(campaignId);
    };

    const validateSelectedCampaignSetup = async () => {
        if (!selectedCampaign) return;
        setActivatingCampaign(true);
        setError('');
        setSuccess('');
        try {
            const updated = await feedbackCampaignApi.markReadyToActivate(selectedCampaign.id);
            setSuccess(`Campaign "${updated.name}" is validated and ready to activate.`);
            onCampaignCreated(updated);
            await refreshActivationAfterLifecycle(updated.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Campaign setup could not be validated.');
            await loadActivationState(selectedCampaign.id);
        } finally {
            setActivatingCampaign(false);
        }
    };

    const activateSelectedCampaign = async () => {
        if (!selectedCampaign) return;
        setActivatingCampaign(true);
        setError('');
        setSuccess('');
        try {
            const updated = await feedbackCampaignApi.activateCampaign(selectedCampaign.id);
            setSuccess(`Campaign "${updated.name}" launched successfully. Feedback collection is now active.`);
            onCampaignCreated(updated);
            await refreshActivationAfterLifecycle(updated.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Campaign could not be launched.');
            await loadActivationState(selectedCampaign.id);
        } finally {
            setActivatingCampaign(false);
        }
    };

    return {
        refreshActivationAfterLifecycle,
        validateSelectedCampaignSetup,
        activateSelectedCampaign,
    };
}

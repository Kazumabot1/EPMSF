import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { feedbackCampaignApi } from '../../../../../api/feedbackCampaignApi';
import type {
    FeedbackCampaign,
    FeedbackAssignmentGenerationResponse,
    FeedbackCampaignActivationReadiness,
    FeedbackCampaignQuestionReview,
    FeedbackCampaignScoringConfig,
    FeedbackCampaignTargetsResponse,
} from '../../../../../types/feedbackCampaign';
import type { CampaignInfoForm, DraftEvaluatorAddition, FieldErrors, SetupStepKey } from '../types/campaignSetupTypes';
import { emptyActivationReadiness, emptyAssignmentPreview, emptyQuestionReview, emptyScoringConfig, emptyTargetsResponse } from '../utils/campaignSetupEmptyState';
import { buildCampaignPayload, validateCampaignInfoForm } from '../utils/campaignSetupValidation';

type Setter<T> = Dispatch<SetStateAction<T>>;

type CampaignInfoActionsParams = {
    campaigns: FeedbackCampaign[];
    selectedCampaign: FeedbackCampaign | null;
    form: CampaignInfoForm;
    setSelectedCampaignId: Setter<number | ''>;
    setForm: Setter<CampaignInfoForm>;
    setErrors: Setter<FieldErrors>;
    setError: Setter<string>;
    setSuccess: Setter<string>;
    setSaving: Setter<boolean>;
    setDeleting: Setter<boolean>;
    setCampaignInfoOpen: Setter<boolean>;
    setTargetsResponse: Setter<FeedbackCampaignTargetsResponse>;
    setSelectedTargetIds: Setter<number[]>;
    setAssignmentPreview: Setter<FeedbackAssignmentGenerationResponse>;
    setQuestionReview: Setter<FeedbackCampaignQuestionReview>;
    setScoringConfig: Setter<FeedbackCampaignScoringConfig>;
    setSelectedQuestionGroupKey: Setter<string>;
    setActivationReadiness: Setter<FeedbackCampaignActivationReadiness>;
    setDraftRemovedEvaluatorKeys: Setter<Set<string>>;
    setDraftManualAdditions: Setter<DraftEvaluatorAddition[]>;
    setActiveStepKey: Setter<SetupStepKey>;
    applyForm: (campaign: FeedbackCampaign) => void;
    loadCampaignSnapshot: (campaignId: number, fallback?: FeedbackCampaign | null) => Promise<FeedbackCampaign | null>;
    refreshCampaigns: () => Promise<FeedbackCampaign[]>;
    onCampaignCreated: (campaign: FeedbackCampaign) => void;
    defaultForm: () => CampaignInfoForm;
};

export function useCampaignInfoActions({
                                           campaigns,
                                           selectedCampaign,
                                           form,
                                           setSelectedCampaignId,
                                           setForm,
                                           setErrors,
                                           setError,
                                           setSuccess,
                                           setSaving,
                                           setDeleting,
                                           setCampaignInfoOpen,
                                           setTargetsResponse,
                                           setSelectedTargetIds,
                                           setAssignmentPreview,
                                           setQuestionReview,
                                           setScoringConfig,
                                           setSelectedQuestionGroupKey,
                                           setActivationReadiness,
                                           setDraftRemovedEvaluatorKeys,
                                           setDraftManualAdditions,
                                           setActiveStepKey,
                                           applyForm,
                                           loadCampaignSnapshot,
                                           refreshCampaigns,
                                           onCampaignCreated,
                                           defaultForm,
                                       }: CampaignInfoActionsParams) {
    const resetSelectedDraft = () => {
        setSelectedCampaignId('');
        setForm(defaultForm());
        setTargetsResponse(emptyTargetsResponse(null));
        setSelectedTargetIds([]);
        setAssignmentPreview(emptyAssignmentPreview(null));
        setQuestionReview(emptyQuestionReview(null));
        setScoringConfig(emptyScoringConfig(null));
        setSelectedQuestionGroupKey('');
        setActivationReadiness(emptyActivationReadiness(null));
        setCampaignInfoOpen(false);
    };

    const handleSelectCampaign = async (value: string) => {
        setError('');
        setSuccess('');
        setErrors({});
        setDraftRemovedEvaluatorKeys(new Set());
        setDraftManualAdditions([]);
        if (!value) {
            resetSelectedDraft();
            return;
        }
        const id = Number(value);
        setSelectedCampaignId(id);
        const campaign = campaigns.find(item => item.id === id) ?? null;
        if (campaign) applyForm(campaign);
        setCampaignInfoOpen(false);
        await loadCampaignSnapshot(id, campaign);
    };

    const validate = () => {
        const nextErrors = validateCampaignInfoForm(form);
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        if (!validate()) return;
        setSaving(true);
        try {
            const saved = selectedCampaign
                ? await feedbackCampaignApi.updateCampaign(selectedCampaign.id, buildCampaignPayload(form))
                : await feedbackCampaignApi.createCampaign(buildCampaignPayload(form));
            setSelectedCampaignId(saved.id);
            setCampaignInfoOpen(false);
            setSuccess(selectedCampaign ? `Campaign "${saved.name}" draft updated.` : `Campaign "${saved.name}" saved as draft. Target selection is now available.`);
            onCampaignCreated(saved);
            setActiveStepKey('targets');
            await refreshCampaigns();
            applyForm(saved);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Campaign could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDraft = async () => {
        if (!selectedCampaign || selectedCampaign.status !== 'DRAFT') return;
        const confirmed = window.confirm(`Delete draft campaign "${selectedCampaign.name}"? This cannot be undone.`);
        if (!confirmed) return;
        setDeleting(true);
        setError('');
        setSuccess('');
        try {
            await feedbackCampaignApi.deleteDraftCampaign(selectedCampaign.id);
            setSuccess(`Draft campaign "${selectedCampaign.name}" deleted.`);
            resetSelectedDraft();
            await refreshCampaigns();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Draft campaign could not be deleted.');
        } finally {
            setDeleting(false);
        }
    };

    return {
        handleSelectCampaign,
        handleSave,
        handleDeleteDraft,
    };
}

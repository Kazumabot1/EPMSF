import type { Dispatch, SetStateAction } from 'react';
import { hrFeedbackApi } from '../../../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../../../api/feedbackCampaignApi';
import type {
    FeedbackCampaign,
    FeedbackAssignmentGenerationResponse,
    FeedbackCampaignActivationReadiness,
    FeedbackCampaignQuestionReview,
    FeedbackCampaignScoringConfig,
    FeedbackCampaignTargetsResponse,
    FeedbackDepartmentOption,
    FeedbackTargetCandidate,
    FeedbackTargetEmployee,
    FeedbackTeamOption,
} from '../../../../../types/feedbackCampaign';
import type { CampaignInfoForm, ReadinessFilter } from '../types/campaignSetupTypes';
import { normalizeList } from '../utils/campaignSetupCollections';
import {
    emptyActivationReadiness,
    emptyAssignmentPreview,
    emptyQuestionReview,
    emptyScoringConfig,
    emptyTargetsResponse,
} from '../utils/campaignSetupEmptyState';
import { campaignToForm } from '../utils/campaignSetupValidation';

type Setter<T> = Dispatch<SetStateAction<T>>;

type CampaignSetupLoaderParams = {
    targetSearch: string;
    currentDepartmentId: number | '';
    parentDepartmentId: number | '';
    teamId: number | '';
    readiness: ReadinessFilter;
    selectedCampaign: FeedbackCampaign | null;
    setCampaigns: Setter<FeedbackCampaign[]>;
    setLoadingCampaigns: Setter<boolean>;
    setSelectedCampaignId: Setter<number | ''>;
    setDepartments: Setter<FeedbackDepartmentOption[]>;
    setTeams: Setter<FeedbackTeamOption[]>;
    setEmployees: Setter<FeedbackTargetEmployee[]>;
    setCandidates: Setter<FeedbackTargetCandidate[]>;
    setLoadingCandidates: Setter<boolean>;
    setTargetsResponse: Setter<FeedbackCampaignTargetsResponse>;
    setSelectedTargetIds: Setter<number[]>;
    setLoadingTargets: Setter<boolean>;
    setQuestionReview: Setter<FeedbackCampaignQuestionReview>;
    setSelectedQuestionGroupKey: Setter<string>;
    setLoadingQuestionReview: Setter<boolean>;
    setScoringConfig: Setter<FeedbackCampaignScoringConfig>;
    setActivationReadiness: Setter<FeedbackCampaignActivationReadiness>;
    setLoadingActivation: Setter<boolean>;
    setAssignmentPreview: Setter<FeedbackAssignmentGenerationResponse>;
    setForm: Setter<CampaignInfoForm>;
    setError: Setter<string>;
    onCampaignCreated: (campaign: FeedbackCampaign) => void;
};

export function useCampaignSetupLoaders({
                                            targetSearch,
                                            currentDepartmentId,
                                            parentDepartmentId,
                                            teamId,
                                            readiness,
                                            selectedCampaign,
                                            setCampaigns,
                                            setLoadingCampaigns,
                                            setSelectedCampaignId,
                                            setDepartments,
                                            setTeams,
                                            setEmployees,
                                            setCandidates,
                                            setLoadingCandidates,
                                            setTargetsResponse,
                                            setSelectedTargetIds,
                                            setLoadingTargets,
                                            setQuestionReview,
                                            setSelectedQuestionGroupKey,
                                            setLoadingQuestionReview,
                                            setScoringConfig,
                                            setActivationReadiness,
                                            setLoadingActivation,
                                            setAssignmentPreview,
                                            setForm,
                                            setError,
                                            onCampaignCreated,
                                        }: CampaignSetupLoaderParams) {
    const applyForm = (campaign: FeedbackCampaign) => {
        setForm(campaignToForm(campaign));
    };

    const refreshCampaigns = async (): Promise<FeedbackCampaign[]> => {
        try {
            setLoadingCampaigns(true);
            const data = await hrFeedbackApi.getAllCampaigns();
            setCampaigns(data);
            setSelectedCampaignId(current => {
                if (current === '') return current;
                return data.some(campaign => campaign.id === current) ? current : '';
            });
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load campaigns.');
            return [];
        } finally {
            setLoadingCampaigns(false);
        }
    };

    const loadDirectoryFilters = async () => {
        try {
            const [departmentData, teamData, employeeData] = await Promise.all([
                feedbackCampaignApi.getDepartments(),
                feedbackCampaignApi.getTeams(),
                feedbackCampaignApi.getEmployees(),
            ]);
            setDepartments(departmentData);
            setTeams(teamData);
            setEmployees(employeeData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load setup data.');
        }
    };

    const loadCandidates = async () => {
        try {
            setLoadingCandidates(true);
            const data = await feedbackCampaignApi.getTargetCandidates({
                search: targetSearch,
                currentDepartmentId: currentDepartmentId === '' ? null : currentDepartmentId,
                parentDepartmentId: parentDepartmentId === '' ? null : parentDepartmentId,
                teamId: teamId === '' ? null : teamId,
                campaignId: selectedCampaign?.id ?? null,
                readiness,
            });
            setCandidates(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load target candidates.');
        } finally {
            setLoadingCandidates(false);
        }
    };

    const loadTargets = async (campaignId: number) => {
        try {
            setLoadingTargets(true);
            const data = await feedbackCampaignApi.getCampaignTargets(campaignId);
            setTargetsResponse(data);
            setSelectedTargetIds(normalizeList(data.targets.map(target => target.employeeId)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load selected targets.');
        } finally {
            setLoadingTargets(false);
        }
    };

    const loadQuestionReview = async (campaignId: number) => {
        try {
            setLoadingQuestionReview(true);
            const data = await feedbackCampaignApi.getQuestionReview(campaignId);
            setQuestionReview(data);
            setSelectedQuestionGroupKey(current => current && data.groups.some(group => group.groupKey === current) ? current : data.groups[0]?.groupKey ?? '');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load question snapshot.');
        } finally {
            setLoadingQuestionReview(false);
        }
    };

    const loadScoringConfig = async (campaignId: number) => {
        try {
            const data = await feedbackCampaignApi.getScoringConfig(campaignId);
            setScoringConfig(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load campaign scoring configuration.');
        }
    };

    const loadActivationState = async (campaignId: number) => {
        try {
            setLoadingActivation(true);
            const activationState = await feedbackCampaignApi.getActivationReadiness(campaignId);
            setActivationReadiness(activationState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load activation readiness.');
        } finally {
            setLoadingActivation(false);
        }
    };

    const loadCampaignSnapshot = async (campaignId: number, fallback?: FeedbackCampaign | null): Promise<FeedbackCampaign | null> => {
        try {
            const [latestCampaign, latestTargets] = await Promise.all([
                feedbackCampaignApi.getCampaign(campaignId).catch(() => fallback ?? null),
                feedbackCampaignApi.getCampaignTargets(campaignId).catch(() => null),
            ]);
            const nextCampaign = latestCampaign ?? fallback ?? null;
            if (nextCampaign) {
                setCampaigns(current => {
                    const exists = current.some(item => item.id === nextCampaign.id);
                    return exists
                        ? current.map(item => item.id === nextCampaign.id ? nextCampaign : item)
                        : [nextCampaign, ...current];
                });
                applyForm(nextCampaign);
                onCampaignCreated(nextCampaign);
            }
            if (latestTargets) {
                setTargetsResponse(latestTargets);
                setSelectedTargetIds(normalizeList(latestTargets.targets.map(target => target.employeeId)));
            } else if (nextCampaign) {
                setSelectedTargetIds(normalizeList(nextCampaign.targetEmployeeIds ?? []));
            }
            return nextCampaign;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh campaign workspace.');
            return fallback ?? null;
        }
    };

    const resetCampaignWorkspace = () => {
        setTargetsResponse(emptyTargetsResponse(null));
        setSelectedTargetIds([]);
        setAssignmentPreview(emptyAssignmentPreview(null));
        setQuestionReview(emptyQuestionReview(null));
        setScoringConfig(emptyScoringConfig(null));
        setSelectedQuestionGroupKey('');
        setActivationReadiness(emptyActivationReadiness(null));
    };

    return {
        applyForm,
        refreshCampaigns,
        loadDirectoryFilters,
        loadCandidates,
        loadTargets,
        loadQuestionReview,
        loadScoringConfig,
        loadActivationState,
        loadCampaignSnapshot,
        resetCampaignWorkspace,
    };
}

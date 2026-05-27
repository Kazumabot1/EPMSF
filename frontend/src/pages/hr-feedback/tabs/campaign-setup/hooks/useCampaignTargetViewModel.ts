import { useMemo } from 'react';
import type {
    FeedbackCampaignTargetsResponse,
    FeedbackTargetCandidate,
} from '../../../../../types/feedbackCampaign';
import { normalizeList, sameIds } from '../utils/campaignSetupCollections';

type UseCampaignTargetViewModelParams = {
    targetsResponse: FeedbackCampaignTargetsResponse;
    selectedTargetIds: number[];
    candidates: FeedbackTargetCandidate[];
    positionFilter: string;
};

export function useCampaignTargetViewModel({
                                               targetsResponse,
                                               selectedTargetIds,
                                               candidates,
                                               positionFilter,
                                           }: UseCampaignTargetViewModelParams) {
    const savedTargetIds = useMemo(
        () => normalizeList(targetsResponse.targets.map(target => target.employeeId)),
        [targetsResponse.targets],
    );

    const targetIdsNormalized = useMemo(() => normalizeList(selectedTargetIds), [selectedTargetIds]);
    const hasUnsavedTargetChanges = !sameIds(savedTargetIds, targetIdsNormalized);

    const candidateById = useMemo(() => new Map(candidates.map(candidate => [candidate.employeeId, candidate])), [candidates]);
    const savedTargetById = useMemo(() => new Map(targetsResponse.targets.map(target => [target.employeeId, target])), [targetsResponse.targets]);

    const selectedTargets = useMemo(() => targetIdsNormalized.map((employeeId) => (
        candidateById.get(employeeId) ?? savedTargetById.get(employeeId)
    )).filter((item): item is FeedbackTargetCandidate => Boolean(item)), [candidateById, savedTargetById, targetIdsNormalized]);

    const positionOptions = useMemo(() => Array.from(new Set(candidates.map(candidate => candidate.positionName).filter((value): value is string => Boolean(value)))).sort(), [candidates]);
    const candidateRows = useMemo(() => candidates
        .filter(candidate => !positionFilter || candidate.positionName === positionFilter)
        .slice(0, 80), [candidates, positionFilter]);

    const availableCandidateCount = useMemo(() => candidates.filter(candidate => candidate.eligible && candidate.warnings.length === 0).length, [candidates]);
    const reviewCandidateCount = useMemo(() => candidates.filter(candidate => candidate.eligible && candidate.warnings.length > 0).length, [candidates]);
    const selectedReadyCount = useMemo(() => selectedTargets.filter(target => target.eligible && target.warnings.length === 0).length, [selectedTargets]);
    const selectedReviewCount = useMemo(() => selectedTargets.filter(target => target.eligible && target.warnings.length > 0).length, [selectedTargets]);
    const selectedUnavailableCount = useMemo(() => selectedTargets.filter(target => !target.eligible).length, [selectedTargets]);
    const hasUnavailableSelection = selectedUnavailableCount > 0;
    const selectedDepartmentCount = useMemo(() => new Set(selectedTargets.map(target => target.currentDepartmentName).filter(Boolean)).size, [selectedTargets]);
    const selectedDepartmentSummary = useMemo(() => {
        const counts = selectedTargets.reduce<Record<string, number>>((acc, target) => {
            const key = target.currentDepartmentName || 'Department not set';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).sort(([, leftCount], [, rightCount]) => rightCount - leftCount).slice(0, 5);
    }, [selectedTargets]);

    return {
        savedTargetIds,
        targetIdsNormalized,
        hasUnsavedTargetChanges,
        selectedTargets,
        positionOptions,
        candidateRows,
        availableCandidateCount,
        reviewCandidateCount,
        selectedReadyCount,
        selectedReviewCount,
        selectedUnavailableCount,
        hasUnavailableSelection,
        selectedDepartmentCount,
        selectedDepartmentSummary,
    };
}

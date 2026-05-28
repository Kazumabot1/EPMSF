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
    levelFilter: string;
};

const sortLevelCodes = (left: string, right: string) => {
    const leftRank = Number.parseInt(left.replace(/\D+/g, ''), 10);
    const rightRank = Number.parseInt(right.replace(/\D+/g, ''), 10);
    if (Number.isFinite(leftRank) && Number.isFinite(rightRank) && leftRank !== rightRank) {
        return leftRank - rightRank;
    }
    return left.localeCompare(right);
};

export function useCampaignTargetViewModel({
                                               targetsResponse,
                                               selectedTargetIds,
                                               candidates,
                                               positionFilter,
                                               levelFilter,
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

    const positionOptions = useMemo(() => Array.from(new Set(candidates
        .filter(candidate => !levelFilter || candidate.levelCode === levelFilter)
        .map(candidate => candidate.positionName)
        .filter((value): value is string => Boolean(value))))
        .sort(), [candidates, levelFilter]);

    const levelOptions = useMemo(() => Array.from(new Set(candidates
        .filter(candidate => !positionFilter || candidate.positionName === positionFilter)
        .map(candidate => candidate.levelCode)
        .filter((value): value is string => Boolean(value))))
        .sort(sortLevelCodes), [candidates, positionFilter]);

    const filteredCandidates = useMemo(() => candidates.filter(candidate => (
        (!positionFilter || candidate.positionName === positionFilter)
        && (!levelFilter || candidate.levelCode === levelFilter)
    )), [candidates, levelFilter, positionFilter]);

    const candidateRows = useMemo(() => filteredCandidates.slice(0, 120), [filteredCandidates]);
    const filteredSelectableCandidateIds = useMemo(
        () => normalizeList(filteredCandidates.filter(candidate => candidate.eligible).map(candidate => candidate.employeeId)),
        [filteredCandidates],
    );

    const availableCandidateCount = useMemo(() => filteredCandidates.filter(candidate => candidate.eligible && candidate.warnings.length === 0).length, [filteredCandidates]);
    const reviewCandidateCount = useMemo(() => filteredCandidates.filter(candidate => candidate.eligible && candidate.warnings.length > 0).length, [filteredCandidates]);
    const blockedCandidateCount = useMemo(() => filteredCandidates.filter(candidate => !candidate.eligible).length, [filteredCandidates]);
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
        levelOptions,
        filteredCandidates,
        candidateRows,
        filteredSelectableCandidateIds,
        filteredCandidateCount: filteredCandidates.length,
        availableCandidateCount,
        reviewCandidateCount,
        blockedCandidateCount,
        selectedReadyCount,
        selectedReviewCount,
        selectedUnavailableCount,
        hasUnavailableSelection,
        selectedDepartmentCount,
        selectedDepartmentSummary,
    };
}

import { useEffect, useMemo, useState } from 'react';
import { feedbackCampaignApi } from '../../../../../api/feedbackCampaignApi';
import type {
    FeedbackAssignmentDetailItem,
    FeedbackAssignmentGenerationResponse,
    FeedbackRelationshipCandidateResponse,
    FeedbackRelationshipType,
    FeedbackTargetCandidate,
    FeedbackTargetEmployee,
    ManualAssignmentInput,
} from '../../../../../types/feedbackCampaign';
import type { DraftEvaluatorAddition } from '../types/campaignSetupTypes';
import { assignmentKey } from '../utils/campaignSetupFormatters';
import { manualEvaluatorEligibilityMessage, type ManualEvaluatorCandidate } from '../utils/manualEvaluatorValidation';

const EMPTY_ASSIGNMENT_DETAILS: FeedbackAssignmentDetailItem[] = [];

const defaultManualForm: ManualAssignmentInput = {
    targetEmployeeId: 0,
    evaluatorEmployeeId: 0,
    relationshipType: 'PEER',
    reason: '',
};

type UseCampaignEvaluatorViewModelParams = {
    selectedCampaignId?: number | null;
    assignmentPreview: FeedbackAssignmentGenerationResponse;
    employees: FeedbackTargetEmployee[];
    candidates: FeedbackTargetCandidate[];
    selectedTargets: FeedbackTargetCandidate[];
    savedTargets: FeedbackTargetCandidate[];
    savedTargetIds: number[];
    draftManualAdditions: DraftEvaluatorAddition[];
    draftRemovedEvaluatorKeys: Set<string>;
    evaluatorSearch: string;
};

const relationshipOrder: FeedbackRelationshipType[] = ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'];

const formatDepartmentPosition = (employee: ManualEvaluatorCandidate) => [
    employee.currentDepartment ?? 'Department not set',
    employee.positionTitle ?? employee.positionName,
].filter(Boolean).join(' · ');

const searchableCandidateValues = (employee: ManualEvaluatorCandidate) => [
    employee.fullName,
    employee.employeeName ?? '',
    employee.employeeCode ?? '',
    employee.email ?? '',
    employee.currentDepartment ?? '',
    employee.positionTitle ?? '',
    employee.positionName ?? '',
    employee.positionLevelCode ?? '',
    employee.levelCode ?? '',
    employee.sourceLabel ?? '',
    String(employee.id),
];

const toManualCandidate = (
    candidate: FeedbackRelationshipCandidateResponse,
    enrichedEmployeeMap: Map<number, ManualEvaluatorCandidate>,
): ManualEvaluatorCandidate => {
    const existing = enrichedEmployeeMap.get(candidate.employeeId);
    return {
        ...(existing ?? {
            id: candidate.employeeId,
            fullName: candidate.employeeName?.trim() || `Employee #${candidate.employeeId}`,
            currentDepartmentId: candidate.currentDepartmentId ?? null,
            currentDepartment: candidate.currentDepartmentName ?? null,
            positionTitle: candidate.positionName ?? null,
            positionLevelCode: candidate.levelCode ?? null,
            userId: candidate.userId ?? null,
        }),
        id: candidate.employeeId,
        userId: candidate.userId ?? existing?.userId ?? null,
        fullName: candidate.employeeName?.trim() || existing?.fullName || `Employee #${candidate.employeeId}`,
        currentDepartmentId: candidate.currentDepartmentId ?? existing?.currentDepartmentId ?? null,
        currentDepartment: candidate.currentDepartmentName ?? existing?.currentDepartment ?? null,
        positionTitle: candidate.positionName ?? existing?.positionTitle ?? null,
        positionLevelCode: candidate.levelCode ?? existing?.positionLevelCode ?? null,
        employeeName: candidate.employeeName ?? existing?.employeeName ?? existing?.fullName ?? null,
        levelCode: candidate.levelCode ?? existing?.levelCode ?? existing?.positionLevelCode ?? null,
        positionName: candidate.positionName ?? existing?.positionName ?? existing?.positionTitle ?? null,
        employeeCode: candidate.employeeCode ?? existing?.employeeCode ?? null,
        email: candidate.email ?? existing?.email ?? null,
        sourceLabel: candidate.sourceLabel ?? existing?.sourceLabel ?? null,
        relationshipType: candidate.relationshipType,
    };
};

export function useCampaignEvaluatorViewModel({
                                                  selectedCampaignId,
                                                  assignmentPreview,
                                                  employees,
                                                  candidates,
                                                  selectedTargets,
                                                  savedTargets,
                                                  savedTargetIds,
                                                  draftManualAdditions,
                                                  draftRemovedEvaluatorKeys,
                                                  evaluatorSearch,
                                              }: UseCampaignEvaluatorViewModelParams) {
    const [selectedEvaluatorTargetId, setSelectedEvaluatorTargetId] = useState<number>(0);
    const [manualForm, setManualForm] = useState<ManualAssignmentInput>(defaultManualForm);
    const [relationshipCandidates, setRelationshipCandidates] = useState<FeedbackRelationshipCandidateResponse[]>([]);
    const [relationshipCandidatesLoading, setRelationshipCandidatesLoading] = useState(false);
    const [relationshipCandidatesError, setRelationshipCandidatesError] = useState<string | null>(null);

    const assignmentDetails = assignmentPreview.assignmentDetails ?? EMPTY_ASSIGNMENT_DETAILS;
    const employeeMap = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees]);
    const previewItemByTarget = useMemo(() => new Map(assignmentPreview.requests.map(item => [item.targetEmployeeId, item])), [assignmentPreview.requests]);

    const targetHintByEmployeeId = useMemo(() => {
        const map = new Map<number, FeedbackTargetCandidate>();
        for (const target of candidates) map.set(target.employeeId, target);
        for (const target of savedTargets) map.set(target.employeeId, target);
        for (const target of selectedTargets) map.set(target.employeeId, target);
        return map;
    }, [candidates, savedTargets, selectedTargets]);

    const enrichedEmployeeMap = useMemo(() => {
        const map = new Map<number, ManualEvaluatorCandidate>();
        for (const employee of employees) {
            const hint = targetHintByEmployeeId.get(employee.id);
            map.set(employee.id, {
                ...employee,
                currentDepartmentId: employee.currentDepartmentId ?? hint?.currentDepartmentId ?? null,
                currentDepartment: employee.currentDepartment ?? hint?.currentDepartmentName ?? null,
                positionTitle: employee.positionTitle ?? hint?.positionName ?? null,
                positionLevelCode: employee.positionLevelCode ?? hint?.levelCode ?? null,
                employeeName: hint?.employeeName ?? employee.fullName,
                levelCode: hint?.levelCode ?? employee.positionLevelCode ?? null,
                positionName: hint?.positionName ?? employee.positionTitle ?? null,
            });
        }
        return map;
    }, [employees, targetHintByEmployeeId]);

    const draftAdditionDetails = useMemo<FeedbackAssignmentDetailItem[]>(() => draftManualAdditions
        .filter(item => !draftRemovedEvaluatorKeys.has(`${item.targetEmployeeId}:${item.evaluatorEmployeeId}:${item.relationshipType}`))
        .map(item => {
            const evaluator = enrichedEmployeeMap.get(item.evaluatorEmployeeId);
            const target = selectedTargets.find(targetItem => targetItem.employeeId === item.targetEmployeeId)
                ?? savedTargets.find(targetItem => targetItem.employeeId === item.targetEmployeeId);
            return {
                assignmentId: null,
                requestId: 0,
                targetEmployeeId: item.targetEmployeeId,
                targetEmployeeName: target?.employeeName ?? `Employee #${item.targetEmployeeId}`,
                evaluatorEmployeeId: item.evaluatorEmployeeId,
                evaluatorEmployeeName: evaluator?.fullName ?? `Employee #${item.evaluatorEmployeeId}`,
                evaluatorEmployeeCode: null,
                evaluatorEmployeeEmail: null,
                evaluatorDepartmentId: evaluator?.currentDepartmentId ?? null,
                evaluatorPositionId: null,
                evaluatorPositionName: evaluator?.positionTitle ?? evaluator?.positionName ?? null,
                manualReason: item.reason ?? null,
                selectionReason: item.reason ?? null,
                confidence: 'HR_CONFIRMED',
                warnings: [],
                relationshipType: item.relationshipType,
                selectionMethod: 'MANUAL',
                status: 'PENDING',
                anonymous: Boolean(item.anonymous),
            };
        }), [draftManualAdditions, draftRemovedEvaluatorKeys, enrichedEmployeeMap, savedTargets, selectedTargets]);

    const displayedAssignmentDetails = useMemo(() => [
        ...assignmentDetails.filter(item => !draftRemovedEvaluatorKeys.has(assignmentKey(item))),
        ...draftAdditionDetails,
    ], [assignmentDetails, draftAdditionDetails, draftRemovedEvaluatorKeys]);

    const hasDraftEvaluatorChanges = draftRemovedEvaluatorKeys.size > 0 || draftManualAdditions.length > 0;

    const assignmentsByTarget = useMemo(() => {
        const grouped = new Map<number, FeedbackAssignmentDetailItem[]>();
        for (const assignment of displayedAssignmentDetails) {
            const current = grouped.get(assignment.targetEmployeeId) ?? [];
            current.push(assignment);
            grouped.set(assignment.targetEmployeeId, current);
        }
        for (const value of grouped.values()) {
            value.sort((left, right) => {
                const typeOrder = relationshipOrder.indexOf(left.relationshipType) - relationshipOrder.indexOf(right.relationshipType);
                if (typeOrder !== 0) return typeOrder;
                return (left.evaluatorEmployeeName ?? '').localeCompare(right.evaluatorEmployeeName ?? '');
            });
        }
        return grouped;
    }, [displayedAssignmentDetails]);

    const evaluatorTargets = useMemo(() => {
        const targetMap = new Map<number, FeedbackTargetCandidate>();
        for (const target of savedTargets) targetMap.set(target.employeeId, target);
        for (const target of selectedTargets) targetMap.set(target.employeeId, target);
        return savedTargetIds.map(id => targetMap.get(id)).filter((item): item is FeedbackTargetCandidate => Boolean(item));
    }, [savedTargetIds, savedTargets, selectedTargets]);

    const activeEvaluatorTargetId = selectedEvaluatorTargetId || evaluatorTargets[0]?.employeeId || 0;
    const activeEvaluatorTarget = evaluatorTargets.find(target => target.employeeId === activeEvaluatorTargetId) ?? null;
    const activeEvaluatorAssignments = assignmentsByTarget.get(activeEvaluatorTargetId) ?? EMPTY_ASSIGNMENT_DETAILS;
    const activePreviewItem = previewItemByTarget.get(activeEvaluatorTargetId) ?? null;

    const assignedEvaluatorIdsForActiveTarget = useMemo(
        () => new Set(activeEvaluatorAssignments.map(item => item.evaluatorEmployeeId)),
        [activeEvaluatorAssignments],
    );

    useEffect(() => {
        const campaignId = Number(selectedCampaignId ?? 0);
        if (!campaignId || !activeEvaluatorTargetId || !manualForm.relationshipType) {
            setRelationshipCandidates([]);
            setRelationshipCandidatesError(null);
            setRelationshipCandidatesLoading(false);
            return;
        }

        let cancelled = false;
        setRelationshipCandidatesLoading(true);
        setRelationshipCandidatesError(null);

        feedbackCampaignApi.getRelationshipCandidates(campaignId, activeEvaluatorTargetId, manualForm.relationshipType)
            .then(items => {
                if (cancelled) return;
                setRelationshipCandidates(items);
            })
            .catch(error => {
                if (cancelled) return;
                setRelationshipCandidates([]);
                setRelationshipCandidatesError(error instanceof Error ? error.message : 'Eligible reviewers could not be loaded.');
            })
            .finally(() => {
                if (!cancelled) setRelationshipCandidatesLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [activeEvaluatorTargetId, manualForm.relationshipType, selectedCampaignId]);

    const allowedCandidateIds = useMemo(
        () => new Set(relationshipCandidates.map(candidate => candidate.employeeId)),
        [relationshipCandidates],
    );

    const manualRelationshipCandidateSource = useMemo(() => {
        if (!activeEvaluatorTargetId || !activeEvaluatorTarget) return [] as ManualEvaluatorCandidate[];
        const query = evaluatorSearch.trim().toLowerCase();

        const withEligibility = relationshipCandidates
            .map(candidate => toManualCandidate(candidate, enrichedEmployeeMap))
            .map(employee => ({
                ...employee,
                eligibilityMessage: manualEvaluatorEligibilityMessage(
                    employee,
                    activeEvaluatorTarget,
                    manualForm.relationshipType,
                    assignedEvaluatorIdsForActiveTarget,
                    allowedCandidateIds,
                ),
            }))
            .filter(employee => !employee.eligibilityMessage);

        const searched = query
            ? withEligibility.filter(employee => searchableCandidateValues(employee)
                .some(value => value.toLowerCase().includes(query)))
            : withEligibility;

        return searched
            .sort((left, right) => {
                const departmentCompare = String(left.currentDepartment ?? '').localeCompare(String(right.currentDepartment ?? ''));
                if (departmentCompare !== 0) return departmentCompare;
                return left.fullName.localeCompare(right.fullName);
            })
            .slice(0, 20);
    }, [activeEvaluatorTarget, activeEvaluatorTargetId, allowedCandidateIds, assignedEvaluatorIdsForActiveTarget, enrichedEmployeeMap, evaluatorSearch, manualForm.relationshipType, relationshipCandidates]);

    const manualCandidateNotice = useMemo(() => {
        if (!activeEvaluatorTarget) return 'Select a recipient before adding an evaluator.';
        if (relationshipCandidatesLoading) return 'Loading eligible reviewers...';
        if (relationshipCandidatesError) return relationshipCandidatesError;
        if (manualForm.relationshipType === 'MANAGER') {
            return 'Manager reviewers are selected from eligible reviewers for this recipient.';
        }
        if (manualForm.relationshipType === 'SUBORDINATE') {
            return 'Subordinate reviewers are selected from eligible reviewers for this recipient.';
        }
        if (manualForm.relationshipType === 'SELF') {
            return 'Self review uses the selected recipient as evaluator.';
        }
        return 'Peer reviewers are selected from eligible reviewers for this recipient.';
    }, [activeEvaluatorTarget, manualForm.relationshipType, relationshipCandidatesError, relationshipCandidatesLoading]);

    const evaluatorCandidates = manualRelationshipCandidateSource;

    const selectedManualEvaluator = useMemo(() => {
        if (!manualForm.evaluatorEmployeeId) return null;
        const selectedBackendCandidate = relationshipCandidates.find(candidate => candidate.employeeId === manualForm.evaluatorEmployeeId);
        if (selectedBackendCandidate) return toManualCandidate(selectedBackendCandidate, enrichedEmployeeMap);
        return enrichedEmployeeMap.get(manualForm.evaluatorEmployeeId) ?? null;
    }, [enrichedEmployeeMap, manualForm.evaluatorEmployeeId, relationshipCandidates]);

    const manualEvaluatorEligibilityError = useMemo(
        () => manualForm.evaluatorEmployeeId
            ? manualEvaluatorEligibilityMessage(
                selectedManualEvaluator,
                activeEvaluatorTarget,
                manualForm.relationshipType,
                assignedEvaluatorIdsForActiveTarget,
                allowedCandidateIds,
            )
            : '',
        [activeEvaluatorTarget, allowedCandidateIds, assignedEvaluatorIdsForActiveTarget, manualForm.evaluatorEmployeeId, manualForm.relationshipType, selectedManualEvaluator],
    );

    const activeAssignmentsByRelationship = useMemo(() => {
        const grouped = new Map<FeedbackRelationshipType, FeedbackAssignmentDetailItem[]>();
        for (const assignment of activeEvaluatorAssignments) {
            const current = grouped.get(assignment.relationshipType) ?? [];
            current.push(assignment);
            grouped.set(assignment.relationshipType, current);
        }
        return grouped;
    }, [activeEvaluatorAssignments]);

    const activeTargetSummary = useMemo(() => {
        if (!activeEvaluatorTarget) return '';
        return `${activeEvaluatorTarget.employeeName} · ${activeEvaluatorTarget.positionName ?? 'Position not set'} · ${activeEvaluatorTarget.currentDepartmentName ?? 'Department not set'}`;
    }, [activeEvaluatorTarget]);

    useEffect(() => {
        const firstTargetId = evaluatorTargets[0]?.employeeId ?? 0;
        if (!firstTargetId) {
            setSelectedEvaluatorTargetId(current => (current === 0 ? current : 0));
            setManualForm(current => {
                if (current.targetEmployeeId === 0 && current.evaluatorEmployeeId === 0) {
                    return current;
                }
                return { ...current, targetEmployeeId: 0, evaluatorEmployeeId: 0 };
            });
            return;
        }
        if (!selectedEvaluatorTargetId || !evaluatorTargets.some(target => target.employeeId === selectedEvaluatorTargetId)) {
            setSelectedEvaluatorTargetId(firstTargetId);
        }
    }, [evaluatorTargets, selectedEvaluatorTargetId]);

    useEffect(() => {
        setManualForm(current => {
            const nextEvaluatorEmployeeId = assignedEvaluatorIdsForActiveTarget.has(current.evaluatorEmployeeId)
                ? 0
                : current.evaluatorEmployeeId;
            if (current.targetEmployeeId === activeEvaluatorTargetId
                && current.evaluatorEmployeeId === nextEvaluatorEmployeeId) {
                return current;
            }
            return {
                ...current,
                targetEmployeeId: activeEvaluatorTargetId,
                evaluatorEmployeeId: nextEvaluatorEmployeeId,
            };
        });
    }, [activeEvaluatorTargetId, assignedEvaluatorIdsForActiveTarget]);

    useEffect(() => {
        if (relationshipCandidatesLoading || !manualForm.evaluatorEmployeeId) return;
        if (!allowedCandidateIds.has(manualForm.evaluatorEmployeeId)) {
            setManualForm(current => ({ ...current, evaluatorEmployeeId: 0 }));
        }
    }, [allowedCandidateIds, manualForm.evaluatorEmployeeId, relationshipCandidatesLoading]);

    return {
        assignmentDetails,
        employeeMap,
        previewItemByTarget,
        draftAdditionDetails,
        displayedAssignmentDetails,
        hasDraftEvaluatorChanges,
        assignmentsByTarget,
        evaluatorTargets,
        selectedEvaluatorTargetId,
        setSelectedEvaluatorTargetId,
        activeEvaluatorTargetId,
        activeEvaluatorTarget,
        activeEvaluatorAssignments,
        activePreviewItem,
        assignedEvaluatorIdsForActiveTarget,
        evaluatorCandidates,
        relationshipCandidatesLoading,
        relationshipCandidatesError,
        manualCandidateNotice,
        selectedManualEvaluator,
        manualEvaluatorEligibilityError,
        activeAssignmentsByRelationship,
        activeTargetSummary,
        manualForm,
        setManualForm,
        formatDepartmentPosition,
    };
}

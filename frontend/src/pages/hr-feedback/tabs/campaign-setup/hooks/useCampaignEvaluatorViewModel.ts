import { useEffect, useMemo, useState } from 'react';
import type {
    FeedbackAssignmentDetailItem,
    FeedbackAssignmentGenerationResponse,
    FeedbackRelationshipType,
    FeedbackTargetCandidate,
    FeedbackTargetEmployee,
    ManualAssignmentInput,
} from '../../../../../types/feedbackCampaign';
import type { DraftEvaluatorAddition } from '../types/campaignSetupTypes';
import { assignmentKey } from '../utils/campaignSetupFormatters';
import { manualEvaluatorEligibilityMessage } from '../utils/manualEvaluatorValidation';

const EMPTY_ASSIGNMENT_DETAILS: FeedbackAssignmentDetailItem[] = [];

const defaultManualForm: ManualAssignmentInput = {
    targetEmployeeId: 0,
    evaluatorEmployeeId: 0,
    relationshipType: 'PEER',
    reason: '',
};

type UseCampaignEvaluatorViewModelParams = {
    assignmentPreview: FeedbackAssignmentGenerationResponse;
    employees: FeedbackTargetEmployee[];
    selectedTargets: FeedbackTargetCandidate[];
    savedTargets: FeedbackTargetCandidate[];
    savedTargetIds: number[];
    draftManualAdditions: DraftEvaluatorAddition[];
    draftRemovedEvaluatorKeys: Set<string>;
    evaluatorSearch: string;
};

export function useCampaignEvaluatorViewModel({
                                                  assignmentPreview,
                                                  employees,
                                                  selectedTargets,
                                                  savedTargets,
                                                  savedTargetIds,
                                                  draftManualAdditions,
                                                  draftRemovedEvaluatorKeys,
                                                  evaluatorSearch,
                                              }: UseCampaignEvaluatorViewModelParams) {
    const [selectedEvaluatorTargetId, setSelectedEvaluatorTargetId] = useState<number>(0);
    const [manualForm, setManualForm] = useState<ManualAssignmentInput>(defaultManualForm);

    const assignmentDetails = assignmentPreview.assignmentDetails ?? EMPTY_ASSIGNMENT_DETAILS;
    const employeeMap = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees]);
    const previewItemByTarget = useMemo(() => new Map(assignmentPreview.requests.map(item => [item.targetEmployeeId, item])), [assignmentPreview.requests]);

    const draftAdditionDetails = useMemo<FeedbackAssignmentDetailItem[]>(() => draftManualAdditions
        .filter(item => !draftRemovedEvaluatorKeys.has(`${item.targetEmployeeId}:${item.evaluatorEmployeeId}:${item.relationshipType}`))
        .map(item => {
            const evaluator = employeeMap.get(item.evaluatorEmployeeId);
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
                evaluatorPositionName: null,
                manualReason: item.reason ?? null,
                selectionReason: item.reason ?? null,
                confidence: 'HR_CONFIRMED',
                warnings: [],
                relationshipType: item.relationshipType,
                selectionMethod: 'MANUAL',
                status: 'PENDING',
                anonymous: Boolean(item.anonymous),
            };
        }), [draftManualAdditions, draftRemovedEvaluatorKeys, employeeMap, savedTargets, selectedTargets]);

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
                const relationshipOrder = ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'];
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

    const evaluatorCandidates = useMemo(() => {
        const query = evaluatorSearch.trim().toLowerCase();
        return employees
            .filter(employee => {
                if (!activeEvaluatorTargetId) return false;
                if (employee.id === activeEvaluatorTargetId) return false;
                if (!query) return true;
                return [
                    employee.fullName,
                    employee.currentDepartment ?? '',
                    employee.positionTitle ?? '',
                    employee.positionLevelCode ?? '',
                    String(employee.id),
                ].some(value => value.toLowerCase().includes(query));
            })
            .map(employee => ({
                ...employee,
                eligibilityMessage: manualEvaluatorEligibilityMessage(
                    employee,
                    activeEvaluatorTarget,
                    manualForm.relationshipType,
                    assignedEvaluatorIdsForActiveTarget,
                ),
            }))
            .sort((left, right) => Number(Boolean(left.eligibilityMessage)) - Number(Boolean(right.eligibilityMessage)))
            .slice(0, 12);
    }, [activeEvaluatorTarget, activeEvaluatorTargetId, assignedEvaluatorIdsForActiveTarget, employees, evaluatorSearch, manualForm.relationshipType]);

    const selectedManualEvaluator = useMemo(
        () => employeeMap.get(manualForm.evaluatorEmployeeId) ?? null,
        [employeeMap, manualForm.evaluatorEmployeeId],
    );

    const manualEvaluatorEligibilityError = useMemo(
        () => manualForm.evaluatorEmployeeId
            ? manualEvaluatorEligibilityMessage(
                selectedManualEvaluator,
                activeEvaluatorTarget,
                manualForm.relationshipType,
                assignedEvaluatorIdsForActiveTarget,
            )
            : '',
        [activeEvaluatorTarget, assignedEvaluatorIdsForActiveTarget, manualForm.evaluatorEmployeeId, manualForm.relationshipType, selectedManualEvaluator],
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
        selectedManualEvaluator,
        manualEvaluatorEligibilityError,
        activeAssignmentsByRelationship,
        manualForm,
        setManualForm,
    };
}

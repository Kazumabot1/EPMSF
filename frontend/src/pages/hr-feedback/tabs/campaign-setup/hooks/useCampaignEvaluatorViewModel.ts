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
import { manualEvaluatorEligibilityMessage, type ManualEvaluatorCandidate } from '../utils/manualEvaluatorValidation';

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

export function useCampaignEvaluatorViewModel({
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
                managerEmployeeId: hint?.managerEmployeeId ?? null,
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

    const manualRelationshipCandidateSource = useMemo(() => {
        if (!activeEvaluatorTargetId || !activeEvaluatorTarget) return [] as ManualEvaluatorCandidate[];
        const query = evaluatorSearch.trim().toLowerCase();
        const all = Array.from(enrichedEmployeeMap.values()).filter(employee => employee.id !== activeEvaluatorTargetId);

        const relationshipType = manualForm.relationshipType;
        let source = all;
        if (relationshipType === 'MANAGER') {
            source = activeEvaluatorTarget.managerEmployeeId
                ? all.filter(employee => employee.id === activeEvaluatorTarget.managerEmployeeId)
                : [];
        } else if (relationshipType === 'SUBORDINATE') {
            source = all.filter(employee => Number(employee.managerEmployeeId ?? 0) === Number(activeEvaluatorTarget.employeeId));
        }

        const withEligibility = source
            .map(employee => ({
                ...employee,
                eligibilityMessage: manualEvaluatorEligibilityMessage(
                    employee,
                    activeEvaluatorTarget,
                    relationshipType,
                    assignedEvaluatorIdsForActiveTarget,
                ),
            }))
            .filter(employee => !employee.eligibilityMessage);

        const searched = query
            ? withEligibility.filter(employee => [
                employee.fullName,
                employee.currentDepartment ?? '',
                employee.positionTitle ?? '',
                employee.positionLevelCode ?? '',
                String(employee.id),
            ].some(value => value.toLowerCase().includes(query)))
            : withEligibility;

        return searched
            .sort((left, right) => {
                const departmentCompare = String(left.currentDepartment ?? '').localeCompare(String(right.currentDepartment ?? ''));
                if (departmentCompare !== 0) return departmentCompare;
                return left.fullName.localeCompare(right.fullName);
            })
            .slice(0, 20);
    }, [activeEvaluatorTarget, activeEvaluatorTargetId, assignedEvaluatorIdsForActiveTarget, enrichedEmployeeMap, evaluatorSearch, manualForm.relationshipType]);

    const manualCandidateNotice = useMemo(() => {
        if (!activeEvaluatorTarget) return 'Select a recipient before adding an evaluator.';
        if (manualForm.relationshipType === 'MANAGER') {
            return activeEvaluatorTarget.managerEmployeeId
                ? 'Only the recorded Reports To manager is available for Manager review.'
                : 'This recipient has no Reports To manager recorded.';
        }
        if (manualForm.relationshipType === 'SUBORDINATE') {
            return 'Only employees whose Reports To value points to this recipient are available.';
        }
        return 'Peer candidates are limited to the same department, same organization layer, and same or adjacent level.';
    }, [activeEvaluatorTarget, manualForm.relationshipType]);

    const evaluatorCandidates = manualRelationshipCandidateSource;

    const selectedManualEvaluator = useMemo(
        () => enrichedEmployeeMap.get(manualForm.evaluatorEmployeeId) ?? null,
        [enrichedEmployeeMap, manualForm.evaluatorEmployeeId],
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

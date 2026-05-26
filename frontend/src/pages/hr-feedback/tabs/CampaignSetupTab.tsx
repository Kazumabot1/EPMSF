import { useEffect, useMemo, useState } from 'react';
import { authStorage } from '../../../services/authStorage';
import { LaunchReadinessSection } from './campaign-setup/components/LaunchReadinessSection';
import { CampaignStat } from './campaign-setup/components/CampaignStat';
import { CampaignInfoStep } from './campaign-setup/components/CampaignInfoStep';
import { TargetEmployeesStep } from './campaign-setup/components/TargetEmployeesStep';
import { EvaluatorAssignmentsStep } from './campaign-setup/components/EvaluatorAssignmentsStep';
import { QuestionReviewStep } from './campaign-setup/components/QuestionReviewStep';
import { useQuestionReviewExpansion } from './campaign-setup/hooks/useQuestionReviewExpansion';
import { useCampaignSetupLoaders } from './campaign-setup/hooks/useCampaignSetupLoaders';
import { useCampaignInfoActions } from './campaign-setup/hooks/useCampaignInfoActions';
import { useCampaignTargetActions } from './campaign-setup/hooks/useCampaignTargetActions';
import { useCampaignEvaluatorActions } from './campaign-setup/hooks/useCampaignEvaluatorActions';
import { useCampaignQuestionReviewActions } from './campaign-setup/hooks/useCampaignQuestionReviewActions';
import { useCampaignLifecycleActions } from './campaign-setup/hooks/useCampaignLifecycleActions';
import { useCampaignSetupSteps } from './campaign-setup/hooks/useCampaignSetupSteps';
import {
  DEFAULT_EVALUATOR_CONFIG,
  getPeerReviewerCount,
  normalizeEvaluatorConfig,
} from '../../../types/feedbackCampaign';
import type {
  FeedbackCampaign,
  FeedbackAssignmentGenerationResponse,
  EvaluatorConfigInput,
  FeedbackCampaignTargetsResponse,
  FeedbackDepartmentOption,
  FeedbackTargetCandidate,
  FeedbackTeamOption,
  FeedbackCampaignQuestionReview,
  FeedbackCampaignActivationReadiness,
  FeedbackCampaignScoringConfig,
  FeedbackRelationshipType,
  FeedbackAssignmentDetailItem,
  FeedbackTargetEmployee,
  ManualAssignmentInput,
} from '../../../types/feedbackCampaign';
import type {
  CampaignInfoForm,
  DraftEvaluatorAddition,
  FieldErrors,
  ReadinessFilter,
  SetupStepKey,
} from './campaign-setup/types/campaignSetupTypes';
import {
  DESCRIPTION_LIMIT,
  INSTRUCTIONS_LIMIT,
  INSTRUCTION_TEMPLATE,
  TIME_OPTIONS,
  defaultForm,
  relationshipOptions,
  RELATIONSHIP_ORDER,
  statusDescriptions,
  statusLabels,
} from './campaign-setup/utils/campaignSetupConstants';
import {
  assignmentKey,
  assignmentReadinessClass,
  assignmentSourceLabel,
  assignmentStatusLabel,
  completionLabel,
  formatTimeLabel,
  formatWindow,
  initials,
  personSubtitle,
  readinessClass,
  readinessLabel,
  recipientDetailItems,
  relationshipIcon,
  relationshipLabel,
  statusClass,
} from './campaign-setup/utils/campaignSetupFormatters';
import {
  formatPercent,
  normalizeList,
  roundPercent,
  sameIds,
} from './campaign-setup/utils/campaignSetupCollections';
import {
  emptyActivationReadiness,
  emptyAssignmentPreview,
  emptyQuestionReview,
  emptyScoringConfig,
  emptyTargetsResponse,
} from './campaign-setup/utils/campaignSetupEmptyState';
import { cleanEvaluatorNote, getLaunchBannerCopy } from './campaign-setup/utils/campaignSetupMessages';
import {
  buildQuestionCompetencies,
  writeQuestionDragData,
} from './campaign-setup/utils/campaignSetupQuestionUtils';

interface Props {
  onCampaignCreated: (campaign: FeedbackCampaign) => void;
}

const EMPTY_ASSIGNMENT_DETAILS: FeedbackAssignmentDetailItem[] = [];

export default function CampaignSetupTab({ onCampaignCreated }: Props) {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | ''>('');
  const [form, setForm] = useState<CampaignInfoForm>(defaultForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [departments, setDepartments] = useState<FeedbackDepartmentOption[]>([]);
  const [, setTeams] = useState<FeedbackTeamOption[]>([]);
  const [employees, setEmployees] = useState<FeedbackTargetEmployee[]>([]);
  const [candidates, setCandidates] = useState<FeedbackTargetCandidate[]>([]);
  const [targetsResponse, setTargetsResponse] = useState<FeedbackCampaignTargetsResponse>(emptyTargetsResponse(null));
  const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [currentDepartmentId, setCurrentDepartmentId] = useState<number | ''>('');
  const [parentDepartmentId] = useState<number | ''>('');
  const [teamId] = useState<number | ''>('');
  const [positionFilter, setPositionFilter] = useState('');
  const [readiness, setReadiness] = useState<ReadinessFilter>('AVAILABLE');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);
  const [evaluatorConfig, setEvaluatorConfig] = useState<EvaluatorConfigInput>(() => normalizeEvaluatorConfig(DEFAULT_EVALUATOR_CONFIG));
  const [assignmentPreview, setAssignmentPreview] = useState<FeedbackAssignmentGenerationResponse>(emptyAssignmentPreview(null));
  const [previewingAssignments, setPreviewingAssignments] = useState(false);
  const [generatingAssignments, setGeneratingAssignments] = useState(false);
  const [questionReview, setQuestionReview] = useState<FeedbackCampaignQuestionReview>(emptyQuestionReview(null));
  const [scoringConfig, setScoringConfig] = useState<FeedbackCampaignScoringConfig>(emptyScoringConfig(null));
  const [savingScoringConfig, setSavingScoringConfig] = useState(false);
  const [selectedQuestionGroupKey, setSelectedQuestionGroupKey] = useState<string>('');
  const [loadingQuestionReview, setLoadingQuestionReview] = useState(false);
  const [resolvingQuestionReview, setResolvingQuestionReview] = useState(false);
  const [savingQuestionReview, setSavingQuestionReview] = useState(false);
  const [activationReadiness, setActivationReadiness] = useState<FeedbackCampaignActivationReadiness>(emptyActivationReadiness(null));
  const [loadingActivation, setLoadingActivation] = useState(false);
  const [activatingCampaign, setActivatingCampaign] = useState(false);
  const [activeStepKey, setActiveStepKey] = useState<SetupStepKey>('foundation');
  const [campaignInfoOpen, setCampaignInfoOpen] = useState(false);
  const [recipientDetails, setRecipientDetails] = useState<FeedbackTargetCandidate | null>(null);
  const [selectedEvaluatorTargetId, setSelectedEvaluatorTargetId] = useState<number>(0);
  const [evaluatorSearch, setEvaluatorSearch] = useState('');
  const [addingEvaluator, setAddingEvaluator] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<number | null>(null);
  const [manualForm, setManualForm] = useState<ManualAssignmentInput>({
    targetEmployeeId: 0,
    evaluatorEmployeeId: 0,
    relationshipType: 'PEER',
    reason: '',
  });
  const [draftRemovedEvaluatorKeys, setDraftRemovedEvaluatorKeys] = useState<Set<string>>(() => new Set());
  const [draftManualAdditions, setDraftManualAdditions] = useState<DraftEvaluatorAddition[]>([]);

  const selectedCampaign = useMemo(
      () => campaigns.find(campaign => campaign.id === selectedCampaignId) ?? null,
      [campaigns, selectedCampaignId],
  );

  const currentUser = useMemo(() => authStorage.getUser() as { fullName?: string; email?: string; employeeCode?: string; position?: string } | null, []);
  const localTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time', []);

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

  const previewWarningCount = assignmentPreview.requests.filter(item => item.warnings.length > 0).length;
  const hasAssignmentPreview = assignmentPreview.requests.length > 0;
  const assignmentDetails = assignmentPreview.assignmentDetails ?? [];
  const canEditEvaluators = selectedCampaign?.status === 'DRAFT';
  const normalizedEvaluatorConfig = useMemo(() => normalizeEvaluatorConfig(evaluatorConfig), [evaluatorConfig]);
  const peerReviewerCount = getPeerReviewerCount(normalizedEvaluatorConfig);
  const hasSavedEvaluatorAssignments = assignmentDetails.some(item => item.assignmentId != null);
  const savedAssignmentCount = selectedCampaign?.assignmentCount ?? 0;
  const employeeMap = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees]);
  const previewItemByTarget = useMemo(() => new Map(assignmentPreview.requests.map(item => [item.targetEmployeeId, item])), [assignmentPreview.requests]);
  const draftAdditionDetails = useMemo<FeedbackAssignmentDetailItem[]>(() => draftManualAdditions
      .filter(item => !draftRemovedEvaluatorKeys.has(`${item.targetEmployeeId}:${item.evaluatorEmployeeId}:${item.relationshipType}`))
      .map(item => {
        const evaluator = employeeMap.get(item.evaluatorEmployeeId);
        const target = selectedTargets.find(targetItem => targetItem.employeeId === item.targetEmployeeId)
            ?? targetsResponse.targets.find(targetItem => targetItem.employeeId === item.targetEmployeeId);
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
      }), [draftManualAdditions, draftRemovedEvaluatorKeys, employeeMap, selectedTargets, targetsResponse.targets]);
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
    for (const target of targetsResponse.targets) targetMap.set(target.employeeId, target);
    for (const target of selectedTargets) targetMap.set(target.employeeId, target);
    return savedTargetIds.map(id => targetMap.get(id)).filter((item): item is FeedbackTargetCandidate => Boolean(item));
  }, [savedTargetIds, selectedTargets, targetsResponse.targets]);
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
          if (assignedEvaluatorIdsForActiveTarget.has(employee.id)) return false;
          if (manualForm.relationshipType === 'PEER'
              && activeEvaluatorTarget?.currentDepartmentName
              && employee.currentDepartment
              && employee.currentDepartment !== activeEvaluatorTarget.currentDepartmentName) {
            return false;
          }
          if (!query) return true;
          return [employee.fullName, employee.currentDepartment ?? '', String(employee.id)]
              .some(value => value.toLowerCase().includes(query));
        })
        .slice(0, 12);
  }, [activeEvaluatorTarget?.currentDepartmentName, activeEvaluatorTargetId, assignedEvaluatorIdsForActiveTarget, employees, evaluatorSearch, manualForm.relationshipType]);
  const activeAssignmentsByRelationship = useMemo(() => {
    const grouped = new Map<FeedbackRelationshipType, FeedbackAssignmentDetailItem[]>();
    for (const assignment of activeEvaluatorAssignments) {
      const current = grouped.get(assignment.relationshipType) ?? [];
      current.push(assignment);
      grouped.set(assignment.relationshipType, current);
    }
    return grouped;
  }, [activeEvaluatorAssignments]);
  const questionGroups = questionReview.groups ?? [];
  const competencyWeights = questionReview.competencyWeights ?? [];
  const competencyWeightTotal = useMemo(() => roundPercent(competencyWeights.reduce((sum, item) => sum + Number(item.weightPercent ?? 0), 0)), [competencyWeights]);
  const competencyWeightDelta = roundPercent(100 - competencyWeightTotal);
  const competencyWeightsReady = competencyWeights.length > 0
      && Math.abs(competencyWeightTotal - 100) <= 0.01
      && competencyWeights.every(item => (item.warnings ?? []).length === 0);
  const selectedQuestionGroup = questionGroups.find(group => group.groupKey === selectedQuestionGroupKey) ?? questionGroups[0] ?? null;
  const {
    selectedQuestionCompetencies,
    isQuestionCompetencyExpanded,
    toggleQuestionCompetency,
    isQuestionPreviewExpanded,
    toggleQuestionPreview,
  } = useQuestionReviewExpansion(selectedQuestionGroup);
  const selectedQuestionIncludedCompetencyCount = selectedQuestionCompetencies.filter(competency => competency.questions.some(question => question.included)).length;
  const selectedQuestionIncludedQuestionCount = selectedQuestionCompetencies.flatMap(competency => competency.questions).filter(question => question.included).length;
  const selectedQuestionTotalCompetencyCount = selectedQuestionCompetencies.length;
  const selectedQuestionTotalQuestionCount = selectedQuestionGroup?.questionCount ?? selectedQuestionCompetencies.flatMap(competency => competency.questions).length;
  const activeQuestionFormTitle = selectedQuestionGroup ? `${relationshipLabel(selectedQuestionGroup.relationshipType as FeedbackRelationshipType)} Feedback Form` : 'Feedback Form';
  const hasQuestionReview = questionGroups.length > 0;
  const questionSaveDisabled = savingQuestionReview || !hasQuestionReview || !competencyWeightsReady || selectedCampaign?.status !== 'DRAFT';
  const questionReviewReady = Boolean(questionReview.saved && questionReview.includedQuestionCount > 0 && competencyWeightsReady && questionGroups.every(group => group.includedQuestionCount > 0));
  const activationBlocked = activationReadiness.blockingIssues.length > 0;
  const activationWarnings = activationReadiness.warnings.length;
  const setupReady = Boolean(selectedCampaign && activationReadiness.ready && !activationBlocked);
  const campaignReadyToActivate = selectedCampaign?.status === 'READY_TO_ACTIVATE';
  const canValidateSetup = Boolean(selectedCampaign && selectedCampaign.status === 'DRAFT' && activationReadiness.canMarkReady && setupReady);
  const canActivate = Boolean(selectedCampaign && campaignReadyToActivate && activationReadiness.canActivate && setupReady);
  const campaignLaunched = Boolean(selectedCampaign && ['ACTIVE', 'CLOSED', 'PUBLISHED'].includes(selectedCampaign.status));
  const launchReady = Boolean(selectedCampaign && campaignReadyToActivate && setupReady);
  const { title: launchBannerTitle, message: launchBannerMessage } = getLaunchBannerCopy({
    launchReady,
    setupReady,
    campaignStatus: selectedCampaign?.status,
  });
  const launchTargetCount = activationReadiness.summary.targetCount || targetsResponse.targetCount || selectedCampaign?.targetCount || 0;
  const launchAssignmentCount = activationReadiness.summary.assignmentCount || selectedCampaign?.assignmentCount || savedAssignmentCount;
  const questionCountsByForm = questionGroups.map(group => Number(group.includedQuestionCount || group.questionCount || 0)).filter(count => count > 0);
  const uniqueQuestionCounts = Array.from(new Set(questionCountsByForm));
  const questionsPerFormLabel = questionGroups.length === 0
      ? 'No forms ready'
      : uniqueQuestionCounts.length === 1
          ? `${uniqueQuestionCounts[0]} questions per form`
          : `${Math.min(...questionCountsByForm)}–${Math.max(...questionCountsByForm)} questions per form`;
  const competencyCountsByForm = useMemo(() => questionGroups
      .map(group => buildQuestionCompetencies(group.questions ?? []).filter(competency => competency.questions.some(question => question.included)).length)
      .filter(count => count > 0), [questionGroups]);
  const uniqueCompetencyCounts = Array.from(new Set(competencyCountsByForm));
  const competencyCountLabel = competencyCountsByForm.length === 0
      ? 'No competencies ready'
      : uniqueCompetencyCounts.length === 1
          ? `${uniqueCompetencyCounts[0]} competencies`
          : `${Math.min(...competencyCountsByForm)}–${Math.max(...competencyCountsByForm)} competencies`;
  const roleAssignmentSummary = scoringConfig.relationshipWeights
      .filter(item => Number(item.assignmentCount ?? 0) > 0)
      .map(item => `${relationshipLabel(item.relationshipType)} ${item.assignmentCount}`);
  const anonymousRoleLabels = selectedCampaign ? [
    selectedCampaign.managerFeedbackAnonymous ? 'Manager' : '',
    selectedCampaign.peerFeedbackAnonymous ? 'Peer' : '',
    selectedCampaign.subordinateFeedbackAnonymous ? 'Direct Report' : '',
    selectedCampaign.selfFeedbackAnonymous ? 'Self' : '',
  ].filter(Boolean) : [];
  const privacySummary = anonymousRoleLabels.length > 0
      ? `Anonymous feedback enabled for ${anonymousRoleLabels.join(', ')}.`
      : 'Anonymous feedback is not enabled for this campaign.';
  const launchChecklist = useMemo(() => {
    const checks = activationReadiness.checks.map(check => ({ ...check }));
    if (selectedCampaign && !checks.some(check => String(check.key).toUpperCase() === 'PRIVACY_POLICY')) {
      checks.push({
        key: 'PRIVACY_POLICY',
        label: 'Privacy settings',
        status: 'PASS',
        message: privacySummary,
      });
    }
    return checks;
  }, [activationReadiness.checks, privacySummary, selectedCampaign]);

  const launchQuestionFormSummaries = useMemo(() => questionGroups.map(group => ({
    key: group.groupKey,
    relationshipLabel: relationshipLabel(group.relationshipType),
    includedQuestionCount: Number(group.includedQuestionCount ?? 0),
    questionCount: Number(group.questionCount ?? 0),
    competencyCount: buildQuestionCompetencies(group.questions ?? [])
        .filter(competency => competency.questions.some(question => question.included)).length,
  })), [questionGroups]);



  const draftCampaigns = campaigns.filter(campaign => campaign.status === 'DRAFT').length;
  const activeCampaigns = campaigns.filter(campaign => campaign.status === 'ACTIVE').length;
  const readyCampaigns = campaigns.filter(campaign => campaign.status === 'READY_TO_ACTIVATE').length;
  const publishedCampaigns = campaigns.filter(campaign => campaign.status === 'PUBLISHED').length;

  const {
    applyForm,
    refreshCampaigns,
    loadDirectoryFilters,
    loadCandidates,
    loadTargets,
    loadQuestionReview,
    loadScoringConfig,
    loadActivationState,
    loadCampaignSnapshot,
  } = useCampaignSetupLoaders({
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
  });

  useEffect(() => {
    void refreshCampaigns();
    void loadDirectoryFilters();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadCandidates();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [targetSearch, currentDepartmentId, parentDepartmentId, teamId, readiness, selectedCampaign?.id]);

  useEffect(() => {
    if (selectedCampaign?.id) {
      void loadTargets(selectedCampaign.id);
      void loadQuestionReview(selectedCampaign.id);
      void loadScoringConfig(selectedCampaign.id);
      void loadActivationState(selectedCampaign.id);
      setAssignmentPreview(emptyAssignmentPreview(selectedCampaign));
    } else {
      setTargetsResponse(emptyTargetsResponse(null));
      setSelectedTargetIds([]);
      setAssignmentPreview(emptyAssignmentPreview(null));
      setQuestionReview(emptyQuestionReview(null));
      setScoringConfig(emptyScoringConfig(null));
      setSelectedQuestionGroupKey('');
      setActivationReadiness(emptyActivationReadiness(null));
    }
  }, [selectedCampaign?.id]);

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

  const {
    handleSelectCampaign,
    handleSave,
    handleDeleteDraft,
  } = useCampaignInfoActions({
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
  });

  const {
    toggleTarget,
    removeSelectedTarget,
    saveTargets,
  } = useCampaignTargetActions({
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
  });

  const {
    setPeerReviewerCount,
    previewEvaluatorRules,
    generateEvaluatorAssignments,
    addEvaluator,
    removeEvaluator,
  } = useCampaignEvaluatorActions({
    selectedCampaign,
    savedTargetIds,
    hasUnsavedTargetChanges,
    evaluatorConfig,
    hasAssignmentPreview,
    activeEvaluatorTargetId,
    manualForm,
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
  });

  const relationshipWeightTotal = useMemo(() => (scoringConfig.relationshipWeights ?? [])
      .reduce((sum, item) => sum + Number(item.weightPercent ?? 0), 0), [scoringConfig.relationshipWeights]);

  const {
    resolveQuestionReview,
    toggleQuestionIncluded,
    handleCompetencyDrop,
    handleQuestionDrop,
    updateRelationshipWeight,
    saveScoringConfig,
    updateCompetencyWeight,
    balanceCompetencyWeightsByQuestions,
    equalizeCompetencyWeights,
    saveQuestionReview,
  } = useCampaignQuestionReviewActions({
    selectedCampaign,
    savedAssignmentCount,
    questionReview,
    competencyWeights,
    competencyWeightsReady,
    competencyWeightTotal,
    relationshipWeightTotal,
    scoringConfig,
    setQuestionReview,
    setSelectedQuestionGroupKey,
    setResolvingQuestionReview,
    setSavingQuestionReview,
    setScoringConfig,
    setSavingScoringConfig,
    setForm,
    setError,
    setSuccess,
    setActiveStepKey,
    loadScoringConfig,
    loadActivationState,
  });

  const {
    validateSelectedCampaignSetup,
    activateSelectedCampaign,
  } = useCampaignLifecycleActions({
    selectedCampaign,
    activationWarnings,
    setActivatingCampaign,
    setError,
    setSuccess,
    loadCampaignSnapshot,
    refreshCampaigns,
    loadScoringConfig,
    loadActivationState,
    onCampaignCreated,
  });

  const canEditSelected = !selectedCampaign || selectedCampaign.status === 'DRAFT';
  const canEditTargets = Boolean(selectedCampaign && selectedCampaign.status === 'DRAFT');

  const { setupSteps, lastUnlockedStep } = useCampaignSetupSteps({
    selectedCampaign,
    selectedTargetCount: targetIdsNormalized.length,
    savedTargetCount: savedTargetIds.length,
    hasUnsavedTargetChanges,
    hasUnavailableSelection,
    savedAssignmentCount,
    questionReviewReady,
    includedQuestionCount: questionReview.includedQuestionCount,
  });

  useEffect(() => {
    const active = setupSteps.find((step) => step.key === activeStepKey);
    if (!active?.unlocked) {
      setActiveStepKey(lastUnlockedStep);
    }
  }, [activeStepKey, lastUnlockedStep, setupSteps]);


  return (
      <div className="hfdq-page hfdc-page">
        <div className="hfdq-page-head">
          <div>
            <p className="hfdq-breadcrumb"><i className="bi bi-house" /> 360 Feedback / Campaign Setup</p>
            <h2>Campaign Setup</h2>
            <p>Set up the campaign, choose feedback recipients, prepare evaluators, review questions, and launch with confidence.</p>
          </div>
          <div className="hfdq-actions">
            <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => void refreshCampaigns()} disabled={loadingCampaigns}>
              <i className="bi bi-arrow-clockwise" /> Refresh
            </button>
            <button className="hfd-btn hfd-btn-primary" type="button" onClick={() => handleSelectCampaign('')}>
              <i className="bi bi-plus-lg" /> New Draft
            </button>
          </div>
        </div>

        {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
        {success && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{success}</div>}

        <section className="hfdq-table-card hfdc-stepper-shell">
          <div className="hfdc-stepper-head">
            <div>
              <span className="hfdq-kicker">Setup path</span>
              <h3>Campaign Setup Wizard</h3>
              <p>Use one focused step at a time. Completed steps stay accessible, and locked steps open automatically when prerequisites are saved.</p>
            </div>
            {selectedCampaign ? <span className={statusClass(selectedCampaign.status)}>{statusLabels[selectedCampaign.status] ?? selectedCampaign.status}</span> : <span className="hfd-status-badge DRAFT">New Draft</span>}
          </div>
          <div className="hfdc-top-stepper" role="tablist" aria-label="Campaign setup steps">
            {setupSteps.map((step, index) => (
                <div key={step.key} className={`hfdc-top-step-wrap ${index < setupSteps.length - 1 ? 'has-line' : ''}`}>
                  <button
                      type="button"
                      role="tab"
                      aria-selected={activeStepKey === step.key}
                      className={`hfdc-top-step ${activeStepKey === step.key ? 'active' : ''} ${step.done ? 'done' : ''} ${step.unlocked ? '' : 'locked'}`}
                      onClick={() => step.unlocked && setActiveStepKey(step.key)}
                      disabled={!step.unlocked}
                  >
                  <span className="hfdc-top-step-icon">
                    <i className={`bi ${step.done ? 'bi-check-lg' : step.icon}`} />
                  </span>
                    <span className="hfdc-top-step-copy">
                    <strong>{step.label}</strong>
                    <small>{step.status}</small>
                  </span>
                  </button>
                  {index < setupSteps.length - 1 ? <span className={`hfdc-top-step-line ${setupSteps[index + 1].unlocked ? 'ready' : ''}`} aria-hidden="true" /> : null}
                </div>
            ))}
          </div>
        </section>

        <div className="hfdq-stats-grid hfdc-stats-grid">
          <CampaignStat icon="bi bi-collection" label="Total Campaigns" value={campaigns.length} note="All campaign records" tone="blue" />
          <CampaignStat icon="bi bi-pencil-square" label="Draft / Ready" value={draftCampaigns + readyCampaigns} note={`${draftCampaigns} draft, ${readyCampaigns} ready`} tone="green" />
          <CampaignStat icon="bi bi-person-check" label="Saved Targets" value={targetsResponse.targetCount} note={selectedCampaign ? 'Selected campaign' : 'No campaign selected'} tone="purple" />
          <CampaignStat icon="bi bi-send-check" label="Published" value={publishedCampaigns} note={`${activeCampaigns} active now`} tone="orange" />
        </div>

        {activeStepKey === 'foundation' && <CampaignInfoStep
            selectedCampaign={selectedCampaign}
            statusClass={statusClass}
            statusLabels={statusLabels}
            setCampaignInfoOpen={setCampaignInfoOpen}
            campaignInfoOpen={campaignInfoOpen}
            formatWindow={formatWindow}
            targetsResponse={targetsResponse}
            savedAssignmentCount={savedAssignmentCount}
            handleSave={handleSave}
            currentUser={currentUser}
            localTimeZone={localTimeZone}
            errors={errors}
            form={form}
            canEditSelected={canEditSelected}
            setForm={setForm}
            TIME_OPTIONS={TIME_OPTIONS}
            formatTimeLabel={formatTimeLabel}
            DESCRIPTION_LIMIT={DESCRIPTION_LIMIT}
            INSTRUCTIONS_LIMIT={INSTRUCTIONS_LIMIT}
            INSTRUCTION_TEMPLATE={INSTRUCTION_TEMPLATE}
            deleting={deleting}
            handleDeleteDraft={handleDeleteDraft}
            setErrors={setErrors}
            saving={saving}
        />}

        {activeStepKey === 'targets' && <TargetEmployeesStep
            selectedCampaign={selectedCampaign}
            targetIdsNormalized={targetIdsNormalized}
            selectedReadyCount={selectedReadyCount}
            selectedReviewCount={selectedReviewCount}
            selectedDepartmentCount={selectedDepartmentCount}
            availableCandidateCount={availableCandidateCount}
            reviewCandidateCount={reviewCandidateCount}
            targetSearch={targetSearch}
            setTargetSearch={setTargetSearch}
            currentDepartmentId={currentDepartmentId}
            setCurrentDepartmentId={setCurrentDepartmentId}
            departments={departments}
            positionFilter={positionFilter}
            setPositionFilter={setPositionFilter}
            positionOptions={positionOptions}
            readiness={readiness}
            setReadiness={setReadiness}
            loadingCandidates={loadingCandidates}
            candidateRows={candidateRows}
            readinessClass={readinessClass}
            personSubtitle={personSubtitle}
            readinessLabel={readinessLabel}
            setRecipientDetails={setRecipientDetails}
            canEditTargets={canEditTargets}
            toggleTarget={toggleTarget}
            hasUnsavedTargetChanges={hasUnsavedTargetChanges}
            targetsResponse={targetsResponse}
            hasUnavailableSelection={hasUnavailableSelection}
            selectedDepartmentSummary={selectedDepartmentSummary}
            recipientDetails={recipientDetails}
            recipientDetailItems={recipientDetailItems}
            loadingTargets={loadingTargets}
            selectedTargets={selectedTargets}
            removeSelectedTarget={removeSelectedTarget}
            setSelectedTargetIds={setSelectedTargetIds}
            savedTargetIds={savedTargetIds}
            savingTargets={savingTargets}
            saveTargets={saveTargets}
        />}

        {activeStepKey === 'evaluators' && <EvaluatorAssignmentsStep
            savedTargetIds={savedTargetIds}
            hasUnsavedTargetChanges={hasUnsavedTargetChanges}
            hasUnavailableSelection={hasUnavailableSelection}
            assignmentPreview={assignmentPreview}
            previewWarningCount={previewWarningCount}
            hasDraftEvaluatorChanges={hasDraftEvaluatorChanges}
            hasSavedEvaluatorAssignments={hasSavedEvaluatorAssignments}
            selectedCampaign={selectedCampaign}
            peerReviewerCount={peerReviewerCount}
            setPeerReviewerCount={setPeerReviewerCount}
            canEditEvaluators={canEditEvaluators}
            relationshipWeightTotal={relationshipWeightTotal}
            RELATIONSHIP_ORDER={RELATIONSHIP_ORDER}
            scoringConfig={scoringConfig}
            updateRelationshipWeight={updateRelationshipWeight}
            setScoringConfig={setScoringConfig}
            savingScoringConfig={savingScoringConfig}
            saveScoringConfig={saveScoringConfig}
            previewingAssignments={previewingAssignments}
            generatingAssignments={generatingAssignments}
            previewEvaluatorRules={previewEvaluatorRules}
            hasAssignmentPreview={hasAssignmentPreview}
            generateEvaluatorAssignments={generateEvaluatorAssignments}
            setActiveStepKey={setActiveStepKey}
            cleanEvaluatorNote={cleanEvaluatorNote}
            evaluatorTargets={evaluatorTargets}
            previewItemByTarget={previewItemByTarget}
            assignmentsByTarget={assignmentsByTarget}
            assignmentReadinessClass={assignmentReadinessClass}
            activeEvaluatorTargetId={activeEvaluatorTargetId}
            setSelectedEvaluatorTargetId={setSelectedEvaluatorTargetId}
            activeEvaluatorTarget={activeEvaluatorTarget}
            activePreviewItem={activePreviewItem}
            activeAssignmentsByRelationship={activeAssignmentsByRelationship}
            relationshipIcon={relationshipIcon}
            relationshipLabel={relationshipLabel}
            initials={initials}
            assignmentSourceLabel={assignmentSourceLabel}
            assignmentStatusLabel={assignmentStatusLabel}
            removingAssignmentId={removingAssignmentId}
            removeEvaluator={removeEvaluator}
            manualForm={manualForm}
            setManualForm={setManualForm}
            relationshipOptions={relationshipOptions}
            evaluatorSearch={evaluatorSearch}
            setEvaluatorSearch={setEvaluatorSearch}
            evaluatorCandidates={evaluatorCandidates}
            addingEvaluator={addingEvaluator}
            addEvaluator={addEvaluator}
        />}

        {activeStepKey === 'questions' && <QuestionReviewStep
            savedAssignmentCount={savedAssignmentCount}
            selectedCampaign={selectedCampaign}
            competencyWeightsReady={competencyWeightsReady}
            formatPercent={formatPercent}
            competencyWeightTotal={competencyWeightTotal}
            competencyWeights={competencyWeights}
            competencyWeightDelta={competencyWeightDelta}
            questionSaveDisabled={questionSaveDisabled}
            saveQuestionReview={saveQuestionReview}
            savingQuestionReview={savingQuestionReview}
            loadingQuestionReview={loadingQuestionReview}
            balanceCompetencyWeightsByQuestions={balanceCompetencyWeightsByQuestions}
            equalizeCompetencyWeights={equalizeCompetencyWeights}
            updateCompetencyWeight={updateCompetencyWeight}
            resolvingQuestionReview={resolvingQuestionReview}
            resolveQuestionReview={resolveQuestionReview}
            questionReview={questionReview}
            questionGroups={questionGroups}
            buildQuestionCompetencies={buildQuestionCompetencies}
            selectedQuestionGroup={selectedQuestionGroup}
            setSelectedQuestionGroupKey={setSelectedQuestionGroupKey}
            relationshipLabel={relationshipLabel}
            activeQuestionFormTitle={activeQuestionFormTitle}
            selectedQuestionIncludedQuestionCount={selectedQuestionIncludedQuestionCount}
            selectedQuestionTotalQuestionCount={selectedQuestionTotalQuestionCount}
            selectedQuestionIncludedCompetencyCount={selectedQuestionIncludedCompetencyCount}
            selectedQuestionTotalCompetencyCount={selectedQuestionTotalCompetencyCount}
            selectedQuestionCompetencies={selectedQuestionCompetencies}
            isQuestionCompetencyExpanded={isQuestionCompetencyExpanded}
            handleCompetencyDrop={handleCompetencyDrop}
            writeQuestionDragData={writeQuestionDragData}
            toggleQuestionCompetency={toggleQuestionCompetency}
            isQuestionPreviewExpanded={isQuestionPreviewExpanded}
            handleQuestionDrop={handleQuestionDrop}
            toggleQuestionPreview={toggleQuestionPreview}
            toggleQuestionIncluded={toggleQuestionIncluded}
        />}
        {activeStepKey === 'launch' && (
            <LaunchReadinessSection
                selectedCampaign={selectedCampaign}
                questionReviewReady={questionReviewReady}
                campaignLaunched={campaignLaunched}
                launchReady={launchReady}
                launchTargetCount={launchTargetCount}
                launchAssignmentCount={launchAssignmentCount}
                questionFormCount={questionGroups.length}
                loadingActivation={loadingActivation}
                launchBannerTitle={launchBannerTitle}
                launchBannerMessage={launchBannerMessage}
                activationReadiness={activationReadiness}
                launchChecklist={launchChecklist}
                campaignWindowLabel={selectedCampaign ? formatWindow(selectedCampaign) : '-'}
                privacySummary={privacySummary}
                targetWarningCount={targetsResponse.warningCount}
                roleAssignmentSummary={roleAssignmentSummary}
                questionsPerFormLabel={questionsPerFormLabel}
                competencyCountLabel={competencyCountLabel}
                questionFormSummaries={launchQuestionFormSummaries}
                scoringConfig={scoringConfig}
                competencyWeightsReady={competencyWeightsReady}
                competencyWeightTotal={competencyWeightTotal}
                canValidateSetup={canValidateSetup}
                canActivate={canActivate}
                activatingCampaign={activatingCampaign}
                formatPercent={formatPercent}
                onRefreshCheck={() => selectedCampaign && void loadActivationState(selectedCampaign.id)}
                onBackToQuestionReview={() => setActiveStepKey('questions')}
                onValidateSetup={() => void validateSelectedCampaignSetup()}
                onLaunchCampaign={() => void activateSelectedCampaign()}
            />
        )}


        <section className="hfdq-table-card hfdc-list-card">
          <div className="hfdc-card-head">
            <div>
              <span className="hfdq-kicker">Campaign records</span>
              <h3>Campaign List</h3>
              <p>Confirm target count and campaign windows before evaluator rules start.</p>
            </div>
          </div>

          {loadingCampaigns ? (
              <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
              <div className="hfd-empty-state hfdc-empty-state"><i className="bi bi-inbox" /><strong>No campaigns yet</strong><p>Save a campaign draft to start the new setup flow.</p></div>
          ) : (
              <div className="hfd-table-wrap hfdq-modern-table-wrap">
                <table className="hfd-table hfdq-modern-table hfdc-campaign-table">
                  <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Review Year</th>
                    <th>Status</th>
                    <th>Targets</th>
                    <th>Assignments</th>
                    <th>Completion</th>
                    <th>Window</th>
                    <th />
                  </tr>
                  </thead>
                  <tbody>
                  {campaigns.map(campaign => (
                      <tr key={campaign.id}>
                        <td><div className="hfd-campaign-name-cell"><strong>{campaign.name}</strong><small>Reference #{campaign.id}</small></div></td>
                        <td>{campaign.reviewYear}</td>
                        <td><span className={statusClass(campaign.status)}>{statusLabels[campaign.status] ?? campaign.status}</span><small>{statusDescriptions[campaign.status] ?? ''}</small></td>
                        <td>{campaign.targetCount ?? 0}</td>
                        <td>{campaign.assignmentCount ?? 0}</td>
                        <td>{completionLabel(campaign)}</td>
                        <td>{formatWindow(campaign)}</td>
                        <td><button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => handleSelectCampaign(String(campaign.id))}>Open</button></td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
          )}
        </section>
      </div>
  );
}

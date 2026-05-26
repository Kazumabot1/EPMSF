import { type DragEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import { authStorage } from '../../../services/authStorage';
import { LaunchReadinessSection } from './campaign-setup/components/LaunchReadinessSection';
import { CampaignStat } from './campaign-setup/components/CampaignStat';
import { CampaignInfoStep } from './campaign-setup/components/CampaignInfoStep';
import { TargetEmployeesStep } from './campaign-setup/components/TargetEmployeesStep';
import { EvaluatorAssignmentsStep } from './campaign-setup/components/EvaluatorAssignmentsStep';
import { QuestionReviewStep } from './campaign-setup/components/QuestionReviewStep';
import { useQuestionReviewExpansion } from './campaign-setup/hooks/useQuestionReviewExpansion';
import {
  DEFAULT_EVALUATOR_CONFIG,
  getPeerReviewerCount,
  hasAnyEvaluatorSource,
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
  FeedbackCampaignQuestionGroup,
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
  allocateEqualPercentages,
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
  getQuestionSectionCode,
  isReviewQuestionScored,
  readQuestionDragData,
  sortQuestionItems,
  writeQuestionDragData,
} from './campaign-setup/utils/campaignSetupQuestionUtils';
import { buildCampaignPayload, campaignToForm, validateCampaignInfoForm } from './campaign-setup/utils/campaignSetupValidation';

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
      setError(err instanceof Error ? err.message : 'Failed to load question review.');
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
      const readiness = await feedbackCampaignApi.getActivationReadiness(campaignId);
      setActivationReadiness(readiness);
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

  const applyForm = (campaign: FeedbackCampaign) => {
    setForm(campaignToForm(campaign));
  };

  const handleSelectCampaign = async (value: string) => {
    setError('');
    setSuccess('');
    setErrors({});
    setDraftRemovedEvaluatorKeys(new Set());
    setDraftManualAdditions([]);
    if (!value) {
      setSelectedCampaignId('');
      setForm(defaultForm());
      setTargetsResponse(emptyTargetsResponse(null));
      setSelectedTargetIds([]);
      setAssignmentPreview(emptyAssignmentPreview(null));
      setQuestionReview(emptyQuestionReview(null));
      setScoringConfig(emptyScoringConfig(null));
      setActivationReadiness(emptyActivationReadiness(null));
      setCampaignInfoOpen(false);
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


  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      setSelectedCampaignId('');
      setForm(defaultForm());
      setTargetsResponse(emptyTargetsResponse(null));
      setSelectedTargetIds([]);
      await refreshCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft campaign could not be deleted.');
    } finally {
      setDeleting(false);
    }
  };

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

  const setPeerReviewerCount = (value: number) => {
    const nextCount = Math.max(1, Math.min(8, value));
    setEvaluatorConfig(current => normalizeEvaluatorConfig({
      ...current,
      includePeers: true,
      peerMinCount: Math.min(current.peerMinCount ?? DEFAULT_EVALUATOR_CONFIG.peerMinCount, nextCount),
      peerMaxCount: nextCount,
      peerCount: nextCount,
    }));
  };

  const buildEvaluatorPayload = (): EvaluatorConfigInput => normalizeEvaluatorConfig(evaluatorConfig);

  const validateEvaluatorRules = () => {
    if (!selectedCampaign) {
      setError('Save campaign info before preparing evaluators.');
      return false;
    }
    if (selectedCampaign.status !== 'DRAFT') {
      setError('Evaluators can be prepared only while the campaign is in draft.');
      return false;
    }
    if (savedTargetIds.length === 0 || hasUnsavedTargetChanges) {
      setError(hasUnsavedTargetChanges ? 'Save recipient changes before preparing evaluators.' : 'Select and save recipients before preparing evaluators.');
      return false;
    }
    const payload = buildEvaluatorPayload();
    if (!hasAnyEvaluatorSource(payload)) {
      setError('At least one evaluator group is required.');
      return false;
    }
    if (payload.includePeers && payload.peerMinCount > payload.peerMaxCount) {
      setError('Peer reviewer count is not valid.');
      return false;
    }
    if (payload.includeSubordinates && payload.subordinateMinCount > payload.subordinateMaxCount) {
      setError('Direct report reviewer count is not valid.');
      return false;
    }
    return true;
  };

  const previewEvaluatorRules = async () => {
    if (!validateEvaluatorRules() || !selectedCampaign) return;
    if (hasAssignmentPreview) {
      const confirmed = window.confirm('Refresh suggested evaluators? Changes added by HR will be kept.');
      if (!confirmed) return;
    }
    setPreviewingAssignments(true);
    setError('');
    setSuccess('');
    try {
      const preview = await feedbackCampaignApi.previewAssignments(selectedCampaign.id, buildEvaluatorPayload());
      setAssignmentPreview(preview);
      setSelectedEvaluatorTargetId(current => current || preview.requests[0]?.targetEmployeeId || 0);
      setSuccess(`${preview.totalEvaluatorsGenerated} evaluator${preview.totalEvaluatorsGenerated === 1 ? '' : 's'} prepared for review.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluator preview could not be prepared.');
    } finally {
      setPreviewingAssignments(false);
    }
  };


  const generateEvaluatorAssignments = async () => {
    if (!validateEvaluatorRules() || !selectedCampaign) return;
    if (!hasAssignmentPreview) {
      setError('Preview evaluators before saving.');
      return;
    }
    const confirmed = window.confirm('Save the prepared evaluator list?');
    if (!confirmed) return;
    setGeneratingAssignments(true);
    setError('');
    setSuccess('');
    try {
      let response = await feedbackCampaignApi.generateAssignments(selectedCampaign.id, buildEvaluatorPayload());

      if (draftRemovedEvaluatorKeys.size > 0) {
        const assignmentsToRemove = (response.assignmentDetails ?? [])
            .filter(assignment => assignment.assignmentId != null && draftRemovedEvaluatorKeys.has(assignmentKey(assignment)));
        for (const assignment of assignmentsToRemove) {
          response = await feedbackCampaignApi.removeAssignment(selectedCampaign.id, assignment.assignmentId as number);
        }
      }

      for (const addition of draftManualAdditions) {
        response = await feedbackCampaignApi.addManualAssignment(selectedCampaign.id, {
          targetEmployeeId: addition.targetEmployeeId,
          evaluatorEmployeeId: addition.evaluatorEmployeeId,
          relationshipType: addition.relationshipType,
          anonymous: addition.anonymous,
          reason: addition.reason?.trim(),
        });
      }

      setAssignmentPreview(response);
      setSelectedEvaluatorTargetId(current => current || response.requests[0]?.targetEmployeeId || 0);
      setDraftRemovedEvaluatorKeys(new Set());
      setDraftManualAdditions([]);
      setQuestionReview(emptyQuestionReview(selectedCampaign));
      setSelectedQuestionGroupKey('');
      setSuccess(`${response.totalEvaluatorsGenerated} evaluator${response.totalEvaluatorsGenerated === 1 ? '' : 's'} saved for review.`);
      await loadCampaignSnapshot(selectedCampaign.id, selectedCampaign);
      await refreshCampaigns();
      await loadQuestionReview(selectedCampaign.id);
      await loadScoringConfig(selectedCampaign.id);
      await loadActivationState(selectedCampaign.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluators could not be saved.');
    } finally {
      setGeneratingAssignments(false);
    }
  };


  const addEvaluator = async () => {
    if (!selectedCampaign) return;
    if (!canEditEvaluators) {
      setError('Evaluators can be changed only while the campaign is in draft.');
      return;
    }
    if (!hasAssignmentPreview) {
      setError('Preview evaluators before adding someone.');
      return;
    }
    const targetEmployeeId = activeEvaluatorTargetId;
    if (!targetEmployeeId || !manualForm.evaluatorEmployeeId) {
      setError('Choose an evaluator to add.');
      return;
    }
    if (!manualForm.reason || manualForm.reason.trim().length < 5) {
      setError('Add a short reason before saving this evaluator.');
      return;
    }
    const payload: ManualAssignmentInput = {
      ...manualForm,
      targetEmployeeId,
      reason: manualForm.reason.trim(),
      anonymous:
          manualForm.relationshipType === 'PEER'
              ? selectedCampaign.peerFeedbackAnonymous !== false
              : manualForm.relationshipType === 'SUBORDINATE'
                  ? selectedCampaign.subordinateFeedbackAnonymous !== false
                  : selectedCampaign.managerFeedbackAnonymous === true,
    };
    const key = `${payload.targetEmployeeId}:${payload.evaluatorEmployeeId}:${payload.relationshipType}`;
    if (displayedAssignmentDetails.some(item => assignmentKey(item) === key)) {
      setError('This evaluator is already included for the selected recipient.');
      return;
    }

    if (!hasSavedEvaluatorAssignments) {
      setDraftRemovedEvaluatorKeys(current => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      setDraftManualAdditions(current => [...current, { ...payload, draftId: `${Date.now()}-${payload.evaluatorEmployeeId}` }]);
      setManualForm(current => ({ ...current, evaluatorEmployeeId: 0, reason: '' }));
      setEvaluatorSearch('');
      setSuccess('Evaluator added to the prepared list.');
      return;
    }

    setAddingEvaluator(true);
    setError('');
    setSuccess('');
    try {
      const response = await feedbackCampaignApi.addManualAssignment(selectedCampaign.id, payload);
      setAssignmentPreview(response);
      setManualForm(current => ({ ...current, evaluatorEmployeeId: 0, reason: '' }));
      setEvaluatorSearch('');
      setSuccess('Evaluator added.');
      await loadCampaignSnapshot(selectedCampaign.id, selectedCampaign);
      await refreshCampaigns();
      await loadQuestionReview(selectedCampaign.id);
      await loadScoringConfig(selectedCampaign.id);
      await loadActivationState(selectedCampaign.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluator could not be added.');
    } finally {
      setAddingEvaluator(false);
    }
  };


  const removeEvaluator = async (assignment: FeedbackAssignmentDetailItem) => {
    if (!selectedCampaign || !canEditEvaluators) return;
    if (assignment.status === 'SUBMITTED') {
      setError('Submitted feedback cannot be changed.');
      return;
    }
    const confirmed = window.confirm('Remove this evaluator?');
    if (!confirmed) return;

    const key = assignmentKey(assignment);
    if (assignment.assignmentId == null) {
      setDraftManualAdditions(current => current.filter(item => `${item.targetEmployeeId}:${item.evaluatorEmployeeId}:${item.relationshipType}` !== key));
      setDraftRemovedEvaluatorKeys(current => new Set(current).add(key));
      setSuccess('Evaluator removed from the prepared list.');
      return;
    }

    setRemovingAssignmentId(assignment.assignmentId);
    setError('');
    setSuccess('');
    try {
      const response = await feedbackCampaignApi.removeAssignment(selectedCampaign.id, assignment.assignmentId);
      setAssignmentPreview(response);
      setSuccess('Evaluator removed.');
      await loadCampaignSnapshot(selectedCampaign.id, selectedCampaign);
      await refreshCampaigns();
      await loadQuestionReview(selectedCampaign.id);
      await loadScoringConfig(selectedCampaign.id);
      await loadActivationState(selectedCampaign.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluator could not be removed.');
    } finally {
      setRemovingAssignmentId(null);
    }
  };


  const resolveQuestionReview = async () => {
    if (!selectedCampaign) return;
    if (savedAssignmentCount === 0) {
      setError('Generate evaluator assignments before resolving campaign questions.');
      return;
    }
    setResolvingQuestionReview(true);
    setError('');
    setSuccess('');
    try {
      const data = await feedbackCampaignApi.resolveQuestionReview(selectedCampaign.id);
      setQuestionReview(data);
      setSelectedQuestionGroupKey(data.groups[0]?.groupKey ?? '');
      setSuccess('Questions refreshed from active rules.');
      await loadScoringConfig(selectedCampaign.id);
      await loadActivationState(selectedCampaign.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Questions could not be prepared.');
    } finally {
      setResolvingQuestionReview(false);
    }
  };

  const updateQuestionGroup = (
      groupKey: string,
      updater: (questions: FeedbackCampaignQuestionGroup['questions']) => FeedbackCampaignQuestionGroup['questions'],
  ) => {
    setQuestionReview(current => {
      const groups = current.groups.map(group => {
        if (group.groupKey !== groupKey) return group;
        const questions = updater(group.questions);
        const questionCount = questions.length;
        const includedQuestionCount = questions.filter(question => question.included).length;
        const scoredQuestionCount = questions.filter(isReviewQuestionScored).length;
        const includedScoredQuestionCount = questions.filter(question => question.included && isReviewQuestionScored(question)).length;
        return { ...group, questions, questionCount, includedQuestionCount, scoredQuestionCount, includedScoredQuestionCount };
      });
      return {
        ...current,
        saved: false,
        questionCount: groups.reduce((total, group) => total + group.questionCount, 0),
        includedQuestionCount: groups.reduce((total, group) => total + group.includedQuestionCount, 0),
        scoredQuestionCount: groups.reduce((total, group) => total + group.scoredQuestionCount, 0),
        includedScoredQuestionCount: groups.reduce((total, group) => total + group.includedScoredQuestionCount, 0),
        groups,
      };
    });
  };

  const toggleQuestionIncluded = (groupKey: string, questionCode: string) => {
    updateQuestionGroup(groupKey, (questions: FeedbackCampaignQuestionGroup['questions']) =>
        questions.map(question => question.questionCode === questionCode ? { ...question, included: !question.included } : question),
    );
  };

  const moveCompetency = (groupKey: string, fromSectionCode: string, toSectionCode: string) => {
    if (fromSectionCode === toSectionCode) return;
    updateQuestionGroup(groupKey, (questions: FeedbackCampaignQuestionGroup['questions']) => {
      const sections = Array.from(new Map(sortQuestionItems(questions).map(question => [getQuestionSectionCode(question), question])).keys());
      const fromIndex = sections.indexOf(fromSectionCode);
      const toIndex = sections.indexOf(toSectionCode);
      if (fromIndex < 0 || toIndex < 0) return questions;
      const nextSections = [...sections];
      const [moved] = nextSections.splice(fromIndex, 1);
      nextSections.splice(toIndex, 0, moved);
      const sectionOrder = new Map(nextSections.map((section, index) => [section, (index + 1) * 10]));
      return questions.map(question => {
        const currentSectionCode = getQuestionSectionCode(question);
        return { ...question, sectionOrder: sectionOrder.get(currentSectionCode) ?? question.sectionOrder };
      });
    });
  };

  const moveQuestion = (groupKey: string, sectionCode: string, fromQuestionCode: string, toQuestionCode: string) => {
    if (fromQuestionCode === toQuestionCode) return;
    updateQuestionGroup(groupKey, (questions: FeedbackCampaignQuestionGroup['questions']) => {
      const scoped = sortQuestionItems(questions.filter(question => (getQuestionSectionCode(question)) === sectionCode));
      const fromIndex = scoped.findIndex(question => question.questionCode === fromQuestionCode);
      const toIndex = scoped.findIndex(question => question.questionCode === toQuestionCode);
      if (fromIndex < 0 || toIndex < 0) return questions;
      const ordered = [...scoped];
      const [moved] = ordered.splice(fromIndex, 1);
      ordered.splice(toIndex, 0, moved);
      const displayOrder = new Map(ordered.map((question, index) => [question.questionCode, (index + 1) * 10]));
      return questions.map(question => {
        const nextDisplayOrder = displayOrder.get(question.questionCode);
        return typeof nextDisplayOrder === 'number'
            ? { ...question, displayOrder: nextDisplayOrder }
            : question;
      });
    });
  };



  const handleCompetencyDrop = (event: DragEvent<HTMLElement>, groupKey: string, toSectionCode: string) => {
    event.preventDefault();
    const payload = readQuestionDragData(event);
    if (payload?.kind === 'competency' && payload.groupKey === groupKey) {
      moveCompetency(groupKey, payload.sectionCode, toSectionCode);
    }
  };

  const handleQuestionDrop = (event: DragEvent<HTMLElement>, groupKey: string, sectionCode: string, toQuestionCode: string) => {
    event.preventDefault();
    const payload = readQuestionDragData(event);
    if (payload?.kind === 'question' && payload.groupKey === groupKey && payload.sectionCode === sectionCode) {
      moveQuestion(groupKey, sectionCode, payload.questionCode, toQuestionCode);
    }
  };

  const relationshipWeightTotal = useMemo(() => (scoringConfig.relationshipWeights ?? [])
      .reduce((sum, item) => sum + Number(item.weightPercent ?? 0), 0), [scoringConfig.relationshipWeights]);

  const updateRelationshipWeight = (relationshipType: FeedbackRelationshipType, value: number) => {
    const normalized = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    setScoringConfig(current => ({
      ...current,
      relationshipWeightsReady: false,
      relationshipWeights: RELATIONSHIP_ORDER.map(type => {
        const existing = current.relationshipWeights.find(item => item.relationshipType === type);
        return {
          relationshipType: type,
          label: existing?.label ?? type,
          weightPercent: type === relationshipType ? normalized : Number(existing?.weightPercent ?? 0),
          assignmentCount: existing?.assignmentCount ?? 0,
          targetCountWithRole: existing?.targetCountWithRole ?? 0,
          currentlyAvailable: Boolean(existing?.currentlyAvailable),
        };
      }),
    }));
  };

  const saveScoringConfig = async () => {
    if (!selectedCampaign) return;
    if (selectedCampaign.status !== 'DRAFT') {
      setError('Scoring weights can be changed only while the campaign is DRAFT.');
      return;
    }
    if (Math.round(relationshipWeightTotal * 100) / 100 !== 100) {
      setError(`Evaluator relationship weights must total 100%. Current total is ${relationshipWeightTotal}%.`);
      return;
    }
    setSavingScoringConfig(true);
    setError('');
    setSuccess('');
    try {
      const data = await feedbackCampaignApi.updateScoringConfig(selectedCampaign.id, {
        redistributeMissingRelationshipWeight: scoringConfig.redistributeMissingRelationshipWeight,
        relationshipWeights: RELATIONSHIP_ORDER.map(type => ({
          relationshipType: type,
          weightPercent: Number(scoringConfig.relationshipWeights.find(item => item.relationshipType === type)?.weightPercent ?? 0),
        })),
      });
      setScoringConfig(data);
      setForm(current => ({ ...current, redistributeMissingRelationshipWeight: data.redistributeMissingRelationshipWeight }));
      setSuccess('Campaign relationship weights saved. Missing role weights will be handled according to the redistribution setting.');
      await loadActivationState(selectedCampaign.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scoring configuration could not be saved.');
    } finally {
      setSavingScoringConfig(false);
    }
  };

  const updateCompetencyWeight = (competencyCode: string, value: number) => {
    const normalized = roundPercent(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)));
    setQuestionReview(current => ({
      ...current,
      competencyWeightsReady: false,
      competencyWeights: (current.competencyWeights ?? []).map(item => (
          item.competencyCode === competencyCode ? { ...item, weightPercent: normalized, saved: false } : item
      )),
    }));
  };

  const balanceCompetencyWeightsByQuestions = () => {
    setQuestionReview(current => ({
      ...current,
      competencyWeightsReady: false,
      competencyWeights: (current.competencyWeights ?? []).map(item => ({
        ...item,
        weightPercent: roundPercent(Number(item.defaultWeightPercent ?? 0)),
        saved: false,
      })),
    }));
  };

  const equalizeCompetencyWeights = () => {
    setQuestionReview(current => {
      const weights = current.competencyWeights ?? [];
      const percentages = allocateEqualPercentages(weights.length);
      return {
        ...current,
        competencyWeightsReady: false,
        competencyWeights: weights.map((item, index) => ({
          ...item,
          weightPercent: percentages[index] ?? 0,
          saved: false,
        })),
      };
    });
  };

  const saveQuestionReview = async () => {
    if (!selectedCampaign) return;
    if (selectedCampaign.status !== 'DRAFT') {
      setError('Campaign questions can be changed only while the campaign is DRAFT.');
      return;
    }
    const selections = questionReview.groups.flatMap(group => group.questions.map(question => ({
      selectionId: question.selectionId ?? null,
      relationshipType: group.relationshipType,
      targetLevelCode: group.targetLevelCode,
      questionCode: question.questionCode,
      included: Boolean(question.included),
      required: Boolean(question.required),
      sectionOrder: question.sectionOrder ?? null,
      displayOrder: question.displayOrder ?? null,
    })));
    if (selections.length === 0) {
      setError('Resolve campaign questions before saving.');
      return;
    }
    const emptyGroups = questionReview.groups.filter(group => group.questions.filter(question => question.included).length === 0);
    if (emptyGroups.length > 0) {
      setError('Each form needs at least one included question.');
      return;
    }
    if (competencyWeights.length === 0) {
      setError('Scoring weights are required before saving.');
      return;
    }
    if (!competencyWeightsReady) {
      setError(`Competency weights must total 100%. Current total is ${formatPercent(competencyWeightTotal)}%.`);
      return;
    }
    setSavingQuestionReview(true);
    setError('');
    setSuccess('');
    try {
      const data = await feedbackCampaignApi.saveQuestionReview(selectedCampaign.id, {
        selections,
        competencyWeights: competencyWeights.map(item => ({
          competencyCode: item.competencyCode,
          weightPercent: Number(item.weightPercent ?? 0),
        })),
      });
      setQuestionReview(data);
      setSelectedQuestionGroupKey(data.groups[0]?.groupKey ?? '');
      setSuccess('Question review saved.');
      setActiveStepKey('launch');
      await loadScoringConfig(selectedCampaign.id);
      await loadActivationState(selectedCampaign.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Question review could not be saved.');
    } finally {
      setSavingQuestionReview(false);
    }
  };

  const refreshActivationAfterLifecycle = async (campaignId: number) => {
    await loadCampaignSnapshot(campaignId, selectedCampaign);
    await refreshCampaigns();
    await loadScoringConfig(campaignId);
    await loadActivationState(campaignId);
  };

  const validateSelectedCampaignSetup = async () => {
    if (!selectedCampaign) return;
    const warningText = activationWarnings > 0
        ? `

There are ${activationWarnings} warning(s). Validation is allowed, but HR should review them first.`
        : '';
    const confirmed = window.confirm(`Validate setup for "${selectedCampaign.name}"?

This will lock campaign setup and move it to Ready to activate. You can launch after validation.${warningText}`);
    if (!confirmed) return;
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
    const warningText = activationWarnings > 0
        ? `

There are ${activationWarnings} warning(s). Activation is allowed, but HR should review them first.`
        : '';
    const confirmed = window.confirm(`Activate "${selectedCampaign.name}"?

This will generate final feedback question snapshots, notify evaluators, and move the campaign to ACTIVE.${warningText}`);
    if (!confirmed) return;
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

  const canEditSelected = !selectedCampaign || selectedCampaign.status === 'DRAFT';
  const canEditTargets = Boolean(selectedCampaign && selectedCampaign.status === 'DRAFT');

  const setupSteps: Array<{ key: SetupStepKey; label: string; note: string; status: string; icon: string; unlocked: boolean; done: boolean }> = [
    {
      key: 'foundation',
      label: 'Foundation',
      note: 'Campaign info and policy',
      status: selectedCampaign ? 'Saved' : 'Start here',
      icon: 'bi-pencil-square',
      unlocked: true,
      done: Boolean(selectedCampaign),
    },
    {
      key: 'targets',
      label: 'Targets',
      note: 'Select employees',
      status: selectedCampaign ? `${targetIdsNormalized.length} selected` : 'Save draft first',
      icon: 'bi-people',
      unlocked: Boolean(selectedCampaign),
      done: savedTargetIds.length > 0 && !hasUnsavedTargetChanges && !hasUnavailableSelection,
    },
    {
      key: 'evaluators',
      label: 'Evaluators',
      note: 'Generate review network',
      status: savedTargetIds.length > 0 ? (savedAssignmentCount > 0 ? `${savedAssignmentCount} generated` : 'Ready to configure') : 'Save targets first',
      icon: 'bi-diagram-3',
      unlocked: savedTargetIds.length > 0 && !hasUnsavedTargetChanges && !hasUnavailableSelection,
      done: savedAssignmentCount > 0,
    },
    {
      key: 'questions',
      label: 'Question Review',
      note: 'Campaign question set',
      status: savedAssignmentCount > 0 ? (questionReviewReady ? `${questionReview.includedQuestionCount} saved` : 'Ready to review') : 'Generate evaluators first',
      icon: 'bi-ui-checks-grid',
      unlocked: savedAssignmentCount > 0,
      done: questionReviewReady,
    },
    {
      key: 'launch',
      label: 'Review & Launch',
      note: 'Final check before launch',
      status: questionReviewReady ? 'Ready for validation' : 'Save questions first',
      icon: 'bi-rocket-takeoff',
      unlocked: questionReviewReady || ['READY_TO_ACTIVATE', 'ACTIVE', 'CLOSED', 'PUBLISHED'].includes(selectedCampaign?.status ?? ''),
      done: ['READY_TO_ACTIVATE', 'ACTIVE', 'CLOSED', 'PUBLISHED'].includes(selectedCampaign?.status ?? ''),
    },
  ];

  const lastUnlockedStep = [...setupSteps].reverse().find((step) => step.unlocked)?.key ?? 'foundation';

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

import { type DragEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import { authStorage } from '../../../services/authStorage';
import {
  DEFAULT_EVALUATOR_CONFIG,
  getPeerReviewerCount,
  hasAnyEvaluatorSource,
  normalizeEvaluatorConfig,
} from '../../../types/feedbackCampaign';
import type {
  CreateFeedbackCampaignInput,
  FeedbackCampaign,
  FeedbackCampaignStatus,
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

interface Props {
  onCampaignCreated: (campaign: FeedbackCampaign) => void;
}

type FieldErrors = Record<string, string>;
type ReadinessFilter = 'ALL' | 'AVAILABLE' | 'READY' | 'WARNINGS' | 'BLOCKED';
type SetupStepKey = 'foundation' | 'targets' | 'evaluators' | 'questions' | 'launch';
type QuestionDragPayload =
    | { kind: 'competency'; groupKey: string; sectionCode: string }
    | { kind: 'question'; groupKey: string; sectionCode: string; questionCode: string };

type CampaignInfoForm = {
  name: string;
  reviewYear: number | '';
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  description: string;
  instructions: string;
  autoSubmitCompletedDraftsOnClose: boolean;
  managerFeedbackAnonymous: boolean;
  peerFeedbackAnonymous: boolean;
  subordinateFeedbackAnonymous: boolean;
  selfFeedbackAnonymous: boolean;
  redistributeMissingRelationshipWeight: boolean;
};

const DEFAULT_CAMPAIGN_TYPE = '360 Feedback';
const DESCRIPTION_LIMIT = 2000;
const INSTRUCTIONS_LIMIT = 4000;
const INSTRUCTION_TEMPLATE = 'Rate recent, observable work behavior. Use specific examples where possible, keep comments constructive, and avoid personal or unrelated remarks.';

const padTime = (value: number) => String(value).padStart(2, '0');
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? 0 : 30;
  return `${padTime(hours)}:${padTime(minutes)}`;
});

const buildLocalDateTime = (date: string, time: string) => date && time ? `${date}T${time}` : '';
const formatTimeLabel = (time: string) => {
  const [hourRaw, minuteRaw] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hourRaw, minuteRaw, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
};

const statusLabels: Record<FeedbackCampaignStatus, string> = {
  DRAFT: 'Draft',
  READY_TO_ACTIVATE: 'Ready to activate',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  PUBLISHED: 'Published',
};

const statusDescriptions: Record<FeedbackCampaignStatus, string> = {
  DRAFT: 'Editable setup draft',
  READY_TO_ACTIVATE: 'Setup passed validation',
  ACTIVE: 'Collecting feedback',
  CLOSED: 'Submission closed',
  PUBLISHED: 'Reports published',
};

const normalizeDateTimeForApi = (value: string) => value.length === 16 ? `${value}:00` : value;

const defaultForm = (): CampaignInfoForm => ({
  name: '',
  reviewYear: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  description: '',
  instructions: '',
  autoSubmitCompletedDraftsOnClose: false,
  managerFeedbackAnonymous: false,
  peerFeedbackAnonymous: true,
  subordinateFeedbackAnonymous: true,
  selfFeedbackAnonymous: false,
  redistributeMissingRelationshipWeight: true,
});

const emptyTargetsResponse = (campaign?: FeedbackCampaign | null): FeedbackCampaignTargetsResponse => ({
  campaignId: campaign?.id ?? 0,
  campaignName: campaign?.name ?? '',
  campaignStatus: campaign?.status ?? 'DRAFT',
  targetCount: 0,
  readyCount: 0,
  warningCount: 0,
  blockedCount: 0,
  targets: [],
  warnings: [],
});

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
};

const formatWindow = (campaign: FeedbackCampaign) => `${formatDateTime(campaign.startAt ?? campaign.startDate)} - ${formatDateTime(campaign.endAt ?? campaign.endDate)}`;
const statusClass = (status: FeedbackCampaignStatus | string) => `hfd-status-badge ${String(status).replace(/_/g, '-')}`;

const completionLabel = (campaign: FeedbackCampaign) => {
  if (!campaign.assignmentCount || campaign.assignmentCount <= 0) return 'Not generated';
  return `${campaign.assignmentCount} assignment${campaign.assignmentCount === 1 ? '' : 's'}`;
};

const CampaignStat = ({ icon, label, value, note, tone }: { icon: string; label: string; value: number | string; note: string; tone: string }) => (
    <div className={`hfdq-stat-card ${tone}`}>
      <span className="hfdq-stat-icon"><i className={icon} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{note}</em>
      </div>
    </div>
);

const normalizeList = (ids: Iterable<number>) => Array.from(new Set(ids)).sort((left, right) => left - right);
const sameIds = (left: number[], right: number[]) => left.length === right.length && left.every((id, index) => id === right[index]);

const readinessLabel = (item: FeedbackTargetCandidate) => {
  if (!item.eligible) return 'Not available';
  if (item.warnings.length > 0) return 'Needs review';
  return 'Ready';
};

const readinessClass = (item: FeedbackTargetCandidate) => {
  if (!item.eligible) return 'blocked';
  if (item.warnings.length > 0) return 'warning';
  return 'ready';
};


const recipientDetailItems = (item: FeedbackTargetCandidate) => [
  { label: 'Manager', value: item.managerName ?? 'Not set' },
  { label: 'Possible peers', value: String(item.peerCandidateCount ?? 0) },
  { label: 'Direct reports', value: String(item.subordinateCandidateCount ?? 0) },
  { label: 'Teams', value: item.activeTeamNames.length > 0 ? item.activeTeamNames.join(', ') : 'Not set' },
];


const questionDragMime = 'application/x-epms-question-review';
const sortQuestionItems = <T extends { sectionOrder?: number | null; displayOrder?: number | null; questionCode?: string | null }>(items: T[]) =>
    [...items].sort((left, right) =>
        Number(left.sectionOrder ?? 9999) - Number(right.sectionOrder ?? 9999)
        || Number(left.displayOrder ?? 9999) - Number(right.displayOrder ?? 9999)
        || String(left.questionCode ?? '').localeCompare(String(right.questionCode ?? '')),
    );

const normalizeCompetencyTitle = (title?: string | null, code?: string | null) => {
  const cleanTitle = String(title ?? '').trim();
  const genericTitle = !cleanTitle || cleanTitle === 'Questions' || /^competency\s*\d+$/i.test(cleanTitle);
  if (!genericTitle) return cleanTitle;
  const cleanCode = String(code ?? '').trim();
  return cleanCode || 'Unmapped competency';
};

const isReviewQuestionScored = (question: FeedbackCampaignQuestionGroup['questions'][number]) => {
  const responseType = String(question.responseType ?? '').toUpperCase();
  const scoringBehavior = String(question.scoringBehavior ?? '').toUpperCase();
  return scoringBehavior === 'SCORED' && (responseType === 'RATING' || responseType === 'RATING_WITH_COMMENT');
};

const sameStringSet = (left: Set<string>, right: Set<string>) =>
    left.size === right.size && Array.from(left).every(value => right.has(value));

const roundPercent = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

const formatPercent = (value?: number | null) => {
  const rounded = roundPercent(Number(value ?? 0));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const allocateEqualPercentages = (count: number) => {
  if (count <= 0) return [];
  const baseCents = Math.floor(10000 / count);
  let remaining = 10000 - (baseCents * count);
  return Array.from({ length: count }, () => {
    const cents = baseCents + (remaining > 0 ? 1 : 0);
    if (remaining > 0) remaining -= 1;
    return roundPercent(cents / 100);
  });
};

type QuestionCompetencyGroup = {
  sectionCode: string;
  sectionTitle: string;
  sectionOrder: number;
  questions: FeedbackCampaignQuestionGroup['questions'];
};

const getQuestionSectionCode = (question: FeedbackCampaignQuestionGroup['questions'][number]) =>
    String(question.competencyCode || question.sectionCode || 'UNMAPPED').trim();

const buildQuestionCompetencies = (questions: FeedbackCampaignQuestionGroup['questions'] = []): QuestionCompetencyGroup[] => {
  const bySection = new Map<string, QuestionCompetencyGroup>();
  sortQuestionItems(questions).forEach((question) => {
    const sectionCode = getQuestionSectionCode(question);
    const existing = bySection.get(sectionCode) ?? {
      sectionCode,
      sectionTitle: normalizeCompetencyTitle(question.competencyName || question.sectionTitle, question.competencyCode),
      sectionOrder: Number(question.sectionOrder ?? bySection.size + 1),
      questions: [],
    };
    existing.sectionTitle = normalizeCompetencyTitle(question.competencyName || question.sectionTitle || existing.sectionTitle, question.competencyCode);
    existing.sectionOrder = Math.min(existing.sectionOrder, Number(question.sectionOrder ?? existing.sectionOrder));
    existing.questions = sortQuestionItems([...existing.questions, question]);
    bySection.set(sectionCode, existing);
  });
  return Array.from(bySection.values()).sort((left, right) => left.sectionOrder - right.sectionOrder || left.sectionTitle.localeCompare(right.sectionTitle));
};

const emptyAssignmentPreview = (campaign?: FeedbackCampaign | null): FeedbackAssignmentGenerationResponse => ({
  campaignId: campaign?.id ?? 0,
  totalTargets: 0,
  totalEvaluatorsGenerated: 0,
  evaluatorConfig: null,
  requests: [],
  assignmentDetails: [],
  warnings: [],
});


const emptyActivationReadiness = (campaign?: FeedbackCampaign | null): FeedbackCampaignActivationReadiness => ({
  campaignId: campaign?.id ?? 0,
  campaignName: campaign?.name ?? '',
  campaignStatus: campaign?.status ?? 'DRAFT',
  ready: false,
  canMarkReady: false,
  canActivate: false,
  summary: {
    targetCount: 0,
    assignmentCount: 0,
    questionSelectionCount: 0,
    assignmentQuestionSnapshotCount: 0,
    pendingAssignmentCount: 0,
    inProgressAssignmentCount: 0,
    submittedAssignmentCount: 0,
    completionPercent: 0,
  },
  checks: [],
  blockingIssues: [],
  warnings: [],
});

const RELATIONSHIP_ORDER: FeedbackRelationshipType[] = ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'];

const emptyScoringConfig = (campaign?: FeedbackCampaign | null): FeedbackCampaignScoringConfig => ({
  campaignId: campaign?.id ?? 0,
  campaignName: campaign?.name ?? '',
  campaignStatus: campaign?.status ?? 'DRAFT',
  redistributeMissingRelationshipWeight: campaign?.redistributeMissingRelationshipWeight !== false,
  totalRelationshipWeight: 100,
  relationshipWeightsReady: true,
  relationshipWeights: [
    { relationshipType: 'MANAGER', label: 'Manager', weightPercent: 40, assignmentCount: 0, targetCountWithRole: 0, currentlyAvailable: false },
    { relationshipType: 'PEER', label: 'Peer', weightPercent: 30, assignmentCount: 0, targetCountWithRole: 0, currentlyAvailable: false },
    { relationshipType: 'SUBORDINATE', label: 'Subordinate', weightPercent: 20, assignmentCount: 0, targetCountWithRole: 0, currentlyAvailable: false },
    { relationshipType: 'SELF', label: 'Self', weightPercent: 10, assignmentCount: 0, targetCountWithRole: 0, currentlyAvailable: false },
  ],
  warnings: [],
});

const emptyQuestionReview = (campaign?: FeedbackCampaign | null): FeedbackCampaignQuestionReview => ({
  campaignId: campaign?.id ?? 0,
  campaignName: campaign?.name ?? '',
  campaignStatus: campaign?.status ?? 'DRAFT',
  saved: false,
  targetCount: 0,
  assignmentCount: 0,
  groupCount: 0,
  questionCount: 0,
  includedQuestionCount: 0,
  scoredQuestionCount: 0,
  includedScoredQuestionCount: 0,
  totalCompetencyWeight: 0,
  competencyWeightsReady: false,
  lastSavedAt: null,
  warnings: [],
  competencyWeights: [],
  groups: [],
});


const activationCheckClass = (status?: string | null) => {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'PASS') return 'ready';
  if (normalized === 'WARNING') return 'warning';
  return 'blocked';
};

const activationCheckIcon = (status?: string | null) => {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'PASS') return 'bi-check-circle-fill';
  if (normalized === 'WARNING') return 'bi-exclamation-triangle-fill';
  return 'bi-x-circle-fill';
};

const launchCheckLabels: Record<string, string> = {
  LIFECYCLE: 'Lifecycle gate',
  CAMPAIGN_INFO: 'Campaign details',
  TARGETS: 'Recipients',
  EVALUATOR_ASSIGNMENTS: 'Evaluator assignments',
  QUESTION_SELECTION: 'Question review',
  RELATIONSHIP_WEIGHTS: 'Relationship weights',
  COMPETENCY_WEIGHTS: 'Competency weights',
  SUBMISSION_WINDOW: 'Submission window',
  PRIVACY_POLICY: 'Privacy settings',
};

const launchCheckLabel = (key?: string | null, fallback?: string | null) => launchCheckLabels[String(key ?? '').toUpperCase()] ?? fallback ?? 'Setup check';

const launchCheckMessage = (key?: string | null, status?: string | null, fallback?: string | null) => {
  const normalizedKey = String(key ?? '').toUpperCase();
  const normalizedStatus = String(status ?? '').toUpperCase();
  if (normalizedStatus === 'PASS') return fallback ?? 'Ready.';
  if (normalizedKey === 'LIFECYCLE') return fallback ?? 'Validate setup before launching.';
  if (normalizedKey === 'QUESTION_SELECTION') return 'Save the question review before launching.';
  if (normalizedKey === 'RELATIONSHIP_WEIGHTS') return 'Evaluator role weights must total 100%.';
  if (normalizedKey === 'COMPETENCY_WEIGHTS') return 'Competency weights must total 100%.';
  if (normalizedKey === 'TARGETS') return 'Select and save at least one feedback recipient.';
  if (normalizedKey === 'EVALUATOR_ASSIGNMENTS') return 'Generate evaluator assignments before launching.';
  if (normalizedKey === 'SUBMISSION_WINDOW') return fallback ?? 'Review the submission window before launching.';
  return fallback ?? 'Review this item before launching.';
};

const assignmentReadinessClass = (item: { warnings: string[]; totalAssignments: number }) => {
  if (item.totalAssignments <= 0) return 'blocked';
  if (item.warnings.length > 0) return 'warning';
  return 'ready';
};

const personSubtitle = (item: FeedbackTargetCandidate) => [
  item.employeeCode,
  item.email,
].filter(Boolean).join(' · ') || `Employee #${item.employeeId}`;

const initials = (name?: string | null) =>
    (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';

const relationshipLabel = (type: FeedbackRelationshipType | string) => {
  switch (type) {
    case 'MANAGER':
      return 'Manager';
    case 'PEER':
      return 'Peer';
    case 'SUBORDINATE':
      return 'Direct Report';
    case 'SELF':
      return 'Self';
    default:
      return String(type).replace(/_/g, ' ');
  }
};

const relationshipIcon = (type: FeedbackRelationshipType | string) => {
  switch (type) {
    case 'MANAGER':
      return 'bi-person-workspace';
    case 'PEER':
      return 'bi-people';
    case 'SUBORDINATE':
      return 'bi-person-lines-fill';
    case 'SELF':
      return 'bi-person-check';
    default:
      return 'bi-person';
  }
};

const assignmentSourceLabel = (assignment: FeedbackAssignmentDetailItem) => {
  if (assignment.selectionMethod === 'MANUAL') return 'Added by HR';
  if (assignment.relationshipType === 'PEER') return 'Suggested';
  return 'Included';
};

const assignmentStatusLabel = (status?: string | null) => {
  switch (status) {
    case 'SUBMITTED':
      return 'Submitted';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'CANCELLED':
      return 'Cancelled';
    case 'DECLINED':
      return 'Declined';
    default:
      return 'Pending';
  }
};

const cleanEvaluatorNote = (message: string) => {
  if (message.includes('No active direct manager')) return 'Manager not found.';
  if (message.includes('No direct reports')) return 'No direct reports found.';
  if (message.includes('No active team')) return 'Team not set.';
  if (message.includes('No current department')) return 'Department not set.';
  if (message.includes('eligible peer')) return 'Fewer peer reviewers are available.';
  if (message.includes('eligible subordinate')) return 'Fewer direct report reviewers are available.';
  if (message.includes('manual evaluator')) return 'Evaluator added by HR was kept.';
  return message;
};

const relationshipOptions: Array<{ value: Exclude<FeedbackRelationshipType, 'SELF'>; label: string }> = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'PEER', label: 'Peer' },
  { value: 'SUBORDINATE', label: 'Direct Report' },
];

type DraftEvaluatorAddition = ManualAssignmentInput & { draftId: string };

const assignmentKey = (assignment: Pick<FeedbackAssignmentDetailItem, 'targetEmployeeId' | 'evaluatorEmployeeId' | 'relationshipType'>) =>
    `${assignment.targetEmployeeId}:${assignment.evaluatorEmployeeId}:${assignment.relationshipType}`;

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
  const [expandedQuestionCompetencies, setExpandedQuestionCompetencies] = useState<Set<string>>(() => new Set());
  const [expandedQuestionPreviews, setExpandedQuestionPreviews] = useState<Set<string>>(() => new Set());

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
  const activeEvaluatorAssignments = assignmentsByTarget.get(activeEvaluatorTargetId) ?? [];
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
  const selectedQuestionCompetencies = useMemo(() => buildQuestionCompetencies(selectedQuestionGroup?.questions ?? []), [selectedQuestionGroup]);
  const selectedQuestionCompetencyKeys = useMemo(() => selectedQuestionCompetencies.map(competency => competency.sectionCode).join('|'), [selectedQuestionCompetencies]);
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
  const launchBannerTitle = launchReady
      ? 'Ready to launch'
      : setupReady && selectedCampaign?.status === 'DRAFT'
          ? 'Ready for final validation'
          : 'Needs attention';
  const launchBannerMessage = launchReady
      ? 'Setup is validated and locked. Launching this campaign will open feedback collection.'
      : setupReady && selectedCampaign?.status === 'DRAFT'
          ? 'All setup checks pass. Validate the setup first, then launch the campaign.'
          : 'Fix the items below before launching this campaign.';
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

  useEffect(() => {
    if (!selectedQuestionGroup || selectedQuestionCompetencies.length === 0) return;
    const currentKeys = selectedQuestionCompetencies.map(competency => `${selectedQuestionGroup.groupKey}:${competency.sectionCode}`);
    setExpandedQuestionCompetencies(current => {
      const stillValid = new Set(Array.from(current).filter(key => currentKeys.includes(key)));
      const next = stillValid.size > 0 ? stillValid : new Set([currentKeys[0]]);
      return sameStringSet(current, next) ? current : next;
    });
  }, [selectedQuestionGroup?.groupKey, selectedQuestionCompetencyKeys]);

  const isQuestionCompetencyExpanded = (groupKey: string, sectionCode: string) =>
      expandedQuestionCompetencies.has(`${groupKey}:${sectionCode}`);

  const toggleQuestionCompetency = (groupKey: string, sectionCode: string) => {
    const key = `${groupKey}:${sectionCode}`;
    setExpandedQuestionCompetencies(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const questionPreviewKey = (groupKey: string, questionCode: string) => `${groupKey}:${questionCode}`;

  const isQuestionPreviewExpanded = (groupKey: string, questionCode: string) =>
      expandedQuestionPreviews.has(questionPreviewKey(groupKey, questionCode));

  const toggleQuestionPreview = (groupKey: string, questionCode: string) => {
    const key = questionPreviewKey(groupKey, questionCode);
    setExpandedQuestionPreviews(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
      setSelectedEvaluatorTargetId(0);
      setManualForm(current => ({ ...current, targetEmployeeId: 0, evaluatorEmployeeId: 0 }));
      return;
    }
    if (!selectedEvaluatorTargetId || !evaluatorTargets.some(target => target.employeeId === selectedEvaluatorTargetId)) {
      setSelectedEvaluatorTargetId(firstTargetId);
    }
  }, [evaluatorTargets, selectedEvaluatorTargetId]);

  useEffect(() => {
    setManualForm(current => ({
      ...current,
      targetEmployeeId: activeEvaluatorTargetId,
      evaluatorEmployeeId: assignedEvaluatorIdsForActiveTarget.has(current.evaluatorEmployeeId) ? 0 : current.evaluatorEmployeeId,
    }));
  }, [activeEvaluatorTargetId, assignedEvaluatorIdsForActiveTarget]);

  const applyForm = (campaign: FeedbackCampaign) => {
    setForm({
      name: campaign.name,
      reviewYear: campaign.reviewYear ?? '',
      startDate: (campaign.startAt ?? campaign.startDate ?? '').slice(0, 10),
      startTime: (campaign.startAt ?? '').slice(11, 16),
      endDate: (campaign.endAt ?? campaign.endDate ?? '').slice(0, 10),
      endTime: (campaign.endAt ?? '').slice(11, 16),
      description: campaign.description ?? '',
      instructions: campaign.instructions ?? '',
      autoSubmitCompletedDraftsOnClose: Boolean(campaign.autoSubmitCompletedDraftsOnClose),
      managerFeedbackAnonymous: Boolean(campaign.managerFeedbackAnonymous),
      peerFeedbackAnonymous: campaign.peerFeedbackAnonymous !== false,
      subordinateFeedbackAnonymous: campaign.subordinateFeedbackAnonymous !== false,
      selfFeedbackAnonymous: Boolean(campaign.selfFeedbackAnonymous),
      redistributeMissingRelationshipWeight: campaign.redistributeMissingRelationshipWeight !== false,
    });
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
    const nextErrors: FieldErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Campaign name is required.';
    if (form.name.trim().length > 255) nextErrors.name = 'Campaign name cannot exceed 255 characters.';
    const reviewYear = Number(form.reviewYear);
    if (!form.reviewYear || !Number.isFinite(reviewYear) || reviewYear < 2000 || reviewYear > 2100) nextErrors.reviewYear = 'Enter a review year between 2000 and 2100.';
    if (!form.startDate) nextErrors.startAt = 'Choose a start date.';
    if (!form.startTime) nextErrors.startAt = nextErrors.startAt ?? 'Choose a start time.';
    if (!form.endDate) nextErrors.endAt = 'Choose an end date.';
    if (!form.endTime) nextErrors.endAt = nextErrors.endAt ?? 'Choose an end time.';
    const startAt = buildLocalDateTime(form.startDate, form.startTime);
    const endAt = buildLocalDateTime(form.endDate, form.endTime);
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) nextErrors.endAt = 'End date/time must be after start date/time.';
    if (form.description.length > DESCRIPTION_LIMIT) nextErrors.description = `Announcement cannot exceed ${DESCRIPTION_LIMIT.toLocaleString()} characters.`;
    if (form.instructions.length > INSTRUCTIONS_LIMIT) nextErrors.instructions = `Instructions cannot exceed ${INSTRUCTIONS_LIMIT.toLocaleString()} characters.`;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (): CreateFeedbackCampaignInput => ({
    name: form.name.trim(),
    campaignType: DEFAULT_CAMPAIGN_TYPE,
    reviewYear: Number(form.reviewYear),
    startAt: normalizeDateTimeForApi(buildLocalDateTime(form.startDate, form.startTime)),
    endAt: normalizeDateTimeForApi(buildLocalDateTime(form.endDate, form.endTime)),
    startDate: form.startDate,
    endDate: form.endDate,
    description: form.description.trim(),
    instructions: form.instructions.trim(),
    autoSubmitCompletedDraftsOnClose: form.autoSubmitCompletedDraftsOnClose,
    managerFeedbackAnonymous: form.managerFeedbackAnonymous,
    peerFeedbackAnonymous: form.peerFeedbackAnonymous,
    subordinateFeedbackAnonymous: form.subordinateFeedbackAnonymous,
    selfFeedbackAnonymous: form.selfFeedbackAnonymous,
    redistributeMissingRelationshipWeight: form.redistributeMissingRelationshipWeight,
  });

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = selectedCampaign
          ? await feedbackCampaignApi.updateCampaign(selectedCampaign.id, buildPayload())
          : await feedbackCampaignApi.createCampaign(buildPayload());
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

  const writeQuestionDragData = (event: DragEvent<HTMLElement>, payload: QuestionDragPayload) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(questionDragMime, JSON.stringify(payload));
  };

  const readQuestionDragData = (event: DragEvent<HTMLElement>): QuestionDragPayload | null => {
    try {
      const raw = event.dataTransfer.getData(questionDragMime);
      return raw ? JSON.parse(raw) as QuestionDragPayload : null;
    } catch {
      return null;
    }
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

        {activeStepKey === 'foundation' && (
            <section className="hfdq-table-card hfdc-info-card">
              <div className="hfdc-card-head">
                <div>
                  <span className="hfdq-kicker">Step 1</span>
                  <h3>Campaign Info</h3>
                  <p>Set the campaign identity, review year, feedback window, participant message, and privacy policy before choosing targets.</p>
                </div>
                <div className="hfdc-info-head-actions">
                  {selectedCampaign ? <span className={statusClass(selectedCampaign.status)}>{statusLabels[selectedCampaign.status] ?? selectedCampaign.status}</span> : <span className="hfd-status-badge DRAFT">New Draft</span>}
                  <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => setCampaignInfoOpen(current => !current)}>
                    <i className={`bi ${campaignInfoOpen ? 'bi-chevron-up' : 'bi-pencil-square'}`} /> {campaignInfoOpen ? 'Close' : selectedCampaign ? 'Edit Campaign Info' : 'Create Campaign Info'}
                  </button>
                </div>
              </div>

              {!campaignInfoOpen ? (
                  <div className="hfdc-info-summary">
                    <div className="hfdc-info-summary-main">
                      <span className="hfdc-info-summary-icon"><i className="bi bi-megaphone" /></span>
                      <div>
                        <strong>{selectedCampaign?.name || 'No campaign information saved'}</strong>
                        <p>{selectedCampaign ? formatWindow(selectedCampaign) : 'Create a draft campaign to continue target selection and evaluator setup.'}</p>
                      </div>
                    </div>
                    <div className="hfdc-info-summary-grid">
                      <span><small>Review year</small><strong>{selectedCampaign?.reviewYear ?? 'Not set'}</strong></span>
                      <span><small>Targets</small><strong>{targetsResponse.targetCount}</strong></span>
                      <span><small>Assignments</small><strong>{savedAssignmentCount}</strong></span>
                      <span><small>Status</small><strong>{selectedCampaign ? (statusLabels[selectedCampaign.status] ?? selectedCampaign.status) : 'Draft not saved'}</strong></span>
                    </div>
                  </div>
              ) : (
                  <form onSubmit={handleSave} noValidate>
                    <div className="hfdc-form-section hfdc-form-section-collapsible">
                      <div className="hfdc-context-card">
                        <span className="hfdc-context-icon"><i className="bi bi-person-badge" /></span>
                        <div>
                          <strong>Campaign owner</strong>
                          <small>{currentUser?.fullName ?? 'Current HR user'}{currentUser?.email ? ` · ${currentUser.email}` : ''}</small>
                        </div>
                      </div>

                      <div className="hfdc-context-card">
                        <span className="hfdc-context-icon"><i className="bi bi-globe2" /></span>
                        <div>
                          <strong>Timezone</strong>
                          <small>{localTimeZone}. All schedule times use this timezone.</small>
                        </div>
                      </div>
                      <label className="hfdc-field full">
                        <span>Campaign Name <em>*</em></span>
                        <input
                            className={`hfd-input ${errors.name ? 'error' : ''}`}
                            value={form.name}
                            disabled={!canEditSelected}
                            onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
                            placeholder="Example: Q2 Leadership 360 Review"
                        />
                        {errors.name ? <small className="hfd-error-msg">{errors.name}</small> : <small>Visible in setup screens, evaluator tasks, and campaign reports.</small>}
                      </label>

                      <label className="hfdc-field">
                        <span>Review Year <em>*</em></span>
                        <input
                            type="number"
                            min="2000"
                            max="2100"
                            className={`hfd-input ${errors.reviewYear ? 'error' : ''}`}
                            value={form.reviewYear}
                            disabled={!canEditSelected}
                            onChange={e => setForm(current => ({ ...current, reviewYear: e.target.value === '' ? '' : Number(e.target.value) }))}
                            placeholder="Example: 2026"
                        />
                        {errors.reviewYear ? <small className="hfd-error-msg">{errors.reviewYear}</small> : <small>Used for filtering, reporting, and historical comparison.</small>}
                      </label>

                      <div className="hfdc-date-time-field">
                        <span>Start Date & Time <em>*</em></span>
                        <div className="hfdc-date-time-grid">
                          <input
                              type="date"
                              className={`hfd-input ${errors.startAt ? 'error' : ''}`}
                              value={form.startDate}
                              disabled={!canEditSelected}
                              onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))}
                              aria-label="Start date"
                          />
                          <select
                              className={`hfd-input ${errors.startAt ? 'error' : ''}`}
                              value={form.startTime}
                              disabled={!canEditSelected}
                              onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))}
                              aria-label="Start time"
                          >
                            <option value="">Select time</option>
                            {TIME_OPTIONS.map(time => <option key={time} value={time}>{formatTimeLabel(time)}</option>)}
                          </select>
                        </div>
                        {errors.startAt ? <small className="hfd-error-msg">{errors.startAt}</small> : <small>Feedback collection opens at this date and time.</small>}
                      </div>

                      <div className="hfdc-date-time-field">
                        <span>End Date & Time <em>*</em></span>
                        <div className="hfdc-date-time-grid">
                          <input
                              type="date"
                              className={`hfd-input ${errors.endAt ? 'error' : ''}`}
                              value={form.endDate}
                              disabled={!canEditSelected}
                              onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))}
                              aria-label="End date"
                          />
                          <select
                              className={`hfd-input ${errors.endAt ? 'error' : ''}`}
                              value={form.endTime}
                              disabled={!canEditSelected}
                              onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))}
                              aria-label="End time"
                          >
                            <option value="">Select time</option>
                            {TIME_OPTIONS.map(time => <option key={time} value={time}>{formatTimeLabel(time)}</option>)}
                          </select>
                        </div>
                        {errors.endAt ? <small className="hfd-error-msg">{errors.endAt}</small> : <small>Feedback collection closes after this date and time.</small>}
                      </div>

                      <div className="hfdc-window-validation full">
                        <i className="bi bi-calendar2-check" />
                        <span>Campaign window conflicts are checked when the draft is saved.</span>
                      </div>

                      <label className="hfdc-field full">
                        <span>Participant Announcement</span>
                        <textarea
                            className={`hfd-input hfdc-textarea ${errors.description ? 'error' : ''}`}
                            rows={3}
                            value={form.description}
                            disabled={!canEditSelected}
                            onChange={e => setForm(current => ({ ...current, description: e.target.value }))}
                            placeholder="Example: Share concise feedback that helps employees understand strengths and growth opportunities for this review cycle."
                        />
                        <small className={form.description.length > DESCRIPTION_LIMIT ? 'hfd-error-msg' : ''}>{form.description.length}/{DESCRIPTION_LIMIT.toLocaleString()} characters · Shown to selected participants before they begin feedback.</small>
                        {errors.description ? <small className="hfd-error-msg">{errors.description}</small> : null}
                      </label>

                      <label className="hfdc-field full hfdc-template-field">
                        <span>Evaluator Instructions</span>
                        <textarea
                            className={`hfd-input hfdc-textarea ${errors.instructions ? 'error' : ''}`}
                            rows={3}
                            value={form.instructions}
                            disabled={!canEditSelected}
                            onChange={e => setForm(current => ({ ...current, instructions: e.target.value }))}
                            placeholder="Example: Rate recent, observable work behavior and include specific examples where helpful."
                        />
                        <div className="hfdc-field-footer">
                          <small className={form.instructions.length > INSTRUCTIONS_LIMIT ? 'hfd-error-msg' : ''}>{form.instructions.length}/{INSTRUCTIONS_LIMIT.toLocaleString()} characters · Displayed before evaluators submit feedback.</small>
                          <button className="hfd-btn hfd-btn-ghost" type="button" disabled={!canEditSelected} onClick={() => setForm(current => ({ ...current, instructions: current.instructions.trim() ? current.instructions : INSTRUCTION_TEMPLATE }))}>
                            <i className="bi bi-magic" /> Use template
                          </button>
                        </div>
                        {errors.instructions ? <small className="hfd-error-msg">{errors.instructions}</small> : null}
                      </label>

                      <details className="hfdc-advanced-policy full">
                        <summary>
                          <span><i className="bi bi-shield-lock" /> Privacy policy</span>
                          <small>Optional relationship-level anonymity settings</small>
                        </summary>
                        <div className="hfdc-policy-grid full">
                          <label className="hfdc-toggle-card compact">
                            <input type="checkbox" checked={form.managerFeedbackAnonymous} disabled={!canEditSelected} onChange={e => setForm(current => ({ ...current, managerFeedbackAnonymous: e.target.checked }))} />
                            <span><strong>Manager feedback anonymous</strong><small>Manager identity is hidden from the subject.</small></span>
                          </label>
                          <label className="hfdc-toggle-card compact">
                            <input type="checkbox" checked={form.peerFeedbackAnonymous} disabled={!canEditSelected} onChange={e => setForm(current => ({ ...current, peerFeedbackAnonymous: e.target.checked }))} />
                            <span><strong>Peer feedback anonymous</strong><small>Peer identity is hidden from the subject.</small></span>
                          </label>
                          <label className="hfdc-toggle-card compact">
                            <input type="checkbox" checked={form.subordinateFeedbackAnonymous} disabled={!canEditSelected} onChange={e => setForm(current => ({ ...current, subordinateFeedbackAnonymous: e.target.checked }))} />
                            <span><strong>Subordinate feedback anonymous</strong><small>Direct report identity is hidden from the subject.</small></span>
                          </label>
                          <label className="hfdc-toggle-card compact">
                            <input type="checkbox" checked={form.selfFeedbackAnonymous} disabled={!canEditSelected} onChange={e => setForm(current => ({ ...current, selfFeedbackAnonymous: e.target.checked }))} />
                            <span><strong>Self feedback anonymous</strong><small>Self feedback identity is hidden in reports.</small></span>
                          </label>
                        </div>
                      </details>
                    </div>

                    <div className="hfdc-form-actions">
                      {selectedCampaign?.status === 'DRAFT' && (
                          <button className="hfd-btn hfd-btn-danger" disabled={deleting} type="button" onClick={handleDeleteDraft}>
                            <i className="bi bi-trash" /> {deleting ? 'Deleting...' : 'Delete Draft'}
                          </button>
                      )}
                      <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => { setCampaignInfoOpen(false); setErrors({}); }}>Cancel</button>
                      <button id="btn-save-campaign-draft" type="submit" className="hfd-btn hfd-btn-primary" disabled={saving || !canEditSelected}>
                        <i className="bi bi-save2" /> {saving ? 'Saving...' : selectedCampaign ? 'Save Changes' : 'Save Draft'}
                      </button>
                    </div>
                  </form>
              )}
            </section>
        )}

        {activeStepKey === 'targets' && (
            <section className={`hfdq-table-card hfdt-card hfdt-recipient-workspace ${!selectedCampaign ? 'disabled' : ''}`}>
              <div className="hfdc-card-head hfdt-head">
                <div>
                  <span className="hfdq-kicker">Step 2</span>
                  <h3>Select Feedback Recipients</h3>
                  <p>Choose employees for this feedback cycle. Evaluators will be prepared in the next step.</p>
                </div>
                <div className="hfdt-summary-pills">
                  <span><strong>{targetIdsNormalized.length}</strong> selected</span>
                  <span><strong>{selectedReadyCount}</strong> ready</span>
                  <span><strong>{selectedReviewCount}</strong> review</span>
                  <span><strong>{selectedDepartmentCount}</strong> departments</span>
                </div>
              </div>

              {!selectedCampaign ? (
                  <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save campaign info first</strong><p>Recipient selection becomes available after campaign info is saved.</p></div>
              ) : (
                  <div className="hfdt-recipient-grid">
                    <div className="hfdt-directory-panel hfdt-recipient-directory">
                      <div className="hfdt-recipient-toolbar">
                        <div>
                          <span className="hfdq-kicker">Recipients</span>
                          <h4>Employee Directory</h4>
                          <p>Search and add employees to this campaign.</p>
                        </div>
                        <div className="hfdt-recipient-counts">
                          <span><strong>{availableCandidateCount}</strong> ready</span>
                          <span><strong>{reviewCandidateCount}</strong> need review</span>
                        </div>
                      </div>

                      <div className="hfdt-recipient-filters">
                        <label className="hfdc-field full search">
                          <span>Search employees</span>
                          <input className="hfd-input" value={targetSearch} onChange={event => setTargetSearch(event.target.value)} placeholder="Search by name, employee code, email, department, or position" />
                        </label>
                        <label className="hfdc-field">
                          <span>Department</span>
                          <select className="hfd-input" value={currentDepartmentId} onChange={event => setCurrentDepartmentId(event.target.value ? Number(event.target.value) : '')}>
                            <option value="">All departments</option>
                            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                          </select>
                        </label>
                        <label className="hfdc-field">
                          <span>Position</span>
                          <select className="hfd-input" value={positionFilter} onChange={event => setPositionFilter(event.target.value)}>
                            <option value="">All positions</option>
                            {positionOptions.map(position => <option key={position} value={position}>{position}</option>)}
                          </select>
                        </label>
                        <label className="hfdc-field">
                          <span>Status</span>
                          <select className="hfd-input" value={readiness} onChange={event => setReadiness(event.target.value as ReadinessFilter)}>
                            <option value="AVAILABLE">Available</option>
                            <option value="READY">Ready</option>
                            <option value="WARNINGS">Needs review</option>
                            <option value="BLOCKED">Not available</option>
                          </select>
                        </label>
                      </div>

                      <div className="hfdt-recipient-table">
                        <div className="hfdt-recipient-table-head">
                          <span>Employee</span>
                          <span>Department</span>
                          <span>Position</span>
                          <span>Manager</span>
                          <span>Status</span>
                          <span />
                        </div>
                        {loadingCandidates ? (
                            <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading employees...</div>
                        ) : candidateRows.length === 0 ? (
                            <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-search" /><strong>No employees found</strong><p>Try another search or adjust the filters.</p></div>
                        ) : candidateRows.map(candidate => {
                          const selected = targetIdsNormalized.includes(candidate.employeeId);
                          const availability = readinessClass(candidate);
                          return (
                              <article key={candidate.employeeId} className={`hfdt-recipient-row ${selected ? 'selected' : ''} ${availability}`}>
                                <div className="hfdt-recipient-person">
                                  <span className={`hfdt-readiness-dot ${availability}`} />
                                  <div>
                                    <strong>{candidate.employeeName}</strong>
                                    <small>{personSubtitle(candidate)}</small>
                                  </div>
                                </div>
                                <div className="hfdt-recipient-cell">
                                  <strong>{candidate.currentDepartmentName ?? 'Not set'}</strong>
                                  <small>{candidate.parentDepartmentName && candidate.parentDepartmentName !== candidate.currentDepartmentName ? candidate.parentDepartmentName : 'Current department'}</small>
                                </div>
                                <div className="hfdt-recipient-cell">
                                  <strong>{candidate.positionName ?? 'Not set'}</strong>
                                  <small>{candidate.employmentStatus ?? 'Employee'}</small>
                                </div>
                                <div className="hfdt-recipient-cell">
                                  <strong>{candidate.managerName ?? 'Not set'}</strong>
                                  <small>{candidate.managerName ? 'Reporting manager' : 'Needs review'}</small>
                                </div>
                                <div className="hfdt-status-stack">
                                  <span className={`hfdt-badge ${availability}`}>{readinessLabel(candidate)}</span>
                                  <button className="hfdt-text-button" type="button" onClick={() => setRecipientDetails(candidate)}>
                                    View details
                                  </button>
                                </div>
                                <div className="hfdt-row-actions">
                                  <button className={`hfd-btn ${selected ? 'hfd-btn-ghost' : 'hfd-btn-secondary'}`} type="button" disabled={!canEditTargets || !candidate.eligible} onClick={() => toggleTarget(candidate)}>
                                    {selected ? <><i className="bi bi-check2" /> Selected</> : <><i className="bi bi-plus-lg" /> Add</>}
                                  </button>
                                </div>
                              </article>
                          );
                        })}
                      </div>
                    </div>

                    <aside className="hfdt-selected-panel hfdt-recipient-summary">
                      <div className="hfdt-selected-head">
                        <div>
                          <span className="hfdq-kicker">Selected recipients</span>
                          <h4>{targetIdsNormalized.length} employee{targetIdsNormalized.length === 1 ? '' : 's'}</h4>
                          <p>{selectedReadyCount} ready · {selectedReviewCount} need review</p>
                        </div>
                        {hasUnsavedTargetChanges && <span className="hfdt-unsaved"><i className="bi bi-dot" /> Unsaved</span>}
                      </div>

                      {targetsResponse.warnings.length > 0 && (
                          <div className="hfdt-response-warnings">
                            {targetsResponse.warnings.map(item => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                          </div>
                      )}

                      {hasUnavailableSelection && (
                          <div className="hfdt-response-warnings blocked">
                            <span><i className="bi bi-slash-circle" /> Remove unavailable recipients to continue.</span>
                          </div>
                      )}

                      <div className="hfdt-summary-strip">
                        <span><strong>{targetIdsNormalized.length}</strong><small>Total selected</small></span>
                        <span><strong>{selectedDepartmentCount}</strong><small>Departments</small></span>
                        <span><strong>{selectedReviewCount}</strong><small>Need review</small></span>
                      </div>

                      {selectedDepartmentSummary.length > 0 && (
                          <div className="hfdt-department-summary">
                            <strong>Departments selected</strong>
                            <div>
                              {selectedDepartmentSummary.map(([department, count]) => <span key={department}>{department} · {count}</span>)}
                            </div>
                          </div>
                      )}

                      {recipientDetails && (
                          <div className={`hfdt-recipient-detail-card ${readinessClass(recipientDetails)}`}>
                            <div className="hfdt-recipient-detail-head">
                              <div>
                                <span className="hfdq-kicker">Employee details</span>
                                <strong>{recipientDetails.employeeName}</strong>
                                <small>{recipientDetails.positionName ?? 'Position not set'} · {recipientDetails.currentDepartmentName ?? 'Department not set'}</small>
                              </div>
                              <button type="button" className="hfdt-icon-button" onClick={() => setRecipientDetails(null)} aria-label="Close details"><i className="bi bi-x-lg" /></button>
                            </div>
                            <div className="hfdt-recipient-detail-grid">
                              {recipientDetailItems(recipientDetails).map(item => (
                                  <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>
                              ))}
                            </div>
                            {(recipientDetails.blockReasons.length > 0 || recipientDetails.warnings.length > 0 || recipientDetails.notes.length > 0) && (
                                <div className="hfdt-recipient-detail-notes">
                                  {recipientDetails.blockReasons.map(reason => <span key={reason} className="blocked"><i className="bi bi-slash-circle" />{reason}</span>)}
                                  {recipientDetails.warnings.map(reason => <span key={reason} className="warning"><i className="bi bi-exclamation-triangle" />{reason}</span>)}
                                  {recipientDetails.notes.map(note => <span key={note} className="note"><i className="bi bi-info-circle" />{note}</span>)}
                                </div>
                            )}
                          </div>
                      )}

                      <div className="hfdt-selected-list">
                        {loadingTargets ? (
                            <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading saved recipients...</div>
                        ) : selectedTargets.length === 0 ? (
                            <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-person-plus" /><strong>No recipients selected</strong><p>Add employees from the directory to continue.</p></div>
                        ) : selectedTargets.map(target => (
                            <div key={target.employeeId} className={`hfdt-selected-card ${readinessClass(target)}`}>
                              <div>
                                <strong>{target.employeeName}</strong>
                                <small>{target.currentDepartmentName ?? 'Department not set'} · {target.positionName ?? 'Position not set'}</small>
                              </div>
                              <div className="hfdt-selected-metrics compact">
                                <span><b>{target.peerCandidateCount}</b> possible peers</span>
                                <span><b>{target.subordinateCandidateCount}</b> direct reports</span>
                              </div>
                              {(target.warnings.length > 0 || target.notes.length > 0) && (
                                  <div className="hfdt-selected-issues">
                                    {target.warnings.slice(0, 1).map(warning => <span key={warning}><i className="bi bi-exclamation-triangle" /> {warning}</span>)}
                                    {target.notes.slice(0, 1).map(note => <span key={note} className="note"><i className="bi bi-info-circle" /> {note}</span>)}
                                  </div>
                              )}
                              <button type="button" className="hfd-btn hfd-btn-secondary" onClick={() => setRecipientDetails(target)}>
                                <i className="bi bi-info-circle" /> Details
                              </button>
                              <button type="button" className="hfd-btn hfd-btn-ghost" disabled={!canEditTargets} onClick={() => removeSelectedTarget(target.employeeId)}>
                                <i className="bi bi-x-lg" /> Remove
                              </button>
                            </div>
                        ))}
                      </div>

                      <div className="hfdt-selected-actions">
                        <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!canEditTargets || !hasUnsavedTargetChanges} onClick={() => setSelectedTargetIds(savedTargetIds)}>
                          Reset
                        </button>
                        <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canEditTargets || savingTargets || targetIdsNormalized.length === 0 || !hasUnsavedTargetChanges || hasUnavailableSelection} onClick={() => void saveTargets()}>
                          <i className="bi bi-save2" /> {savingTargets ? 'Saving...' : 'Save Recipients'}
                        </button>
                      </div>
                    </aside>
                  </div>
              )}
            </section>
        )}

        {activeStepKey === 'evaluators' && (
            <section className={`hfdq-table-card hfde-card hfde-final ${savedTargetIds.length === 0 || hasUnsavedTargetChanges || hasUnavailableSelection ? 'disabled' : ''}`}>
              <div className="hfdc-card-head hfde-head">
                <div>
                  <span className="hfdq-kicker">Step 3</span>
                  <h3>Prepare Evaluators</h3>
                  <p>Review who will provide feedback before saving evaluator assignments.</p>
                </div>
                <div className="hfdt-summary-pills">
                  <span><strong>{savedTargetIds.length}</strong> recipients</span>
                  <span><strong>{assignmentPreview.totalEvaluatorsGenerated}</strong> evaluators</span>
                  <span><strong>{previewWarningCount}</strong> need review</span>
                  <span><strong>{hasDraftEvaluatorChanges ? 'Unsaved changes' : hasSavedEvaluatorAssignments ? 'Saved' : 'Draft'}</strong></span>
                </div>
              </div>

              {!selectedCampaign ? (
                  <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save campaign info first</strong><p>Evaluator preparation becomes available after campaign info and recipients are saved.</p></div>
              ) : savedTargetIds.length === 0 ? (
                  <div className="hfd-empty-state hfdt-empty"><i className="bi bi-people" /><strong>Save recipients first</strong><p>Select and save feedback recipients before preparing evaluators.</p></div>
              ) : hasUnsavedTargetChanges ? (
                  <div className="hfd-empty-state hfdt-empty"><i className="bi bi-cloud-arrow-up" /><strong>Save recipient changes</strong><p>Evaluator preview uses saved recipients only. Save or reset changes before continuing.</p></div>
              ) : hasUnavailableSelection ? (
                  <div className="hfd-empty-state hfdt-empty"><i className="bi bi-slash-circle" /><strong>Remove unavailable recipients</strong><p>Only available recipients can continue to evaluator preparation.</p></div>
              ) : (
                  <div className="hfde-final-grid">
                    <div className="hfde-settings-panel">
                      <div className="hfde-section-head">
                        <div>
                          <span className="hfdq-kicker">Reviewer setup</span>
                          <h4>Feedback groups</h4>
                          <p>These groups will be prepared for each saved recipient.</p>
                        </div>
                      </div>

                      <div className="hfde-reviewer-cards">
                        <article className="hfde-reviewer-card self">
                          <span className="hfde-role-icon self"><i className="bi bi-person-check" /></span>
                          <div><strong>Self Review</strong><small>Included for each recipient</small></div>
                        </article>
                        <article className="hfde-reviewer-card manager">
                          <span className="hfde-role-icon manager"><i className="bi bi-person-workspace" /></span>
                          <div><strong>Manager Review</strong><small>Included when available</small></div>
                        </article>
                        <article className="hfde-reviewer-card peer featured">
                          <span className="hfde-role-icon peer"><i className="bi bi-people" /></span>
                          <div><strong>Peer Review</strong><small>{peerReviewerCount} reviewer{peerReviewerCount === 1 ? '' : 's'} per recipient</small></div>
                        </article>
                        <article className="hfde-reviewer-card subordinate">
                          <span className="hfde-role-icon subordinate"><i className="bi bi-person-lines-fill" /></span>
                          <div><strong>Direct Report Review</strong><small>Included when available</small></div>
                        </article>
                      </div>

                      <div className="hfde-peer-control">
                        <div>
                          <span className="hfdq-kicker">Peer reviewers</span>
                          <strong>People per recipient</strong>
                          <small>Choose how many peer reviewers should be suggested for each recipient.</small>
                        </div>
                        <div className="hfde-stepper-control">
                          <button type="button" onClick={() => setPeerReviewerCount(peerReviewerCount - 1)} disabled={!canEditEvaluators || peerReviewerCount <= 1}>−</button>
                          <span>{peerReviewerCount}</span>
                          <button type="button" onClick={() => setPeerReviewerCount(peerReviewerCount + 1)} disabled={!canEditEvaluators || peerReviewerCount >= 8}>+</button>
                        </div>
                      </div>

                      <div className="hfdcw-card">
                        <div className="hfdcw-head">
                          <div>
                            <span className="hfdq-kicker">Reviewer contribution</span>
                            <h4>Feedback contribution</h4>
                            <p>Set how much each feedback group contributes to the final score.</p>
                          </div>
                          <span className={`hfdcw-total ${Math.round(relationshipWeightTotal * 100) / 100 === 100 ? 'ready' : 'blocked'}`}>
                    {relationshipWeightTotal}% total
                  </span>
                        </div>
                        <div className="hfdcw-grid">
                          {RELATIONSHIP_ORDER.map(type => {
                            const item = scoringConfig.relationshipWeights.find(weight => weight.relationshipType === type);
                            return (
                                <label key={type} className="hfdcw-weight-row">
                        <span>
                          <strong>{item?.label ?? type}</strong>
                          <small>{item?.assignmentCount ?? 0} assignment{(item?.assignmentCount ?? 0) === 1 ? '' : 's'} · {(item?.targetCountWithRole ?? 0)} target{(item?.targetCountWithRole ?? 0) === 1 ? '' : 's'} covered</small>
                        </span>
                                  <input
                                      className="hfd-input"
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={1}
                                      disabled={selectedCampaign.status !== 'DRAFT'}
                                      value={Number(item?.weightPercent ?? 0)}
                                      onChange={event => updateRelationshipWeight(type, Number(event.target.value))}
                                  />
                                  <em>%</em>
                                </label>
                            );
                          })}
                        </div>
                        <label className="hfdc-toggle-card full hfdcw-redistribute">
                          <input
                              type="checkbox"
                              checked={scoringConfig.redistributeMissingRelationshipWeight}
                              disabled={selectedCampaign.status !== 'DRAFT'}
                              onChange={event => setScoringConfig(current => ({ ...current, redistributeMissingRelationshipWeight: event.target.checked }))}
                          />
                          <span>
                    <strong>Rebalance when a group is missing</strong>
                    <small>Use the available feedback groups when one group is not present.</small>
                  </span>
                        </label>
                        {scoringConfig.warnings.length > 0 && (
                            <div className="hfdt-response-warnings">
                              {scoringConfig.warnings.map(item => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                            </div>
                        )}
                        <div className="hfdcw-actions">
                          <button className="hfd-btn hfd-btn-primary" type="button" disabled={selectedCampaign.status !== 'DRAFT' || savingScoringConfig || Math.round(relationshipWeightTotal * 100) / 100 !== 100} onClick={() => void saveScoringConfig()}>
                            <i className="bi bi-save2" /> {savingScoringConfig ? 'Saving weights...' : 'Save Contribution'}
                          </button>
                        </div>
                      </div>


                      <div className="hfde-actions hfde-final-actions">
                        <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!canEditEvaluators || previewingAssignments || generatingAssignments} onClick={() => void previewEvaluatorRules()}>
                          <i className="bi bi-eye" /> {previewingAssignments ? 'Preparing...' : hasAssignmentPreview ? 'Refresh Suggestions' : 'Preview Evaluators'}
                        </button>
                        <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canEditEvaluators || previewingAssignments || generatingAssignments || !hasAssignmentPreview} onClick={() => void generateEvaluatorAssignments()}>
                          <i className="bi bi-check2-circle" /> {generatingAssignments ? 'Saving...' : 'Save Evaluators'}
                        </button>
                        <button className="hfd-btn hfd-btn-secondary" type="button" disabled={!hasSavedEvaluatorAssignments || hasDraftEvaluatorChanges} onClick={() => setActiveStepKey('questions')}>
                          Continue
                        </button>
                      </div>
                    </div>

                    <div className="hfde-review-panel">
                      <div className="hfde-section-head compact">
                        <div>
                          <span className="hfdq-kicker">Evaluator preview</span>
                          <h4>{hasAssignmentPreview ? `${assignmentPreview.requests.length} recipient${assignmentPreview.requests.length === 1 ? '' : 's'}` : 'No preview yet'}</h4>
                        </div>
                        {hasAssignmentPreview && <span className={`hfdt-badge ${previewWarningCount > 0 ? 'warning' : 'ready'}`}>{previewWarningCount > 0 ? 'Needs review' : 'Ready'}</span>}
                      </div>

                      {assignmentPreview.warnings.length > 0 && (
                          <div className="hfdt-response-warnings">
                            {assignmentPreview.warnings.slice(0, 4).map(item => <span key={item}><i className="bi bi-info-circle" /> {cleanEvaluatorNote(item)}</span>)}
                          </div>
                      )}

                      <div className="hfde-target-list">
                        {!hasAssignmentPreview ? (
                            <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-eye" /><strong>No evaluators prepared yet</strong><p>Preview evaluators to review the suggested list.</p></div>
                        ) : evaluatorTargets.map(target => {
                          const previewItem = previewItemByTarget.get(target.employeeId);
                          const targetAssignments = assignmentsByTarget.get(target.employeeId) ?? [];
                          const status = previewItem ? assignmentReadinessClass(previewItem) : 'blocked';
                          return (
                              <button key={target.employeeId} type="button" className={`hfde-target-card ${activeEvaluatorTargetId === target.employeeId ? 'selected' : ''} ${status}`} onClick={() => setSelectedEvaluatorTargetId(target.employeeId)}>
                                <span className={`hfdt-readiness-dot ${status}`} />
                                <span>
                              <strong>{target.employeeName}</strong>
                              <small>{target.positionName ?? 'Position not set'} · {target.currentDepartmentName ?? 'Department not set'}</small>
                            </span>
                                <em>{previewItem?.totalAssignments ?? targetAssignments.length}</em>
                              </button>
                          );
                        })}
                      </div>
                    </div>

                    <aside className="hfde-detail-panel">
                      <div className="hfdt-selected-head">
                        <div>
                          <span className="hfdq-kicker">Recipient</span>
                          <h4>{activeEvaluatorTarget?.employeeName ?? 'Select a recipient'}</h4>
                          <p>{activeEvaluatorTarget ? `${activeEvaluatorTarget.positionName ?? 'Position not set'} · ${activeEvaluatorTarget.currentDepartmentName ?? 'Department not set'}` : 'Evaluator details will appear here.'}</p>
                        </div>
                        {activePreviewItem && <span className={`hfdt-badge ${assignmentReadinessClass(activePreviewItem)}`}>{assignmentReadinessClass(activePreviewItem) === 'ready' ? 'Ready' : 'Needs review'}</span>}
                      </div>

                      {activePreviewItem?.warnings?.length ? (
                          <div className="hfdt-response-warnings">
                            {activePreviewItem.warnings.slice(0, 3).map(item => <span key={item}><i className="bi bi-info-circle" /> {cleanEvaluatorNote(item)}</span>)}
                          </div>
                      ) : null}

                      <div className="hfde-assignment-groups">
                        {(['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'] as FeedbackRelationshipType[]).map(type => {
                          const group = activeAssignmentsByRelationship.get(type) ?? [];
                          return (
                              <section key={type} className="hfde-assignment-group">
                                <div className="hfde-assignment-group-head">
                                  <span><i className={`bi ${relationshipIcon(type)}`} /> {relationshipLabel(type)}</span>
                                  <em>{group.length}</em>
                                </div>
                                {group.length === 0 ? (
                                    <p className="hfde-empty-line">No evaluator selected.</p>
                                ) : group.map(assignment => (
                                    <article key={`${assignment.assignmentId ?? 'planned'}-${assignment.targetEmployeeId}-${assignment.evaluatorEmployeeId}-${assignment.relationshipType}`} className={`hfde-assignment-row ${assignment.selectionMethod === 'MANUAL' ? 'manual' : ''}`}>
                                      <span className="hfde-avatar">{initials(assignment.evaluatorEmployeeName)}</span>
                                      <div>
                                        <strong>{assignment.evaluatorEmployeeName ?? `Employee #${assignment.evaluatorEmployeeId}`}</strong>
                                        <small>{assignment.evaluatorPositionName ?? assignment.evaluatorEmployeeEmail ?? 'Evaluator'}</small>
                                        <span>{assignmentSourceLabel(assignment)} · {assignmentStatusLabel(assignment.status)}</span>
                                      </div>
                                      <button
                                          type="button"
                                          className="hfdt-icon-button"
                                          disabled={!canEditEvaluators || assignment.relationshipType === 'SELF' || assignment.status === 'SUBMITTED' || (assignment.assignmentId != null && removingAssignmentId === assignment.assignmentId)}
                                          onClick={() => void removeEvaluator(assignment)}
                                          aria-label="Remove evaluator"
                                      >
                                        <i className="bi bi-x-lg" />
                                      </button>
                                    </article>
                                ))}
                              </section>
                          );
                        })}
                      </div>

                      <div className={`hfde-add-panel ${!canEditEvaluators || !hasAssignmentPreview ? 'disabled' : ''}`}>
                        <div className="hfde-add-head">
                          <div>
                            <span className="hfdq-kicker">Adjust evaluators</span>
                            <h4>Add evaluator</h4>
                          </div>
                          {!hasAssignmentPreview ? <span>Preview first</span> : hasDraftEvaluatorChanges ? <span>Unsaved changes</span> : null}
                        </div>
                        <div className="hfde-add-form">
                          <label className="hfdc-field">
                            <span>Relationship</span>
                            <select className="hfd-input" value={manualForm.relationshipType} disabled={!canEditEvaluators || !hasAssignmentPreview} onChange={event => setManualForm(current => ({ ...current, relationshipType: event.target.value as FeedbackRelationshipType, evaluatorEmployeeId: 0 }))}>
                              {relationshipOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                          <label className="hfdc-field">
                            <span>Find evaluator</span>
                            <input className="hfd-input" value={evaluatorSearch} disabled={!canEditEvaluators || !hasAssignmentPreview} onChange={event => setEvaluatorSearch(event.target.value)} placeholder="Search by name or department" />
                          </label>
                        </div>
                        {canEditEvaluators && hasAssignmentPreview && (
                            <div className="hfde-candidate-list">
                              {evaluatorCandidates.length === 0 ? (
                                  <span className="hfde-empty-line">No evaluator found.</span>
                              ) : evaluatorCandidates.map(employee => (
                                  <button key={employee.id} type="button" className={`hfde-candidate ${manualForm.evaluatorEmployeeId === employee.id ? 'selected' : ''}`} onClick={() => setManualForm(current => ({ ...current, evaluatorEmployeeId: employee.id }))}>
                                    <span className="hfde-avatar">{initials(employee.fullName)}</span>
                                    <span><strong>{employee.fullName}</strong><small>{employee.currentDepartment ?? 'Department not set'}</small></span>
                                    {manualForm.evaluatorEmployeeId === employee.id && <i className="bi bi-check-circle-fill" />}
                                  </button>
                              ))}
                            </div>
                        )}
                        <label className="hfdc-field full">
                          <span>Reason</span>
                          <textarea className="hfd-input hfdc-textarea" rows={2} disabled={!canEditEvaluators || !hasAssignmentPreview} value={manualForm.reason ?? ''} onChange={event => setManualForm(current => ({ ...current, reason: event.target.value }))} placeholder="Example: Confirmed after reviewing the reporting line." />
                        </label>
                        <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canEditEvaluators || !hasAssignmentPreview || addingEvaluator || !manualForm.evaluatorEmployeeId || !manualForm.reason?.trim()} onClick={() => void addEvaluator()}>
                          <i className="bi bi-plus-lg" /> {addingEvaluator ? 'Adding...' : 'Add Evaluator'}
                        </button>
                      </div>
                    </aside>
                  </div>
              )}
            </section>
        )}

        {activeStepKey === 'questions' && (
            <section className={`hfdq-table-card hfdqr-card hfdqw-card ${savedAssignmentCount === 0 ? 'disabled' : ''}`}>
              <div className="hfdqw-page-head">
                <div className="hfdqw-title-block">
                  <span className="hfdq-kicker">Step 4</span>
                  <h3>{selectedCampaign?.name ?? 'Feedback Campaign'}</h3>
                  <p>Question review · evaluator forms · form readiness</p>
                </div>
                <div className={`hfdqw-weight-indicator ${competencyWeightsReady ? 'ready' : 'warning'}`}>
                  <span>Scoring weights</span>
                  <strong>{formatPercent(competencyWeightTotal)}%</strong>
                  <em>{competencyWeightsReady ? `${competencyWeights.length} competencies` : `${formatPercent(Math.abs(competencyWeightDelta))}% ${competencyWeightDelta > 0 ? 'remaining' : 'over'}`}</em>
                  <button className="hfd-btn hfd-btn-primary" type="button" disabled={questionSaveDisabled} onClick={() => void saveQuestionReview()}>
                    <i className="bi bi-save2" /> {savingQuestionReview ? 'Saving...' : 'Save Review'}
                  </button>
                </div>
              </div>

              {!selectedCampaign ? (
                  <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save campaign info first</strong><p>Questions become available after the campaign setup is ready.</p></div>
              ) : savedAssignmentCount === 0 ? (
                  <div className="hfd-empty-state hfdt-empty"><i className="bi bi-diagram-3" /><strong>Save evaluators first</strong><p>Questions become available after evaluators are saved.</p></div>
              ) : loadingQuestionReview ? (
                  <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading questions...</div>
              ) : (
                  <div className="hfdqw-step-stack">
                    <section className="hfdqw-scoring-panel">
                      <div className="hfdqw-scoring-head">
                        <div>
                          <span className="hfdq-kicker">Scoring weights</span>
                          <h4>Competency weights</h4>
                          <p>Set how much each competency contributes to each evaluator form score.</p>
                        </div>
                        <div className={`hfdqw-total-pill ${competencyWeightsReady ? 'ready' : 'warning'}`}>
                          <span>Total</span>
                          <strong>{formatPercent(competencyWeightTotal)}%</strong>
                        </div>
                      </div>

                      <div className="hfdqw-weight-actions">
                        <button className="hfd-btn hfd-btn-secondary" type="button" disabled={selectedCampaign.status !== 'DRAFT'} onClick={balanceCompetencyWeightsByQuestions}>
                          Balance by questions
                        </button>
                        <button className="hfd-btn hfd-btn-secondary" type="button" disabled={selectedCampaign.status !== 'DRAFT'} onClick={equalizeCompetencyWeights}>
                          Equal by competency
                        </button>
                        <span>{competencyWeightsReady ? 'Ready to save.' : `Adjust weights to total 100%. ${formatPercent(Math.abs(competencyWeightDelta))}% ${competencyWeightDelta > 0 ? 'remaining' : 'over'}.`}</span>
                      </div>

                      {competencyWeights.length === 0 ? (
                          <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-sliders" /><strong>No scoring weights yet</strong><p>Refresh questions from active rules to prepare competency weights.</p></div>
                      ) : (
                          <div className="hfdqw-weight-table">
                            <div className="hfdqw-weight-row hfdqw-weight-header">
                              <span>Competency</span>
                              <span>Questions</span>
                              <span>Used in</span>
                              <span>Weight</span>
                            </div>
                            {competencyWeights.map(weight => (
                                <div key={weight.competencyCode} className={`hfdqw-weight-row ${(weight.warnings ?? []).length > 0 ? 'warning' : ''}`}>
                                  <div>
                                    <strong>{weight.competencyName}</strong>
                                    <small>{weight.competencyCode}</small>
                                    {(weight.warnings ?? []).map(warning => <em key={warning}><i className="bi bi-exclamation-triangle" /> {warning}</em>)}
                                  </div>
                                  <span>{weight.questionCountVariesByForm ? 'Varies by form' : `${weight.questionCountPerForm ?? 0} per form`}</span>
                                  <span>{(weight.usedInForms ?? []).join(', ') || 'Not used'}</span>
                                  <label className="hfdqw-weight-input">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        disabled={selectedCampaign.status !== 'DRAFT'}
                                        value={Number(weight.weightPercent ?? 0)}
                                        onChange={event => updateCompetencyWeight(weight.competencyCode, Number(event.target.value))}
                                    />
                                    <span>%</span>
                                  </label>
                                </div>
                            ))}
                          </div>
                      )}
                    </section>

                    <div className="hfdqw-builder-layout">
                      <aside className="hfdqw-form-panel">
                        <div className="hfdqw-panel-head">
                          <span className="hfdq-kicker">Forms</span>
                          <h4>Feedback forms</h4>
                          <p>Select the form to review.</p>
                        </div>

                        <div className="hfdqr-actions hfdqw-actions-top">
                          <button className="hfd-btn hfd-btn-secondary" type="button" disabled={resolvingQuestionReview || savingQuestionReview} onClick={() => void resolveQuestionReview()}>
                            <i className="bi bi-arrow-repeat" /> {resolvingQuestionReview ? 'Refreshing...' : 'Refresh from Rules'}
                          </button>
                        </div>

                        {questionReview.warnings.length > 0 && (
                            <div className="hfdt-response-warnings compact">
                              {questionReview.warnings.slice(0, 4).map(item => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                            </div>
                        )}

                        <div className="hfdqr-group-list hfdqw-form-list">
                          {questionGroups.length === 0 ? (
                              <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-ui-checks-grid" /><strong>No questions yet</strong><p>Refresh from active rules to review the form.</p></div>
                          ) : questionGroups.map(group => {
                            const groupCompetencies = buildQuestionCompetencies(group.questions);
                            const groupReady = group.includedQuestionCount > 0 && group.warnings.length === 0;
                            return (
                                <button key={group.groupKey} type="button" className={`hfdqr-group-card hfdqw-form-tab ${selectedQuestionGroup?.groupKey === group.groupKey ? 'selected' : ''} ${groupReady ? 'ready' : 'warning'}`} onClick={() => setSelectedQuestionGroupKey(group.groupKey)}>
                                  <span className={`hfdt-readiness-dot ${groupReady ? 'ready' : 'warning'}`} />
                                  <span>
                              <strong>{relationshipLabel(group.relationshipType)} form</strong>
                              <small>{group.includedQuestionCount}/{group.questionCount} questions · {groupCompetencies.length} competencies</small>
                            </span>
                                  <em>{group.includedQuestionCount}</em>
                                </button>
                            );
                          })}
                        </div>
                      </aside>

                      <main className="hfdqw-builder-panel">
                        {!selectedQuestionGroup ? (
                            <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-ui-checks" /><strong>Select a form</strong><p>The question review will appear here.</p></div>
                        ) : (
                            <>
                              <div className="hfdqw-builder-head">
                                <div>
                                  <span className="hfdq-kicker">Question review</span>
                                  <h4>{activeQuestionFormTitle}</h4>
                                  <p>{selectedQuestionIncludedQuestionCount}/{selectedQuestionTotalQuestionCount} questions · {selectedQuestionIncludedCompetencyCount}/{selectedQuestionTotalCompetencyCount} competencies</p>
                                </div>
                                <div className="hfdqw-form-meta">
                                  <span>Rating scale: 1–5</span>
                                  <span>Comments included</span>
                                </div>
                              </div>

                              {selectedQuestionGroup.warnings.length > 0 && (
                                  <div className="hfdt-selected-issues hfdqr-group-warnings">
                                    {selectedQuestionGroup.warnings.map(warning => <span key={warning}><i className="bi bi-exclamation-triangle" /> {warning}</span>)}
                                  </div>
                              )}

                              <div className="hfdqw-accordion-list">
                                {selectedQuestionCompetencies.length === 0 ? (
                                    <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-slash-circle" /><strong>No questions found</strong><p>Refresh from active rules after updating the question setup.</p></div>
                                ) : selectedQuestionCompetencies.map((competency) => {
                                  const includedCount = competency.questions.filter(question => question.included).length;
                                  const expanded = isQuestionCompetencyExpanded(selectedQuestionGroup.groupKey, competency.sectionCode);
                                  return (
                                      <article
                                          key={competency.sectionCode}
                                          className={`hfdqw-accordion-card ${expanded ? 'open' : ''}`}
                                          onDragOver={event => event.preventDefault()}
                                          onDrop={event => handleCompetencyDrop(event, selectedQuestionGroup.groupKey, competency.sectionCode)}
                                      >
                                        <div className="hfdqw-accordion-head">
                                    <span
                                        className="hfdqw-drag-handle"
                                        draggable={selectedCampaign.status === 'DRAFT'}
                                        onDragStart={event => writeQuestionDragData(event, { kind: 'competency', groupKey: selectedQuestionGroup.groupKey, sectionCode: competency.sectionCode })}
                                        title="Drag to reorder"
                                    >
                                      <i className="bi bi-grip-vertical" />
                                    </span>
                                          <button type="button" className="hfdqw-accordion-toggle" onClick={() => toggleQuestionCompetency(selectedQuestionGroup.groupKey, competency.sectionCode)}>
                                      <span>
                                        <strong>{competency.sectionTitle}</strong>
                                        <small>{includedCount} question{includedCount === 1 ? '' : 's'}</small>
                                      </span>
                                            <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                                          </button>

                                        </div>

                                        {expanded && (
                                            <div className="hfdqw-question-stack">
                                              {competency.questions.map((question, questionIndex) => (
                                                  <article
                                                      key={question.questionCode}
                                                      className={`hfdqw-question-card ${question.included ? 'included' : 'excluded'} ${isQuestionPreviewExpanded(selectedQuestionGroup.groupKey, question.questionCode) ? 'preview-open' : ''}`}
                                                      onDragOver={event => event.preventDefault()}
                                                      onDrop={event => {
                                                        event.stopPropagation();
                                                        handleQuestionDrop(event, selectedQuestionGroup.groupKey, competency.sectionCode, question.questionCode);
                                                      }}
                                                  >
                                              <span
                                                  className="hfdqw-drag-handle"
                                                  draggable={selectedCampaign.status === 'DRAFT'}
                                                  onDragStart={event => writeQuestionDragData(event, { kind: 'question', groupKey: selectedQuestionGroup.groupKey, sectionCode: competency.sectionCode, questionCode: question.questionCode })}
                                                  title="Drag to reorder"
                                              >
                                                <i className="bi bi-grip-vertical" />
                                              </span>
                                                    <div className="hfdqw-question-body">
                                                      <div className="hfdqw-question-topline">
                                                        <small>Question {questionIndex + 1}</small>
                                                        <div className="hfdqw-question-actions">
                                                          <button type="button" className="hfdqw-preview-toggle" onClick={() => toggleQuestionPreview(selectedQuestionGroup.groupKey, question.questionCode)}>
                                                            {isQuestionPreviewExpanded(selectedQuestionGroup.groupKey, question.questionCode) ? 'Hide preview' : 'Show preview'}
                                                            <i className={`bi ${isQuestionPreviewExpanded(selectedQuestionGroup.groupKey, question.questionCode) ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                                                          </button>
                                                          <label className="hfdqw-include-toggle">
                                                            <input type="checkbox" checked={question.included} disabled={selectedCampaign.status !== 'DRAFT'} onChange={() => toggleQuestionIncluded(selectedQuestionGroup.groupKey, question.questionCode)} />
                                                            <span>{question.included ? 'Included' : 'Excluded'}</span>
                                                          </label>
                                                        </div>
                                                      </div>
                                                      <strong>{question.questionText}</strong>
                                                      {isQuestionPreviewExpanded(selectedQuestionGroup.groupKey, question.questionCode) && (
                                                          <div className="hfdqw-preview-controls">
                                                            <div className="hfdqw-rating-preview" aria-hidden="true">
                                                              {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" disabled>{value}</button>)}
                                                            </div>
                                                            <textarea className="hfdqw-comment-preview" disabled rows={3} placeholder="Write a clear, helpful comment for this feedback response." />
                                                          </div>
                                                      )}
                                                    </div>
                                                  </article>
                                              ))}
                                            </div>
                                        )}
                                      </article>
                                  );
                                })}
                              </div>
                            </>
                        )}
                      </main>
                    </div>
                  </div>
              )}
            </section>
        )}

        {activeStepKey === 'launch' && (
            <section className={`hfdq-table-card hfda-card ${!questionReviewReady && selectedCampaign?.status === 'DRAFT' ? 'disabled' : ''}`}>
              <div className="hfdc-card-head hfda-head">
                <div>
                  <span className="hfdq-kicker">Step 5</span>
                  <h3>Review & Launch</h3>
                  <p>Check the final setup before opening feedback collection.</p>
                </div>
                <div className="hfdt-summary-pills">
                  <span><strong>{campaignLaunched ? statusLabels[selectedCampaign!.status] : launchReady ? 'Ready' : 'Review'}</strong> status</span>
                  <span><strong>{launchTargetCount}</strong> recipients</span>
                  <span><strong>{launchAssignmentCount}</strong> assignments</span>
                  <span><strong>{questionGroups.length}</strong> forms</span>
                </div>
              </div>

              {!selectedCampaign ? (
                  <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save a draft campaign first</strong><p>Launch becomes available after the setup is saved.</p></div>
              ) : campaignLaunched ? (
                  <div className="hfda-launched-state">
                    <span className="hfda-launched-icon"><i className="bi bi-rocket-takeoff" /></span>
                    <div>
                      <span className="hfdq-kicker">Campaign launched</span>
                      <h4>{selectedCampaign.status === 'ACTIVE' ? 'Feedback collection is active.' : `Campaign status: ${statusLabels[selectedCampaign.status] ?? selectedCampaign.status}`}</h4>
                      <p>Use Monitoring to track evaluator progress, follow up on incomplete assignments, and manage submission activity.</p>
                    </div>
                    <a className="hfd-btn hfd-btn-primary" href="/hr/feedback/monitoring"><i className="bi bi-graph-up-arrow" /> Open Monitoring</a>
                  </div>
              ) : !questionReviewReady && selectedCampaign.status === 'DRAFT' ? (
                  <div className="hfd-empty-state hfdt-empty"><i className="bi bi-ui-checks-grid" /><strong>Save question review first</strong><p>Launch requires saved recipients, evaluator assignments, questions, and scoring weights.</p></div>
              ) : loadingActivation ? (
                  <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading final launch check...</div>
              ) : (
                  <div className="hfda-launch-stack">
                    <div className={`hfda-launch-banner ${launchReady ? 'ready' : 'blocked'}`}>
                      <i className={`bi ${launchReady ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
                      <div>
                        <strong>{launchBannerTitle}</strong>
                        <p>{launchBannerMessage}</p>
                      </div>
                    </div>

                    {activationReadiness.blockingIssues.length > 0 && (
                        <div className="hfdt-response-warnings blocked">
                          {activationReadiness.blockingIssues.map(item => <span key={item}><i className="bi bi-x-circle" /> {item}</span>)}
                        </div>
                    )}

                    {activationReadiness.warnings.length > 0 && (
                        <div className="hfdt-response-warnings">
                          {activationReadiness.warnings.map(item => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                        </div>
                    )}

                    <div className="hfda-launch-grid">
                      <div className="hfda-readiness-panel">
                        <div className="hfdt-policy-note">
                          <i className="bi bi-shield-lock" />
                          <div>
                            <strong>Setup locks after launch</strong>
                            <p>Feedback assignments become available, the question set is locked for this campaign, and setup changes will no longer be editable.</p>
                          </div>
                        </div>

                        <div className="hfda-check-list">
                          {launchChecklist.length === 0 ? (
                              <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-clipboard-check" /><strong>No validation result yet</strong><p>Refresh the final check after saving setup changes.</p></div>
                          ) : launchChecklist.map(check => (
                              <article key={check.key} className={`hfda-check-card ${activationCheckClass(check.status)}`}>
                                <i className={`bi ${activationCheckIcon(check.status)}`} />
                                <div>
                                  <strong>{launchCheckLabel(check.key, check.label)}</strong>
                                  <small>{launchCheckMessage(check.key, check.status, check.message)}</small>
                                </div>
                                <em>{String(check.status).toUpperCase() === 'PASS' ? 'Ready' : String(check.status).toUpperCase() === 'WARNING' ? 'Warning' : 'Needs attention'}</em>
                              </article>
                          ))}
                        </div>
                      </div>

                      <aside className="hfda-summary-panel">
                        <article className="hfda-summary-card">
                          <span className="hfdq-kicker">Campaign</span>
                          <h4>{selectedCampaign.name}</h4>
                          <p>Review year: {selectedCampaign.reviewYear}</p>
                          <p>Feedback period: {formatWindow(selectedCampaign)}</p>
                          <p>{privacySummary}</p>
                        </article>

                        <article className="hfda-summary-card">
                          <span className="hfdq-kicker">Recipients</span>
                          <h4>{launchTargetCount} selected employee{launchTargetCount === 1 ? '' : 's'}</h4>
                          <p>{targetsResponse.warningCount > 0 ? `${targetsResponse.warningCount} recipient warning${targetsResponse.warningCount === 1 ? '' : 's'} to review.` : 'Recipient selection is ready.'}</p>
                        </article>

                        <article className="hfda-summary-card">
                          <span className="hfdq-kicker">Evaluator assignments</span>
                          <h4>{launchAssignmentCount} assignment{launchAssignmentCount === 1 ? '' : 's'}</h4>
                          <p>{roleAssignmentSummary.length > 0 ? roleAssignmentSummary.join(' · ') : 'Generate evaluator assignments before launch.'}</p>
                        </article>

                        <article className="hfda-summary-card">
                          <span className="hfdq-kicker">Question forms</span>
                          <h4>{questionGroups.length} form{questionGroups.length === 1 ? '' : 's'} · {questionsPerFormLabel}</h4>
                          <p>{competencyCountLabel}</p>
                          <div className="hfda-form-summary-list">
                            {questionGroups.map(group => (
                                <span key={group.groupKey}>{relationshipLabel(group.relationshipType)}: {group.includedQuestionCount}/{group.questionCount} questions · {buildQuestionCompetencies(group.questions).filter(competency => competency.questions.some(question => question.included)).length} competencies</span>
                            ))}
                          </div>
                        </article>

                        <article className="hfda-summary-card">
                          <span className="hfdq-kicker">Scoring</span>
                          <h4>{scoringConfig.relationshipWeightsReady && competencyWeightsReady ? 'Scoring ready' : 'Review scoring setup'}</h4>
                          <p>Relationship weights: {formatPercent(scoringConfig.totalRelationshipWeight)}%</p>
                          <p>Competency weights: {formatPercent(competencyWeightTotal)}%</p>
                          <p>Missing role handling: {scoringConfig.redistributeMissingRelationshipWeight ? 'Redistribute available weight' : 'Require every weighted role'}</p>
                        </article>
                      </aside>
                    </div>

                    <div className="hfda-launch-actions">
                      <button className="hfd-btn hfd-btn-secondary" type="button" disabled={loadingActivation} onClick={() => selectedCampaign && void loadActivationState(selectedCampaign.id)}>
                        <i className="bi bi-arrow-clockwise" /> Refresh Check
                      </button>
                      <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => setActiveStepKey('questions')}>
                        <i className="bi bi-ui-checks-grid" /> Back to Question Review
                      </button>
                      {selectedCampaign.status === 'DRAFT' && (
                          <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canValidateSetup || activatingCampaign} onClick={() => void validateSelectedCampaignSetup()}>
                            <i className="bi bi-shield-check" /> {activatingCampaign ? 'Validating...' : 'Validate Setup'}
                          </button>
                      )}
                      {selectedCampaign.status === 'READY_TO_ACTIVATE' && (
                          <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canActivate || activatingCampaign} onClick={() => void activateSelectedCampaign()}>
                            <i className="bi bi-rocket-takeoff" /> {activatingCampaign ? 'Launching...' : 'Launch Campaign'}
                          </button>
                      )}
                    </div>
                  </div>
              )}
            </section>
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

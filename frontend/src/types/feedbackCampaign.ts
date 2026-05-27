export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type FeedbackCampaignStatus = 'DRAFT' | 'READY_TO_ACTIVATE' | 'ACTIVE' | 'CLOSED' | 'PUBLISHED';
export type FeedbackCampaignEarlyCloseStatus = 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED';


export type ActivationCheckStatus = 'PASS' | 'WARNING' | 'BLOCKED';

export interface FeedbackCampaignActivationCheck {
  key: string;
  label: string;
  status: ActivationCheckStatus | string;
  message: string;
}

export interface FeedbackCampaignActivationSummary {
  targetCount: number;
  assignmentCount: number;
  questionSelectionCount: number;
  assignmentQuestionSnapshotCount: number;
  pendingAssignmentCount: number;
  inProgressAssignmentCount: number;
  submittedAssignmentCount: number;
  completionPercent: number;
}

export interface FeedbackCampaignActivationReadiness {
  campaignId: number;
  campaignName: string;
  campaignStatus: FeedbackCampaignStatus | string;
  ready: boolean;
  canMarkReady: boolean;
  canActivate: boolean;
  summary: FeedbackCampaignActivationSummary;
  checks: FeedbackCampaignActivationCheck[];
  blockingIssues: string[];
  warnings: string[];
}

export interface FeedbackCampaignMonitoringRoleProgress {
  role: string;
  total: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  cancelled: number;
  completionPercent: number;
}

export interface FeedbackCampaignMonitoringTargetProgress {
  requestId: number;
  targetEmployeeId: number;
  targetEmployeeName?: string | null;
  currentDepartmentName?: string | null;
  assignmentCount: number;
  notStartedCount: number;
  inProgressCount: number;
  submittedCount: number;
  cancelledCount: number;
  completionPercent: number;
  status: string;
}

export interface FeedbackCampaignMonitoring {
  campaignId: number;
  campaignName: string;
  campaignStatus: FeedbackCampaignStatus | string;
  targetCount: number;
  assignmentCount: number;
  notStartedCount: number;
  inProgressCount: number;
  submittedCount: number;
  cancelledCount: number;
  completionPercent: number;
  byRole: FeedbackCampaignMonitoringRoleProgress[];
  targets: FeedbackCampaignMonitoringTargetProgress[];
  warnings: string[];
}

export interface FeedbackFormOption {
  id: number;
  formName: string;
  anonymousAllowed: boolean;
  versionNumber: number;
  status: string;
}


export interface FeedbackReminderResponse {
  campaignId: number;
  campaignName: string;
  pendingAssignmentCount: number;
  notifiedEvaluatorCount: number;
  skippedAssignmentCount: number;
  warnings: string[];
}

export interface FeedbackCampaign {
  id: number;
  name: string;
  campaignType: string;
  reviewYear: number;
  startDate: string;
  endDate: string;
  startAt: string;
  endAt: string;
  description?: string | null;
  instructions?: string | null;
  status: FeedbackCampaignStatus;
  formId?: number | null;
  autoSubmitCompletedDraftsOnClose?: boolean;
  managerFeedbackAnonymous?: boolean;
  peerFeedbackAnonymous?: boolean;
  subordinateFeedbackAnonymous?: boolean;
  selfFeedbackAnonymous?: boolean;
  redistributeMissingRelationshipWeight?: boolean;
  earlyCloseRequestStatus?: FeedbackCampaignEarlyCloseStatus | string;
  earlyCloseRequestedAt?: string | null;
  earlyCloseRequestedByUserId?: number | null;
  earlyCloseRequestReason?: string | null;
  earlyCloseReviewedAt?: string | null;
  earlyCloseReviewedByUserId?: number | null;
  earlyCloseReviewReason?: string | null;
  closedAt?: string | null;
  closedByUserId?: number | null;
  closeReason?: string | null;
  closedEarly?: boolean;
  createdBy: number;
  createdAt: string;
  targetCount: number;
  assignmentCount: number;
  targetEmployeeIds: number[];
}

export interface CreateFeedbackCampaignInput {
  name: string;
  campaignType: string;
  reviewYear?: number;
  startAt: string;
  endAt: string;
  startDate?: string;
  endDate?: string;
  formId?: number | null;
  description?: string;
  instructions?: string;
  autoSubmitCompletedDraftsOnClose?: boolean;
  managerFeedbackAnonymous?: boolean;
  peerFeedbackAnonymous?: boolean;
  subordinateFeedbackAnonymous?: boolean;
  selfFeedbackAnonymous?: boolean;
  redistributeMissingRelationshipWeight?: boolean;
}

export interface FeedbackCampaignTargetsInput {
  employeeIds: number[];
}

export interface FeedbackTargetReadinessItem {
  requestId?: number | null;
  employeeId: number;
  userId?: number | null;
  employeeCode?: string | null;
  employeeName: string;
  email?: string | null;
  parentDepartmentId?: number | null;
  parentDepartmentName?: string | null;
  currentDepartmentId?: number | null;
  currentDepartmentName?: string | null;
  positionId?: number | null;
  positionName?: string | null;
  levelCode?: string | null;
  managerUserId?: number | null;
  managerEmployeeId?: number | null;
  managerName?: string | null;
  employmentStatus?: string | null;
  eligible: boolean;
  blockReasons: string[];
  warnings: string[];
  notes: string[];
  activeTeamCount: number;
  activeTeamNames: string[];
  peerCandidateCount: number;
  subordinateCandidateCount: number;
  selectedAt?: string | null;
  selectedByUserId?: number | null;
}

export type FeedbackTargetCandidate = FeedbackTargetReadinessItem;
export type FeedbackCampaignTarget = FeedbackTargetReadinessItem;

export interface FeedbackCampaignTargetsResponse {
  campaignId: number;
  campaignName: string;
  campaignStatus: FeedbackCampaignStatus | string;
  targetCount: number;
  readyCount: number;
  warningCount: number;
  blockedCount: number;
  targets: FeedbackCampaignTarget[];
  warnings: string[];
}

export interface FeedbackTargetCandidateQuery {
  search?: string;
  currentDepartmentId?: number | null;
  parentDepartmentId?: number | null;
  teamId?: number | null;
  readiness?: 'ALL' | 'AVAILABLE' | 'READY' | 'WARNINGS' | 'BLOCKED';
  levelCode?: string | null;
  campaignId?: number | null;
}


export interface EvaluatorConfigInput {
  includeManager: boolean;
  includePeers: boolean;
  includeSubordinates: boolean;
  includeSelf: boolean;
  peerMinCount: number;
  peerMaxCount: number;
  subordinateMinCount: number;
  subordinateMaxCount: number;
  flexibleMode: boolean;
  includeTeamPeers: boolean;
  includeDepartmentPeers: boolean;
  includeProjectPeers: boolean;
  includeCrossTeamPeers: boolean;
  /**
   * @deprecated Backend compatibility alias only. New UI logic must use peerMinCount/peerMaxCount.
   */
  peerCount?: number;
}

export const DEFAULT_EVALUATOR_CONFIG: EvaluatorConfigInput = {
  includeManager: true,
  includePeers: true,
  includeSubordinates: true,
  includeSelf: true,
  peerMinCount: 1,
  peerMaxCount: 3,
  subordinateMinCount: 0,
  subordinateMaxCount: 5,
  flexibleMode: true,
  includeTeamPeers: true,
  includeDepartmentPeers: true,
  includeProjectPeers: false,
  includeCrossTeamPeers: false,
  peerCount: 3,
};

const toSafeInteger = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const clampInteger = (value: unknown, fallback: number, min: number, max: number) =>
    Math.max(min, Math.min(max, toSafeInteger(value, fallback)));

export const normalizeEvaluatorConfig = (input?: Partial<EvaluatorConfigInput> | null): EvaluatorConfigInput => {
  const source = input ?? {};
  const legacyPeerCount = source.peerCount;
  const peerMaxCount = clampInteger(
      source.peerMaxCount ?? legacyPeerCount,
      DEFAULT_EVALUATOR_CONFIG.peerMaxCount,
      1,
      10,
  );
  const peerMinCount = clampInteger(
      source.peerMinCount,
      Math.min(DEFAULT_EVALUATOR_CONFIG.peerMinCount, peerMaxCount),
      0,
      peerMaxCount,
  );
  const subordinateMaxCount = clampInteger(
      source.subordinateMaxCount,
      DEFAULT_EVALUATOR_CONFIG.subordinateMaxCount,
      0,
      10,
  );
  const subordinateMinCount = clampInteger(
      source.subordinateMinCount,
      DEFAULT_EVALUATOR_CONFIG.subordinateMinCount,
      0,
      subordinateMaxCount,
  );

  const includeTeamPeers = source.includeTeamPeers ?? DEFAULT_EVALUATOR_CONFIG.includeTeamPeers;
  const includeDepartmentPeers = source.includeDepartmentPeers ?? DEFAULT_EVALUATOR_CONFIG.includeDepartmentPeers;
  const includeProjectPeers = source.includeProjectPeers ?? DEFAULT_EVALUATOR_CONFIG.includeProjectPeers;
  const includeCrossTeamPeers = source.includeCrossTeamPeers ?? DEFAULT_EVALUATOR_CONFIG.includeCrossTeamPeers;
  const hasSpecificPeerSource = includeTeamPeers || includeDepartmentPeers || includeProjectPeers || includeCrossTeamPeers;

  return {
    includeManager: source.includeManager ?? DEFAULT_EVALUATOR_CONFIG.includeManager,
    includePeers: source.includePeers ?? hasSpecificPeerSource,
    includeSubordinates: source.includeSubordinates ?? DEFAULT_EVALUATOR_CONFIG.includeSubordinates,
    includeSelf: source.includeSelf ?? DEFAULT_EVALUATOR_CONFIG.includeSelf,
    peerMinCount,
    peerMaxCount,
    subordinateMinCount,
    subordinateMaxCount,
    flexibleMode: source.flexibleMode ?? DEFAULT_EVALUATOR_CONFIG.flexibleMode,
    includeTeamPeers,
    includeDepartmentPeers,
    includeProjectPeers,
    includeCrossTeamPeers,
    peerCount: peerMaxCount,
  };
};

export const getPeerReviewerCount = (config?: Partial<EvaluatorConfigInput> | null) =>
    normalizeEvaluatorConfig(config).peerMaxCount;

export const hasAnyEvaluatorSource = (config?: Partial<EvaluatorConfigInput> | null) => {
  const normalized = normalizeEvaluatorConfig(config);
  return normalized.includeManager
      || normalized.includeSelf
      || normalized.includeSubordinates
      || (normalized.includePeers && (
          normalized.includeTeamPeers
          || normalized.includeDepartmentPeers
          || normalized.includeProjectPeers
          || normalized.includeCrossTeamPeers
      ));
};

export type FeedbackRelationshipType = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';

export interface FeedbackRelationshipWeight {
  relationshipType: FeedbackRelationshipType | string;
  label: string;
  weightPercent: number;
  assignmentCount: number;
  targetCountWithRole: number;
  currentlyAvailable: boolean;
}

export interface FeedbackCampaignScoringConfig {
  campaignId: number;
  campaignName: string;
  campaignStatus: FeedbackCampaignStatus | string;
  redistributeMissingRelationshipWeight: boolean;
  totalRelationshipWeight: number;
  relationshipWeightsReady: boolean;
  relationshipWeights: FeedbackRelationshipWeight[];
  warnings: string[];
}

export interface FeedbackCampaignScoringConfigInput {
  redistributeMissingRelationshipWeight: boolean;
  relationshipWeights: Array<{ relationshipType: FeedbackRelationshipType | string; weightPercent: number }>;
}
export type EvaluatorSelectionMethod = 'AUTO_RANDOM' | 'AUTO_RELATIONSHIP' | 'MANUAL';
export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'DECLINED' | 'CANCELLED';

export interface FeedbackAssignmentPreviewItem {
  requestId: number;
  targetEmployeeId: number;
  targetEmployeeName?: string | null;
  managerAssignments: number;
  selfAssignments: number;
  subordinateAssignments: number;
  peerAssignments: number;
  totalAssignments: number;
  autoAssignments: number;
  manualAssignments: number;
  warnings: string[];
}

export interface FeedbackAssignmentDetailItem {
  assignmentId?: number | null;
  requestId: number;
  targetEmployeeId: number;
  targetEmployeeName?: string | null;
  evaluatorEmployeeId: number;
  evaluatorEmployeeName?: string | null;
  evaluatorEmployeeCode?: string | null;
  evaluatorEmployeeEmail?: string | null;
  evaluatorDepartmentId?: number | null;
  evaluatorPositionId?: number | null;
  evaluatorPositionName?: string | null;
  manualReason?: string | null;
  selectionReason?: string | null;
  confidence?: string | null;
  warnings?: string[];
  relationshipType: FeedbackRelationshipType;
  selectionMethod: EvaluatorSelectionMethod;
  status: AssignmentStatus;
  anonymous: boolean;
}

export interface ManualAssignmentInput {
  targetEmployeeId: number;
  evaluatorEmployeeId: number;
  relationshipType: FeedbackRelationshipType;
  anonymous?: boolean;
  reason?: string;
}

export interface FeedbackAssignmentGenerationResponse {
  campaignId: number;
  totalTargets: number;
  totalEvaluatorsGenerated: number;
  evaluatorConfig: EvaluatorConfigInput | null;
  requests: FeedbackAssignmentPreviewItem[];
  assignmentDetails: FeedbackAssignmentDetailItem[];
  warnings: string[];
}

export interface FeedbackTargetEmployee {
  id: number;
  fullName: string;
  currentDepartmentId: number | null;
  currentDepartment: string | null;
  positionTitle?: string | null;
  positionLevelCode?: string | null;
  userId: number | null;
}

export interface FeedbackDepartmentOption {
  id: number;
  name: string;
}

export interface FeedbackTeamOption {
  id: number;
  teamName: string;
  memberEmployeeIds: number[];
}

export interface FeedbackCampaignQuestionItem {
  selectionId?: number | null;
  questionBankId?: number | null;
  questionVersionId?: number | null;
  sourceRuleId?: number | null;
  questionCode: string;
  competencyCode?: string | null;
  competencyName?: string | null;
  questionText: string;
  responseType: string;
  scoringBehavior: string;
  ratingScaleId?: number | null;
  required: boolean;
  included: boolean;
  weight: number;
  sectionCode: string;
  sectionTitle: string;
  sectionOrder: number;
  displayOrder: number;
}

export interface FeedbackCampaignQuestionGroup {
  groupKey: string;
  relationshipType: FeedbackRelationshipType | string;
  relationshipLabel: string;
  targetLevelCode: string;
  targetLevelRank?: number | null;
  targetCount: number;
  assignmentCount: number;
  questionCount: number;
  includedQuestionCount: number;
  scoredQuestionCount: number;
  includedScoredQuestionCount: number;
  warnings: string[];
  questions: FeedbackCampaignQuestionItem[];
}

export interface FeedbackCampaignCompetencyWeight {
  competencyId?: number | null;
  competencyCode: string;
  competencyName: string;
  displayOrder?: number | null;
  questionCountPerForm?: number | null;
  questionCountVariesByForm?: boolean;
  formCount: number;
  usedInForms: string[];
  includedScoredQuestionCountByForm: Record<string, number>;
  defaultWeightPercent: number;
  weightPercent: number;
  saved: boolean;
  warnings: string[];
}

export interface FeedbackCampaignQuestionReview {
  campaignId: number;
  campaignName: string;
  campaignStatus: FeedbackCampaignStatus | string;
  saved: boolean;
  targetCount: number;
  assignmentCount: number;
  groupCount: number;
  questionCount: number;
  includedQuestionCount: number;
  scoredQuestionCount: number;
  includedScoredQuestionCount: number;
  totalCompetencyWeight: number;
  competencyWeightsReady: boolean;
  lastSavedAt?: string | null;
  warnings: string[];
  competencyWeights: FeedbackCampaignCompetencyWeight[];
  groups: FeedbackCampaignQuestionGroup[];
}

export interface FeedbackCampaignQuestionSelectionInput {
  selectionId?: number | null;
  relationshipType: string;
  targetLevelCode: string;
  questionCode: string;
  included: boolean;
  required: boolean;
  sectionOrder?: number | null;
  displayOrder?: number | null;
  weight?: number | null;
}

export interface FeedbackCampaignQuestionReviewSaveInput {
  selections: FeedbackCampaignQuestionSelectionInput[];
  competencyWeights?: Array<{ competencyCode: string; weightPercent: number }>;
}

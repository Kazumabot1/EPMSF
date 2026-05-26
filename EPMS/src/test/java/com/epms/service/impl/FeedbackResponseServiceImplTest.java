//export interface ApiEnvelope<T> {
//    success: boolean;
//    message: string;
//    data: T;
//    timestamp: string;
//}
//
//export type FeedbackCampaignStatus = 'DRAFT' | 'READY_TO_ACTIVATE' | 'ACTIVE' | 'CLOSED' | 'PUBLISHED';
//export interface FeedbackResponseItemPayload {
//    questionId: number;
//    ratingValue: number;
//    comment?: string;
//}
//
//export interface FeedbackResponseSubmitPayload {
//    evaluatorAssignmentId: number;
//    responses: FeedbackResponseItemPayload[];
//    comments?: string;
//}
//
//export type EvaluatorType = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';
//
//export interface FeedbackRequestCreatePayload {
//    formId: number;
//    campaignId: number;
//    targetEmployeeId: number;
//    dueAt: string;
//    anonymousEnabled?: boolean;
//    evaluatorTypes: EvaluatorType[];
//}
//
//export interface FeedbackCampaignPayload {
//    name: string;
//    campaignType: string;
//    reviewYear?: number;
//    startDate: string;
//    endDate: string;
//    status?: FeedbackCampaignStatus;
//    formId?: number | null;
//}
//
//export interface FeedbackCampaign {
//    id: number;
//    name: string;
//    campaignType?: string;
//    reviewYear?: number;
//    startDate: string;
//    endDate: string;
//    startAt?: string;
//    endAt?: string;
//    status: FeedbackCampaignStatus;
//    formId?: number | null;
//    createdBy: number;
//    createdAt: string;
//    targetCount?: number;
//    assignmentCount?: number;
//    targetEmployeeIds?: number[];
//}
//
//export interface FeedbackQuestionDraft {
//    questionText: string;
//    questionOrder: number;
//    ratingScaleId: number;
//    weight: number;
//    isRequired: boolean;
//}
//
//export interface FeedbackSectionDraft {
//    title: string;
//    orderNo: number;
//    questions: FeedbackQuestionDraft[];
//}
//
//export interface FeedbackFormPayload {
//    formName: string;
//    anonymousAllowed: boolean;
//    sections: FeedbackSectionDraft[];
//}
//
//export interface SpringPage<T> {
//    content: T[];
//    totalElements: number;
//    totalPages: number;
//    size: number;
//    number: number;
//}
//
//export interface FeedbackRequestListItem {
//    id: number;
//    formId: number;
//    campaignId: number;
//    campaignName: string;
//    targetEmployeeId: number;
//    dueAt: string;
//    status: string;
//}
//
//export interface FeedbackSubmissionStatus {
//    evaluatorAssignmentId: number;
//    requestId: number;
//    campaignId: number;
//    campaignName: string;
//    campaignStatus?: FeedbackCampaignStatus;
//    targetEmployeeId: number;
//    targetEmployeeName?: string;
//    evaluatorType?: string;
//    relationshipType?: string;
//    status: string;
//    canSubmit?: boolean;
//    lifecycleMessage?: string | null;
//    dueAt: string;
//}
//
//export interface FeedbackReceivedQuestionItem {
//    questionId: number;
//    questionText: string;
//    questionOrder?: number | null;
//    sectionTitle?: string | null;
//    sectionOrder?: number | null;
//    required?: boolean | null;
//    ratingValue?: number | null;
//    comment?: string | null;
//}
//
//export interface FeedbackReceivedItem {
//    responseId: number;
//    requestId: number;
//    campaignId: number;
//    campaignName: string;
//    campaignStatus?: FeedbackCampaignStatus;
//    targetEmployeeId: number;
//    targetEmployeeName?: string;
//    overallScore: number | null;
//    scoreCategory?: string | null;
//    comments: string | null;
//    submittedAt: string;
//    sourceType?: string;
//    relationshipType?: string;
//    anonymous: boolean;
//    evaluatorEmployeeId: number | null;
//    evaluatorDisplayName?: string | null;
//    evaluatorIdentityVisible?: boolean | null;
//    evaluatorSourceLabel?: string | null;
//    identityProtectionReason?: string | null;
//    visibilityReason?: string | null;
//    questionItems?: FeedbackReceivedQuestionItem[];
//}
//
//export interface FeedbackSummary {
//    requestId: number;
//    averageScore: number;
//    totalResponses: number;
//}
//
//export interface PendingEvaluator {
//    evaluatorEmployeeId: number;
//    requestId: number;
//}
//
//export interface FeedbackCompletionItem {
//    requestId: number;
//    targetEmployeeId: number;
//    targetEmployeeName?: string | null;
//    targetEmployeeEmail?: string | null;
//    requestStatus?: string | null;
//    dueAt?: string | null;
//    effectiveDeadline?: string | null;
//    totalEvaluators: number;
//    submittedEvaluators: number;
//    pendingEvaluators: number;
//    inProgressEvaluators?: number;
//    notStartedEvaluators?: number;
//    overdueEvaluators?: number;
//    declinedEvaluators?: number;
//    cancelledEvaluators?: number;
//    managerEvaluators?: number;
//    peerEvaluators?: number;
//    subordinateEvaluators?: number;
//    selfEvaluators?: number;
//    completionPercent: number;
//    averageScore?: number | null;
//    scoreCategory?: string | null;
//    statusLabel?: string | null;
//    actionNeeded?: string | null;
//}
//
//export interface FeedbackRelationshipProgress {
//    relationshipType: string;
//    label?: string | null;
//    total: number;
//    submitted: number;
//    pending: number;
//    overdue: number;
//    completionPercent: number;
//}
//
//export interface FeedbackAssignmentStatusBreakdown {
//    submitted: number;
//    inProgress: number;
//    notStarted: number;
//    overdue: number;
//    declined: number;
//    cancelled: number;
//}
//
//export interface FeedbackTargetStatusBreakdown {
//    completed: number;
//    pending: number;
//    overdue: number;
//    noAssignments: number;
//}
//
//export interface FeedbackCompletionDashboard {
//    campaignId: number;
//    campaignName: string;
//    campaignStatus?: FeedbackCampaignStatus | string;
//    campaignStartAt?: string | null;
//    campaignEndAt?: string | null;
//    totalRequests: number;
//    totalTargets?: number;
//    totalAssignments: number;
//    submittedAssignments: number;
//    pendingAssignments?: number;
//    pendingUsers: number;
//    inProgressAssignments?: number;
//    notStartedAssignments?: number;
//    overdueAssignments?: number;
//    declinedAssignments?: number;
//    cancelledAssignments?: number;
//    completedTargets?: number;
//    targetsWithPending?: number;
//    targetsWithOverdue?: number;
//    managerAssignments?: number;
//    peerAssignments?: number;
//    subordinateAssignments?: number;
//    selfAssignments?: number;
//    statusBreakdown?: FeedbackAssignmentStatusBreakdown;
//    targetStatusBreakdown?: FeedbackTargetStatusBreakdown;
//    relationshipProgress?: FeedbackRelationshipProgress[];
//    completionPercent: number;
//    healthStatus?: string | null;
//    healthMessage?: string | null;
//    generatedAt?: string | null;
//    requests: FeedbackCompletionItem[];
//}
//
//export interface FeedbackSourceBreakdown {
//    sourceType: string;
//    responseCount: number;
//    averageScore: number;
//    scoreCategory: string;
//}
//
//export interface ConsolidatedFeedbackItem {
//    targetEmployeeId: number;
//    targetEmployeeName?: string;
//    averageScore: number;
//    scoreCategory?: string;
//    totalResponses: number;
//    managerResponses: number;
//    peerResponses: number;
//    subordinateResponses: number;
//    selfResponses?: number;
//    managerAverageScore?: number;
//    peerAverageScore?: number;
//    subordinateAverageScore?: number;
//    selfAverageScore?: number;
//    sourceBreakdown?: FeedbackSourceBreakdown[];
//}
//
//export interface ConsolidatedFeedbackReport {
//    campaignId: number;
//    campaignName: string;
//    campaignAverageScore: number;
//    campaignScoreCategory?: string;
//    totalResponses: number;
//    totalEmployees?: number;
//    managerResponses?: number;
//    peerResponses?: number;
//    subordinateResponses?: number;
//    selfResponses?: number;
//    sourceBreakdown?: FeedbackSourceBreakdown[];
//    items: ConsolidatedFeedbackItem[];
//}
//
//export interface CampaignDashboardItem {
//    campaignId: number;
//    campaignName: string;
//    status: string;
//    startDate: string;
//    endDate: string;
//    totalRequests: number;
//    completionPercent: number;
//}
//
//export interface TeamFeedbackSummary {
//    targetEmployeeId: number;
//    averageScore: number;
//    totalResponses: number;
//    pendingEvaluations: number;
//}
//
//export interface FeedbackDashboard {
//    dashboardType: string;
//    userId: number;
//    totalForms: number;
//    totalRequests: number;
//    totalResponses: number;
//    totalPendingAssignments: number;
//    averageScore: number;
//    pendingFeedbackToSubmit: FeedbackSubmissionStatus[];
//    ownFeedbackResults: FeedbackReceivedItem[];
//    teamFeedbackSummary: TeamFeedbackSummary[];
//    campaigns: CampaignDashboardItem[];
//}
//
//export interface AuditLogEntry {
//    id: number;
//    userId: number;
//    action: string;
//    entityType: string;
//    entityId: number;
//    oldValue: string | null;
//    newValue: string | null;
//    reason: string | null;
//    timestamp: string;
//}

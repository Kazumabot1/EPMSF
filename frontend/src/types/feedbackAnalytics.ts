export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export interface FeedbackResultItem {
  campaignId: number;
  campaignName: string;
  targetEmployeeId: number;
  targetEmployeeName: string;
  averageScore: number | null;
  rawAverageScore?: number | null;
  scoreCategory?: string;
  totalResponses: number;
  managerResponses: number;
  peerResponses: number;
  subordinateResponses: number;
  selfResponses?: number;
  assignedEvaluatorCount?: number;
  submittedEvaluatorCount?: number;
  pendingEvaluatorCount?: number;
  completionRate?: number;
  confidenceLevel?: string;
  insufficientFeedback?: boolean;
  managerAverageScore?: number | null;
  peerAverageScore?: number | null;
  subordinateAverageScore?: number | null;
  selfAverageScore?: number | null;
  scoreCalculationMethod?: string;
  scoreCalculationNote?: string;
  visibilityStatus?: 'HIDDEN' | 'READY_TO_PUBLISH' | 'PUBLISHED' | string;
  includeOverallScore?: boolean;
  includeCompetencyBreakdown?: boolean;
  includeSelfVsOthers?: boolean;
  includeComments?: boolean;
  includeScoreExplanation?: boolean;
  publishedAt?: string | null;
  publishedByUserId?: number | null;
  publishNote?: string | null;
  summarizedAt: string;
}

export interface FeedbackScoreDistribution {
  band: string;
  label: string;
  minScore: number;
  maxScore: number;
  count: number;
}

export interface FeedbackRelationshipAverage {
  relationshipType: string;
  label?: string | null;
  averageScore?: number | null;
  responseCount: number;
}

export interface FeedbackCompetencyAverage {
  competencyCode: string;
  competencyName: string;
  averageScore?: number | null;
  responseCount: number;
  questionCount: number;
}

export interface FeedbackConfidenceBreakdown {
  level: string;
  label: string;
  count: number;
}

export interface FeedbackCampaignSummary {
  campaignId: number;
  campaignName: string;
  status: string;
  overallAverageScore: number;
  overallScoreCategory?: string;
  totalEmployees: number;
  totalResponses: number;
  assignedEvaluatorCount?: number;
  submittedEvaluatorCount?: number;
  pendingEvaluatorCount?: number;
  completionRate?: number;
  insufficientFeedbackCount?: number;
  visibilityStatus?: 'HIDDEN' | 'READY_TO_PUBLISH' | 'PUBLISHED' | string;
  includeOverallScore?: boolean;
  includeCompetencyBreakdown?: boolean;
  includeSelfVsOthers?: boolean;
  includeComments?: boolean;
  includeScoreExplanation?: boolean;
  publishedAt?: string | null;
  publishedByUserId?: number | null;
  publishNote?: string | null;
  summarizedAt: string;
  scoreDistribution?: FeedbackScoreDistribution[];
  relationshipAverages?: FeedbackRelationshipAverage[];
  competencyAverages?: FeedbackCompetencyAverage[];
  confidenceBreakdown?: FeedbackConfidenceBreakdown[];
  items: FeedbackResultItem[];
}

export interface FeedbackSummaryPublishRequest {
  scope: 'ALL_READY' | 'SELECTED_EMPLOYEES';
  targetEmployeeIds?: number[];
  includeOverallScore: boolean;
  includeCompetencyBreakdown: boolean;
  includeSelfVsOthers: boolean;
  includeComments: boolean;
  includeScoreExplanation: boolean;
  notifyEmployees: boolean;
}

export interface FeedbackMyResult {
  employeeId: number;
  employeeName: string;
  results: FeedbackResultItem[];
}

export interface FeedbackTeamSummary {
  managerUserId: number;
  ownerUserId?: number;
  viewScope?: 'MANAGER_DIRECT_REPORTS' | 'DEPARTMENT' | string;
  departmentId?: number | null;
  departmentName?: string | null;
  totalDirectReports: number;
  totalDepartmentEmployees?: number;
  totalManagedTeams?: number;
  totalDepartmentTeams?: number;
  totalClosedResults: number;
  accessTitle?: string | null;
  accessDescription?: string | null;
  privacyNotice?: string | null;
  emptyStateMessage?: string | null;
  items: FeedbackResultItem[];
}

export interface FeedbackIntegrationScore {
  campaignId: number;
  campaignName: string;
  campaignStatus: string;
  targetEmployeeId: number;
  targetEmployeeName: string;
  feedbackScore: number | null;
  rawFeedbackScore: number | null;
  scoreBand: string;
  assignedEvaluatorCount: number;
  submittedEvaluatorCount: number;
  pendingEvaluatorCount: number;
  completionRate: number;
  confidenceLevel: string;
  insufficientFeedback: boolean;
  managerAverageScore?: number | null;
  peerAverageScore?: number | null;
  subordinateAverageScore?: number | null;
  selfAverageScore?: number | null;
  managerResponses: number;
  peerResponses: number;
  subordinateResponses: number;
  selfResponses: number;
  scoreCalculationMethod: string;
  scoreCalculationNote?: string;
  visibilityStatus?: 'HIDDEN' | 'READY_TO_PUBLISH' | 'PUBLISHED' | string;
  includeOverallScore?: boolean;
  includeCompetencyBreakdown?: boolean;
  includeSelfVsOthers?: boolean;
  includeComments?: boolean;
  includeScoreExplanation?: boolean;
  publishedAt?: string | null;
  publishedByUserId?: number | null;
  publishNote?: string | null;
  summarizedAt: string;
}

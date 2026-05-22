export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type FeedbackRelationshipType = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';
export type FeedbackAssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'DECLINED' | 'CANCELLED';
export type FeedbackCampaignLifecycleStatus = 'DRAFT' | 'READY_TO_ACTIVATE' | 'ACTIVE' | 'CLOSED' | 'PUBLISHED';

export interface FeedbackEvaluatorTask {
  assignmentId: number;
  campaignId: number;
  campaignName: string;
  campaignStatus: FeedbackCampaignLifecycleStatus;
  campaignStartAt: string | null;
  targetEmployeeId: number;
  targetEmployeeName: string;
  relationshipType: FeedbackRelationshipType;
  anonymous: boolean;
  status: FeedbackAssignmentStatus;
  canSubmit: boolean;
  lifecycleMessage: string | null;
  autoSubmitCompletedDraftsOnClose?: boolean;
  autoSubmitNotice?: string | null;
  dueAt: string | null;
  submittedAt: string | null;
}

export interface FeedbackRatingOption {
  value: number;
  label: string;
}

export interface FeedbackAssignmentEmployeeInfo {
  employeeId: number | null;
  userId: number | null;
  employeeCode: string | null;
  employeeName: string | null;
  email: string | null;
  positionName: string | null;
  departmentName: string | null;
  levelCode: string | null;
}

export interface FeedbackAssignmentQuestionDetail {
  id: number;
  assignmentQuestionId?: number;
  sourceQuestionId?: number | null;
  questionCode?: string | null;
  competencyCode?: string | null;
  responseType?: 'RATING' | 'RATING_WITH_COMMENT' | 'TEXT' | 'YES_NO' | 'MULTI_SELECT' | string;
  questionText: string;
  questionOrder: number;
  ratingScaleId: number | null;
  ratingScaleMin?: number | null;
  ratingScaleMax?: number | null;
  ratingOptions?: FeedbackRatingOption[];
  weight: number | null;
  required: boolean;
  existingRatingValue: number | null;
  existingComment: string | null;
}

export interface FeedbackAssignmentSectionDetail {
  id: number;
  sectionCode?: string | null;
  title: string;
  orderNo: number;
  questions: FeedbackAssignmentQuestionDetail[];
}

export interface FeedbackAssignmentDetail {
  assignmentId: number;
  campaignId: number;
  campaignName: string;
  campaignStatus: FeedbackCampaignLifecycleStatus;
  campaignStartAt: string | null;
  targetEmployeeId: number;
  targetEmployeeName: string;
  target: FeedbackAssignmentEmployeeInfo | null;
  evaluator: FeedbackAssignmentEmployeeInfo | null;
  relationshipType: FeedbackRelationshipType;
  anonymous: boolean;
  status: FeedbackAssignmentStatus;
  canSubmit: boolean;
  lifecycleMessage: string | null;
  autoSubmitCompletedDraftsOnClose?: boolean;
  autoSubmitNotice?: string | null;
  dueAt: string | null;
  submittedAt: string | null;
  comments: string | null;
  assessmentDateText: string | null;
  effectiveDateText: string | null;
  totalQuestionCount: number;
  requiredQuestionCount: number;
  answeredQuestionCount: number;
  answeredRequiredQuestionCount: number;
  completionPercent: number;
  finalSubmissionReady: boolean;
  submittedLocked: boolean;
  sections: FeedbackAssignmentSectionDetail[];
}

export interface SubmitFeedbackResponsePayload {
  evaluatorAssignmentId: number;
  comments?: string;
  assessmentDateText?: string;
  effectiveDateText?: string;
  responses: Array<{
    assignmentQuestionId?: number;
    questionId?: number;
    ratingValue: number | null;
    comment?: string;
  }>;
}

export interface SaveFeedbackDraftPayload {
  evaluatorAssignmentId: number;
  comments?: string;
  assessmentDateText?: string;
  effectiveDateText?: string;
  responses: Array<{
    assignmentQuestionId?: number;
    questionId?: number;
    ratingValue?: number | null;
    comment?: string;
  }>;
}

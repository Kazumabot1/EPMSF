export type FeedbackRequestStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type FeedbackAssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
export type FeedbackResponseStatus = 'DRAFT' | 'SUBMITTED';
export type EvaluatorSourceType = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';

export interface FeedbackQuestion {
  id?: number;
  questionText: string;
  questionOrder: number;
  ratingScaleId?: number;
  weight: number;
  isRequired: boolean;
}

export interface FeedbackSection {
  id?: number;
  title: string;
  orderNo: number;
  questions: FeedbackQuestion[];
}

export interface FeedbackForm {
  id?: number;
  formName: string;
  anonymousAllowed: boolean;
  status: string;
  sections: FeedbackSection[];
}

export interface FeedbackRequest {
  id: number;
  formId: number;
  cycleId: number;
  targetEmployeeId: number;
  dueAt: string;
  status: FeedbackRequestStatus;
  isAnonymousEnabled: boolean;
}

export interface FeedbackSummaryResponse {
  requestId: number;
  targetEmployeeName: string;
  formTitle: string;
  averageScore: number;
  totalResponses: number;
  pendingEvaluators: number;
}

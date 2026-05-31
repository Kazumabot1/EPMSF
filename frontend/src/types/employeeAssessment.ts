/*Z*/export type AssessmentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_MANAGER'
  | 'PENDING_DEPARTMENT_HEAD'
  | 'PENDING_HR'
  | 'APPROVED'
  | 'DECLINED'
  | 'REJECTED'
  | 'CLOSED_REJECTED';

export type AssessmentResponseType =
  | 'RATING'
  | 'TEXT'
  | 'YES_NO'
  | 'YES_NO_RATING';

export interface AssessmentScoreBand {
  id?: number | null;
  minScore: number;
  maxScore: number;
  label: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface AssessmentItem {
  id?: number | null;
  questionId?: number | null;
  sectionTitle: string;
  questionText: string;
  itemOrder: number;
  responseType?: AssessmentResponseType;
  isRequired?: boolean;
  weight?: number;
  rating: number | null;
  maxRating: number;
  comment: string;
  yesNoAnswer?: boolean | null;
}

export interface AssessmentSection {
  id?: number | null;
  title: string;
  orderNo?: number;
  items: AssessmentItem[];
}

export interface EmployeeAssessment {
  id: number | null;
  formId?: number | null;
  assessmentFormId?: number | null;
  formName?: string;
  companyName?: string | null;

  userId: number;
  employeeId?: number | null;
  employeeName: string;
  employeeCode?: string | null;
  currentPosition?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  managerUserId?: number | null;
  managerName?: string | null;
  departmentHeadUserId?: number | null;
  departmentHeadName?: string | null;
  assessmentDate?: string | null;

  period: string;
  status: AssessmentStatus;
  totalScore: number;
  maxScore: number;
  scorePercent: number;
  performanceLabel: string;
  remarks: string;
  managerComment?: string | null;
  hrComment?: string | null;
  departmentHeadComment?: string | null;
  declineReason?: string | null;
  rejectedByRole?: string | null;
  rejectedByUserId?: number | null;
  rejectedByName?: string | null;
  rejectedAt?: string | null;

  employeeSignatureId?: number | null;
  employeeSignatureName?: string | null;
  employeeSignatureImageData?: string | null;
  employeeSignatureImageType?: string | null;
  employeeSignedAt?: string | null;

  managerSignatureId?: number | null;
  managerSignatureName?: string | null;
  managerSignatureImageData?: string | null;
  managerSignatureImageType?: string | null;
  managerSignedAt?: string | null;

  departmentHeadSignatureId?: number | null;
  departmentHeadSignatureName?: string | null;
  departmentHeadSignatureImageData?: string | null;
  departmentHeadSignatureImageType?: string | null;
  departmentHeadSignedAt?: string | null;

  hrSignatureId?: number | null;
  hrSignatureName?: string | null;
  hrSignatureImageData?: string | null;
  hrSignatureImageType?: string | null;
  hrSignedAt?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  declinedAt?: string | null;

  sections: AssessmentSection[];
  scoreBands?: AssessmentScoreBand[];
}

export interface AssessmentItemRequest {
  id?: number | null;
  questionId?: number | null;
  sectionTitle: string;
  questionText: string;
  itemOrder: number;
  responseType?: AssessmentResponseType;
  rating?: number | null;
  comment?: string;
  yesNoAnswer?: boolean | null;
}

export interface AssessmentRequest {
  formId?: number | null;
  assessmentFormId?: number | null;
  period: string;
  remarks: string;
  items: AssessmentItemRequest[];
}

export interface AssessmentScoreRow {
  id: number;
  formId?: number | null;
  assessmentFormId?: number | null;
  formName?: string | null;

  employeeId?: number | null;
  employeeName: string;
  employeeCode?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  managerUserId?: number | null;
  managerName?: string | null;

  period: string;
  status: AssessmentStatus;
  totalScore: number;
  maxScore: number;
  scorePercent: number;
  performanceLabel: string;

  submittedAt?: string | null;
  approvedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  rejectedByRole?: string | null;
  rejectedByUserId?: number | null;
  rejectedByName?: string | null;
  rejectedAt?: string | null;

  employeeSigned?: boolean;
  managerSigned?: boolean;
  departmentHeadSigned?: boolean;
  hrSigned?: boolean;
}
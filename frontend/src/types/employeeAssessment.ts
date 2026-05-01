export type AssessmentStatus = 'DRAFT' | 'SUBMITTED';

export interface AssessmentItem {
  id?: number | null;
  sectionTitle: string;
  questionText: string;
  itemOrder: number;
  rating: number | null;
  maxRating: number;
  comment: string;
}

export interface AssessmentSection {
  title: string;
  items: AssessmentItem[];
}

export interface EmployeeAssessment {
  id: number | null;
  userId: number;
  employeeId?: number | null;
  employeeName: string;
  employeeCode?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  period: string;
  status: AssessmentStatus;
  totalScore: number;
  maxScore: number;
  scorePercent: number;
  performanceLabel: string;
  remarks: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  submittedAt?: string | null;
  sections: AssessmentSection[];
}

export interface AssessmentItemRequest {
  id?: number | null;
  sectionTitle: string;
  questionText: string;
  itemOrder: number;
  rating: number | null;
  comment: string;
}

export interface AssessmentRequest {
  period: string;
  remarks: string;
  items: AssessmentItemRequest[];
}

export interface AssessmentScoreRow {
  id: number;
  employeeId?: number | null;
  employeeName: string;
  employeeCode?: string | null;
  departmentName?: string | null;
  period: string;
  status: AssessmentStatus;
  totalScore: number;
  maxScore: number;
  scorePercent: number;
  performanceLabel: string;
  submittedAt?: string | null;
}

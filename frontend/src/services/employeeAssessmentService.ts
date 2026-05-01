import api from './api';
import type {
  AssessmentRequest,
  AssessmentScoreRow,
  EmployeeAssessment,
} from '../types/employeeAssessment';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
};

const unwrap = <T>(response: { data: ApiEnvelope<T> | T }): T => {
  const body = response.data as ApiEnvelope<T> | T;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as T;
};

export const employeeAssessmentService = {
  async getTemplate(): Promise<EmployeeAssessment> {
    const response = await api.get<ApiEnvelope<EmployeeAssessment>>('/employee-assessments/template');
    return unwrap<EmployeeAssessment>(response);
  },

  async getLatestDraft(): Promise<EmployeeAssessment> {
    const response = await api.get<ApiEnvelope<EmployeeAssessment>>('/employee-assessments/my-latest-draft');
    return unwrap<EmployeeAssessment>(response);
  },

  async getById(id: number): Promise<EmployeeAssessment> {
    const response = await api.get<ApiEnvelope<EmployeeAssessment>>(`/employee-assessments/${id}`);
    return unwrap<EmployeeAssessment>(response);
  },

  async saveDraft(payload: AssessmentRequest, id?: number | null): Promise<EmployeeAssessment> {
    if (id) {
      const response = await api.put<ApiEnvelope<EmployeeAssessment>>(`/employee-assessments/${id}`, payload);
      return unwrap<EmployeeAssessment>(response);
    }
    const response = await api.post<ApiEnvelope<EmployeeAssessment>>('/employee-assessments', payload);
    return unwrap<EmployeeAssessment>(response);
  },

  async submit(id: number, payload: AssessmentRequest): Promise<EmployeeAssessment> {
    const response = await api.post<ApiEnvelope<EmployeeAssessment>>(`/employee-assessments/${id}/submit`, payload);
    return unwrap<EmployeeAssessment>(response);
  },

  async myScores(): Promise<AssessmentScoreRow[]> {
    const response = await api.get<ApiEnvelope<AssessmentScoreRow[]>>('/employee-assessments/my-scores');
    return unwrap<AssessmentScoreRow[]>(response);
  },

  async scoreTable(): Promise<AssessmentScoreRow[]> {
    const response = await api.get<ApiEnvelope<AssessmentScoreRow[]>>('/employee-assessments/score-table');
    return unwrap<AssessmentScoreRow[]>(response);
  },
};

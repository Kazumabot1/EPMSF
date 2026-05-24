import api from './api';
import type {
  AppraisalCycleRequest,
  AppraisalCycleResponse,
  AppraisalEmployeeOptionResponse,
  AppraisalCycleStatus,
  AppraisalReturnRequest,
  AppraisalReviewSubmitRequest,
  AppraisalScoreBandRequest,
  AppraisalScoreBandResponse,
  AppraisalTemplateRequest,
  AppraisalTemplateCycleRequest,
  AppraisalTemplateResponse,
  AppraisalTemplateStatus,
  EmployeeAppraisalFormResponse,
  PmAppraisalSubmitRequest,
} from '../types/appraisal';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
};

export type AppraisalAuditEntityType = 'APPRAISAL_TEMPLATE' | 'APPRAISAL_CYCLE';

export type AppraisalAuditLog = {
  id: number;
  userId?: number | null;
  changedByName?: string | null;
  action: string;
  entityType: AppraisalAuditEntityType;
  entityId: number;
  changedColumn?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  timestamp?: string | null;
};

const unwrap = <T>(response: { data: ApiEnvelope<T> | T }): T => {
  const body = response.data as ApiEnvelope<T> | T;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as T;
};


export const appraisalAuditService = {
  list: async (entityType: AppraisalAuditEntityType, entityId: number) => {
    const response = await api.get<ApiEnvelope<AppraisalAuditLog[]>>('/audit-logs', {
      params: { entityType, entityId },
    });
    return unwrap<AppraisalAuditLog[]>(response);
  },
};

export const appraisalTemplateService = {
  list: async (status?: AppraisalTemplateStatus) => {
    const response = await api.get<ApiEnvelope<AppraisalTemplateResponse[]>>('/hr/appraisal/templates', {
      params: status ? { status } : undefined,
    });
    return unwrap<AppraisalTemplateResponse[]>(response);
  },

  get: async (templateId: number) => {
    const response = await api.get<ApiEnvelope<AppraisalTemplateResponse>>(`/hr/appraisal/templates/${templateId}`);
    return unwrap<AppraisalTemplateResponse>(response);
  },

  create: async (payload: AppraisalTemplateRequest) => {
    const response = await api.post<ApiEnvelope<AppraisalTemplateResponse>>('/hr/appraisal/templates', payload);
    return unwrap<AppraisalTemplateResponse>(response);
  },

  updateDraft: async (templateId: number, payload: AppraisalTemplateRequest) => {
    const response = await api.put<ApiEnvelope<AppraisalTemplateResponse>>(`/hr/appraisal/templates/${templateId}`, payload);
    return unwrap<AppraisalTemplateResponse>(response);
  },

  activate: async (templateId: number) => {
    const response = await api.patch<ApiEnvelope<AppraisalTemplateResponse>>(`/hr/appraisal/templates/${templateId}/activate`);
    return unwrap<AppraisalTemplateResponse>(response);
  },

  archive: async (templateId: number) => {
    const response = await api.patch<ApiEnvelope<AppraisalTemplateResponse>>(`/hr/appraisal/templates/${templateId}/archive`);
    return unwrap<AppraisalTemplateResponse>(response);
  },
};

export const appraisalCycleService = {
  list: async (status?: AppraisalCycleStatus) => {
    const response = await api.get<ApiEnvelope<AppraisalCycleResponse[]>>('/hr/appraisal/cycles', {
      params: status ? { status } : undefined,
    });
    return unwrap<AppraisalCycleResponse[]>(response);
  },

  getActiveForPm: async () => {
    const response = await api.get<ApiEnvelope<AppraisalCycleResponse[]>>('/appraisal/workflow/pm/cycles/active');
    return unwrap<AppraisalCycleResponse[]>(response);
  },

  get: async (cycleId: number) => {
    const response = await api.get<ApiEnvelope<AppraisalCycleResponse>>(`/hr/appraisal/cycles/${cycleId}`);
    return unwrap<AppraisalCycleResponse>(response);
  },

  create: async (payload: AppraisalCycleRequest) => {
    const response = await api.post<ApiEnvelope<AppraisalCycleResponse>>('/hr/appraisal/cycles', payload);
    return unwrap<AppraisalCycleResponse>(response);
  },

  updateDraft: async (cycleId: number, payload: AppraisalCycleRequest) => {
    const response = await api.put<ApiEnvelope<AppraisalCycleResponse>>(`/hr/appraisal/cycles/${cycleId}`, payload);
    return unwrap<AppraisalCycleResponse>(response);
  },

  activate: async (cycleId: number) => {
    const response = await api.patch<ApiEnvelope<AppraisalCycleResponse>>(`/hr/appraisal/cycles/${cycleId}/activate`);
    return unwrap<AppraisalCycleResponse>(response);
  },

  lock: async (cycleId: number) => {
    const response = await api.patch<ApiEnvelope<AppraisalCycleResponse>>(`/hr/appraisal/cycles/${cycleId}/lock`);
    return unwrap<AppraisalCycleResponse>(response);
  },

  complete: async (cycleId: number) => {
    const response = await api.patch<ApiEnvelope<AppraisalCycleResponse>>(`/hr/appraisal/cycles/${cycleId}/complete`);
    return unwrap<AppraisalCycleResponse>(response);
  },

  reuse: async (cycleId: number, payload: AppraisalCycleRequest) => {
    const response = await api.post<ApiEnvelope<AppraisalCycleResponse>>(`/hr/appraisal/cycles/${cycleId}/reuse`, payload);
    return unwrap<AppraisalCycleResponse>(response);
  },

  createFromTemplate: async (payload: AppraisalTemplateCycleRequest) => {
    const response = await api.post<ApiEnvelope<AppraisalCycleResponse>>('/hr/appraisal/cycles/from-template', payload);
    return unwrap<AppraisalCycleResponse>(response);
  },
};

export const appraisalWorkflowService = {
  getPmEligibleEmployees: async (cycleId: number) => {
    const response = await api.get<ApiEnvelope<AppraisalEmployeeOptionResponse[]>>(
      `/appraisal/workflow/pm/cycles/${cycleId}/employees`,
    );
    return unwrap<AppraisalEmployeeOptionResponse[]>(response);
  },

  getPmCycleTemplate: async (cycleId: number) => {
    const response = await api.get<ApiEnvelope<AppraisalTemplateResponse>>(
      `/appraisal/workflow/pm/cycles/${cycleId}/template-form`,
    );
    return unwrap<AppraisalTemplateResponse>(response);
  },

  createPmDraft: async (cycleId: number, employeeId: number) => {
    const response = await api.post<ApiEnvelope<EmployeeAppraisalFormResponse>>(
      `/appraisal/workflow/pm/cycles/${cycleId}/employees/${employeeId}/draft`,
    );
    return unwrap<EmployeeAppraisalFormResponse>(response);
  },

  savePmDraft: async (formId: number, payload: PmAppraisalSubmitRequest) => {
    const response = await api.post<ApiEnvelope<EmployeeAppraisalFormResponse>>(
      `/appraisal/workflow/pm/forms/${formId}/draft`,
      payload,
    );
    return unwrap<EmployeeAppraisalFormResponse>(response);
  },

  submitPmReview: async (formId: number, payload: PmAppraisalSubmitRequest) => {
    const response = await api.post<ApiEnvelope<EmployeeAppraisalFormResponse>>(
      `/appraisal/workflow/pm/forms/${formId}/submit`,
      payload,
    );
    return unwrap<EmployeeAppraisalFormResponse>(response);
  },

  getPmHistory: async () => {
    const response = await api.get<ApiEnvelope<EmployeeAppraisalFormResponse[]>>('/appraisal/workflow/pm/history');
    return unwrap<EmployeeAppraisalFormResponse[]>(response);
  },

  getDeptHeadQueue: async () => {
    const response = await api.get<ApiEnvelope<EmployeeAppraisalFormResponse[]>>('/appraisal/workflow/dept-head/queue');
    return unwrap<EmployeeAppraisalFormResponse[]>(response);
  },

  getDeptHeadHistory: async () => {
    const response = await api.get<ApiEnvelope<EmployeeAppraisalFormResponse[]>>('/appraisal/workflow/dept-head/history');
    return unwrap<EmployeeAppraisalFormResponse[]>(response);
  },

  saveDeptHeadDraft: async (formId: number, payload: AppraisalReviewSubmitRequest) => {
    const response = await api.post<ApiEnvelope<EmployeeAppraisalFormResponse>>(
      `/appraisal/workflow/dept-head/forms/${formId}/draft`,
      payload,
    );
    return unwrap<EmployeeAppraisalFormResponse>(response);
  },

  submitDeptHeadReview: async (formId: number, payload: AppraisalReviewSubmitRequest) => {
    const response = await api.post<ApiEnvelope<EmployeeAppraisalFormResponse>>(
      `/appraisal/workflow/dept-head/forms/${formId}/submit`,
      payload,
    );
    return unwrap<EmployeeAppraisalFormResponse>(response);
  },

  getHrQueue: async () => {
    const response = await api.get<ApiEnvelope<EmployeeAppraisalFormResponse[]>>('/appraisal/workflow/hr/queue');
    return unwrap<EmployeeAppraisalFormResponse[]>(response);
  },

  getHrReviewedRecords: async () => {
    const response = await api.get<ApiEnvelope<EmployeeAppraisalFormResponse[]>>('/appraisal/workflow/hr/reviews');
    return unwrap<EmployeeAppraisalFormResponse[]>(response);
  },

  saveHrDraft: async (formId: number, payload: AppraisalReviewSubmitRequest) => {
    const response = await api.post<ApiEnvelope<EmployeeAppraisalFormResponse>>(
      `/appraisal/workflow/hr/forms/${formId}/draft`,
      payload,
    );
    return unwrap<EmployeeAppraisalFormResponse>(response);
  },

  approveByHr: async (formId: number, payload: AppraisalReviewSubmitRequest) => {
    const response = await api.post<ApiEnvelope<EmployeeAppraisalFormResponse>>(
      `/appraisal/workflow/hr/forms/${formId}/approve`,
      payload,
    );
    return unwrap<EmployeeAppraisalFormResponse>(response);
  },

  returnToPm: async (formId: number, payload: AppraisalReturnRequest) => {
    const response = await api.post<ApiEnvelope<EmployeeAppraisalFormResponse>>(
      `/appraisal/workflow/forms/${formId}/return-to-pm`,
      payload,
    );
    return unwrap<EmployeeAppraisalFormResponse>(response);
  },

  getForm: async (formId: number) => {
    const response = await api.get<ApiEnvelope<EmployeeAppraisalFormResponse>>(`/appraisal/workflow/forms/${formId}`);
    return unwrap<EmployeeAppraisalFormResponse>(response);
  },

  getEmployeeForms: async () => {
    const response = await api.get<ApiEnvelope<EmployeeAppraisalFormResponse[]>>('/appraisal/workflow/employee/forms');
    return unwrap<EmployeeAppraisalFormResponse[]>(response);
  },

  exportHrEmployeeReviewPdf: async (formId: number) => {
    try {
      const response = await api.get<Blob>(`/appraisal/reports/hr/forms/${formId}/pdf`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      const responseData = (error as { response?: { data?: unknown } })?.response?.data;
      if (responseData instanceof Blob) {
        const text = await responseData.text();
        if (text) {
          try {
            const parsed = JSON.parse(text) as { message?: string; error?: string };
            throw new Error(parsed.message || parsed.error || text);
          } catch (parseError) {
            if (parseError instanceof SyntaxError) {
              throw new Error(text);
            }
            throw parseError;
          }
        }
      }
      throw error;
    }
  },
};

export const appraisalScoreBandService = {
  list: async () => {
    const response = await api.get<ApiEnvelope<AppraisalScoreBandResponse[]>>('/hr/appraisal/score-bands');
    return unwrap<AppraisalScoreBandResponse[]>(response);
  },

  save: async (payload: AppraisalScoreBandRequest) => {
    const response = await api.post<ApiEnvelope<AppraisalScoreBandResponse>>('/hr/appraisal/score-bands', payload);
    return unwrap<AppraisalScoreBandResponse>(response);
  },

  remove: async (scoreBandId: number) => {
    await api.delete(`/hr/appraisal/score-bands/${scoreBandId}`);
  },
};

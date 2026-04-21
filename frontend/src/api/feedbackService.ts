import api from '../api';
import type { FeedbackForm, FeedbackRequest, FeedbackSummaryResponse } from '../types/feedback';

export const feedbackService = {
  // Forms
  createForm: async (form: FeedbackForm) => {
    const response = await api.post('/api/v1/feedback/forms', form);
    return response.data;
  },

  getForms: async () => {
    const response = await api.get('/api/v1/feedback/forms');
    return response.data;
  },

  getForm: async (id: number): Promise<FeedbackForm> => {
    const response = await api.get(`/api/v1/feedback/forms/${id}`);
    return response.data;
  },

  // Requests
  createRequest: async (request: Partial<FeedbackRequest>) => {
    const response = await api.post('/api/v1/feedback/requests', request);
    return response.data;
  },

  getRequests: async (employeeId: number) => {
    const response = await api.get(`/api/v1/feedback/requests/${employeeId}`);
    return response.data;
  },

  // Responses
  submitResponse: async (payload: any) => {
    const response = await api.post('/api/v1/feedback/responses', payload);
    return response.data;
  },

  // Employees & Cycles (Helper Lookups)
  getEmployees: async () => {
    const response = await api.get('/api/employees');
    return response.data;
  },

  getCycles: async () => {
    const response = await api.get('/api/appraisal-cycles');
    return response.data;
  },

  getAssignments: async (evaluatorId: number) => {
    const response = await api.get(`/api/v1/feedback/assignments/evaluator/${evaluatorId}`);
    return response.data;
  },

  // Analytics
  getSummary: async (requestId: number): Promise<FeedbackSummaryResponse> => {
    const response = await api.get(`/api/v1/feedback/requests/${requestId}/summary`);
    return response.data.data; // GenericApiResponse wrapper
  }
};

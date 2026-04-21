import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '../api/feedbackService';
import type { FeedbackForm, FeedbackRequest } from '../types/feedback';

export const useFeedbackForms = () => {
  return useQuery({
    queryKey: ['feedbackForms'],
    queryFn: feedbackService.getForms,
  });
};

export const useFormDetails = (formId: number) => {
  return useQuery({
    queryKey: ['feedbackForm', formId],
    queryFn: () => feedbackService.getForm(formId),
    enabled: !!formId,
  });
};

export const useCreateFeedbackForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FeedbackForm) => feedbackService.createForm(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbackForms'] });
    },
  });
};

export const useCreateFeedbackRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: Partial<FeedbackRequest>) => feedbackService.createRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbackRequests'] });
    },
  });
};

export const useFeedbackRequests = (employeeId: number) => {
  return useQuery({
    queryKey: ['feedbackRequests', employeeId],
    queryFn: () => feedbackService.getRequests(employeeId),
    enabled: !!employeeId,
  });
};

export const useSubmitFeedbackResponse = () => {
  return useMutation({
    mutationFn: (payload: any) => feedbackService.submitResponse(payload),
  });
};

export const useFeedbackSummary = (requestId: number) => {
  return useQuery({
    queryKey: ['feedbackSummary', requestId],
    queryFn: () => feedbackService.getSummary(requestId),
    enabled: !!requestId,
  });
};

export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: feedbackService.getEmployees,
  });
};

export const useCycles = () => {
  return useQuery({
    queryKey: ['cycles'],
    queryFn: feedbackService.getCycles,
  });
};

export const useAssignments = (evaluatorId: number) => {
  return useQuery({
    queryKey: ['assignments', evaluatorId],
    queryFn: () => feedbackService.getAssignments(evaluatorId),
    enabled: !!evaluatorId,
  });
};

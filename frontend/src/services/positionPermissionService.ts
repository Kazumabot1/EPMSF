import { isAxiosError } from 'axios';
import api from './api';
import type {
  PositionPermission,
  PositionPermissionAudit,
  TeamPermissionImpactPreview,
} from '../types/positionPermission';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

const POSITION_PERMISSION_ENDPOINT = '/position-permissions';

const unwrap = <T>(response: { data: ApiEnvelope<T> | T }): T => {
  const body = response.data as ApiEnvelope<T>;
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data;
  }
  return response.data as T;
};

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object') {
      const maybeMessage = (data as { message?: unknown; error?: unknown }).message;
      if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
        return maybeMessage;
      }

      const maybeError = (data as { error?: unknown }).error;
      if (typeof maybeError === 'string' && maybeError.trim().length > 0) {
        return maybeError;
      }
    }
  }

  return fallback;
};

export const emptyPositionPermission = (): PositionPermission => ({
  oneOnOneCreate: false,
  oneOnOneDeptSelection: false,
  oneOnOneTeamSelection: false,
  teamCreate: false,
  teamEdit: false,
  teamHistory: false,
  teamView: false,
  teamAssignAsLeader: false,
  teamAssignAsPm: false,
  teamAssignAsMember: false,
  pipCreate: false,
  pipEdit: false,
  pipViewAll: false,
  appraisalReview: false,
  appraisalApprove: false,
  appraisalView: false,
  appraisalScoreInput: false,
  appraisalSign: false,
  kpiCreate: false,
  kpiEdit: false,
  kpiScore: false,
  kpiView: false,
  kpiInput: false,
  selfAssessmentView: false,
  selfAssessmentInput: false,
  selfAssessmentLock: false,
  selfAssessmentSign: false,
  feedbackFormCreate: false,
  feedbackSend: false,
  continuousFeedbackView: false,
  continuousFeedbackGive: false,
  departmentCrud: false,
  departmentComparisonView: false,
  positionCrud: false,
  employeeCrud: false,
  employeeExcelImport: false,
});

export const emptyTeamPermissionImpactPreview = (): TeamPermissionImpactPreview => ({
  positionId: 0,
  positionTitle: '',
  hasImpact: false,
  memberRemovalCount: 0,
  projectManagerRemovalCount: 0,
  teamInactivationCount: 0,
  items: [],
});

export const positionPermissionService = {
  async getMyPermissions(): Promise<PositionPermission> {
    try {
      const response = await api.get<ApiEnvelope<PositionPermission>>(
        `${POSITION_PERMISSION_ENDPOINT}/me`,
      );
      return { ...emptyPositionPermission(), ...unwrap(response) };
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load current position permissions.'));
    }
  },

  async getByPositionId(positionId: number): Promise<PositionPermission> {
    try {
      const response = await api.get<ApiEnvelope<PositionPermission>>(
        `${POSITION_PERMISSION_ENDPOINT}/position/${positionId}`,
      );
      return { ...emptyPositionPermission(), ...unwrap(response) };
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load position permissions.'));
    }
  },

  async previewImpact(
    positionId: number,
    payload: PositionPermission,
  ): Promise<TeamPermissionImpactPreview> {
    try {
      const response = await api.post<ApiEnvelope<TeamPermissionImpactPreview>>(
        `${POSITION_PERMISSION_ENDPOINT}/position/${positionId}/impact-preview`,
        payload,
      );
      return { ...emptyTeamPermissionImpactPreview(), ...unwrap(response) };
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to preview position permission impact.'));
    }
  },

  async save(positionId: number, payload: PositionPermission): Promise<PositionPermission> {
    try {
      const response = await api.put<ApiEnvelope<PositionPermission>>(
        `${POSITION_PERMISSION_ENDPOINT}/position/${positionId}`,
        payload,
      );
      return { ...emptyPositionPermission(), ...unwrap(response) };
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to save position permissions.'));
    }
  },

  async getAudit(positionId: number): Promise<PositionPermissionAudit[]> {
    try {
      const response = await api.get<ApiEnvelope<PositionPermissionAudit[]>>(
        `${POSITION_PERMISSION_ENDPOINT}/position/${positionId}/audit`,
      );
      return unwrap(response) ?? [];
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load position permission audit history.'));
    }
  },
};
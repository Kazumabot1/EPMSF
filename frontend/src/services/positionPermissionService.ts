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

export const POSITION_PERMISSION_FIELDS: Array<keyof PositionPermission> = [
  'oneOnOneCreate',
  'oneOnOneDeptSelection',
  'oneOnOneTeamSelection',

  'teamCreate',
  'teamEdit',
  'teamHistory',
  'teamView',
'teamAssignAsLeader',
'teamAssignAsMember',

  'pipCreate',
  'pipEdit',
  'pipViewAll',

  'appraisalReview',
  'appraisalApprove',
  'appraisalView',
  'appraisalScoreInput',
  'appraisalSign',

  'kpiCreate',
  'kpiEdit',
  'kpiScore',
  'kpiView',
  'kpiInput',

  'selfAssessmentView',
  'selfAssessmentInput',
  'selfAssessmentLock',
  'selfAssessmentSign',

  'feedbackFormCreate',
  'feedbackSend',
  'continuousFeedbackView',
  'continuousFeedbackGive',

  'departmentCrud',
  'departmentComparisonView',
  'positionCrud',
  'employeeCrud',
  'employeeExcelImport',
];

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
  teamPermission: false,
  organizationPermission: false,
  assessmentPermission: false,
  appraisalPermission: false,
  feedback360Permission: false,
  oneOnOnePermission: false,
  positionPermission: false,
  kpiPermission: false,

  assessmentScoresView: false,
  assessmentFormCreate: false,

  oneOnOneCreate: false,
  oneOnOneDeptSelection: false,
  oneOnOneTeamSelection: false,

  teamCreate: false,
  teamEdit: false,
  teamHistory: false,
  teamView: false,

teamAssignAsLeader: false,
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

export const sanitizePositionPermission = (payload: unknown): PositionPermission => {
  const source = (payload ?? {}) as Record<string, unknown>;
  const clean = emptyPositionPermission();

  POSITION_PERMISSION_FIELDS.forEach((field) => {
    clean[field] = Boolean(source[field]);
  });


clean.teamPermission = Boolean(
  source.teamPermission ||
    clean.teamView ||
    clean.teamCreate ||
    clean.teamEdit ||
    clean.teamHistory,
);

  clean.organizationPermission = Boolean(
    source.organizationPermission ||
      clean.departmentCrud ||
      clean.departmentComparisonView ||
      clean.employeeCrud ||
      clean.employeeExcelImport,
  );

  clean.assessmentScoresView = Boolean(
    source.assessmentScoresView || clean.selfAssessmentView || clean.selfAssessmentLock || clean.selfAssessmentSign,
  );
  clean.assessmentFormCreate = Boolean(source.assessmentFormCreate || clean.selfAssessmentLock);
  clean.assessmentPermission = Boolean(
    source.assessmentPermission ||
      clean.selfAssessmentView ||
      clean.selfAssessmentInput ||
      clean.selfAssessmentLock ||
      clean.selfAssessmentSign ||
      clean.assessmentScoresView ||
      clean.assessmentFormCreate,
  );

  clean.appraisalPermission = Boolean(
    source.appraisalPermission ||
      clean.appraisalReview ||
      clean.appraisalApprove ||
      clean.appraisalView ||
      clean.appraisalScoreInput ||
      clean.appraisalSign,
  );

  clean.kpiPermission = Boolean(
    source.kpiPermission || clean.kpiCreate || clean.kpiEdit || clean.kpiScore || clean.kpiView || clean.kpiInput,
  );


  clean.oneOnOnePermission = Boolean(
    source.oneOnOnePermission || clean.oneOnOneCreate || clean.oneOnOneDeptSelection || clean.oneOnOneTeamSelection,
  );
  clean.feedback360Permission = Boolean(source.feedback360Permission || clean.feedbackFormCreate || clean.feedbackSend);
  clean.positionPermission = Boolean(source.positionPermission || clean.positionCrud);

  return clean;
};

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

      return sanitizePositionPermission(unwrap(response));
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, 'Failed to load current position permissions.'),
      );
    }
  },

  async getByPositionId(positionId: number): Promise<PositionPermission> {
    try {
      const response = await api.get<ApiEnvelope<PositionPermission>>(
        `${POSITION_PERMISSION_ENDPOINT}/position/${positionId}`,
      );

      return sanitizePositionPermission(unwrap(response));
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, 'Failed to load position permissions.'),
      );
    }
  },

  async previewImpact(
    positionId: number,
    payload: PositionPermission,
  ): Promise<TeamPermissionImpactPreview> {
    try {
      const response = await api.post<ApiEnvelope<TeamPermissionImpactPreview>>(
        `${POSITION_PERMISSION_ENDPOINT}/position/${positionId}/impact-preview`,
        sanitizePositionPermission(payload),
      );

      return {
        ...emptyTeamPermissionImpactPreview(),
        ...unwrap(response),
      };
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, 'Failed to preview position permission impact.'),
      );
    }
  },

  async save(positionId: number, payload: PositionPermission): Promise<PositionPermission> {
    try {
      const response = await api.put<ApiEnvelope<PositionPermission>>(
        `${POSITION_PERMISSION_ENDPOINT}/position/${positionId}`,
        sanitizePositionPermission(payload),
      );

      return sanitizePositionPermission(unwrap(response));
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, 'Failed to save position permissions.'),
      );
    }
  },

  async getAudit(positionId: number): Promise<PositionPermissionAudit[]> {
    try {
      const response = await api.get<ApiEnvelope<PositionPermissionAudit[]>>(
        `${POSITION_PERMISSION_ENDPOINT}/position/${positionId}/audit`,
      );

      return unwrap(response) ?? [];
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, 'Failed to load position permission audit history.'),
      );
    }
  },
};
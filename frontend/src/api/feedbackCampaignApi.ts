import api from '../services/api';
import { extractApiErrorMessage } from '../services/apiError';
import {
  fetchEmployees,
  type EmployeeResponse,
} from '../services/employeeService';
import { normalizeEvaluatorConfig } from '../types/feedbackCampaign';
import {
  fetchDepartments,
  fetchTeams,
  type Department,
  type TeamResponse,
} from '../services/teamService';
import type {
  ApiEnvelope,
  CreateFeedbackCampaignInput,
  FeedbackAssignmentGenerationResponse,
  FeedbackCampaignActivationReadiness,
  FeedbackCampaignMonitoring,
  FeedbackCampaign,
  FeedbackCampaignTarget,
  FeedbackCampaignTargetsInput,
  FeedbackCampaignTargetsResponse,
  FeedbackDepartmentOption,
  FeedbackTargetCandidate,
  FeedbackTargetCandidateQuery,
  FeedbackFormOption,
  FeedbackTargetEmployee,
  FeedbackTeamOption,
  FeedbackReminderResponse,
  FeedbackCampaignQuestionReview,
  FeedbackCampaignQuestionReviewSaveInput,
  EvaluatorConfigInput,
  ManualAssignmentInput,
  FeedbackCampaignScoringConfig,
  FeedbackCampaignScoringConfigInput,
} from '../types/feedbackCampaign';

const FEEDBACK_BASE = '/v1/feedback';

const unwrapEnvelope = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;

const buildTargetCandidateParams = (query: FeedbackTargetCandidateQuery = {}) => {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.currentDepartmentId != null) params.set('currentDepartmentId', String(query.currentDepartmentId));
  if (query.parentDepartmentId != null) params.set('parentDepartmentId', String(query.parentDepartmentId));
  if (query.teamId != null) params.set('teamId', String(query.teamId));
  if (query.levelCode?.trim()) params.set('levelCode', query.levelCode.trim());
  if (query.campaignId != null) params.set('campaignId', String(query.campaignId));
  if (query.readiness && query.readiness !== 'ALL') params.set('readiness', query.readiness);
  return params.toString();
};

const mapReadinessItem = <T extends FeedbackTargetCandidate | FeedbackCampaignTarget>(item: T): T => ({
  ...item,
  employeeName: item.employeeName?.trim() || `Employee #${item.employeeId}`,
  eligible: item.eligible !== false,
  blockReasons: item.blockReasons ?? [],
  warnings: item.warnings ?? [],
  notes: item.notes ?? [],
  activeTeamNames: item.activeTeamNames ?? [],
  activeTeamCount: item.activeTeamCount ?? 0,
  peerCandidateCount: item.peerCandidateCount ?? 0,
  subordinateCandidateCount: item.subordinateCandidateCount ?? 0,
});

const mapTargetsResponse = (response: FeedbackCampaignTargetsResponse): FeedbackCampaignTargetsResponse => ({
  ...response,
  targets: (response.targets ?? []).map(mapReadinessItem),
  warnings: response.warnings ?? [],
});

const mapQuestionReviewResponse = (response: FeedbackCampaignQuestionReview): FeedbackCampaignQuestionReview => ({
  ...response,
  warnings: response.warnings ?? [],
  groups: (response.groups ?? []).map(group => ({
    ...group,
    warnings: group.warnings ?? [],
    questions: group.questions ?? [],
  })),
  competencyWeights: (response.competencyWeights ?? []).map(weight => ({
    ...weight,
    formCount: Number(weight.formCount ?? 0),
    usedInForms: weight.usedInForms ?? [],
    includedScoredQuestionCountByForm: weight.includedScoredQuestionCountByForm ?? {},
    defaultWeightPercent: Number(weight.defaultWeightPercent ?? 0),
    weightPercent: Number(weight.weightPercent ?? 0),
    saved: Boolean(weight.saved),
    warnings: weight.warnings ?? [],
  })),
  totalCompetencyWeight: Number(response.totalCompetencyWeight ?? 0),
  competencyWeightsReady: Boolean(response.competencyWeightsReady),
});

const mapAssignmentGenerationResponse = (response: FeedbackAssignmentGenerationResponse): FeedbackAssignmentGenerationResponse => ({
  ...response,
  totalTargets: Number(response.totalTargets ?? 0),
  totalEvaluatorsGenerated: Number(response.totalEvaluatorsGenerated ?? 0),
  evaluatorConfig: response.evaluatorConfig ? normalizeEvaluatorConfig(response.evaluatorConfig) : null,
  requests: response.requests ?? [],
  assignmentDetails: response.assignmentDetails ?? [],
  warnings: response.warnings ?? [],
});

const mapActivationReadinessResponse = (response: FeedbackCampaignActivationReadiness): FeedbackCampaignActivationReadiness => ({
  ...response,
  ready: Boolean(response.ready),
  canMarkReady: Boolean(response.canMarkReady),
  canActivate: Boolean(response.canActivate),
  summary: {
    targetCount: Number(response.summary?.targetCount ?? 0),
    assignmentCount: Number(response.summary?.assignmentCount ?? 0),
    questionSelectionCount: Number(response.summary?.questionSelectionCount ?? 0),
    assignmentQuestionSnapshotCount: Number(response.summary?.assignmentQuestionSnapshotCount ?? 0),
    pendingAssignmentCount: Number(response.summary?.pendingAssignmentCount ?? 0),
    inProgressAssignmentCount: Number(response.summary?.inProgressAssignmentCount ?? 0),
    submittedAssignmentCount: Number(response.summary?.submittedAssignmentCount ?? 0),
    completionPercent: Number(response.summary?.completionPercent ?? 0),
  },
  checks: (response.checks ?? []).map(check => ({
    ...check,
    key: String(check.key ?? '').toUpperCase(),
    label: check.label ?? check.key ?? 'Setup check',
    message: check.message ?? '',
    status: check.status ?? 'BLOCKED',
  })),
  blockingIssues: response.blockingIssues ?? [],
  warnings: response.warnings ?? [],
});

const mapEmployee = (employee: EmployeeResponse): FeedbackTargetEmployee => ({
  id: employee.id,
  fullName:
      employee.fullName?.trim() ||
      `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
      `Employee #${employee.id}`,
  currentDepartmentId: employee.currentDepartmentId ?? null,
  currentDepartment: employee.currentDepartment ?? null,
  userId: employee.userId ?? null,
});

const mapDepartment = (department: Department): FeedbackDepartmentOption => ({
  id: department.id,
  name: department.departmentName ?? department.name ?? `Department #${department.id}`,
});

const mapTeam = (team: TeamResponse): FeedbackTeamOption => ({
  id: team.id,
  teamName: team.teamName,
  memberEmployeeIds: team.members
      .map((member) => member.employeeId)
      .filter((value): value is number => typeof value === 'number'),
});

export const feedbackCampaignApi = {
  async getActiveForms(): Promise<FeedbackFormOption[]> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackFormOption[]>>(`${FEEDBACK_BASE}/forms/active`);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load active feedback forms.'));
    }
  },

  async getEmployees(): Promise<FeedbackTargetEmployee[]> {
    const employees = await fetchEmployees(false);
    return employees
        .filter((employee) => employee.userId != null && employee.active !== false)
        .map(mapEmployee)
        .sort((left, right) => left.fullName.localeCompare(right.fullName));
  },

  async getDepartments(): Promise<FeedbackDepartmentOption[]> {
    const departments = await fetchDepartments();
    return departments.map(mapDepartment).sort((left, right) => left.name.localeCompare(right.name));
  },

  async getTeams(): Promise<FeedbackTeamOption[]> {
    const teams = await fetchTeams();
    return teams.map(mapTeam).sort((left, right) => left.teamName.localeCompare(right.teamName));
  },

  async createCampaign(payload: CreateFeedbackCampaignInput): Promise<FeedbackCampaign> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns`, payload);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create feedback campaign.'));
    }
  },

  async getCampaign(campaignId: number): Promise<FeedbackCampaign> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns/${campaignId}`);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load feedback campaign.'));
    }
  },

  async getTargetCandidates(query: FeedbackTargetCandidateQuery = {}): Promise<FeedbackTargetCandidate[]> {
    try {
      const params = buildTargetCandidateParams(query);
      const response = await api.get<ApiEnvelope<FeedbackTargetCandidate[]>>(
          `${FEEDBACK_BASE}/campaigns/target-candidates${params ? `?${params}` : ''}`,
      );
      return unwrapEnvelope(response).map(mapReadinessItem);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load target candidates.'));
    }
  },

  async getScoringConfig(campaignId: number): Promise<FeedbackCampaignScoringConfig> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaignScoringConfig>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/scoring-config`,
      );
      const data = unwrapEnvelope(response);
      return {
        ...data,
        relationshipWeights: data.relationshipWeights ?? [],
        warnings: data.warnings ?? [],
        totalRelationshipWeight: Number(data.totalRelationshipWeight ?? 0),
      };
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load campaign scoring configuration.'));
    }
  },

  async updateScoringConfig(
      campaignId: number,
      payload: FeedbackCampaignScoringConfigInput,
  ): Promise<FeedbackCampaignScoringConfig> {
    try {
      const response = await api.put<ApiEnvelope<FeedbackCampaignScoringConfig>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/scoring-config`,
          payload,
      );
      const data = unwrapEnvelope(response);
      return {
        ...data,
        relationshipWeights: data.relationshipWeights ?? [],
        warnings: data.warnings ?? [],
        totalRelationshipWeight: Number(data.totalRelationshipWeight ?? 0),
      };
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to save campaign scoring configuration.'));
    }
  },

  async getCampaignTargets(campaignId: number): Promise<FeedbackCampaignTargetsResponse> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaignTargetsResponse>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/targets`,
      );
      return mapTargetsResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load campaign targets.'));
    }
  },

  async updateCampaignTargets(
      campaignId: number,
      payload: FeedbackCampaignTargetsInput,
  ): Promise<FeedbackCampaignTargetsResponse> {
    try {
      const response = await api.put<ApiEnvelope<FeedbackCampaignTargetsResponse>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/targets`,
          payload,
      );
      return mapTargetsResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to save campaign targets.'));
    }
  },

  async assignTargets(
      campaignId: number,
      payload: FeedbackCampaignTargetsInput,
  ): Promise<FeedbackCampaign> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaign>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/targets`,
          payload,
      );
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to assign campaign targets.'));
    }
  },



  async getActivationReadiness(campaignId: number): Promise<FeedbackCampaignActivationReadiness> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaignActivationReadiness>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/activation-readiness`,
      );
      return mapActivationReadinessResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load activation readiness.'));
    }
  },

  async getCampaignMonitoring(campaignId: number): Promise<FeedbackCampaignMonitoring> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaignMonitoring>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/monitoring`,
      );
      const data = unwrapEnvelope(response);
      return {
        ...data,
        byRole: data.byRole ?? [],
        targets: data.targets ?? [],
        warnings: data.warnings ?? [],
      };
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load campaign monitoring.'));
    }
  },

  async activateCampaign(campaignId: number): Promise<FeedbackCampaign> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns/${campaignId}/activate`);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to activate feedback campaign.'));
    }
  },

  async closeCampaign(campaignId: number): Promise<FeedbackCampaign> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns/${campaignId}/close`);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to close feedback campaign.'));
    }
  },

  async updateCampaign(campaignId: number, payload: CreateFeedbackCampaignInput): Promise<FeedbackCampaign> {
    try {
      const response = await api.put<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns/${campaignId}`, payload);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update feedback campaign draft.'));
    }
  },

  async markReadyToActivate(campaignId: number): Promise<FeedbackCampaign> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns/${campaignId}/ready`);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to validate feedback campaign setup.'));
    }
  },

  async publishCampaign(campaignId: number): Promise<FeedbackCampaign> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns/${campaignId}/publish`);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to publish feedback campaign.'));
    }
  },

  async deleteDraftCampaign(campaignId: number): Promise<void> {
    try {
      await api.delete(`${FEEDBACK_BASE}/campaigns/${campaignId}`);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to delete draft feedback campaign.'));
    }
  },

  async generateAssignments(
      campaignId: number,
      payload: EvaluatorConfigInput,
  ): Promise<FeedbackAssignmentGenerationResponse> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackAssignmentGenerationResponse>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/assignments/generate`,
          normalizeEvaluatorConfig(payload),
      );
      return mapAssignmentGenerationResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Evaluators could not be saved.'));
    }
  },

  async previewAssignments(
      campaignId: number,
      payload: EvaluatorConfigInput,
  ): Promise<FeedbackAssignmentGenerationResponse> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackAssignmentGenerationResponse>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/assignments/preview`,
          normalizeEvaluatorConfig(payload),
      );
      return mapAssignmentGenerationResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Evaluator preview could not be prepared.'));
    }
  },

  async getAssignmentPreview(campaignId: number): Promise<FeedbackAssignmentGenerationResponse> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackAssignmentGenerationResponse>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/assignments/preview`,
      );
      return mapAssignmentGenerationResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Evaluator preview could not be loaded.'));
    }
  },

  async addManualAssignment(
      campaignId: number,
      payload: ManualAssignmentInput,
  ): Promise<FeedbackAssignmentGenerationResponse> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackAssignmentGenerationResponse>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/assignments/manual`,
          payload,
      );
      return mapAssignmentGenerationResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Evaluator could not be added.'));
    }
  },

  async removeAssignment(
      campaignId: number,
      assignmentId: number,
  ): Promise<FeedbackAssignmentGenerationResponse> {
    try {
      const response = await api.delete<ApiEnvelope<FeedbackAssignmentGenerationResponse>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/assignments/${assignmentId}`,
      );
      return mapAssignmentGenerationResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Evaluator could not be removed.'));
    }
  },


  async getQuestionReview(campaignId: number): Promise<FeedbackCampaignQuestionReview> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaignQuestionReview>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/question-review`,
      );
      return mapQuestionReviewResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load campaign question review.'));
    }
  },

  async resolveQuestionReview(campaignId: number): Promise<FeedbackCampaignQuestionReview> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaignQuestionReview>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/question-review/resolve`,
      );
      return mapQuestionReviewResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to resolve campaign questions.'));
    }
  },

  async saveQuestionReview(
      campaignId: number,
      payload: FeedbackCampaignQuestionReviewSaveInput,
  ): Promise<FeedbackCampaignQuestionReview> {
    try {
      const response = await api.put<ApiEnvelope<FeedbackCampaignQuestionReview>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/question-review`,
          payload,
      );
      return mapQuestionReviewResponse(unwrapEnvelope(response));
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to save campaign question selection.'));
    }
  },

  async sendPendingReminders(campaignId: number): Promise<FeedbackReminderResponse> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackReminderResponse>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/reminders`,
      );
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to send pending evaluator reminders.'));
    }
  },
};

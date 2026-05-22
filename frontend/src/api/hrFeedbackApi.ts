import api from '../services/api';
import { extractApiErrorMessage } from '../services/apiError';
import type {
    ApiEnvelope,
    EvaluatorConfigInput,
    FeedbackCampaign,
    FeedbackCampaignActivationReadiness,
    FeedbackCampaignMonitoring,
    FeedbackCampaignStatus,
    FeedbackReminderResponse,
} from '../types/feedbackCampaign';

const BASE = '/v1/feedback';

const unwrap = <T>(res: { data: ApiEnvelope<T> }): T => res.data.data;

export type FeedbackFormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface FormOptionItem {
    id: number;
    formName: string;
    anonymousAllowed: boolean;
    versionNumber: number;
    status: FeedbackFormStatus | string;
    rootFormId?: number | null;
    createdAt?: string | null;
    createdByUserId?: number | null;
}

export interface FormQuestionDetail {
    id: number | null;
    questionText: string;
    questionOrder: number;
    ratingScaleId: number | null;
    weight: number;
    isRequired: boolean;
}

export interface FormSectionDetail {
    id: number | null;
    title: string;
    orderNo: number;
    questions: FormQuestionDetail[];
}

export interface FormDetail extends FormOptionItem {
    sections: FormSectionDetail[];
}

export interface CreateFormPayload {
    formName: string;
    anonymousAllowed: boolean;
    sections: {
        title: string;
        orderNo: number;
        questions: {
            questionText: string;
            questionOrder: number;
            ratingScaleId: number | null;
            weight: number;
            isRequired: boolean;
        }[];
    }[];
}

export interface RatingScaleOption {
    id: number;
    scales?: number;
    description?: string;
    performanceLevel?: string;
    /** Deprecated: feedback ratings do not decide promotion eligibility. */
    promotionEligibility?: string | null;
    scaleName?: string;
    minScore?: number;
    maxScore?: number;
}


export type FeedbackRelationshipType = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';
export type FeedbackQuestionRuleRole = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';

export type FeedbackQuestionStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED' | 'ARCHIVED' | string;

export interface FeedbackCompetencyItem {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    category?: string;
    displayOrder?: number;
    status?: string;
    questionCount: number;
    activeQuestionCount: number;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface FeedbackCompetencyPayload {
    code?: string;
    name: string;
    description?: string | null;
}

export interface FeedbackQuestionQualityIssue {
    severity: 'ERROR' | 'WARNING' | string;
    code: string;
    message: string;
}

export interface FeedbackQuestionQualityValidation {
    canSave: boolean;
    canActivate: boolean;
    qualityScore: number;
    issues: FeedbackQuestionQualityIssue[];
}

export interface FeedbackQuestionBankReadiness {
    ready: boolean;
    qualityScore: number;
    activeQuestionCount: number;
    draftQuestionCount: number;
    activeCompetencyCount: number;
    totalActiveCompetencyWeight: number;
    issues: FeedbackQuestionQualityIssue[];
}

export interface QuestionBankItem {
    id: number;
    questionCode?: string;
    competencyCode: string;
    questionText: string;
    responseType: string;
    scoringBehavior?: string | null;
    ratingScaleId?: number | null;
    weight: number;
    required: boolean;
    helpText?: string | null;
    status: FeedbackQuestionStatus;
    activeVersionId?: number | null;
    activeVersionNumber?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface QuestionBankPayload {
    questionCode?: string;
    competencyCode: string;
    questionText: string;
    responseType: 'RATING_WITH_COMMENT';
    scoringBehavior: 'SCORED';
    ratingScaleId?: null;
    weight: 1;
    required: true;
    helpText?: string | null;
    status?: string;
}

export interface QuestionRuleItem {
    id: number;
    ruleSetId?: number | null;
    ruleSetName?: string | null;
    ruleSetDescription?: string | null;
    ruleSetStatus?: 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED' | string | null;
    ruleSetType?: 'BASE' | 'DEPARTMENT_ADD_ON' | 'POSITION_ADD_ON' | 'DEPARTMENT_POSITION_ADD_ON' | string | null;
    questionBankId: number;
    activeVersionId?: number | null;
    questionCode?: string | null;
    competencyCode?: string | null;
    questionText?: string | null;
    responseType?: string | null;
    scoringBehavior?: string | null;
    questionStatus?: string | null;
    effectiveActive?: boolean | null;
    targetLevelMinRank: number;
    targetLevelMaxRank: number;
    targetPositionId?: number | null;
    targetDepartmentId?: number | null;
    evaluatorRelationshipType: FeedbackRelationshipType | string;
    evaluatorRelationshipTypes?: Array<FeedbackQuestionRuleRole | string>;
    displayOrder: number;
    rulePriority: number;
    active: boolean;
    updatedAt?: string | null;
}

export interface QuestionRulePayload {
    ruleSetName?: string | null;
    ruleSetDescription?: string | null;
    ruleSetStatus?: 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED' | string | null;
    questionBankId?: number;
    questionBankIds?: number[];
    targetLevelMinRank: number;
    targetLevelMaxRank: number;
    targetPositionId?: number | null;
    targetDepartmentId?: number | null;
    evaluatorRelationshipType?: FeedbackRelationshipType | string;
    evaluatorRelationshipTypes?: Array<FeedbackQuestionRuleRole | 'ALL' | string>;
    displayOrder?: number;
    rulePriority?: number;
    active: boolean;
}

export interface DynamicPreviewQuestion {
    id?: number | null;
    assignmentQuestionId?: number | null;
    questionCode: string;
    competencyCode?: string | null;
    responseType: string;
    scoringBehavior?: string | null;
    questionText: string;
    questionOrder: number;
    ratingScaleId?: number | null;
    ratingScaleMin?: number | null;
    ratingScaleMax?: number | null;
    weight: number;
    required: boolean;
}

export interface DynamicPreviewSection {
    id?: number | null;
    sectionCode: string;
    title: string;
    orderNo: number;
    questions: DynamicPreviewQuestion[];
}

export interface DynamicFormPreview {
    levelCode: string;
    levelRank: number;
    relationshipType: string;
    targetPositionId?: number | null;
    targetDepartmentId?: number | null;
    totalQuestions: number;
    sections: DynamicPreviewSection[];
}

type ApiFeedbackCampaign = Partial<FeedbackCampaign> & {
    id: number;
    name: string;
    campaignType?: string | null;
    reviewYear?: number;
    startDate: string;
    endDate: string;
    startAt?: string;
    endAt?: string;
    description?: string | null;
    instructions?: string | null;
    status: FeedbackCampaignStatus | string;
    createdByUserId?: number;
};

const normalizeCampaign = (campaign: ApiFeedbackCampaign): FeedbackCampaign => ({
    id: campaign.id,
    name: campaign.name,
    campaignType: campaign.campaignType ?? 'Annual 360',
    reviewYear: campaign.reviewYear ?? Number((campaign.startDate ?? new Date().toISOString()).slice(0, 4)),
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    startAt: campaign.startAt ?? `${campaign.startDate}T09:00:00`,
    endAt: campaign.endAt ?? `${campaign.endDate}T17:00:00`,
    description: campaign.description ?? null,
    instructions: campaign.instructions ?? null,
    status: campaign.status as FeedbackCampaignStatus,
    formId: campaign.formId ?? null,
    autoSubmitCompletedDraftsOnClose: Boolean(campaign.autoSubmitCompletedDraftsOnClose),
    managerFeedbackAnonymous: Boolean(campaign.managerFeedbackAnonymous),
    peerFeedbackAnonymous: campaign.peerFeedbackAnonymous !== false,
    subordinateFeedbackAnonymous: campaign.subordinateFeedbackAnonymous !== false,
    selfFeedbackAnonymous: Boolean(campaign.selfFeedbackAnonymous),
    redistributeMissingRelationshipWeight: campaign.redistributeMissingRelationshipWeight !== false,
    earlyCloseRequestStatus: campaign.earlyCloseRequestStatus ?? 'NONE',
    earlyCloseRequestedAt: campaign.earlyCloseRequestedAt ?? null,
    earlyCloseRequestedByUserId: campaign.earlyCloseRequestedByUserId ?? null,
    earlyCloseRequestReason: campaign.earlyCloseRequestReason ?? null,
    earlyCloseReviewedAt: campaign.earlyCloseReviewedAt ?? null,
    earlyCloseReviewedByUserId: campaign.earlyCloseReviewedByUserId ?? null,
    earlyCloseReviewReason: campaign.earlyCloseReviewReason ?? null,
    closedAt: campaign.closedAt ?? null,
    closedByUserId: campaign.closedByUserId ?? null,
    closeReason: campaign.closeReason ?? null,
    closedEarly: Boolean(campaign.closedEarly),
    createdBy: campaign.createdBy ?? campaign.createdByUserId ?? 0,
    createdAt: campaign.createdAt ?? '',
    targetCount: campaign.targetCount ?? campaign.targetEmployeeIds?.length ?? 0,
    assignmentCount: campaign.assignmentCount ?? 0,
    targetEmployeeIds: campaign.targetEmployeeIds ?? [],
});

const normalizeCampaigns = (campaigns: ApiFeedbackCampaign[] | null | undefined): FeedbackCampaign[] =>
    (campaigns ?? []).map(normalizeCampaign);


export interface CreateCampaignPayload {
    name: string;
    campaignType: string;
    reviewYear?: number;
    startAt?: string;
    endAt?: string;
    startDate?: string;
    endDate?: string;
    formId?: number | null;
    description?: string;
    instructions?: string;
    autoSubmitCompletedDraftsOnClose?: boolean;
    managerFeedbackAnonymous?: boolean;
    peerFeedbackAnonymous?: boolean;
    subordinateFeedbackAnonymous?: boolean;
    selfFeedbackAnonymous?: boolean;
    redistributeMissingRelationshipWeight?: boolean;
}

export interface CampaignTargetPayload {
    /** Legacy HR dashboard field kept for backward compatibility. Backend expects employeeIds. */
    targetEmployeeIds?: number[];
    /** Backend field used by /campaigns/{campaignId}/targets. */
    employeeIds?: number[];
    dueAt?: string | null;
    anonymousEnabled?: boolean;
}

export interface AssignmentGenerationResponse {
    campaignId?: number;
    totalTargets?: number;
    totalEvaluatorsGenerated?: number;
    createdAssignments?: number;
    skippedAssignments?: number;
    message?: string;
    assignments?: unknown[];
    preview?: unknown[];
    requests?: unknown[];
    warnings?: string[];
    evaluatorConfig?: EvaluatorConfigInput;
    [key: string]: unknown;
}

export const DEFAULT_EVALUATOR_CONFIG: EvaluatorConfigInput = {
    includeManager: true,
    includePeers: true,
    includeTeamPeers: true,
    includeDepartmentPeers: true,
    includeProjectPeers: false,
    includeCrossTeamPeers: false,
    includeSubordinates: true,
    includeSelf: true,
    peerMinCount: 1,
    peerMaxCount: 3,
    subordinateMinCount: 0,
    subordinateMaxCount: 5,
    flexibleMode: true,
    peerCount: 3,
};

export const ratingScaleLabel = (scale: RatingScaleOption): string => {
    if (scale.scaleName) return `${scale.scaleName} (${scale.minScore ?? 1}-${scale.maxScore ?? scale.scales ?? 5})`;
    return `${scale.description ?? 'Rating Scale'} (1-${scale.scales ?? scale.maxScore ?? 5})`;
};

const normalizeFormOption = (form: Partial<FormOptionItem> & { id: number }): FormOptionItem => ({
    id: form.id,
    formName: form.formName ?? `Feedback Form #${form.id}`,
    anonymousAllowed: form.anonymousAllowed ?? false,
    versionNumber: form.versionNumber ?? 1,
    status: form.status ?? 'DRAFT',
    rootFormId: form.rootFormId ?? null,
    createdAt: form.createdAt ?? null,
    createdByUserId: form.createdByUserId ?? null,
});

const normalizeFormOptions = (forms: (Partial<FormOptionItem> & { id: number })[] | null | undefined): FormOptionItem[] =>
    (forms ?? []).map(normalizeFormOption);

export const hrFeedbackApi = {


    async getFeedbackCompetencies(): Promise<FeedbackCompetencyItem[]> {
        try {
            const res = await api.get<ApiEnvelope<FeedbackCompetencyItem[]>>(`${BASE}/question-bank/competencies`);
            return unwrap(res) ?? [];
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load feedback competencies.'));
        }
    },

    async createFeedbackCompetency(payload: FeedbackCompetencyPayload): Promise<FeedbackCompetencyItem> {
        try {
            const res = await api.post<ApiEnvelope<FeedbackCompetencyItem>>(`${BASE}/question-bank/competencies`, payload);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to create feedback competency.'));
        }
    },

    async updateFeedbackCompetency(competencyId: number, payload: FeedbackCompetencyPayload): Promise<FeedbackCompetencyItem> {
        try {
            const res = await api.put<ApiEnvelope<FeedbackCompetencyItem>>(`${BASE}/question-bank/competencies/${competencyId}`, payload);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to update feedback competency.'));
        }
    },

    async getQuestionBankReadiness(): Promise<FeedbackQuestionBankReadiness> {
        try {
            const res = await api.get<ApiEnvelope<FeedbackQuestionBankReadiness>>(`${BASE}/question-bank/readiness`);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load question bank readiness.'));
        }
    },

    async validateQuestionBankItem(payload: QuestionBankPayload, excludeQuestionId?: number | null): Promise<FeedbackQuestionQualityValidation> {
        try {
            const res = await api.post<ApiEnvelope<FeedbackQuestionQualityValidation>>(`${BASE}/question-bank/questions/quality-check`, payload, {
                params: excludeQuestionId ? { excludeQuestionId } : undefined,
            });
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to validate feedback question.'));
        }
    },

    async getQuestionBank(): Promise<QuestionBankItem[]> {
        try {
            const res = await api.get<ApiEnvelope<QuestionBankItem[]>>(`${BASE}/question-bank/questions`);
            return unwrap(res) ?? [];
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load the feedback question bank.'));
        }
    },

    async createQuestionBankItem(payload: QuestionBankPayload): Promise<QuestionBankItem> {
        try {
            const res = await api.post<ApiEnvelope<QuestionBankItem>>(`${BASE}/question-bank/questions`, payload);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to create feedback question.'));
        }
    },

    async updateQuestionBankItem(questionId: number, payload: QuestionBankPayload): Promise<QuestionBankItem> {
        try {
            const res = await api.put<ApiEnvelope<QuestionBankItem>>(`${BASE}/question-bank/questions/${questionId}`, payload);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to update feedback question.'));
        }
    },

    async updateQuestionBankStatus(questionId: number, status: 'DRAFT' | 'ACTIVE' | 'RETIRED' | 'ARCHIVED'): Promise<QuestionBankItem> {
        try {
            const res = await api.patch<ApiEnvelope<QuestionBankItem>>(`${BASE}/question-bank/questions/${questionId}/status`, null, { params: { status } });
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to update feedback question status.'));
        }
    },

    async getQuestionRules(): Promise<QuestionRuleItem[]> {
        try {
            const res = await api.get<ApiEnvelope<QuestionRuleItem[]>>(`${BASE}/question-bank/rules`);
            return unwrap(res) ?? [];
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load feedback question rules.'));
        }
    },

    async createQuestionRule(payload: QuestionRulePayload): Promise<QuestionRuleItem[]> {
        try {
            const res = await api.post<ApiEnvelope<QuestionRuleItem[] | QuestionRuleItem>>(`${BASE}/question-bank/rules`, payload);
            const data = unwrap(res);
            return Array.isArray(data) ? data : [data];
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to create feedback question rule.'));
        }
    },

    async updateQuestionRule(ruleId: number, payload: QuestionRulePayload): Promise<QuestionRuleItem> {
        try {
            const res = await api.put<ApiEnvelope<QuestionRuleItem>>(`${BASE}/question-bank/rules/${ruleId}`, payload);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to update feedback question rule.'));
        }
    },

    async updateQuestionRuleSet(ruleSetId: number, payload: QuestionRulePayload): Promise<QuestionRuleItem[]> {
        try {
            const res = await api.put<ApiEnvelope<QuestionRuleItem[] | QuestionRuleItem>>(`${BASE}/question-bank/rules/rule-sets/${ruleSetId}`, payload);
            const data = unwrap(res);
            return Array.isArray(data) ? data : [data];
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to update feedback question rule set.'));
        }
    },

    async deactivateQuestionRule(ruleId: number): Promise<void> {
        try {
            await api.delete(`${BASE}/question-bank/rules/${ruleId}`);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to deactivate feedback question rule.'));
        }
    },

    async activateQuestionRule(ruleId: number): Promise<QuestionRuleItem> {
        try {
            const res = await api.patch<ApiEnvelope<QuestionRuleItem>>(`${BASE}/question-bank/rules/${ruleId}/activate`);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to activate feedback question rule.'));
        }
    },

    async previewDynamicForm(params: {
        levelCode: string;
        relationshipType: string;
        targetPositionId?: number | null;
        targetDepartmentId?: number | null;
    }): Promise<DynamicFormPreview> {
        try {
            const res = await api.get<ApiEnvelope<DynamicFormPreview>>(`${BASE}/question-bank/preview`, { params });
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to generate dynamic form preview.'));
        }
    },

    async getAllForms(): Promise<FormOptionItem[]> {
        try {
            const res = await api.get<ApiEnvelope<FormOptionItem[]>>(`${BASE}/forms`);
            return normalizeFormOptions(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load feedback forms.'));
        }
    },

    async getActiveForms(): Promise<FormOptionItem[]> {
        try {
            const res = await api.get<ApiEnvelope<FormOptionItem[]>>(`${BASE}/forms/active`);
            return normalizeFormOptions(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load active forms.'));
        }
    },

    async getFormDetail(formId: number): Promise<FormDetail> {
        try {
            const res = await api.get<ApiEnvelope<FormDetail>>(`${BASE}/forms/${formId}`);
            const detail = unwrap(res);
            return { ...detail, sections: detail.sections ?? [] };
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load form detail.'));
        }
    },

    async createForm(payload: CreateFormPayload): Promise<number> {
        try {
            const res = await api.post<ApiEnvelope<number>>(`${BASE}/forms`, payload);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to create feedback form.'));
        }
    },

    async updateForm(formId: number, payload: CreateFormPayload): Promise<number> {
        try {
            const res = await api.put<ApiEnvelope<number>>(`${BASE}/forms/${formId}`, payload);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to update feedback form.'));
        }
    },

    async createFormVersion(formId: number, payload: CreateFormPayload): Promise<number> {
        try {
            const res = await api.post<ApiEnvelope<number>>(`${BASE}/forms/${formId}/versions`, payload);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to create new form version.'));
        }
    },

    async getFormVersions(formId: number): Promise<FormOptionItem[]> {
        try {
            const res = await api.get<ApiEnvelope<FormOptionItem[] | number[]>>(`${BASE}/forms/${formId}/versions`);
            const data = unwrap(res);

            if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'number') {
                const details = await Promise.all((data as number[]).map(id => hrFeedbackApi.getFormDetail(id)));
                return normalizeFormOptions(details);
            }

            return normalizeFormOptions(data as FormOptionItem[]);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load form versions.'));
        }
    },

    async changeFormStatus(formId: number, status: 'ACTIVE' | 'ARCHIVED'): Promise<void> {
        try {
            await api.put(`${BASE}/forms/${formId}/status?status=${status}`);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to change form status.'));
        }
    },

    async getRatingScales(): Promise<RatingScaleOption[]> {
        try {
            const res = await api.get<ApiEnvelope<RatingScaleOption[]>>('/v1/rating-scales');
            return unwrap(res) ?? [];
        } catch {
            return [];
        }
    },

    async getAllCampaigns(): Promise<FeedbackCampaign[]> {
        try {
            const res = await api.get<ApiEnvelope<ApiFeedbackCampaign[]>>(`${BASE}/campaigns`);
            return normalizeCampaigns(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load campaigns.'));
        }
    },

    async getPendingEarlyCloseRequests(): Promise<FeedbackCampaign[]> {
        try {
            const res = await api.get<ApiEnvelope<ApiFeedbackCampaign[]>>(`${BASE}/campaigns/early-close/requests`);
            return normalizeCampaigns(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load early close requests.'));
        }
    },

    async createCampaign(payload: CreateCampaignPayload): Promise<FeedbackCampaign> {
        try {
            const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns`, payload);
            return normalizeCampaign(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to create campaign.'));
        }
    },

    async updateCampaign(campaignId: number, payload: CreateCampaignPayload): Promise<FeedbackCampaign> {
        try {
            const res = await api.put<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}`, payload);
            return normalizeCampaign(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to update campaign draft.'));
        }
    },

    async markReadyToActivate(campaignId: number): Promise<FeedbackCampaign> {
        try {
            const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/ready`);
            return normalizeCampaign(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to validate campaign setup.'));
        }
    },

    async saveCampaignTargets(campaignId: number, payload: CampaignTargetPayload): Promise<void> {
        try {
            const employeeIds = payload.employeeIds ?? payload.targetEmployeeIds ?? [];
            await api.post(`${BASE}/campaigns/${campaignId}/targets`, { employeeIds });
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to save campaign targets.'));
        }
    },

    async generateAssignments(
        campaignId: number,
        payload: EvaluatorConfigInput = DEFAULT_EVALUATOR_CONFIG,
    ): Promise<AssignmentGenerationResponse> {
        try {
            const res = await api.post<ApiEnvelope<AssignmentGenerationResponse>>(
                `${BASE}/campaigns/${campaignId}/assignments/generate`,
                payload,
            );
            return unwrap(res) ?? {};
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to generate evaluator assignments.'));
        }
    },



    async getActivationReadiness(campaignId: number): Promise<FeedbackCampaignActivationReadiness> {
        try {
            const res = await api.get<ApiEnvelope<FeedbackCampaignActivationReadiness>>(`${BASE}/campaigns/${campaignId}/activation-readiness`);
            const data = unwrap(res);
            return {
                ...data,
                checks: data.checks ?? [],
                blockingIssues: data.blockingIssues ?? [],
                warnings: data.warnings ?? [],
            };
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load activation readiness.'));
        }
    },

    async getCampaignMonitoring(campaignId: number): Promise<FeedbackCampaignMonitoring> {
        try {
            const res = await api.get<ApiEnvelope<FeedbackCampaignMonitoring>>(`${BASE}/campaigns/${campaignId}/monitoring`);
            const data = unwrap(res);
            return {
                ...data,
                byRole: data.byRole ?? [],
                targets: data.targets ?? [],
                warnings: data.warnings ?? [],
            };
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load campaign monitoring.'));
        }
    },

    async activateCampaign(campaignId: number): Promise<FeedbackCampaign> {
        try {
            const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/activate`);
            return normalizeCampaign(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to activate campaign.'));
        }
    },

    async closeCampaign(campaignId: number): Promise<FeedbackCampaign> {
        try {
            const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/close`);
            return normalizeCampaign(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to close campaign.'));
        }
    },

    async requestEarlyClose(campaignId: number, reason: string): Promise<FeedbackCampaign> {
        try {
            const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/early-close/request`, { reason });
            return normalizeCampaign(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to request early close.'));
        }
    },

    async approveEarlyClose(campaignId: number, reviewNote?: string): Promise<FeedbackCampaign> {
        try {
            const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/early-close/approve`, { reviewNote });
            return normalizeCampaign(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to approve early close.'));
        }
    },

    async rejectEarlyClose(campaignId: number, reviewNote?: string): Promise<FeedbackCampaign> {
        try {
            const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/early-close/reject`, { reviewNote });
            return normalizeCampaign(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to reject early close.'));
        }
    },

    async publishCampaign(campaignId: number): Promise<FeedbackCampaign> {
        try {
            const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/publish`);
            return normalizeCampaign(unwrap(res));
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to publish campaign.'));
        }
    },

    async deleteDraftCampaign(campaignId: number): Promise<void> {
        try {
            await api.delete(`${BASE}/campaigns/${campaignId}`);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to delete draft campaign.'));
        }
    },

    async sendPendingReminders(campaignId: number): Promise<FeedbackReminderResponse> {
        try {
            const res = await api.post<ApiEnvelope<FeedbackReminderResponse>>(`${BASE}/campaigns/${campaignId}/reminders`);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to send pending evaluator reminders.'));
        }
    },

    async getCompletionDashboard(campaignId: number) {
        try {
            const res = await api.get<ApiEnvelope<import('../types/feedback').FeedbackCompletionDashboard>>(`${BASE}/campaigns/${campaignId}/completion`);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load completion dashboard.'));
        }
    },

    async getConsolidatedReport(campaignId: number) {
        try {
            const res = await api.get<ApiEnvelope<import('../types/feedback').ConsolidatedFeedbackReport>>(`${BASE}/campaigns/${campaignId}/consolidated`);
            return unwrap(res);
        } catch (e) {
            throw new Error(extractApiErrorMessage(e, 'Failed to load consolidated report.'));
        }
    },
};

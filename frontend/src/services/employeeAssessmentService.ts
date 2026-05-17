
import api from './api';
import type {
  AssessmentRequest,
  AssessmentScoreBand,
  AssessmentScoreRow,
  EmployeeAssessment,
} from '../types/employeeAssessment';

const unwrap = <T,>(payload: any, fallback: T): T => {
  return payload?.data?.data ?? payload?.data ?? fallback;
};

const currentPeriod = () => String(new Date().getFullYear());

const getFullName = (payload: any) => {
  const firstName = payload?.employee?.firstName ?? payload?.firstName ?? '';
  const lastName = payload?.employee?.lastName ?? payload?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    payload?.employeeName ??
    payload?.employeeFullName ??
    payload?.name ??
    payload?.fullName ??
    fullName ??
    ''
  );
};

const defaultScoreBands = (): AssessmentScoreBand[] => [
  {
    minScore: 86,
    maxScore: 100,
    label: 'Outstanding',
    description:
      'Performance exceptional and far exceeds expectations. Consistently demonstrates excellent standards in all job requirements.',
    sortOrder: 1,
  },
  {
    minScore: 71,
    maxScore: 85,
    label: 'Good',
    description: 'Performance is consistent. Clearly meets essential requirements of job.',
    sortOrder: 2,
  },
  {
    minScore: 60,
    maxScore: 70,
    label: 'Meet Requirement',
    description: 'Performance is satisfactory. Meets requirements of the job.',
    sortOrder: 3,
  },
  {
    minScore: 40,
    maxScore: 59,
    label: 'Need Improvement',
    description:
      'Performance is inconsistent. Meets requirements of the job occasionally. Supervision and training is required for most problem areas.',
    sortOrder: 4,
  },
  {
    minScore: 0,
    maxScore: 39,
    label: 'Unsatisfactory',
    description: 'Performance does not meet the minimum requirement of the job.',
    sortOrder: 5,
  },
];

const normalizeScoreBands = (payload: any): AssessmentScoreBand[] => {
  const rawBands = Array.isArray(payload?.scoreBands) ? payload.scoreBands : [];
  const bands = rawBands.length ? rawBands : defaultScoreBands();

  return bands
    .map((band: any, index: number): AssessmentScoreBand => ({
      id: band.id ?? null,
      minScore: Number(band.minScore ?? 0),
      maxScore: Number(band.maxScore ?? 100),
      label: band.label ?? '',
      description: band.description ?? '',
      sortOrder: band.sortOrder ?? index + 1,
    }))
    .sort(
      (a: AssessmentScoreBand, b: AssessmentScoreBand) =>
        Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    );
};

const normalizeAssessment = (payload: any): EmployeeAssessment | null => {
  if (!payload) return null;

  const rawSections = Array.isArray(payload.sections) ? payload.sections : [];

  const formId =
    payload.formId ??
    payload.assessmentFormId ??
    payload.templateId ??
    payload.form?.id ??
    payload.assessmentForm?.id ??
    null;

  const sections = rawSections.map((section: any, sectionIndex: number) => {
    const rawItems = Array.isArray(section.items)
      ? section.items
      : Array.isArray(section.questions)
        ? section.questions
        : [];

    return {
      id: section.id ?? null,
      title: section.title ?? `Section ${sectionIndex + 1}`,
      orderNo: section.orderNo ?? sectionIndex + 1,
      items: rawItems.map((item: any, itemIndex: number) => ({
        id: item.id ?? null,
        questionId: item.questionId ?? item.id ?? null,
        sectionTitle:
          item.sectionTitle ?? section.title ?? `Section ${sectionIndex + 1}`,
        questionText: item.questionText ?? item.text ?? item.title ?? '',
        itemOrder: item.itemOrder ?? item.orderNo ?? itemIndex + 1,
        responseType: item.responseType ?? 'YES_NO_RATING',
        isRequired: item.isRequired ?? true,
        weight: Number(item.weight ?? 1),
        rating: item.rating ?? null,
        maxRating: item.maxRating ?? 5,
        comment: item.comment ?? item.answerText ?? item.textAnswer ?? '',
        yesNoAnswer: item.yesNoAnswer ?? item.booleanAnswer ?? null,
      })),
    };
  });

  return {
    id: payload.id ?? null,
    formId,
    assessmentFormId: formId,
    formName:
      payload.formName ??
      payload.name ??
      payload.title ??
      payload.form?.formName ??
      payload.assessmentForm?.formName ??
      'Employee Self-assessment Form',
    companyName:
      payload.companyName ??
      payload.form?.companyName ??
      'ACE Data Systems Ltd.',

    userId: payload.userId ?? payload.employee?.userId ?? 0,
    employeeId: payload.employeeId ?? payload.employee?.id ?? null,
    employeeName: getFullName(payload),
    employeeCode: payload.employeeCode ?? payload.employee?.employeeCode ?? null,
    currentPosition:
      payload.currentPosition ?? payload.position ?? payload.employee?.position ?? null,
    departmentId: payload.departmentId ?? payload.employee?.departmentId ?? null,
    departmentName:
      payload.departmentName ?? payload.employee?.departmentName ?? null,
    managerUserId: payload.managerUserId ?? null,
    managerName: payload.managerName ?? payload.manager?.fullName ?? null,
    departmentHeadUserId: payload.departmentHeadUserId ?? null,
    departmentHeadName:
      payload.departmentHeadName ??
      payload.departmentHead?.fullName ??
      payload.departmentHead?.name ??
      null,
    assessmentDate: payload.assessmentDate ?? null,

    period: payload.period ?? currentPeriod(),
    status: payload.status ?? 'DRAFT',
    totalScore: Number(payload.totalScore ?? 0),
    maxScore: Number(payload.maxScore ?? 0),
    scorePercent: Number(
      payload.scorePercent ?? payload.scorePercentage ?? payload.percentage ?? 0,
    ),
    performanceLabel: payload.performanceLabel ?? 'Not scored',
    remarks: payload.remarks ?? '',
    managerComment: payload.managerComment ?? null,
    hrComment: payload.hrComment ?? null,
    departmentHeadComment: payload.departmentHeadComment ?? null,
    declineReason: payload.declineReason ?? null,

    // Employee signature
    employeeSignatureId: payload.employeeSignatureId ?? null,
    employeeSignatureName: payload.employeeSignatureName ?? null,
    employeeSignatureImageData: payload.employeeSignatureImageData ?? null,
    employeeSignatureImageType: payload.employeeSignatureImageType ?? null,
    employeeSignedAt: payload.employeeSignedAt ?? null,

    // Manager signature
    managerSignatureId: payload.managerSignatureId ?? null,
    managerSignatureName: payload.managerSignatureName ?? null,
    managerSignatureImageData: payload.managerSignatureImageData ?? null,
    managerSignatureImageType: payload.managerSignatureImageType ?? null,
    managerSignedAt: payload.managerSignedAt ?? null,

    // Department head signature
    departmentHeadSignatureId: payload.departmentHeadSignatureId ?? null,
    departmentHeadSignatureName: payload.departmentHeadSignatureName ?? null,
    departmentHeadSignatureImageData: payload.departmentHeadSignatureImageData ?? null,
    departmentHeadSignatureImageType: payload.departmentHeadSignatureImageType ?? null,
    departmentHeadSignedAt: payload.departmentHeadSignedAt ?? null,

    // HR signature
    hrSignatureId: payload.hrSignatureId ?? null,
    hrSignatureName: payload.hrSignatureName ?? null,
    hrSignatureImageData: payload.hrSignatureImageData ?? null,
    hrSignatureImageType: payload.hrSignatureImageType ?? null,
    hrSignedAt: payload.hrSignedAt ?? null,

    createdAt: payload.createdAt ?? null,
    updatedAt: payload.updatedAt ?? null,
    submittedAt: payload.submittedAt ?? null,
    approvedAt: payload.approvedAt ?? null,
    declinedAt: payload.declinedAt ?? null,

    sections,
    scoreBands: normalizeScoreBands(payload),
  };
};

const normalizeScoreRow = (row: any): AssessmentScoreRow => ({
  id: Number(row.id ?? row.assessmentId ?? 0),
  formId: row.formId ?? row.assessmentFormId ?? null,
  assessmentFormId: row.assessmentFormId ?? row.formId ?? null,
  formName: row.formName ?? null,
  employeeId: row.employeeId ?? row.employee?.id ?? null,
  employeeName:
    row.employeeName ??
    row.employeeFullName ??
    row.employee?.employeeName ??
    row.employee?.fullName ??
    getFullName(row) ??
    'Unknown Employee',
  employeeCode: row.employeeCode ?? row.employee?.employeeCode ?? null,
  departmentId: row.departmentId ?? row.employee?.departmentId ?? row.department?.id ?? null,
  departmentName:
    row.departmentName ??
    row.employee?.departmentName ??
    row.department?.name ??
    null,
  managerUserId: row.managerUserId ?? null,
  managerName: row.managerName ?? null,
  period: row.period ?? currentPeriod(),
  status: row.status ?? 'DRAFT',
  totalScore: Number(row.totalScore ?? 0),
  maxScore: Number(row.maxScore ?? 0),
  scorePercent: Number(
    row.scorePercent ?? row.scorePercentage ?? row.percentage ?? 0,
  ),
  performanceLabel: row.performanceLabel ?? row.label ?? 'Not scored',
  submittedAt: row.submittedAt ?? row.updatedAt ?? null,
  approvedAt: row.approvedAt ?? null,
  declinedAt: row.declinedAt ?? null,
  employeeSigned: Boolean(row.employeeSigned ?? row.employeeSignatureId ?? row.employeeSignedAt),
  managerSigned: Boolean(row.managerSigned ?? row.managerSignatureId ?? row.managerSignedAt),
  departmentHeadSigned: Boolean(
    row.departmentHeadSigned ?? row.departmentHeadSignatureId ?? row.departmentHeadSignedAt,
  ),
  hrSigned: Boolean(row.hrSigned ?? row.hrSignatureId ?? row.hrSignedAt),
});

const normalizeList = <T,>(payload: any, fallback: T[]): T[] => {
  const data = unwrap<any>(payload, fallback);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;

  return fallback;
};

const isMissingDraft = (error: any) => {
  const status = error?.response?.status;
  return status === 404 || status === 204;
};

export const employeeAssessmentService = {
  async template(): Promise<EmployeeAssessment | null> {
    const response = await api.get('/employee-assessments/template');
    return normalizeAssessment(unwrap<any>(response, null));
  },

  async draft(): Promise<EmployeeAssessment | null> {
    const response = await api.get('/employee-assessments/my-latest-draft');
    return normalizeAssessment(unwrap<any>(response, null));
  },

  async getLatestDraft(): Promise<EmployeeAssessment | null> {
    const template = await this.template();

    if (!template) {
      return null;
    }

    const lockedStatuses = [
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_DEPARTMENT_HEAD',
      'PENDING_HR',
      'APPROVED',
      'DECLINED',
      'REJECTED',
    ];

    if (lockedStatuses.includes(template.status)) {
      return template;
    }

    try {
      const draft = await this.draft();

      if (draft && lockedStatuses.includes(draft.status)) {
        return draft;
      }

      const templateFormId = template.assessmentFormId ?? template.formId;
      const draftFormId = draft?.assessmentFormId ?? draft?.formId;

      if (
        draft?.sections?.length &&
        draftFormId &&
        templateFormId &&
        Number(draftFormId) === Number(templateFormId)
      ) {
        return draft;
      }

      return template;
    } catch (error: any) {
      if (!isMissingDraft(error)) {
        throw error;
      }

      return template;
    }
  },

  async getById(id: number): Promise<EmployeeAssessment> {
    const response = await api.get(`/employee-assessments/${id}`);
    return normalizeAssessment(unwrap<any>(response, null)) as EmployeeAssessment;
  },

  async saveDraft(
    payload: AssessmentRequest,
    assessmentId?: number | null,
  ): Promise<EmployeeAssessment> {
    const response = assessmentId
      ? await api.put(`/employee-assessments/${assessmentId}`, payload)
      : await api.post('/employee-assessments', payload);

    return normalizeAssessment(unwrap<any>(response, null)) as EmployeeAssessment;
  },

  async submit(
    payloadOrId: AssessmentRequest | number,
    maybePayload?: AssessmentRequest,
  ): Promise<EmployeeAssessment> {
    if (typeof payloadOrId === 'number') {
      if (!maybePayload) {
        throw new Error('Assessment payload is required.');
      }

      const response = await api.post(
        `/employee-assessments/${payloadOrId}/submit`,
        maybePayload,
      );

      return normalizeAssessment(unwrap<any>(response, null)) as EmployeeAssessment;
    }

    const payload = payloadOrId;
    const savedDraft = await this.saveDraft(payload, null);

    if (!savedDraft?.id) {
      throw new Error('Assessment draft could not be created before submission.');
    }

    const response = await api.post(
      `/employee-assessments/${savedDraft.id}/submit`,
      payload,
    );

    return normalizeAssessment(unwrap<any>(response, null)) as EmployeeAssessment;
  },

  async managerRemark(id: number, comment?: string): Promise<EmployeeAssessment> {
    const response = await api.post(`/employee-assessments/${id}/manager-remark`, {
      comment: comment ?? null,
    });
    return normalizeAssessment(unwrap<any>(response, null)) as EmployeeAssessment;
  },

  async managerSign(id: number, comment?: string): Promise<EmployeeAssessment> {
    return this.managerRemark(id, comment);
  },

  async departmentHeadSign(id: number, comment?: string): Promise<EmployeeAssessment> {
    const response = await api.post(`/employee-assessments/${id}/department-head-sign`, {
      comment: comment ?? null,
    });
    return normalizeAssessment(unwrap<any>(response, null)) as EmployeeAssessment;
  },

  async hrApprove(id: number, comment?: string): Promise<EmployeeAssessment> {
    const response = await api.post(`/employee-assessments/${id}/hr-approve`, {
      comment: comment ?? null,
    });
    return normalizeAssessment(unwrap<any>(response, null)) as EmployeeAssessment;
  },

  async hrDecline(id: number, reason: string, comment?: string): Promise<EmployeeAssessment> {
    const response = await api.post(`/employee-assessments/${id}/hr-decline`, {
      reason,
      comment: comment ?? null,
    });
    return normalizeAssessment(unwrap<any>(response, null)) as EmployeeAssessment;
  },

  async getMine(): Promise<AssessmentScoreRow[]> {
    const response = await api.get('/employee-assessments/my-scores');
    return normalizeList<any>(response, []).map(normalizeScoreRow);
  },

  async getMyHistory(): Promise<AssessmentScoreRow[]> {
    const response = await api.get('/employee-assessments/my-history');
    return normalizeList<any>(response, []).map(normalizeScoreRow);
  },

  async getScoreTable(): Promise<AssessmentScoreRow[]> {
    const response = await api.get('/employee-assessments/score-table');
    return normalizeList<any>(response, []).map(normalizeScoreRow);
  },

  async scoreTable(): Promise<AssessmentScoreRow[]> {
    return this.getScoreTable();
  },
};

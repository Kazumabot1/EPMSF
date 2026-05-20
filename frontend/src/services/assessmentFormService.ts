import api from './api';

export type AssessmentTargetRole = 'Employee' | 'Manager' | 'DepartmentHead';

export type AssessmentResponseType = 'RATING' | 'TEXT' | 'YES_NO' | 'YES_NO_RATING';

export type AssessmentQuestionPayload = {
  id?: number;
  questionText: string;
  responseType: AssessmentResponseType;
  isRequired: boolean;
  weight: number;
};

export type AssessmentSectionPayload = {
  id?: number;
  title: string;
  orderNo: number;
  questions: AssessmentQuestionPayload[];
};

export type AssessmentScoreBandPayload = {
  id?: number;
  minScore: number;
  maxScore: number;
  label: string;
  description?: string;
  sortOrder: number;
};

export type AssessmentFormPayload = {
  formName: string;
  companyName?: string;
  description?: string;
  startDate: string;
  endDate: string;
  targetRoles: AssessmentTargetRole[];
  targetDepartmentIds: number[];
  sections: AssessmentSectionPayload[];
  scoreBands: AssessmentScoreBandPayload[];
};

export type AssessmentFormResponse = {
  id: number;
  formName: string;
  companyName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  targetRoles: AssessmentTargetRole[];
  targetDepartmentIds: number[];
  createdAt?: string;
  updatedAt?: string;
  sections: AssessmentSectionPayload[];
  scoreBands: AssessmentScoreBandPayload[];
};

const SELF_ASSESSMENT_RESPONSE_TYPE: AssessmentResponseType = 'YES_NO_RATING';

const unwrap = <T,>(payload: any, fallback: T): T => {
  return payload?.data?.data ?? payload?.data ?? fallback;
};

const normalizeTargetRole = (value: any): AssessmentTargetRole | null => {
  const normalized = String(value ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  if (normalized === 'EMPLOYEE') return 'Employee';

  if (
    normalized === 'MANAGER' ||
    normalized === 'PROJECT_MANAGER' ||
    normalized === 'TEAM_MANAGER'
  ) {
    return 'Manager';
  }

  if (
    normalized === 'DEPARTMENT_HEAD' ||
    normalized === 'DEPARTMENTHEAD' ||
    normalized === 'DEPT_HEAD' ||
    normalized === 'HEAD_OF_DEPARTMENT'
  ) {
    return 'DepartmentHead';
  }

  return null;
};

const normalizeDepartmentIds = (value: any): number[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
};

const normalizeScoreBands = (bands: any[]): AssessmentScoreBandPayload[] => {
  const fallback: AssessmentScoreBandPayload[] = [
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

  if (!Array.isArray(bands) || bands.length === 0) return fallback;

  return bands.map((band, index) => ({
    id: band.id,
    minScore: Number(band.minScore ?? 0),
    maxScore: Number(band.maxScore ?? 100),
    label: band.label ?? '',
    description: band.description ?? '',
    sortOrder: Number(band.sortOrder ?? index + 1),
  }));
};

const normalizeQuestions = (questions: any[]): AssessmentQuestionPayload[] => {
  if (!Array.isArray(questions)) return [];

  return questions.map((question) => ({
    id: question.id,
    questionText: question.questionText ?? question.text ?? '',
    responseType: SELF_ASSESSMENT_RESPONSE_TYPE,
    isRequired: question.isRequired ?? question.required ?? true,
    weight: 1,
  }));
};

const normalizeSections = (sections: any[]): AssessmentSectionPayload[] => {
  if (!Array.isArray(sections)) return [];

  return sections.map((section, index) => ({
    id: section.id,
    title: section.title ?? `Section ${index + 1}`,
    orderNo: Number(section.orderNo ?? index + 1),
    questions: normalizeQuestions(section.questions ?? section.items ?? []),
  }));
};

const normalizeForm = (item: any): AssessmentFormResponse => {
  const targetRoles = Array.isArray(item.targetRoles)
    ? (item.targetRoles.map(normalizeTargetRole).filter(Boolean) as AssessmentTargetRole[])
    : [];

  return {
    id: Number(item.id ?? 0),
    formName: item.formName ?? 'Employee Self-assessment Form',
    companyName: item.companyName ?? 'ACE Data Systems Ltd.',
    description: item.description ?? '',
    startDate: item.startDate,
    endDate: item.endDate,
    isActive: item.isActive ?? item.active ?? true,
    targetRoles: targetRoles.length ? targetRoles : ['Employee'],
    targetDepartmentIds: normalizeDepartmentIds(item.targetDepartmentIds),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    sections: normalizeSections(item.sections),
    scoreBands: normalizeScoreBands(item.scoreBands),
  };
};

const sanitizePayload = (payload: AssessmentFormPayload): AssessmentFormPayload => ({
  ...payload,
  targetRoles: payload.targetRoles?.length ? payload.targetRoles : ['Employee'],
  targetDepartmentIds: normalizeDepartmentIds(payload.targetDepartmentIds),
  scoreBands: normalizeScoreBands(payload.scoreBands),
  sections: (payload.sections ?? []).map((section, sectionIndex) => ({
    ...section,
    orderNo: section.orderNo ?? sectionIndex + 1,
    questions: (section.questions ?? []).map((question) => ({
      ...question,
      responseType: SELF_ASSESSMENT_RESPONSE_TYPE,
      isRequired: question.isRequired ?? true,
      weight: 1,
    })),
  })),
});

export const assessmentFormService = {
  async getAll(): Promise<AssessmentFormResponse[]> {
    const res = await api.get('/appraisal-forms');
    const data = unwrap<any[]>(res, []);
    return Array.isArray(data) ? data.map(normalizeForm) : [];
  },

  async getById(id: number): Promise<AssessmentFormResponse> {
    const res = await api.get(`/appraisal-forms/${id}`);
    return normalizeForm(unwrap<any>(res, {}));
  },

  async create(payload: AssessmentFormPayload): Promise<AssessmentFormResponse> {
    const res = await api.post('/appraisal-forms', sanitizePayload(payload));
    return normalizeForm(unwrap<any>(res, {}));
  },

  async update(id: number, payload: AssessmentFormPayload): Promise<AssessmentFormResponse> {
    const res = await api.put(`/appraisal-forms/${id}`, sanitizePayload(payload));
    return normalizeForm(unwrap<any>(res, {}));
  },

  async deactivate(id: number): Promise<void> {
    await api.delete(`/appraisal-forms/${id}`);
  },
};
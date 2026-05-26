import api from './api';

export type SelfAssessmentScoreBand = {
  id: number;
  minScore: number;
  maxScore: number;
  label: string;
  description: string;
  sortOrder: number;
};

export type SelfAssessmentScoreBandAudit = {
  id: number;
  bandId: number | null;
  sortOrder: number | null;
  changedByUserId: number | null;
  changedByName: string;
  changedByRole: string;
  changedPart: string;
  oldValue: string;
  newValue: string;
  reason: string;
  changedAt: string;
};

export type SelfAssessmentScoreTableResponse = {
  bands: SelfAssessmentScoreBand[];
  audits: SelfAssessmentScoreBandAudit[];
  activeFormExists: boolean;
  activeFormCount: number;
};

export type SelfAssessmentScoreTableUpdateRequest = {
  editedBandId: number;
  reason: string;
  bands: SelfAssessmentScoreBand[];
};

const unwrap = <T,>(payload: any, fallback: T): T => {
  return payload?.data?.data ?? payload?.data ?? fallback;
};

const normalizeBand = (band: any, index: number): SelfAssessmentScoreBand => ({
  id: Number(band.id ?? 0),
  minScore: Number(band.minScore ?? 0),
  maxScore: Number(band.maxScore ?? 0),
  label: band.label ?? '',
  description: band.description ?? '',
  sortOrder: Number(band.sortOrder ?? index + 1),
});

const normalizeAudit = (audit: any): SelfAssessmentScoreBandAudit => ({
  id: Number(audit.id ?? 0),
  bandId: audit.bandId ?? null,
  sortOrder: audit.sortOrder ?? null,
  changedByUserId: audit.changedByUserId ?? null,
  changedByName: audit.changedByName ?? '-',
  changedByRole: audit.changedByRole ?? '-',
  changedPart: audit.changedPart ?? '-',
  oldValue: audit.oldValue ?? '',
  newValue: audit.newValue ?? '',
  reason: audit.reason ?? '',
  changedAt: audit.changedAt ?? '',
});

const normalizeResponse = (payload: any): SelfAssessmentScoreTableResponse => {
  const data = payload ?? {};

  return {
    bands: Array.isArray(data.bands)
      ? data.bands.map(normalizeBand).sort((a, b) => a.sortOrder - b.sortOrder)
      : [],
    audits: Array.isArray(data.audits) ? data.audits.map(normalizeAudit) : [],
    activeFormExists: Boolean(data.activeFormExists),
    activeFormCount: Number(data.activeFormCount ?? 0),
  };
};

export const selfAssessmentScoreTableService = {
  async getTable(): Promise<SelfAssessmentScoreTableResponse> {
    const response = await api.get('/self-assessment-score-table');
    return normalizeResponse(unwrap<any>(response, {}));
  },

  async updateTable(
    payload: SelfAssessmentScoreTableUpdateRequest,
  ): Promise<SelfAssessmentScoreTableResponse> {
    const response = await api.put('/self-assessment-score-table', payload);
    return normalizeResponse(unwrap<any>(response, {}));
  },

  async getAudit(): Promise<SelfAssessmentScoreBandAudit[]> {
    const response = await api.get('/self-assessment-score-table/audit');
    const data = unwrap<any[]>(response, []);
    return Array.isArray(data) ? data.map(normalizeAudit) : [];
  },
};
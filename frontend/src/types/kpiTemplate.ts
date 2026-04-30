export type KpiFormStatus = 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'SENT' | 'ARCHIVED';

export interface KpiTemplatePositionSummary {
  id: number;
  positionId: number;
  positionTitle: string;
}

export interface KpiTemplateItem {
  id?: number | null;
  kpiLabel: string | null;
  kpiItemId: number | null;
  kpiItemName: string | null;
  kpiCategoryId: number | null;
  kpiCategoryName: string | null;
  kpiUnitId: number | null;
  kpiUnitName: string | null;
  target: number | null;
  weight: number | null;
  sortOrder: number | null;
  actual?: number | null;
  score?: number | null;
  weightedScore?: number | null;
}

export interface KpiTemplateResponse {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  status: KpiFormStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  createdByUserId: number | null;
  positions: KpiTemplatePositionSummary[];
  items: KpiTemplateItem[];
}

export interface KpiTemplateRequest {
  title: string;
  startDate: string;
  endDate: string;
  status: KpiFormStatus;
  positionIds: number[];
  items: KpiTemplateItem[];
}

export interface KpiTemplateRowDraft {
  rowId: string;
  kpiItemId: number | null;
  kpiLabel: string;
  kpiCategoryId: number | null;
  kpiUnitId: number | null;
  target: number | null;
  weight: number | null;
}

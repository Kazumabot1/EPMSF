export interface KpiForm {
  id: number;
  title: string;
  target: number | null;
  weight: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  kpiUnitId: number;
  kpiUnitName: string;
  kpiCategoryId: number;
  kpiCategoryName: string;
  kpiItemId: number;
  kpiItemName: string;
}

export interface KpiFormRequest {
  title: string;
  target: number | null;
  weight: number;
  kpiUnitId: number;
  kpiCategoryId: number;
  kpiItemId: number;
  createdBy: string;
  createdByUserId?: number | null;
  updatedByUserId?: number | null;
}

export interface KpiFormRowDraft {
  rowId: string;
  kpiItemId: number | null;
  kpiCategoryId: number | null;
  kpiUnitId: number | null;
  target: number | null;
  actual: number | null;
  weight: number | null;
  score: number | null;
}

export interface KpiFormPresentation {
  bundleId: string;
  id: number;
  title: string;
  createdBy: string;
  createdAt: string;
  positionId: number | null;
  positionName: string;
  totalScore: number;
  rowCount: number;
}

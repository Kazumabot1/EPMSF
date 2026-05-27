export type KpiFormStatus = 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'SENT' | 'ARCHIVED';

export interface KpiTemplatePositionSummary {
  id: number;
  positionId: number;
  positionTitle: string;
  durationMonths: number;
  durationLabel: string;
}

export interface KpiTemplateItem {
  id?: number | null;
  kpiLabel: string | null;
  kpiItemId: number | null;
  kpiItemName: string | null;
  kpiCategoryId: number | null;
  kpiCategoryName: string | null;
  kpiCategoryLabel?: string | null;
  kpiUnitId: number | null;
  kpiUnitName: string | null;
  kpiUnitLabel?: string | null;
  target: number | null;
  weight: number | null;
  sortOrder: number | null;
  actual?: number | null;
  score?: number | null;
  weightedScore?: number | null;
  changeReason?: string | null;
}

export interface KpiTemplateResponse {
  id: number;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  status: KpiFormStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
  finalizedAt?: string | null;
  sentAt?: string | null;
  createdBy: string | null;
  createdByUserId: number | null;
  updatedByUserId?: number | null;
  positions: KpiTemplatePositionSummary[];
  items: KpiTemplateItem[];
}

export interface KpiTemplateRequest {
  title: string;
  status: KpiFormStatus;
  startDate?: null;
  endDate?: null;
  positionDurationMonths: number;
  positionIds: number[];
  items: KpiTemplateItem[];
  removedItemReasons?: Record<number, string>;
}

export interface KpiTemplateRowDraft {
  rowId: string;
  id?: number | null;
  kpiItemId: number | null;
  kpiLabel: string;
  kpiCategoryId: number | null;
  kpiCategoryLabel: string;
  kpiUnitId: number | null;
  kpiUnitLabel: string;
  target: number | null;
  weight: number | null;
  changeReason?: string | null;
}

export type KpiVersionChangeType = 'CREATED' | 'UPDATED' | 'DELETED' | 'RESTORED' | 'WEIGHT_MODIFIED' | 'TARGET_MODIFIED' | 'CATEGORY_CHANGED' | 'STATUS_CHANGED' | 'DATE_CHANGED';
export type KpiVersionRowStatus = 'INITIAL' | 'UNCHANGED' | 'ADDED' | 'REMOVED';

export interface KpiVersionRowSnapshot {
  itemId: number | null;
  kpiName: string | null;
  kpiItemId: number | null;
  kpiCategoryId: number | null;
  kpiCategoryName: string | null;
  kpiCategoryLabel?: string | null;
  kpiUnitId: number | null;
  kpiUnitName: string | null;
  kpiUnitLabel?: string | null;
  target: number | null;
  weight: number | null;
  sortOrder: number | null;
}

export interface KpiVersionSummary {
  templateId: number;
  templateTitle: string;
  versionNumber: number;
  versionTitle: string;
  positionName: string | null;
  createdAt: string | null;
  editedAt: string | null;
  editedBy: string | null;
  changeCount: number;
}

export interface KpiVersionDetail extends KpiVersionSummary {
  changes: Array<{
    historyId: number;
    changeType: KpiVersionChangeType;
    rowStatus?: KpiVersionRowStatus | null;
    reason: string | null;
    changedAt: string | null;
    changedBy: string | null;
    initialVersion?: boolean | null;
    row: KpiVersionRowSnapshot | null;
  }>;
}

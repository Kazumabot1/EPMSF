export type KpiTemplateCycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSING' | 'DEACTIVATED';

export interface KpiTemplateCycleFormSummary {
  id: number;
  title: string;
}

export interface KpiTemplateCycleResponse {
  id: number;
  cycleName: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  durationLabel: string;
  status: KpiTemplateCycleStatus;
  currentPeriodId: number | null;
  currentPeriodNumber: number | null;
  currentPeriodStartDate: string | null;
  currentPeriodEndDate: string | null;
  closingRequestedAt: string | null;
  graceEndsAt: string | null;
  closedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  kpiForms: KpiTemplateCycleFormSummary[];
}

export interface KpiTemplateCycleRequest {
  cycleName: string;
  startDate: string;
  durationMonths: number;
  kpiFormIds: number[];
}

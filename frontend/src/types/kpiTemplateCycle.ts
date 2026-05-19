export type KpiTemplateCycleStatus = 'DRAFT' | 'ACTIVE' | 'DEACTIVATED';

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

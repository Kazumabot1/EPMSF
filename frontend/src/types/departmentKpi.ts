import type { KpiFormStatus, KpiTemplateItem } from './kpiTemplate';
import type { KpiEarlyCloseReviewDecision, KpiGraceExtension, KpiTemplateCycleStatus } from './kpiTemplateCycle';

export type DepartmentKpiResultStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'FINALIZED' | 'CLOSED';

export interface DepartmentKpiTemplateDepartment {
  id: number;
  departmentName: string;
}

export interface DepartmentKpiTemplate {
  id: number;
  title: string;
  durationMonths: number;
  durationLabel: string;
  status: KpiFormStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  createdByUserId?: number | null;
  departments: DepartmentKpiTemplateDepartment[];
  items: KpiTemplateItem[];
}

export interface DepartmentKpiTemplateRequest {
  title: string;
  status: KpiFormStatus;
  durationMonths: number;
  departmentIds: number[];
  items: KpiTemplateItem[];
}

export interface DepartmentKpiCycleTemplateSummary {
  id: number;
  title: string;
}

export interface DepartmentKpiCycle {
  id: number;
  cycleName: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  durationYears: number;
  durationLabel: string;
  status: KpiTemplateCycleStatus;
  currentPeriodId: number | null;
  currentPeriodNumber: number | null;
  currentPeriodStartDate: string | null;
  currentPeriodEndDate: string | null;
  closingRequestedAt: string | null;
  graceEndsAt: string | null;
  closedAt: string | null;
  earlyCloseReason: string | null;
  graceExtension: KpiGraceExtension | null;
  earlyCloseRequestedAt: string | null;
  earlyCloseRequestedByUserId: number | null;
  earlyCloseRequestedByName: string | null;
  earlyCloseReviewedAt: string | null;
  earlyCloseReviewedByUserId: number | null;
  earlyCloseReviewedByName: string | null;
  earlyCloseReviewDecision: KpiEarlyCloseReviewDecision | null;
  earlyCloseReviewReason: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  templates: DepartmentKpiCycleTemplateSummary[];
}

export interface DepartmentKpiCycleStatusRequest {
  active: boolean;
  reason?: string;
  graceExtension?: KpiGraceExtension;
}

export interface DepartmentKpiCycleRequest {
  cycleName: string;
  startDate: string;
  durationYears: number;
  durationMonths?: number;
  templateIds: number[];
  /** Required when updating an existing cycle. */
  editReason?: string;
}

export interface DepartmentKpiTemplateSummary {
  templateId: number;
  cyclePeriodId?: number | null;
  title: string;
  openAssignments: number;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  periodStatus?: string | null;
}

export interface DepartmentKpiResultLine {
  templateRowId: number;
  kpiLabel: string | null;
  target: number | null;
  weight: number | null;
  unitName: string | null;
  actualValue: number | null;
  score: number | null;
  weightedScore: number | null;
}

export interface DepartmentKpiResult {
  departmentKpiResultId: number;
  departmentId: number;
  departmentName: string;
  templateId: number;
  templateTitle: string;
  cyclePeriodId?: number | null;
  status: DepartmentKpiResultStatus;
  totalScore: number | null;
  totalWeightedScore: number | null;
  finalizedAt?: string | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  finalizationRequestReason?: string | null;
  finalizationRequestedAt?: string | null;
  finalizationRequestedByUserId?: number | null;
  finalizationRequestedByName?: string | null;
  finalizationReviewDecision?: KpiEarlyCloseReviewDecision | null;
  finalizationReviewReason?: string | null;
  finalizationReviewedAt?: string | null;
  finalizationReviewedByUserId?: number | null;
  finalizationReviewedByName?: string | null;
  lines: DepartmentKpiResultLine[];
}

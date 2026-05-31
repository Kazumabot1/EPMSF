export type KpiTemplateCycleStatus = 'DRAFT' | 'ACTIVE' | 'PENDING_APPROVAL' | 'CLOSING' | 'DEACTIVATED';
export type KpiTemplateCyclePeriodStatus = 'SCHEDULED' | 'OPEN' | 'CLOSING' | 'CLOSED';
export type KpiGraceExtension = 'ONE_WEEK' | 'TWO_WEEKS' | 'THREE_WEEKS' | 'ONE_MONTH';
export type KpiEarlyCloseReviewDecision = 'APPROVED' | 'REJECTED';

export interface KpiTemplateCycleFormSummary {
  id: number;
  title: string;
}

export interface KpiTemplateCyclePeriodDto {
  id: number;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: KpiTemplateCyclePeriodStatus;
}

export interface KpiTemplateCycleFormPeriodSchedule {
  kpiFormId: number;
  kpiFormTitle: string;
  periods: KpiTemplateCyclePeriodDto[];
}

export interface KpiTemplateCycleResponse {
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
  createdAt: string | null;
  updatedAt: string | null;
  kpiForms: KpiTemplateCycleFormSummary[];
  /** Full generated schedule, grouped by KPI form (available once periods are generated). */
  periodSchedules?: KpiTemplateCycleFormPeriodSchedule[];
}

export interface KpiTemplateCycleStatusRequest {
  active: boolean;
  reason?: string;
  graceExtension?: KpiGraceExtension;
}

export interface KpiUnassignedEvaluator {
  employeeId: number;
  employeeName: string;
  departmentId: number;
  departmentName: string;
  positionTitle: string;
  reason: string;
}

export interface KpiCycleActivationReadiness {
  cycleId: number;
  cycleName: string;
  ready: boolean;
  targetEmployeeCount: number;
  unassignedEvaluators: KpiUnassignedEvaluator[];
  blockingIssues: string[];
}

export interface KpiTemplateCycleRequest {
  cycleName: string;
  startDate: string;
  durationYears: number;
  durationMonths?: number;
  kpiFormIds: number[];
  /** Required when updating an existing cycle. */
  editReason?: string;
}

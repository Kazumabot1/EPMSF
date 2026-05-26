export type KpiTemplateCycleStatus = 'DRAFT' | 'ACTIVE' | 'PENDING_APPROVAL' | 'CLOSING' | 'DEACTIVATED';
export type KpiGraceExtension = 'ONE_WEEK' | 'TWO_WEEKS' | 'THREE_WEEKS' | 'ONE_MONTH';
export type KpiEarlyCloseReviewDecision = 'APPROVED' | 'REJECTED';

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
}

export interface KpiTemplateCycleStatusRequest {
  active: boolean;
  reason?: string;
  graceExtension?: KpiGraceExtension;
}

export interface KpiTemplateCycleRequest {
  cycleName: string;
  startDate: string;
  durationMonths: number;
  kpiFormIds: number[];
}

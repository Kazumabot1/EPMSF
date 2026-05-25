export type UseKpiTemplateResult = {
  assignmentsCreated: number;
  assignmentsSkippedExisting: number;
  managersNotified: number;
  /** Present when HR applied the template to all departments */
  departmentsWithMatches?: number | null;
};

export type ManagerKpiTemplateSummary = {
  kpiFormId: number;
  cyclePeriodId?: number | null;
  title: string;
  openAssignments: number;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  periodStatus?: string | null;
  graceEndsAt?: string | null;
};

export type ManagerKpiScoreLine = {
  kpiFormItemId: number;
  kpiLabel: string | null;
  kpiCategoryName?: string | null;
  weight: number | null;
  target: number | null;
  unitName: string | null;
  actualValue: number | null;
  /** Achievement % — (actual/target)×100 when using actual, else legacy 0–100 */
  score: number | null;
  weightedScore: number | null;
};

export type ManagerKpiAssignment = {
  employeeKpiFormId: number;
  employeeId: number;
  employeeName: string;
  departmentName?: string | null;
  positionTitle?: string | null;
  kpiFormId?: number | null;
  cyclePeriodId?: number | null;
  kpiTitle?: string | null;
  status: string;
  totalScore: number | null;
  totalWeightedScore: number | null;
  finalizedAt?: string | null;
  earlyFinalizedReason?: string | null;
  finalizedBeforeEndDate?: boolean | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  graceReason?: string | null;
  graceEndsAt?: string | null;
  lines: ManagerKpiScoreLine[];
};

export type EmployeeKpiResult = {
  employeeKpiFormId: number;
  kpiFormId: number;
  cyclePeriodId?: number | null;
  kpiTitle: string;
  positionTitle?: string | null;
  status: string;
  totalScore: number | null;
  totalWeightedScore: number | null;
  finalizedAt: string | null;
  earlyFinalizedReason?: string | null;
  finalizedBeforeEndDate?: boolean | null;
  lines: ManagerKpiScoreLine[];
};

export type HrEmployeeKpiRow = EmployeeKpiResult & {
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  positionTitle: string | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  graceReason?: string | null;
  graceEndsAt?: string | null;
};

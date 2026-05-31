export type EmployeeChangeRequestType = 'POSITION_CHANGE' | 'DEPARTMENT_CHANGE';

export type EmployeeChangeRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'APPLIED';

export type EmployeeChangeSummary = {
  id: number;
  requestType: EmployeeChangeRequestType;
  status: EmployeeChangeRequestStatus;

  employeeId: number;
  employeeName: string;
  employeeEmail?: string;

  requestedByName?: string;
  reviewedByName?: string;

  requestedAt?: string;
  reviewedAt?: string;

  oldPositionName?: string;
  newPositionName?: string;

  oldCurrentDepartmentName?: string;
  newCurrentDepartmentName?: string;

  oldParentDepartmentName?: string;
  newParentDepartmentName?: string;

  oldWorkingDepartmentName?: string;
  newWorkingDepartmentName?: string;

  oldTeamName?: string;

  requestReason?: string;
  ceoReviewReason?: string;

  validationSummary?: string;
  blockingSummary?: string;
};

export type EmployeeChangeAudit = {
  id: number;
  action: string;
  oldStatus?: EmployeeChangeRequestStatus;
  newStatus?: EmployeeChangeRequestStatus;
  performedByName?: string;
  performedAt?: string;
  reason?: string;
  details?: string;
};

export type EmployeeChangeDetail = {
  request: EmployeeChangeSummary;
  audits: EmployeeChangeAudit[];
};

export type PositionChangeCreatePayload = {
  employeeId: number;
  newPositionId: number;
  reason: string;
};

export type DepartmentChangeCreatePayload = {
  employeeId: number;
  newCurrentDepartmentId: number;
  newParentDepartmentId?: number | null;
  reason: string;
};

export type WorkforceEmployee = {
  id: number;
  employeeId?: number;
  userId?: number;

  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;

  email?: string;
  workEmail?: string;

  positionId?: number;
  positionTitle?: string;
  positionName?: string;
  roleName?: string;
  role?: string;
  dashboard?: string;

  currentDepartmentId?: number;
  departmentId?: number;
  departmentName?: string;
  currentDepartmentName?: string;

  parentDepartmentId?: number;
  parentDepartmentName?: string;

  teamId?: number;
  teamName?: string;
  activeTeamName?: string;

  active?: boolean;
};

export type WorkforcePosition = {
  id: number;
  positionTitle?: string;
  title?: string;
  positionName?: string;
  levelCode?: string;
  roleName?: string;
  status?: boolean;
};

export type WorkforceDepartment = {
  id: number;
  departmentName?: string;
  name?: string;
  parentDepartmentId?: number | null;
};







export type EmployeeChangeProfile = {
  employee: EmployeeChangeEmployeeSnapshot;

  currentOrLatestKpi?: EmployeeChangeKpiSnapshot | null;
  allKpis: EmployeeChangeKpiSnapshot[];

  currentOrLatestPip?: EmployeeChangePipSnapshot | null;
  allPips: EmployeeChangePipSnapshot[];

  latestContinuousFeedback?: EmployeeChangeFeedbackSnapshot | null;
  allContinuousFeedback: EmployeeChangeFeedbackSnapshot[];

  activeTeam?: EmployeeChangeTeamHistorySnapshot | null;
  teamHistory: EmployeeChangeTeamHistorySnapshot[];

  currentDepartmentAssignment?: EmployeeChangeDepartmentHistorySnapshot | null;
  departmentHistory: EmployeeChangeDepartmentHistorySnapshot[];

  auditHistory: EmployeeChangeAuditSnapshot[];
};

export type EmployeeChangeEmployeeSnapshot = {
  employeeId: number;
  employeeName: string;
  employeeEmail?: string;

  userId?: number;
  userEmail?: string;

  positionId?: number;
  positionName?: string;
  positionLevel?: string;
  roleName?: string;

  currentDepartmentId?: number;
  currentDepartmentName?: string;

  parentDepartmentId?: number;
  parentDepartmentName?: string;

  workingDepartmentId?: number;
  workingDepartmentName?: string;

  activeTeamName?: string;
};

export type EmployeeChangeKpiSnapshot = {
  id: number;
  title?: string;
  status?: string;
  cycleName?: string;
  periodName?: string;
  assignedAt?: string;
  finalizedAt?: string;
  totalScore?: number;
  totalWeightedScore?: number;
};

export type EmployeeChangePipSnapshot = {
  id: number;
  goal?: string;
  expectedOutcomes?: string;
  comments?: string;
  active?: boolean;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  finishedAt?: string;
  phaseCount?: number;
};

export type EmployeeChangeFeedbackSnapshot = {
  id: number;
  category?: string;
  rating?: number;
  feedbackText?: string;
  giverName?: string;
  teamName?: string;
  createdAt?: string;
};

export type EmployeeChangeTeamHistorySnapshot = {
  teamId: number;
  teamName?: string;
  roleInTeam?: string;
  departmentName?: string;
  status?: string;
  startedDate?: string;
  endedDate?: string;
};

export type EmployeeChangeDepartmentHistorySnapshot = {
  id: number;
  currentDepartmentId?: number;
  currentDepartmentName?: string;
  parentDepartmentId?: number;
  parentDepartmentName?: string;
  workingDepartmentId?: number;
  workingDepartmentName?: string;
  startDate?: string;
  endDate?: string;
  assignedBy?: string;
  active?: boolean;
};

export type EmployeeChangeAuditSnapshot = {
  id: number;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  editedByName?: string;
  editedAt?: string;
  reason?: string;
};
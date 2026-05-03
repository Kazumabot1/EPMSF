// pip.ts file:

/*
  Why this file exists:
  - Keeps all PIP TypeScript types in one place.
  - PIP create page, PIP plan page, and PIP service use these types.
*/

export type PipPhaseStatus = "HASNT_STARTED_YET" | "ONGOING" | "COMPLETED";

export interface PipEligibleEmployee {
  userId: number;
  employeeName: string;
  departmentId: number | null;
  departmentName: string | null;
  alreadyHasActivePip: boolean;
  disabledReason: string | null;
}

export interface PipPhaseRequest {
  phaseNumber: number;
  phaseGoal: string;
  startDate: string;
  endDate: string;
}

export interface PipCreateRequest {
  employeeUserId: number;
  goal: string;
  expectedOutcomes: string;
  startDate: string;
  endDate: string;
  phases: PipPhaseRequest[];
}

export interface PipPhase {
  id: number;
  phaseNumber: number;
  phaseGoal: string;
  startDate: string;
  endDate: string;
  status: PipPhaseStatus;
  reasonNote: string | null;
  updatedAt: string | null;
  updatedByUserId: number | null;
  updatedByName: string | null;
}

export interface PipUpdateHistory {
  id: number;
  phaseId: number | null;
  actionType: string | null;
  oldValue: string | null;
  newValue: string | null;
  comments: string | null;
  updatedBy: number | null;
  updatedByName: string | null;
  updatedAt: string | null;
}

export interface PipDetail {
  id: number;
  employeeUserId: number;
  employeeName: string;
  createdByUserId: number;
  createdByName: string;
  createdByPosition: string;
  goal: string;
  expectedOutcomes: string;
  comments: string | null;
  startDate: string;
  endDate: string;
  status: boolean;
  createdAt: string;
  updatedAt: string | null;
  finishedAt: string | null;
  finishedByUserId: number | null;
  finishedByName: string | null;
  canEdit: boolean;
  canFinish: boolean;
  phases: PipPhase[];
  updates: PipUpdateHistory[];
}

export interface PipPhaseUpdateRequest {
  status: PipPhaseStatus;
  reasonNote: string;
}

export interface PipFinishRequest {
  comments: string;
}
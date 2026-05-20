export interface PositionPermission {
  oneOnOneCreate: boolean;
  oneOnOneDeptSelection: boolean;
  oneOnOneTeamSelection: boolean;
  teamCreate: boolean;
  teamEdit: boolean;
  teamHistory: boolean;
  teamView: boolean;
  teamAssignAsLeader: boolean;
  teamAssignAsPm: boolean;
  teamAssignAsMember: boolean;
  pipCreate: boolean;
  pipEdit: boolean;
  pipViewAll: boolean;
  appraisalReview: boolean;
  appraisalApprove: boolean;
  appraisalView: boolean;
  appraisalScoreInput: boolean;
  appraisalSign: boolean;
  kpiCreate: boolean;
  kpiEdit: boolean;
  kpiScore: boolean;
  kpiView: boolean;
  kpiInput: boolean;
  selfAssessmentView: boolean;
  selfAssessmentInput: boolean;
  selfAssessmentLock: boolean;
  selfAssessmentSign: boolean;
  feedbackFormCreate: boolean;
  feedbackSend: boolean;
  continuousFeedbackView: boolean;
  continuousFeedbackGive: boolean;
  departmentCrud: boolean;
  departmentComparisonView: boolean;
  positionCrud: boolean;
  employeeCrud: boolean;
  employeeExcelImport: boolean;
}

export interface PositionPermissionAudit {
  id: number;
  positionId: number;
  positionTitleSnapshot: string;
  columnName: string;
  oldValue: string | null;
  newValue: string | null;
  editedBy: number | null;
  editedByName: string | null;
  editedAt: string;
}

export interface TeamPermissionImpactItem {
  impactType: 'MEMBER_REMOVAL' | 'PROJECT_MANAGER_REMOVAL' | 'TEAM_INACTIVATION' | string;
  teamId: number;
  teamName: string;
  userId: number;
  userName: string;
  positionTitle: string;
  message: string;
}

export interface TeamPermissionImpactPreview {
  positionId: number;
  positionTitle: string;
  hasImpact: boolean;
  memberRemovalCount: number;
  projectManagerRemovalCount: number;
  teamInactivationCount: number;
  items: TeamPermissionImpactItem[];
}
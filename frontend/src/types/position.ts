export interface PositionLevelRequest {
  levelCode: string;
  active?: boolean;
  reason?: string;
}

export interface PositionLevelResponse {
  id: number;
  levelCode: string;
  active?: boolean;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
}

export interface PositionRequest {
  positionTitle: string;
  levelId: number;
  description: string;
  status: boolean;
  roleId?: number;
  createdBy?: string;
  reason?: string;
}

export interface PositionResponse {
  id: number;
  positionTitle: string;
  levelId: number;
  levelCode: string;
  description: string;
  status: boolean;
  createdAt: string;
  createdBy: string;
  roleId?: number;
  roleName?: string;
}

export interface PositionDepartmentUsage {
  departmentId: number | null;
  departmentName: string;
  departmentCode: string | null;
  employeeCount: number;
  activeEmployeeCount: number;
  inactiveEmployeeCount: number;
  loginAccountCount: number;
  userOnlyAccountCount: number;
  employeeNames: string[];
}

export interface PositionEmployeeUsage {
  employeeId: number;
  userId: number | null;
  employeeCode: string | null;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  active: boolean;
  loginAccountCreated: boolean;
  accountStatus: string | null;
  joinDate: string | null;
  currentDepartmentId: number | null;
  currentDepartment: string | null;
  workingDepartmentId: number | null;
  workingDepartment: string | null;
  usageDepartmentId: number | null;
  usageDepartmentName: string | null;
  departmentUsageLabel: string | null;
  departmentStartDate: string | null;
  departmentEndDate: string | null;
  teamNames: string[];
  teamRoles: string[];
}

export interface PositionUserOnlyAccount {
  userId: number;
  fullName: string;
  email: string | null;
  employeeCode: string | null;
  active: boolean;
  accountStatus: string | null;
  joinDate: string | null;
  departmentId: number | null;
  departmentName: string | null;
}

export interface PositionDetailResponse extends PositionResponse {
  totalEmployeeCount: number;
  activeEmployeeCount: number;
  inactiveEmployeeCount: number;
  loginAccountCount: number;
  userOnlyAccountCount: number;
  departmentCount: number;
  teamCount: number;
  departments: PositionDepartmentUsage[];
  employees: PositionEmployeeUsage[];
  userOnlyAccounts: PositionUserOnlyAccount[];
}
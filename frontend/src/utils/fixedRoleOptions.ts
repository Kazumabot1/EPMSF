import {
  defaultDashboardForRole,
  normalizeRoleName,
  roleDisplayName,
} from './dashboardOptions';

export type FixedRoleOption = {
  id: string;
  name: string;
  label: string;
  dashboard: string;
};

export const FIXED_ROLE_OPTIONS: FixedRoleOption[] = [
  'EMPLOYEE',
  'MANAGER',
  'DEPARTMENT_HEAD',
  'HR',
  'CEO',
  'ADMIN',
].map((role) => ({
  id: role,
  name: role,
  label: roleDisplayName(role),
  dashboard: defaultDashboardForRole(role),
}));

export const normalizeFixedRole = (role?: string | null) => normalizeRoleName(role);
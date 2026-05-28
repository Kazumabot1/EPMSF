import Sidebar from '../components/layout/Sidebar';
import EmployeeSidebar from '../components/sidebar/EmployeeSidebar';
import type { UserRole } from '../config/roleNavigation';

interface RoleBasedSidebarProps {
  role: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const normalizeRole = (value?: string | null) =>
  String(value ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

const RoleBasedSidebar = ({
  role,
  collapsed,
  onToggleCollapse,
}: RoleBasedSidebarProps) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'ADMIN') {
    return <Sidebar collapsed={collapsed} onToggle={onToggleCollapse} variant="admin" />;
  }

  if (normalizedRole === 'HR') {
    return <Sidebar collapsed={collapsed} onToggle={onToggleCollapse} variant="hr" />;
  }

  const isDepartmentHead =
    normalizedRole === 'DEPARTMENT_HEAD' ||
    normalizedRole === 'DEPARTMENTHEAD' ||
    normalizedRole === 'DEPT_HEAD' ||
    normalizedRole === 'HEAD_OF_DEPARTMENT';

  const isManager =
    normalizedRole === 'MANAGER' ||
    normalizedRole === 'PROJECT_MANAGER' ||
    normalizedRole === 'TEAM_MANAGER';

  if (isDepartmentHead || isManager) {
    return <Sidebar collapsed={collapsed} onToggle={onToggleCollapse} />;
  }

  return (
    <EmployeeSidebar
      role={role}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    />
  );
};

export default RoleBasedSidebar;
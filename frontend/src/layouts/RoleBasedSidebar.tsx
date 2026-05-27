import Sidebar from '../components/layout/Sidebar';
import EmployeeSidebar from '../components/sidebar/EmployeeSidebar';
import type { UserRole } from '../config/roleNavigation';

interface RoleBasedSidebarProps {
  role: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const RoleBasedSidebar = ({
  role,
  collapsed,
  onToggleCollapse,
}: RoleBasedSidebarProps) => {
  if (role === 'Admin') {
    return <Sidebar collapsed={collapsed} onToggle={onToggleCollapse} variant="admin" />;
  }

  if (role === 'HR') {
    return <Sidebar collapsed={collapsed} onToggle={onToggleCollapse} variant="hr" />;
  }

  if (role === 'DepartmentHead' || role === 'Manager') {
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
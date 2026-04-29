import EmployeeSidebar from '../components/sidebar/EmployeeSidebar';
import HRSidebar from '../components/sidebar/HRSidebar';
import DepartmentHeadSidebar from '../components/sidebar/DepartmentHeadSidebar';
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
  if (role === 'HR') {
    return <HRSidebar collapsed={collapsed} onToggleCollapse={onToggleCollapse} />;
  }

  if (role === 'DepartmentHead') {
    return (
      <DepartmentHeadSidebar
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }

  return <EmployeeSidebar collapsed={collapsed} onToggleCollapse={onToggleCollapse} />;
};

export default RoleBasedSidebar;
/*
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

  return <EmployeeSidebar role={role} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />;
};

export default RoleBasedSidebar; */





import Sidebar from '../components/layout/Sidebar';
import EmployeeSidebar from '../components/sidebar/EmployeeSidebar';
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
  if (role === 'Admin') {
    return <Sidebar collapsed={collapsed} onToggle={onToggleCollapse} variant="admin" />;
  }

  if (role === 'HR') {
    return <Sidebar collapsed={collapsed} onToggle={onToggleCollapse} variant="hr" />;
  }

  if (role === 'DepartmentHead') {
    return (
      <DepartmentHeadSidebar
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }

  return <EmployeeSidebar role={role} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />;
};

export default RoleBasedSidebar;
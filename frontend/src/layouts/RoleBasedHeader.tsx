import EmployeeHeader from '../components/header/EmployeeHeader';
import HRHeader from '../components/header/HRHeader';
import type { UserRole } from '../config/roleNavigation';

interface RoleBasedHeaderUser {
  fullName?: string;
  email?: string;
  employeeCode?: string;
  position?: string;
  roles?: string[];
  dashboard?: string;
}

interface RoleBasedHeaderProps {
  role: UserRole;
  collapsed: boolean;
  user?: RoleBasedHeaderUser | null;
}

const RoleBasedHeader = ({ role, collapsed, user }: RoleBasedHeaderProps) => {
  if (role === 'HR' || role === 'HRAdmin') {
    return <HRHeader collapsed={collapsed} />;
  }

  return <EmployeeHeader role={role} user={user} collapsed={collapsed} />;
};

export default RoleBasedHeader;
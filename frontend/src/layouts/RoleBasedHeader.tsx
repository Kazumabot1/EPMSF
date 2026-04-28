import EmployeeHeader from '../components/header/EmployeeHeader';
import HRHeader from '../components/header/HRHeader';
import type { UserRole } from '../config/roleNavigation';

interface RoleBasedHeaderProps {
  role: UserRole;
  collapsed: boolean;
  user?: any;
}

const RoleBasedHeader = ({ role, collapsed, user }: RoleBasedHeaderProps) => {
  if (role === 'HR') {
    return <HRHeader collapsed={collapsed} />;
  }

  return <EmployeeHeader role={role} user={user} collapsed={collapsed} />;
};

export default RoleBasedHeader;
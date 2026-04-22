import { Navigate, Outlet } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';

const HRLayout = () => {
  const user = authStorage.getUser();

  if (!user || !authStorage.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const allowedDashboards = ['HR_DASHBOARD', 'ADMIN_DASHBOARD'];

  if (!allowedDashboards.includes(user.dashboard)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default HRLayout;
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../config/roleNavigation';
import { resolveUserRole } from '../config/roleNavigation';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const fallbackByRole: Record<UserRole, string> = {
  Employee: '/employee/dashboard',
  HR: '/dashboard',
  DepartmentHead: '/department-head/dashboard',
  Manager: '/manager/dashboard',
  Executive: '/executive/dashboard',
};

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles?.length) {
    const role = resolveUserRole(user);

    if (!allowedRoles.includes(role)) {
      return <Navigate to={fallbackByRole[role]} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;

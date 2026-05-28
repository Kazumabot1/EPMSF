import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resolveUserRole } from '../config/roleNavigation';
import PositionPermissionRoute from './PositionPermissionRoute';

/**
 * HR users need position oneOnOnePermission; managers and department heads may access 1:1 without it.
 */
const OneOnOneRouteGate = () => {
  const { user } = useAuth();
  const role = resolveUserRole(user);

  if (role === 'HR') {
    return <PositionPermissionRoute permission="oneOnOnePermission" fallbackPath="/dashboard" />;
  }

  if (role === 'Manager' || role === 'DepartmentHead') {
    return <Outlet />;
  }

  return <Navigate to="/login" replace />;
};

export default OneOnOneRouteGate;

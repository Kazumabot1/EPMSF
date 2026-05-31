import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resolveUserRole } from '../config/roleNavigation';
import PositionPermissionRoute from './PositionPermissionRoute';

const OneOnOneRouteGate = () => {
  const { user } = useAuth();
  const role = resolveUserRole(user);

  if (role === 'Admin') {
    return <PositionPermissionRoute fallbackPath="/admin/dashboard" />;
  }

  if (role === 'HR') {
    return <PositionPermissionRoute permission="oneOnOnePermission" fallbackPath="/dashboard" />;
  }

  if (role === 'Manager') {
    return <PositionPermissionRoute permission="oneOnOnePermission" fallbackPath="/manager/dashboard" />;
  }

  if (role === 'DepartmentHead') {
    return <PositionPermissionRoute permission="oneOnOnePermission" fallbackPath="/department-head/dashboard" />;
  }

  return <Navigate to="/login" replace />;
};

export default OneOnOneRouteGate;

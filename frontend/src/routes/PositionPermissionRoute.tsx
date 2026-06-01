/*Z*/import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { dashboardPathByRole, resolveUserRole } from '../config/roleNavigation';
import { authStorage } from '../services/authStorage';
import { emptyPositionPermission, positionPermissionService } from '../services/positionPermissionService';
import type { PositionPermission } from '../types/positionPermission';

type PositionPermissionRouteProps = {
  permission?: keyof PositionPermission;
  anyPermissions?: Array<keyof PositionPermission>;
  fallbackPath?: string;
};

const PositionPermissionRoute = ({
  permission,
  anyPermissions,
  fallbackPath,
}: PositionPermissionRouteProps) => {
  const location = useLocation();
  const user = authStorage.getUser();
  const role = resolveUserRole(user);
  const [permissions, setPermissions] = useState<PositionPermission>(emptyPositionPermission());
  const [loading, setLoading] = useState(true);

  const requiredPermissions = useMemo(() => {
    if (anyPermissions?.length) return anyPermissions;
    return permission ? [permission] : [];
  }, [anyPermissions, permission]);

  useEffect(() => {
    if (role === 'Admin') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    positionPermissionService
      .getMyPermissions()
      .then((data) => {
        if (!cancelled) setPermissions({ ...emptyPositionPermission(), ...data });
      })
      .catch(() => {
        if (!cancelled) setPermissions(emptyPositionPermission());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [role]);

  if (role === 'Admin' || requiredPermissions.length === 0) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="alert alert-info mb-0">Checking position permission...</div>
      </div>
    );
  }

  const allowed = requiredPermissions.some((field) => Boolean(permissions[field]));

  if (!allowed) {
    const positionName = user?.position || 'your position';
    const destination = fallbackPath ?? dashboardPathByRole[role] ?? '/notifications';

    return (
      <Navigate
        to={destination}
        replace
        state={{
          from: location.pathname,
          permissionDeniedMessage: `Your position (${positionName}) has this feature disabled!`,
        }}
      />
    );
  }

  return <Outlet />;
};

export default PositionPermissionRoute;

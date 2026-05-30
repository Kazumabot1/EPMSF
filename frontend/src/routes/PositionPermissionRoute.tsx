import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStorage } from '../services/authStorage';
import { emptyPositionPermission, positionPermissionService } from '../services/positionPermissionService';
import type { PositionPermission } from '../types/positionPermission';

type PositionPermissionRouteProps = {
  permission: keyof PositionPermission;
  fallbackPath?: string;
};

const normalizeRoleName = (role?: string | null) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

const isDefaultAccessRole = (user: ReturnType<typeof authStorage.getUser>) => {
  const roles = (user?.roles ?? []).map(normalizeRoleName);
  const dashboard = normalizeRoleName(user?.dashboard);

  return (
    roles.includes('HRADMIN') ||
    roles.includes('ADMIN') ||
    roles.includes('CEO') ||
    roles.includes('EXECUTIVE') ||
    dashboard === 'HRADMIN_DASHBOARD' ||
    dashboard === 'ADMIN_DASHBOARD' ||
    dashboard === 'CEO_DASHBOARD' ||
    dashboard === 'EXECUTIVE_DASHBOARD'
  );
};

const PositionPermissionRoute = ({
  permission,
  fallbackPath = '/notifications',
}: PositionPermissionRouteProps) => {
  const location = useLocation();
  const user = authStorage.getUser();
  const [permissions, setPermissions] = useState<PositionPermission>(emptyPositionPermission());
  const [loading, setLoading] = useState(true);

  const bypassPositionPermission = useMemo(() => isDefaultAccessRole(user), [user]);

  useEffect(() => {
    if (bypassPositionPermission) {
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
  }, [bypassPositionPermission]);

  if (bypassPositionPermission) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="alert alert-info mb-0">Checking position permission...</div>
      </div>
    );
  }

  if (!permissions[permission]) {
    const positionName = user?.position || 'your position';
    return (
      <Navigate
        to={fallbackPath}
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

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStorage } from '../services/authStorage';
import { emptyPositionPermission, positionPermissionService } from '../services/positionPermissionService';
import type { PositionPermission } from '../types/positionPermission';

type PositionPermissionRouteProps = {
  permission: keyof PositionPermission;
  fallbackPath?: string;
};

const PositionPermissionRoute = ({
  permission,
  fallbackPath = '/notifications',
}: PositionPermissionRouteProps) => {
  const location = useLocation();
  const user = authStorage.getUser();
  const [permissions, setPermissions] = useState<PositionPermission>(emptyPositionPermission());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

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

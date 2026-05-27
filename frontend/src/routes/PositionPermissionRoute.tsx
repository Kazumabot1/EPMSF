import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStorage } from '../services/authStorage';
import {
  emptyPositionPermission,
  positionPermissionService,
} from '../services/positionPermissionService';
import type { PositionPermission } from '../types/positionPermission';
import { dashboardPathByRole, resolveUserRole } from '../config/roleNavigation';

type PositionPermissionRouteProps = {
  permission?: keyof PositionPermission;
  permissions?: Array<keyof PositionPermission>;
  fallbackPath?: string;
};

const permissionAllowed = (
  permissions: PositionPermission,
  permission: keyof PositionPermission,
) => {
  switch (permission) {
    case 'teamView':
    case 'teamHistory':
    case 'teamPermission':
      return Boolean(permissions.teamPermission);

    case 'departmentCrud':
    case 'departmentComparisonView':
    case 'employeeCrud':
    case 'employeeExcelImport':
      return Boolean(permissions.organizationPermission && permissions[permission]);

    case 'assessmentScoresView':
    case 'assessmentFormCreate':
      return Boolean(permissions.assessmentPermission && permissions[permission]);

    case 'appraisalView':
    case 'appraisalReview':
    case 'appraisalApprove':
    case 'appraisalScoreInput':
    case 'appraisalSign':
    case 'appraisalPermission':
      return Boolean(permissions.appraisalPermission);

    case 'continuousFeedbackView':
    case 'continuousFeedbackGive':
       return Boolean(permissions.continuousFeedbackView);

    case 'feedbackFormCreate':
    case 'feedbackSend':
    case 'feedback360Permission':
      return Boolean(permissions.feedback360Permission);

    case 'oneOnOneCreate':
    case 'oneOnOneDeptSelection':
    case 'oneOnOneTeamSelection':
    case 'oneOnOnePermission':
      return Boolean(permissions.oneOnOnePermission);

    case 'pipCreate':
    case 'pipEdit':
    case 'pipViewAll':
  return Boolean(permissions.pipViewAll);

    case 'positionCrud':
    case 'positionPermission':
      return Boolean(permissions.positionPermission);

    case 'kpiView':
    case 'kpiCreate':
    case 'kpiEdit':
    case 'kpiScore':
    case 'kpiInput':
    case 'kpiPermission':
      return Boolean(permissions.kpiPermission);

    case 'departmentKpiPermission':
      return Boolean(permissions.departmentKpiPermission);

    default:
      return Boolean(permissions[permission]);
  }
};

const PositionPermissionRoute = ({
  permission,
  permissions: permissionList,
  fallbackPath,
}: PositionPermissionRouteProps) => {
  const location = useLocation();
  const user = authStorage.getUser();
  const [permissions, setPermissions] = useState<PositionPermission>(
    emptyPositionPermission(),
  );
  const [loading, setLoading] = useState(true);

  const safeFallbackPath =
    fallbackPath || dashboardPathByRole[resolveUserRole(user)] || '/dashboard';

  const requiredPermissions = useMemo(() => {
    if (permissionList?.length) return permissionList;
    if (permission) return [permission];
    return [];
  }, [permission, permissionList]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    positionPermissionService
      .getMyPermissions()
      .then((data) => {
        if (!cancelled) {
          setPermissions({ ...emptyPositionPermission(), ...data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPermissions(emptyPositionPermission());
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const allowed =
    requiredPermissions.length === 0 ||
    requiredPermissions.some((item) => permissionAllowed(permissions, item));

  useEffect(() => {
    if (!loading && !allowed) {
      const positionName = user?.position || 'your position';

      toast.error(`Your position (${positionName}) has this feature disabled.`);
    }
  }, [allowed, loading, user?.position]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="alert alert-info mb-0">Checking position permission...</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <Navigate
        to={safeFallbackPath}
        replace
        state={{
          from: location.pathname,
          permissionDeniedMessage: `Your position (${user?.position || 'your position'}) has this feature disabled.`,
        }}
      />
    );
  }

  return <Outlet />;
};

export default PositionPermissionRoute;
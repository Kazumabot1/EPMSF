import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  roleNavigation,
  type NavItem,
  type UserRole,
} from '../../config/roleNavigation';
import {
  emptyPositionPermission,
  positionPermissionService,
} from '../../services/positionPermissionService';
import type { PositionPermission } from '../../types/positionPermission';

interface EmployeeSidebarProps {
  role?: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  return role;
};

const withBi = (icon: string) => (icon.startsWith('bi ') ? icon : `bi ${icon}`);

const EmployeeSidebar = ({
  role = 'Employee',
  collapsed,
  onToggleCollapse,
}: EmployeeSidebarProps) => {
  const location = useLocation();
  const navigation = useMemo(() => roleNavigation[role] ?? roleNavigation.Employee, [role]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [positionPermissions, setPositionPermissions] = useState<PositionPermission>(emptyPositionPermission());
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const shouldCheckPositionPermissions = useMemo(
    () => navigation.some((item) => item.permissionField || item.children?.some((child) => child.permissionField)),
    [navigation],
  );

  useEffect(() => {
    let cancelled = false;

    if (!shouldCheckPositionPermissions) {
      setPositionPermissions(emptyPositionPermission());
      setPermissionsLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    setPermissionsLoaded(false);
    positionPermissionService
      .getMyPermissions()
      .then((data) => {
        if (!cancelled) setPositionPermissions({ ...emptyPositionPermission(), ...data });
      })
      .catch(() => {
        if (!cancelled) setPositionPermissions(emptyPositionPermission());
      })
      .finally(() => {
        if (!cancelled) setPermissionsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldCheckPositionPermissions]);

  const hasPermission = (field?: keyof PositionPermission) => {
    if (!field) return true;
    if (!permissionsLoaded) return false;
    return Boolean(positionPermissions[field]);
  };

  const isActivePath = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const hasActiveChild = (item: NavItem) =>
    item.children?.some((child) => isActivePath(child.path, child.end)) ?? false;

  const isItemActive = (item: NavItem) => isActivePath(item.path, item.end) || hasActiveChild(item);

  const visibleChildren = (item: NavItem) =>
    (item.children ?? []).filter((child) => hasPermission(child.permissionField));

  const hasVisiblePermission = (item: NavItem) => {
    if (item.children?.length) {
      return visibleChildren(item).length > 0;
    }

    return hasPermission(item.permissionField);
  };

  useEffect(() => {
    setExpanded((previous) => {
      const next = new Set(previous);
      navigation.forEach((item) => {
        if (item.children?.length && hasActiveChild(item)) next.add(item.path);
      });
      return next;
    });
  }, [location.pathname, navigation]);

  const toggleDropdown = (path: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <aside className={`employee-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="employee-sidebar-top">
        <div className="employee-brand">
          <div className="employee-brand-mark">
            <i className="bi bi-lightning-charge-fill" />
          </div>

          {!collapsed && (
            <div className="employee-brand-copy">
              <h2>EPMS</h2>
              <p>PERFORMANCE SYSTEM</p>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="employee-role-chip">
          <p>CURRENT ROLE</p>
          <strong>{displayRoleName(role)}</strong>
        </div>
      )}

      <nav className="employee-nav">
        {navigation.map((item, itemIndex) => {
          const itemHasChildren = Boolean(item.children?.length);
          const isExpanded = expanded.has(item.path);
          const isActiveParent = isItemActive(item);
          const itemKey = `${item.path}:${item.label}:${itemIndex}`;

          if (!hasVisiblePermission(item)) {
            return null;
          }

          if (itemHasChildren) {
            return (
              <div key={itemKey} className="employee-nav-group">
                <button
                  type="button"
                  title={collapsed ? item.label : undefined}
                  className={`employee-nav-link ${isActiveParent ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                  onClick={() => toggleDropdown(item.path)}
                >
                  <span className="employee-nav-link-main">
                    <i className={withBi(item.icon)} />
                    {!collapsed && <span>{item.label}</span>}
                  </span>

                  {!collapsed && <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />}
                </button>

                {!collapsed && isExpanded && (
                  <div className="employee-submenu">
                    {visibleChildren(item).map((child, childIndex) => {
                      const childKey = `${child.path}:${child.label}:${childIndex}`;

                      return (
                        <NavLink
                          key={childKey}
                          to={child.path}
                          end={child.end}
                          className={({ isActive }) => `employee-submenu-link ${isActive ? 'active' : ''}`}
                        >
                          <i className={withBi(child.icon)} />
                          <span>{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={itemKey}
              to={item.path}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `employee-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
              }
            >
              <i className={withBi(item.icon)} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="employee-sidebar-footer">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="employee-sidebar-collapse"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default EmployeeSidebar;

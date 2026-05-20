import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  roleNavigation,
  type NavItem,
} from '../../config/roleNavigation';
import {
  emptyPositionPermission,
  positionPermissionService,
} from '../../services/positionPermissionService';
import type { PositionPermission } from '../../types/positionPermission';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  variant?: 'admin' | 'hr';
};

const withBi = (icon: string) => (icon.startsWith('bi ') ? icon : `bi ${icon}`);

const Sidebar = ({ collapsed, onToggle, variant = 'hr' }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [positionPermissions, setPositionPermissions] = useState<PositionPermission>(emptyPositionPermission());
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const roleLabel = variant === 'admin' ? 'Admin' : 'HR';
  const navItems = useMemo<NavItem[]>(
    () => (variant === 'admin' ? roleNavigation.Admin : roleNavigation.HR),
    [variant],
  );

  useEffect(() => {
    let cancelled = false;

    if (variant !== 'hr') {
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
  }, [variant]);

  const hasPermission = (field?: keyof PositionPermission) => {
    if (!field) return true;
    if (variant !== 'hr') return true;
    if (!permissionsLoaded) return false;
    return Boolean(positionPermissions[field]);
  };

  const isActivePath = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const hasActiveChild = (item: NavItem) =>
    item.children?.some((child) => isActivePath(child.path, child.end)) ?? false;

  const isParentActive = (item: NavItem) => isActivePath(item.path, item.end) || hasActiveChild(item);

  const visibleChildren = (item: NavItem) =>
    (item.children ?? []).filter((child) => hasPermission(child.permissionField));

  const hasVisiblePermission = (item: NavItem) => {
    if (item.children?.length) {
      return visibleChildren(item).length > 0;
    }

    return hasPermission(item.permissionField);
  };

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      navItems.forEach((item) => {
        if (item.children?.length && hasActiveChild(item)) next.add(item.path);
      });
      if (next.size === prev.size && [...next].every((value) => prev.has(value))) return prev;
      return next;
    });
  }, [location.pathname, navItems]);

  const toggleParent = (item: NavItem) => {
    if (!item.children?.length) {
      navigate(item.path);
      return;
    }

    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(item.path)) next.delete(item.path);
      else next.add(item.path);
      return next;
    });
  };

  return (
    <aside className={`hr-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="hr-sidebar-top">
        <div className="hr-brand">
          <div className="hr-brand-mark">E</div>
          {!collapsed && (
            <div className="hr-brand-copy">
              <h2>EPMS</h2>
              <p>Performance System</p>
            </div>
          )}
        </div>
        {!collapsed && <div className="hr-sidebar-top-divider" />}
      </div>

      {!collapsed && (
        <div className="hr-role-chip">
          <small>CURRENT ROLE</small>
          <strong>{roleLabel}</strong>
        </div>
      )}

      <nav className="hr-nav">
        {navItems.map((item, itemIndex) => {
          const isExpanded = expanded.has(item.path);
          const parentActive = isParentActive(item);
          const itemKey = `${item.path}:${item.label}:${itemIndex}`;

          if (!hasVisiblePermission(item)) {
            return null;
          }

          if (!item.children?.length) {
            return (
              <NavLink
                key={itemKey}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `hr-nav-link ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <i className={withBi(item.icon)} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          }

          return (
            <div key={itemKey} className="hr-nav-group">
              <button
                type="button"
                className={`hr-nav-link hr-nav-group-toggle ${parentActive ? 'active' : ''}`}
                onClick={() => toggleParent(item)}
                title={collapsed ? item.label : undefined}
              >
                <i className={withBi(item.icon)} />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} hr-submenu-caret`} />
                  </>
                )}
              </button>

              {!collapsed && isExpanded && (
                <div className="hr-submenu">
                  {visibleChildren(item).map((child, childIndex) => {
                    const childKey = `${child.path}:${child.label}:${childIndex}`;

                    return (
                      <NavLink
                        key={childKey}
                        to={child.path}
                        end={child.end}
                        className={({ isActive }) => `hr-submenu-link ${isActive ? 'active' : ''}`}
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
        })}
      </nav>

      <div className="hr-sidebar-footer">
        <button
          type="button"
          className="hr-sidebar-collapse"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

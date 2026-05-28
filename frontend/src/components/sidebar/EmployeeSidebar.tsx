import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { roleNavigation } from '../../config/roleNavigation';
import type { NavItem, UserRole } from '../../config/roleNavigation';
import SidebarCompanyLogo from '../layout/SidebarCompanyLogo';
import api from '../../services/api';
import { useNotificationsWebSocket } from '../../hooks/useNotificationsWebSocket';

interface EmployeeSidebarProps {
  role?: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const EmployeeSidebar = ({
                           role = 'Employee',
                           collapsed,
                           onToggleCollapse,
                         }: EmployeeSidebarProps) => {
  const location = useLocation();
  const baseNavigation = roleNavigation[role] ?? roleNavigation.Employee;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMyTeams, setHasMyTeams] = useState(false);

  const navigation = useMemo(() => {
    if (!hasMyTeams || baseNavigation.some((item) => item.path === '/my-team')) {
      return baseNavigation;
    }

    const myTeamItem: NavItem = {
      label: 'My Team',
      path: '/my-team',
      icon: 'bi-diagram-3',
    };

    const dashboardIndex = baseNavigation.findIndex((item) => item.path.toLowerCase().includes('dashboard'));
    const insertIndex = dashboardIndex >= 0 ? dashboardIndex + 1 : 1;

    return [
      ...baseNavigation.slice(0, insertIndex),
      myTeamItem,
      ...baseNavigation.slice(insertIndex),
    ];
  }, [baseNavigation, hasMyTeams]);

  const hasActiveChild = (item: NavItem) =>
      item.children?.some(
          (child) => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`),
      ) ?? false;

  const isItemActive = (item: NavItem) => {
    if (item.end) {
      return location.pathname === item.path;
    }

    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`) || hasActiveChild(item);
  };

  useEffect(() => {
    setExpanded((previous) => {
      const next = new Set(previous);

      navigation.forEach((item) => {
        if (item.children?.length && hasActiveChild(item)) {
          next.add(item.path);
        }
      });

      return next;
    });
  }, [location.pathname, navigation]);

  useEffect(() => {
    let cancelled = false;

    api.get('/teams/my-teams')
      .then((response) => {
        if (cancelled) {
          return;
        }

        const payload = response.data as { data?: unknown } | unknown;
        const list = payload && typeof payload === 'object' && 'data' in payload
          ? (payload as { data?: unknown }).data
          : payload;

        setHasMyTeams(Array.isArray(list) && list.length > 0);
      })
      .catch(() => {
        if (!cancelled) {
          setHasMyTeams(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [role, location.pathname]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      const body = response.data as { data?: number } | number;
      const count = typeof body === 'number' ? body : body?.data;
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount, location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    const onNotificationsUpdated = () => {
      void loadUnreadCount();
    };
    const onNotificationsReadStateChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;

      if (typeof detail?.unreadCount === 'number') {
        setUnreadCount(detail.unreadCount);
        return;
      }

      void loadUnreadCount();
    };

    window.addEventListener('epms:notifications-updated', onNotificationsUpdated);
    window.addEventListener('epms:notifications-read-state-changed', onNotificationsReadStateChanged);

    return () => {
      window.removeEventListener('epms:notifications-updated', onNotificationsUpdated);
      window.removeEventListener('epms:notifications-read-state-changed', onNotificationsReadStateChanged);
    };
  }, [loadUnreadCount]);

  useNotificationsWebSocket(() => {
    setUnreadCount((prev) => prev + 1);
  });

  const notificationBadge = unreadCount > 0 ? (
      <span className="employee-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
  ) : null;

  const toggleDropdown = (path: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  };

  return (
      <aside className={`employee-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="employee-sidebar-top">
          <div className="employee-brand">
            <SidebarCompanyLogo />

            {!collapsed && (
                <div className="employee-brand-copy">
                  <h2>EPMS</h2>
                  <p>PERFORMANCE SYSTEM</p>
                </div>
            )}
          </div>
        </div>

        <nav className="employee-nav" aria-label={`${role} navigation`}>
          {navigation.map((item) => {
            const itemHasChildren = Boolean(item.children?.length);
            const isExpanded = expanded.has(item.path);
            const isActiveParent = isItemActive(item);

            if (itemHasChildren) {
              return (
                  <div key={item.path} className="employee-nav-group">
                    <button
                        type="button"
                        title={collapsed ? item.label : undefined}
                        className={`employee-nav-link ${isActiveParent ? 'active' : ''} ${
                            collapsed ? 'collapsed' : ''
                        }`}
                        onClick={() => toggleDropdown(item.path)}
                    >
                  <span className="employee-nav-link-main">
                    <i className={`bi ${item.icon}`} />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.path.includes('notifications') && notificationBadge}
                  </span>

                      {!collapsed && (
                          <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                      )}
                    </button>

                    {!collapsed && isExpanded && (
                        <div className="employee-submenu">
                          {item.children?.map((child) => (
                              <NavLink
                                  key={child.path}
                                  to={child.path}
                                  end={child.end}
                                  className={({ isActive }) =>
                                      `employee-submenu-link ${isActive ? 'active' : ''}`
                                  }
                              >
                                <i className={`bi ${child.icon}`} />
                                <span>{child.label}</span>
                                {child.path.includes('notifications') && notificationBadge}
                              </NavLink>
                          ))}
                        </div>
                    )}
                  </div>
              );
            }

            return (
                <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                        `employee-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
                    }
                >
                  <i className={`bi ${item.icon}`} />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.path.includes('notifications') && notificationBadge}
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

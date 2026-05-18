/*
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { roleNavigation } from '../../config/roleNavigation';
import type { NavItem, UserRole } from '../../config/roleNavigation';

interface EmployeeSidebarProps {
  role?: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  return role;
};

const EmployeeSidebar = ({
  role = 'Employee',
  collapsed,
  onToggleCollapse,
}: EmployeeSidebarProps) => {
  const location = useLocation();
  const navigation = roleNavigation[role] ?? roleNavigation.Employee;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const hasActiveChild = (item: NavItem) => {
    return item.children?.some((child) => location.pathname.startsWith(child.path)) ?? false;
  };

  useEffect(() => {
    setExpanded((previous) => {
      const next = new Set(previous);

      navigation.forEach((item) => {
        if (hasActiveChild(item)) {
          next.add(item.path);
        }
      });

      return next;
    });
  }, [location.pathname]);

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
        {navigation.map((item) => {
          const itemHasChildren = Boolean(item.children?.length);
          const isExpanded = expanded.has(item.path);
          const isActiveParent = location.pathname.startsWith(item.path) || hasActiveChild(item);

          if (itemHasChildren) {
            return (
              <div
                key={item.path}
                className="employee-nav-group"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  title={collapsed ? item.label : undefined}
                  className={`employee-nav-link ${isActiveParent ? 'active' : ''} ${
                    collapsed ? 'collapsed' : ''
                  }`}
                  onClick={() => toggleDropdown(item.path)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: isActiveParent ? '#eef2ff' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    gap: '10px',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: 0,
                    }}
                  >
                    <i className={`bi ${item.icon}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </span>

                  {!collapsed && (
                    <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                  )}
                </button>

                {!collapsed && isExpanded && (
                  <div
                    className="employee-submenu"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginLeft: '28px',
                      paddingLeft: '10px',
                      borderLeft: '1px solid #e5e7eb',
                    }}
                  >
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        end={child.end}
                        className={({ isActive }) =>
                          `employee-submenu-link ${isActive ? 'active' : ''}`
                        }
                        style={({ isActive }) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          color: isActive ? '#4f46e5' : '#475569',
                          background: isActive ? '#eef2ff' : 'transparent',
                          fontWeight: isActive ? 700 : 500,
                        })}
                      >
                        <i className={`bi ${child.icon}`} />
                        <span>{child.label}</span>
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

export default EmployeeSidebar; */







/*
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { roleNavigation } from '../../config/roleNavigation';
import type { NavItem, UserRole } from '../../config/roleNavigation';

interface EmployeeSidebarProps {
  role?: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  return role;
};

const itemKey = (item: NavItem, index: number) => `${item.path}-${item.label}-${index}`;

const EmployeeSidebar = ({
  role = 'Employee',
  collapsed,
  onToggleCollapse,
}: EmployeeSidebarProps) => {
  const location = useLocation();
  const navigation = roleNavigation[role] ?? roleNavigation.Employee;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const hasActiveChild = (item: NavItem) => {
    return item.children?.some((child) => location.pathname.startsWith(child.path)) ?? false;
  };

  useEffect(() => {
    setExpanded((previous) => {
      const next = new Set(previous);

      navigation.forEach((item) => {
        if (hasActiveChild(item)) {
          next.add(item.path);
        }
      });

      return next;
    });
  }, [location.pathname, navigation]);

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
        {navigation.map((item, index) => {
          const itemHasChildren = Boolean(item.children?.length);
          const isExpanded = expanded.has(item.path);
          const isActiveParent = location.pathname.startsWith(item.path) || hasActiveChild(item);

          if (itemHasChildren) {
            return (
              <div
                key={itemKey(item, index)}
                className="employee-nav-group"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  title={collapsed ? item.label : undefined}
                  className={`employee-nav-link ${isActiveParent ? 'active' : ''} ${
                    collapsed ? 'collapsed' : ''
                  }`}
                  onClick={() => toggleDropdown(item.path)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: isActiveParent ? '#eef2ff' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    gap: '10px',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: 0,
                    }}
                  >
                    <i className={`bi ${item.icon}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </span>

                  {!collapsed && (
                    <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                  )}
                </button>

                {!collapsed && isExpanded && (
                  <div
                    className="employee-submenu"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginLeft: '28px',
                      paddingLeft: '10px',
                      borderLeft: '1px solid #e5e7eb',
                    }}
                  >
                    {item.children?.map((child, childIndex) => (
                      <NavLink
                        key={`${child.path}-${child.label}-${childIndex}`}
                        to={child.path}
                        end={child.end}
                        className={({ isActive }) =>
                          `employee-submenu-link ${isActive ? 'active' : ''}`
                        }
                        style={({ isActive }) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          color: isActive ? '#4f46e5' : '#475569',
                          background: isActive ? '#eef2ff' : 'transparent',
                          fontWeight: isActive ? 700 : 500,
                        })}
                      >
                        <i className={`bi ${child.icon}`} />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={itemKey(item, index)}
              to={item.path}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `employee-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
              }
            >
              <i className={`bi ${item.icon}`} />
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

export default EmployeeSidebar; */








import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { roleNavigation } from '../../config/roleNavigation';
import type { NavItem, UserRole } from '../../config/roleNavigation';
import SidebarCompanyLogo from '../layout/SidebarCompanyLogo';

interface EmployeeSidebarProps {
  role?: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  return role;
};

const EmployeeSidebar = ({
  role = 'Employee',
  collapsed,
  onToggleCollapse,
}: EmployeeSidebarProps) => {
  const location = useLocation();
  const navigation = roleNavigation[role] ?? roleNavigation.Employee;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const hasActiveChild = (item: NavItem) =>
    item.children?.some((child) => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)) ??
    false;

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

      {!collapsed && (
        <div className="employee-role-chip">
          <p>CURRENT ROLE</p>
          <strong>{displayRoleName(role)}</strong>
        </div>
      )}

      <nav className="employee-nav">
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
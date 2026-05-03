/*
import { NavLink } from 'react-router-dom';
import { roleNavigation } from '../../config/roleNavigation';
import type { UserRole } from '../../config/roleNavigation';

interface EmployeeSidebarProps {
  role?: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  return role;
};

const EmployeeSidebar = ({ role = 'Employee', collapsed, onToggleCollapse }: EmployeeSidebarProps) => {
  const navigation = roleNavigation[role] ?? roleNavigation.Employee;

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
        {navigation.map((item) => (
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
        ))}
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
 */


/* EmployeeSidebar.tsx
   Why this file is fixed:
   - Manager sidebar uses this component.
   - Adds support for dropdown children.
   - Now Manager can see:
     PIP
       Create
       Past Plans
*/
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
  if (role === 'ProjectManager') return 'Project Manager';
  return role;
};

const EmployeeSidebar = ({ role = 'Employee', collapsed, onToggleCollapse }: EmployeeSidebarProps) => {
  const location = useLocation();
  const navigation = roleNavigation[role] ?? roleNavigation.Employee;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const hasActiveChild = (item: NavItem) =>
    item.children?.some((child) => location.pathname.startsWith(child.path)) ?? false;

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      navigation.forEach((item) => {
        if (hasActiveChild(item)) {
          next.add(item.path);
        }
      });
      return next;
    });
  }, [location.pathname, navigation]);

  const toggleParent = (item: NavItem) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(item.path)) {
        next.delete(item.path);
      } else {
        next.add(item.path);
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
          const activeParent = location.pathname.startsWith(item.path) || hasActiveChild(item);
          const isExpanded = expanded.has(item.path);

          if (item.children?.length) {
            return (
              <div key={item.path} className="employee-nav-group">
                <button
                  type="button"
                  title={collapsed ? item.label : undefined}
                  className={`employee-nav-link ${activeParent ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                  onClick={() => toggleParent(item)}
                >
                  <i className={`bi ${item.icon}`} />
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                    </>
                  )}
                </button>

                {!collapsed && isExpanded && (
                  <div className="employee-submenu">
                    {item.children.map((child) => (
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

export default EmployeeSidebar; */


/* EmployeeSidebar.tsx
   Why this file is fixed:
   - Manager, Employee, Department Head sidebars use this component.
   - The previous submenu rendered but looked broken and was hard to click.
   - This version supports dropdown children clearly.
   - It shows:
     PIP
       Create
       Past Plans
   - It uses inline fallback styles for submenu so it works even if CSS is missing.
*/

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
  if (role === 'ProjectManager') return 'Project Manager';
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

export default EmployeeSidebar;
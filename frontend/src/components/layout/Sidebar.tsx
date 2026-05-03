/* Sidebar.tsx file: *//*

import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  variant?: 'admin' | 'hr';
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
   *//*
 */
/** When set on a child link, only exact path matches (avoids e.g. /hr/employee matching /hr/employee/create). *//*
 */
/*
  end?: boolean;
  children?: NavItem[];
};

const normalizeRoleName = (role: string) =>
  role
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const Sidebar = ({ collapsed, onToggle, variant }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStorage.getUser();

  const dashboard = user?.dashboard ?? '';
  const normalizedRoles = (user?.roles ?? []).map(normalizeRoleName);

  const isAdmin =
    normalizedRoles.includes('ADMIN') ||
    dashboard === 'ADMIN_DASHBOARD';

  const isEmployee =
    normalizedRoles.includes('EMPLOYEE') ||
    dashboard === 'EMPLOYEE_DASHBOARD';

  const roleLabel =
    variant === 'admin'
      ? 'Admin'
      : variant === 'hr'
      ? 'HR'
      : isAdmin
      ? 'Admin'
      : dashboard === 'EMPLOYEE_DASHBOARD'
      ? 'Employee'
      : dashboard === 'HR_DASHBOARD'
      ? 'HR'
      : dashboard === 'MANAGER_DASHBOARD'
      ? 'Manager'
      : dashboard === 'DEPARTMENT_HEAD_DASHBOARD'
      ? 'Department Head'
      : dashboard === 'EXECUTIVE_DASHBOARD'
      ? 'Executive'
      : 'User';

  const adminNavItems: NavItem[] = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: 'bi bi-shield-lock' },
    { to: '/admin/users', label: 'User Accounts', icon: 'bi bi-person-plus' },
    { to: '/admin/employee/import', label: 'Import Accounts', icon: 'bi bi-upload' },
    {
      to: '/user-roles',
      label: 'Access Control',
      icon: 'bi bi-shield-lock',
      children: [
        { to: '/user-roles', label: 'User Roles', icon: 'bi bi-person-gear' },
        { to: '/role-permissions', label: 'Role Permissions', icon: 'bi bi-shield-check' },
        { to: '/permissions', label: 'Permissions', icon: 'bi bi-key' },
      ],
    },
  ];

  const hrNavItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },

    {
      to: '/hr/team',
      label: 'Team Management',
      icon: 'bi bi-people',
      children: [
        { to: '/hr/team', label: 'Teams', icon: 'bi bi-people', end: true },
        { to: '/hr/team/create', label: 'Create Team', icon: 'bi bi-plus-circle' },
      ],
    },

    {
      to: '/hr/organization',
      label: 'Organization',
      icon: 'bi bi-building',
      children: [
        { to: '/hr/department', label: 'Departments', icon: 'bi bi-building' },
        { to: '/hr/employee', label: 'Employee', icon: 'bi bi-people', end: true },
        {
          to: '/hr/employee/workforce',
          label: 'Workforce overview',
          icon: 'bi bi-person-badge',
          end: true,
        },
      ],
    },

    { to: '/hr/assessment-scores', label: 'Assessment Scores', icon: 'bi bi-clipboard-data' },

    {
      to: '/user-roles',
      label: 'Access Control',
      icon: 'bi bi-shield-lock',
      children: [
        { to: '/user-roles', label: 'User Roles', icon: 'bi bi-person-gear' },
        { to: '/role-permissions', label: 'Role Permissions', icon: 'bi bi-shield-check' },
        { to: '/permissions', label: 'Permissions', icon: 'bi bi-key' },
      ],
    },

    {
      to: '/pip-updates',
      label: 'One-on-One',
      icon: 'bi bi-chat-left-text',
      children: [
        { to: '/pip-updates', label: 'PIP Updates', icon: 'bi bi-clipboard-check' },
        { to: '/one-on-one-meetings', label: '1:1 Meetings', icon: 'bi bi-chat-dots' },
        { to: '/one-on-one-action-items', label: 'Action Items', icon: 'bi bi-list-check' },
      ],
    },

    { to: '/notifications', label: 'Notifications', icon: 'bi bi-bell' },

    {
      to: '/hr/position/create',
      label: 'Positions',
      icon: 'bi bi-briefcase',
      children: [
        { to: '/hr/position/create', label: 'Create Position', icon: 'bi bi-briefcase' },
        { to: '/hr/position-level/create', label: 'Position Levels', icon: 'bi bi-diagram-3' },
        { to: '/hr/position/table', label: 'Positions Table', icon: 'bi bi-table' },
      ],
    },

    {
      to: '/hr/performance-kpi/unit',
      label: 'KPI Management',
      icon: 'bi bi-speedometer2',
      children: [
        { to: '/hr/performance-kpi/unit', label: 'KPI Units', icon: 'bi bi-speedometer2' },
        { to: '/hr/performance-kpi/category', label: 'KPI Categories', icon: 'bi bi-tags' },
        { to: '/hr/performance-kpi/item', label: 'KPI Items', icon: 'bi bi-card-checklist' },
        { to: '/hr/kpi-template', label: 'KPI Templates', icon: 'bi bi-ui-checks-grid' },
      ],
    },
  ];

  const navItems: NavItem[] =
    variant === 'admin'
      ? adminNavItems
      : variant === 'hr'
      ? hrNavItems
      : isAdmin
      ? adminNavItems
      : isEmployee
      ? [{ to: '/employee/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' }]
      : hrNavItems;

  const hasActiveChild = (item: NavItem) =>
    item.children?.some((child) => location.pathname.startsWith(child.to)) ?? false;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      navItems.forEach((item) => {
        if (hasActiveChild(item)) next.add(item.to);
      });
      return next;
    });
  }, [location.pathname]);

  const isParentActive = (item: NavItem) =>
    location.pathname.startsWith(item.to) || hasActiveChild(item);

  const toggleParent = (item: NavItem) => {
    if (!item.children?.length) {
      navigate(item.to);
      return;
    }

    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(item.to)) next.delete(item.to);
      else next.add(item.to);
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
        {navItems.map((item) => {
          const isExpanded = expanded.has(item.to);
          const parentActive = isParentActive(item);

          if (!item.children?.length) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `hr-nav-link ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <i className={item.icon} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          }

          return (
            <div key={item.to} className="hr-nav-group">
              <button
                type="button"
                className={`hr-nav-link hr-nav-group-toggle ${parentActive ? 'active' : ''}`}
                onClick={() => toggleParent(item)}
                title={collapsed ? item.label : undefined}
              >
                <i className={item.icon} />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <i
                      className={`bi ${
                        isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'
                      } hr-submenu-caret`}
                    />
                  </>
                )}
              </button>

              {!collapsed && isExpanded && (
                <div className="hr-submenu">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end={child.end}
                      className={({ isActive }) =>
                        `hr-submenu-link ${isActive ? 'active' : ''}`
                      }
                    >
                      <i className={child.icon} />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
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

export default Sidebar; *//*




 */
/*
  Why this file is updated:
  - Uses roleNavigation config.
  - Shows dropdown menus including the new PIP menu.
  - Old PIP Updates item is removed from One-on-One through roleNavigation.ts.
*//*

 */
/*

import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { NavItem } from "../../config/roleNavigation";
import { getNavigationForRole, normalizeRoleName } from "../../config/roleNavigation";
import "./Sidebar.css";

type SidebarProps = {
  role?: string | null;
};

export default function Sidebar({ role }: SidebarProps) {
  const location = useLocation();
  const normalizedRole = normalizeRoleName(role);
  const navItems = useMemo(() => getNavigationForRole(normalizedRole), [normalizedRole]);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};

    navItems.forEach((item) => {
      if (item.children?.some((child) => location.pathname.startsWith(child.path))) {
        next[item.label] = true;
      }
    });

    setOpenMenus((current) => ({ ...current, ...next }));
  }, [location.pathname, navItems]);

  function toggleMenu(label: string) {
    setOpenMenus((current) => ({
      ...current,
      [label]: !current[label],
    }));
  }

  function renderItem(item: NavItem) {
    const Icon = item.icon;

    if (item.children?.length) {
      const isOpen = openMenus[item.label];

      return (
        <div className="sidebar-menu-group" key={item.label}>
          <button
            className={`sidebar-link sidebar-dropdown-toggle ${isOpen ? "open" : ""}`}
            onClick={() => toggleMenu(item.label)}
            type="button"
          >
            <span className="sidebar-link-left">
              <Icon />
              <span>{item.label}</span>
            </span>
            <span className="sidebar-chevron">{isOpen ? "▾" : "▸"}</span>
          </button>

          {isOpen && (
            <div className="sidebar-submenu">
              {item.children.map((child) => (
                <NavLink
                  key={child.path}
                  to={child.path}
                  className={({ isActive }) =>
                    `sidebar-sublink ${isActive ? "active" : ""}`
                  }
                >
                  {child.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (!item.path) return null;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
      >
        <span className="sidebar-link-left">
          <Icon />
          <span>{item.label}</span>
        </span>
      </NavLink>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">E</div>
        <div>
          <h2>EPMS</h2>
          <p>{normalizedRole.replaceAll("_", " ")}</p>
        </div>
      </div>

      <nav className="sidebar-nav">{navItems.map(renderItem)}</nav>
    </aside>
  );
} *//*









 */
/* Sidebar.tsx
   Why this file is fixed:
   - Your existing HR sidebar uses Bootstrap Icons and hr-layout.css.
   - It should not import Sidebar.css because that file does not exist.
   - Removes old One-on-One > PIP Updates menu.
   - Adds a separate PIP dropdown with Create and Past Plans.
*//*


import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  children?: NavItem[];
};

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStorage.getUser();
  const dashboard = user?.dashboard ?? '';

  const roleLabel =
    dashboard === 'EMPLOYEE_DASHBOARD'
      ? 'Employee'
      : dashboard === 'HR_DASHBOARD'
      ? 'HR'
      : dashboard === 'ADMIN_DASHBOARD'
      ? 'Admin'
      : dashboard === 'MANAGER_DASHBOARD'
      ? 'Manager'
      : dashboard === 'DEPARTMENT_HEAD_DASHBOARD'
      ? 'Department Head'
      : dashboard === 'EXECUTIVE_DASHBOARD'
      ? 'Executive'
      : 'User';

  const isHrOnly = dashboard === 'HR_DASHBOARD' || dashboard === 'ADMIN_DASHBOARD';

  const navItems: NavItem[] =
    dashboard === 'EMPLOYEE_DASHBOARD'
      ? [{ to: '/employee/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' }]
      : [
          { to: '/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },

          {
            to: '/hr/team',
            label: 'Team Management',
            icon: 'bi bi-people',
            children: [
              { to: '/hr/team', label: 'Teams', icon: 'bi bi-people', end: true },
              { to: '/hr/team/create', label: 'Create Team', icon: 'bi bi-plus-circle' },
            ],
          },

          {
            to: '/hr/organization',
            label: 'Organization',
            icon: 'bi bi-building',
            children: [
              { to: '/hr/department', label: 'Departments', icon: 'bi bi-building' },
              { to: '/hr/employee', label: 'Employee', icon: 'bi bi-people', end: true },
              {
                to: '/hr/employee/workforce',
                label: 'Workforce overview',
                icon: 'bi bi-person-badge',
                end: true,
              },
              { to: '/hr/employee/import', label: 'Import Employees', icon: 'bi bi-upload' },
            ],
          },

          { to: '/hr/assessment-scores', label: 'Assessment Scores', icon: 'bi bi-clipboard-data' },

          {
            to: '/user-roles',
            label: 'Access Control',
            icon: 'bi bi-shield-lock',
            children: [
              { to: '/user-roles', label: 'User Roles', icon: 'bi bi-person-gear' },
              { to: '/role-permissions', label: 'Role Permissions', icon: 'bi bi-shield-check' },
              { to: '/permissions', label: 'Permissions', icon: 'bi bi-key' },
            ],
          },

          {
            to: '/one-on-one-meetings',
            label: 'One-on-One',
            icon: 'bi bi-chat-left-text',
            children: [
              { to: '/one-on-one-meetings', label: '1:1 Meetings', icon: 'bi bi-chat-dots' },
              { to: '/one-on-one-action-items', label: 'Action Items', icon: 'bi bi-list-check' },
            ],
          },

          {
            to: '/pip/past-plans',
            label: 'PIP',
            icon: 'bi bi-clipboard2-pulse',
            children: isHrOnly
              ? [{ to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' }]
              : [
                  { to: '/pip/create', label: 'Create', icon: 'bi bi-plus-square' },
                  { to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' },
                ],
          },

          { to: '/notifications', label: 'Notifications', icon: 'bi bi-bell' },

          {
            to: '/hr/position/create',
            label: 'Positions',
            icon: 'bi bi-briefcase',
            children: [
              { to: '/hr/position/create', label: 'Create Position', icon: 'bi bi-briefcase' },
              { to: '/hr/position-level/create', label: 'Position Levels', icon: 'bi bi-diagram-3' },
              { to: '/hr/position/table', label: 'Positions Table', icon: 'bi bi-table' },
            ],
          },

          {
            to: '/hr/performance-kpi/unit',
            label: 'KPI Management',
            icon: 'bi bi-speedometer2',
            children: [
              { to: '/hr/performance-kpi/unit', label: 'KPI Units', icon: 'bi bi-speedometer2' },
              { to: '/hr/performance-kpi/category', label: 'KPI Categories', icon: 'bi bi-tags' },
              { to: '/hr/performance-kpi/item', label: 'KPI Items', icon: 'bi bi-card-checklist' },
              { to: '/hr/kpi-template', label: 'KPI Templates', icon: 'bi bi-ui-checks-grid' },
            ],
          },
        ];

  const hasActiveChild = (item: NavItem) =>
    item.children?.some((child) => location.pathname.startsWith(child.to)) ?? false;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      navItems.forEach((item) => {
        if (hasActiveChild(item)) next.add(item.to);
      });
      return next;
    });
  }, [location.pathname]);

  const isParentActive = (item: NavItem) =>
    location.pathname.startsWith(item.to) || hasActiveChild(item);

  const toggleParent = (item: NavItem) => {
    if (!item.children?.length) {
      navigate(item.to);
      return;
    }

    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(item.to)) next.delete(item.to);
      else next.add(item.to);
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
        {navItems.map((item) => {
          const isExpanded = expanded.has(item.to);
          const parentActive = isParentActive(item);

          if (!item.children?.length) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `hr-nav-link ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <i className={item.icon} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          }

          return (
            <div key={item.to} className="hr-nav-group">
              <button
                type="button"
                className={`hr-nav-link hr-nav-group-toggle ${parentActive ? 'active' : ''}`}
                onClick={() => toggleParent(item)}
                title={collapsed ? item.label : undefined}
              >
                <i className={item.icon} />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <i
                      className={`bi ${
                        isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'
                      } hr-submenu-caret`}
                    />
                  </>
                )}
              </button>

              {!collapsed && isExpanded && (
                <div className="hr-submenu">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end={child.end}
                      className={({ isActive }) =>
                        `hr-submenu-link ${isActive ? 'active' : ''}`
                      }
                    >
                      <i className={child.icon} />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
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
 */






/* Sidebar.tsx
   Why this file is fixed:
   - Removes broken/old commented code that caused Vite parse error.
   - Keeps your existing HR/admin sidebar structure.
   - Removes old One-on-One > PIP Updates from the sidebar.
   - Adds separate PIP dropdown:
       PIP
         Create
         Past Plans
   - HR/Admin only sees Past Plans because HR cannot create/update PIP.
*/

import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  variant?: 'admin' | 'hr';
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  children?: NavItem[];
};

const normalizeRoleName = (role: string) =>
  role
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const Sidebar = ({ collapsed, onToggle, variant }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStorage.getUser();

  const dashboard = user?.dashboard ?? '';
  const normalizedRoles = (user?.roles ?? []).map(normalizeRoleName);

  const isAdmin =
    normalizedRoles.includes('ADMIN') ||
    dashboard === 'ADMIN_DASHBOARD';

  const isEmployee =
    normalizedRoles.includes('EMPLOYEE') ||
    dashboard === 'EMPLOYEE_DASHBOARD';

  const isHrOnly =
    normalizedRoles.includes('HR') ||
    dashboard === 'HR_DASHBOARD' ||
    dashboard === 'ADMIN_DASHBOARD' ||
    variant === 'hr' ||
    variant === 'admin';

  const canCreatePip =
    !isHrOnly &&
    !isEmployee;

  const roleLabel =
    variant === 'admin'
      ? 'Admin'
      : variant === 'hr'
      ? 'HR'
      : isAdmin
      ? 'Admin'
      : dashboard === 'EMPLOYEE_DASHBOARD'
      ? 'Employee'
      : dashboard === 'HR_DASHBOARD'
      ? 'HR'
      : dashboard === 'MANAGER_DASHBOARD'
      ? 'Manager'
      : dashboard === 'DEPARTMENT_HEAD_DASHBOARD'
      ? 'Department Head'
      : dashboard === 'EXECUTIVE_DASHBOARD'
      ? 'Executive'
      : 'User';

  const pipChildren: NavItem[] = canCreatePip
    ? [
        { to: '/pip/create', label: 'Create', icon: 'bi bi-plus-square' },
        { to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' },
      ]
    : [
        { to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' },
      ];

  const adminNavItems: NavItem[] = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: 'bi bi-shield-lock' },
    { to: '/admin/users', label: 'User Accounts', icon: 'bi bi-person-plus' },
    { to: '/admin/employee/import', label: 'Import Accounts', icon: 'bi bi-upload' },
    {
      to: '/user-roles',
      label: 'Access Control',
      icon: 'bi bi-shield-lock',
      children: [
        { to: '/user-roles', label: 'User Roles', icon: 'bi bi-person-gear' },
        { to: '/role-permissions', label: 'Role Permissions', icon: 'bi bi-shield-check' },
        { to: '/permissions', label: 'Permissions', icon: 'bi bi-key' },
      ],
    },
    {
      to: '/pip',
      label: 'PIP',
      icon: 'bi bi-clipboard2-pulse',
      children: [{ to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' }],
    },
  ];

  const hrNavItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },

    {
      to: '/hr/team',
      label: 'Team Management',
      icon: 'bi bi-people',
      children: [
        { to: '/hr/team', label: 'Teams', icon: 'bi bi-people', end: true },
        { to: '/hr/team/create', label: 'Create Team', icon: 'bi bi-plus-circle' },
      ],
    },

    {
      to: '/hr/organization',
      label: 'Organization',
      icon: 'bi bi-building',
      children: [
        { to: '/hr/department', label: 'Departments', icon: 'bi bi-building' },
        { to: '/hr/employee', label: 'Employee', icon: 'bi bi-people', end: true },
        {
          to: '/hr/employee/workforce',
          label: 'Workforce overview',
          icon: 'bi bi-person-badge',
          end: true,
        },
        { to: '/hr/employee/import', label: 'Import Employees', icon: 'bi bi-upload' },
      ],
    },

    { to: '/hr/assessment-scores', label: 'Assessment Scores', icon: 'bi bi-clipboard-data' },

    {
      to: '/user-roles',
      label: 'Access Control',
      icon: 'bi bi-shield-lock',
      children: [
        { to: '/user-roles', label: 'User Roles', icon: 'bi bi-person-gear' },
        { to: '/role-permissions', label: 'Role Permissions', icon: 'bi bi-shield-check' },
        { to: '/permissions', label: 'Permissions', icon: 'bi bi-key' },
      ],
    },

    {
      to: '/one-on-one-meetings',
      label: 'One-on-One',
      icon: 'bi bi-chat-left-text',
      children: [
        { to: '/one-on-one-meetings', label: '1:1 Meetings', icon: 'bi bi-chat-dots' },
        { to: '/one-on-one-action-items', label: 'Action Items', icon: 'bi bi-list-check' },
      ],
    },

    {
      to: '/pip',
      label: 'PIP',
      icon: 'bi bi-clipboard2-pulse',
      children: pipChildren,
    },

    { to: '/notifications', label: 'Notifications', icon: 'bi bi-bell' },

    {
      to: '/hr/position/create',
      label: 'Positions',
      icon: 'bi bi-briefcase',
      children: [
        { to: '/hr/position/create', label: 'Create Position', icon: 'bi bi-briefcase' },
        { to: '/hr/position-level/create', label: 'Position Levels', icon: 'bi bi-diagram-3' },
        { to: '/hr/position/table', label: 'Positions Table', icon: 'bi bi-table' },
      ],
    },

    {
      to: '/hr/performance-kpi/unit',
      label: 'KPI Management',
      icon: 'bi bi-speedometer2',
      children: [
        { to: '/hr/performance-kpi/unit', label: 'KPI Units', icon: 'bi bi-speedometer2' },
        { to: '/hr/performance-kpi/category', label: 'KPI Categories', icon: 'bi bi-tags' },
        { to: '/hr/performance-kpi/item', label: 'KPI Items', icon: 'bi bi-card-checklist' },
        { to: '/hr/kpi-template', label: 'KPI Templates', icon: 'bi bi-ui-checks-grid' },
      ],
    },
  ];

  const employeeNavItems: NavItem[] = [
    { to: '/employee/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
    {
      to: '/pip',
      label: 'PIP',
      icon: 'bi bi-clipboard2-pulse',
      children: [
        { to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' },
      ],
    },
  ];

  const navItems: NavItem[] =
    variant === 'admin'
      ? adminNavItems
      : variant === 'hr'
      ? hrNavItems
      : isAdmin
      ? adminNavItems
      : isEmployee
      ? employeeNavItems
      : hrNavItems;

  const hasActiveChild = (item: NavItem) =>
    item.children?.some((child) => location.pathname.startsWith(child.to)) ?? false;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);

      navItems.forEach((item) => {
        if (hasActiveChild(item)) {
          next.add(item.to);
        }
      });

      return next;
    });
  }, [location.pathname, navItems]);

  const isParentActive = (item: NavItem) =>
    location.pathname.startsWith(item.to) || hasActiveChild(item);

  const toggleParent = (item: NavItem) => {
    if (!item.children?.length) {
      navigate(item.to);
      return;
    }

    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(item.to)) {
        next.delete(item.to);
      } else {
        next.add(item.to);
      }

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
        {navItems.map((item) => {
          const isExpanded = expanded.has(item.to);
          const parentActive = isParentActive(item);

          if (!item.children?.length) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `hr-nav-link ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <i className={item.icon} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          }

          return (
            <div key={item.to} className="hr-nav-group">
              <button
                type="button"
                className={`hr-nav-link hr-nav-group-toggle ${parentActive ? 'active' : ''}`}
                onClick={() => toggleParent(item)}
                title={collapsed ? item.label : undefined}
              >
                <i className={item.icon} />

                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <i
                      className={`bi ${
                        isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'
                      } hr-submenu-caret`}
                    />
                  </>
                )}
              </button>

              {!collapsed && isExpanded && (
                <div className="hr-submenu">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end={child.end}
                      className={({ isActive }) =>
                        `hr-submenu-link ${isActive ? 'active' : ''}`
                      }
                    >
                      <i className={child.icon} />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
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
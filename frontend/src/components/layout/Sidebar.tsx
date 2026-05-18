import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';
import SidebarCompanyLogo from './SidebarCompanyLogo';

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
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const Sidebar = ({ collapsed, onToggle, variant }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStorage.getUser();

  const dashboard = user?.dashboard ?? '';
  const normalizedRoles = (user?.roles ?? []).map(normalizeRoleName);
  const normalizedDashboard = normalizeRoleName(dashboard);

  const isAdmin =
    normalizedRoles.includes('ADMIN') ||
    normalizedDashboard === 'ADMIN_DASHBOARD';

  const isEmployee =
    normalizedRoles.includes('EMPLOYEE') ||
    normalizedDashboard === 'EMPLOYEE_DASHBOARD';

  const isHrOnly =
    normalizedRoles.includes('HR') ||
    normalizedDashboard === 'HR_DASHBOARD' ||
    normalizedDashboard === 'ADMIN_DASHBOARD' ||
    variant === 'hr' ||
    variant === 'admin';

  const canCreatePip = !isHrOnly && !isEmployee;

  const roleLabel =
    variant === 'admin'
      ? 'Admin'
      : variant === 'hr'
        ? 'HR'
        : isAdmin
          ? 'Admin'
          : normalizedDashboard === 'EMPLOYEE_DASHBOARD'
            ? 'Employee'
            : normalizedDashboard === 'HR_DASHBOARD'
              ? 'HR'
              : normalizedDashboard === 'MANAGER_DASHBOARD'
                ? 'Manager'
                : normalizedDashboard === 'DEPARTMENT_HEAD_DASHBOARD'
                  ? 'Department Head'
                  : normalizedDashboard === 'EXECUTIVE_DASHBOARD'
                    ? 'Executive'
                    : 'User';

  const navItems: NavItem[] = useMemo(() => {
    const pipChildren: NavItem[] = canCreatePip
      ? [
          { to: '/pip/create', label: 'Create', icon: 'bi bi-plus-square' },
          { to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' },
        ]
      : [{ to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' }];

    const adminNavItems: NavItem[] = [
      { to: '/admin/dashboard', label: 'Admin Dashboard', icon: 'bi bi-shield-lock' },
      { to: '/admin/users', label: 'User Accounts', icon: 'bi bi-person-plus' },
      { to: '/admin/employee/import', label: 'Import Accounts', icon: 'bi bi-upload' },
      { to: '/notifications', label: 'Notifications', icon: 'bi bi-bell' },
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
        label: 'Teams',
        icon: 'bi bi-people-fill',
        children: [
          { to: '/hr/team', label: 'Teams', icon: 'bi bi-people-fill', end: true },
          { to: '/hr/team/create', label: 'Create Team', icon: 'bi bi-plus-square', end: true },
          { to: '/hr/team/history', label: 'Team History', icon: 'bi bi-clock-history', end: true },
        ],
      },
      {
        to: '/hr/organization',
        label: 'Organization',
        icon: 'bi bi-building',
        children: [
          { to: '/hr/department', label: 'Departments', icon: 'bi bi-building' },
          {
            to: '/hr/department-comparison',
            label: 'Departments Comparison',
            icon: 'bi bi-columns-gap',
            end: true,
          },
          { to: '/hr/employee', label: 'Employee', icon: 'bi bi-people', end: true },
          {
            to: '/hr/employee/workforce',
            label: 'Workforce overview',
            icon: 'bi bi-person-badge',
            end: true,
          },
        ],
      },
      {
        to: '/hr/assessment-scores',
        label: 'Assessment',
        icon: 'bi bi-clipboard-data',
        children: [
          { to: '/hr/assessment-scores', label: 'Scores', icon: 'bi bi-clipboard-data', end: true },
          { to: '/hr/assessment-forms', label: 'Form Create', icon: 'bi bi-ui-checks-grid', end: true },
        ],
      },
      {
        to: '/hr/appraisal',
        label: 'Appraisals',
        icon: 'bi bi-clipboard-check',
        children: [
          { to: '/hr/appraisal', label: 'Appraisal Cycle Dashboard', icon: 'bi bi-speedometer2', end: true },
          { to: '/hr/appraisal/template-forms', label: 'Template Forms', icon: 'bi bi-folder2-open' },
          { to: '/hr/appraisal/cycles', label: 'Appraisal Cycles', icon: 'bi bi-calendar2-week' },
          { to: '/hr/appraisal/review-check', label: 'Manager + Dept Review Check', icon: 'bi bi-shield-check' },
        ],
      },
      { to: '/hr/feedback/dashboard', label: '360 Feedback', icon: 'bi bi-chat-square-dots' },
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
      { to: '/employee/kpis', label: 'My KPIs', icon: 'bi bi-bullseye' },
      { to: '/employee/appraisals', label: 'My Appraisals', icon: 'bi bi-clipboard-check' },
      { to: '/employee/self-assessment', label: 'Self-Assessment', icon: 'bi bi-pencil-square' },
      { to: '/employee/feedback', label: 'My Feedback', icon: 'bi bi-chat-dots' },
      { to: '/employee/one-on-ones', label: 'One-on-Ones', icon: 'bi bi-calendar-check' },
      {
        to: '/pip',
        label: 'PIP',
        icon: 'bi bi-clipboard2-pulse',
        children: [{ to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' }],
      },
      { to: '/employee/notifications', label: 'Notifications', icon: 'bi bi-bell' },
    ];

    if (variant === 'admin') return adminNavItems;
    if (variant === 'hr') return hrNavItems;
    if (isAdmin) return adminNavItems;
    if (isEmployee) return employeeNavItems;

    return hrNavItems;
  }, [variant, isAdmin, isEmployee, canCreatePip]);

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

      if (next.size === prev.size && [...next].every((value) => prev.has(value))) {
        return prev;
      }

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
          <SidebarCompanyLogo />

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
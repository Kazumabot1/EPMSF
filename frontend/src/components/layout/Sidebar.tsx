import { NavLink } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
};

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const user = authStorage.getUser();
  const dashboard = user?.dashboard ?? '';

  const roleLabel = (() => {
    switch (dashboard) {
      case 'EMPLOYEE_DASHBOARD':
        return 'Employee';
      case 'HR_DASHBOARD':
        return 'HR';
      case 'ADMIN_DASHBOARD':
        return 'Admin';
      case 'MANAGER_DASHBOARD':
        return 'Manager';
      case 'DEPARTMENT_HEAD_DASHBOARD':
        return 'Department Head';
      case 'EXECUTIVE_DASHBOARD':
        return 'Executive';
      default:
        return 'User';
    }
  })();

  const navItems: NavItem[] = (() => {
    switch (dashboard) {
      case 'EMPLOYEE_DASHBOARD':
        return [
          { to: '/employee/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
        ];

      case 'HR_DASHBOARD':
      case 'ADMIN_DASHBOARD':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
          { to: '/hr/team', label: 'Team Management', icon: 'bi bi-people' },
          { to: '/hr/department', label: 'Departments', icon: 'bi bi-building' },
          { to: '/user-roles', label: 'User Roles', icon: 'bi bi-person-gear' },
          { to: '/role-permissions', label: 'Role Permissions', icon: 'bi bi-shield-check' },
          { to: '/permissions', label: 'Permissions', icon: 'bi bi-key' },
          { to: '/notifications', label: 'Notifications', icon: 'bi bi-bell' },
          { to: '/pip-updates', label: 'PIP Updates', icon: 'bi bi-clipboard-check' },
          { to: '/one-on-one-meetings', label: '1:1 Meetings', icon: 'bi bi-chat-dots' },
          { to: '/one-on-one-action-items', label: 'Action Items', icon: 'bi bi-list-check' },
          { to: '/hr/position/create', label: 'Create Position', icon: 'bi bi-briefcase' },
          { to: '/hr/position-level/create', label: 'Position Levels', icon: 'bi bi-diagram-3' },
          { to: '/hr/position/table', label: 'Positions Table', icon: 'bi bi-table' },
          { to: '/hr/performance-kpi/unit', label: 'KPI Units', icon: 'bi bi-speedometer2' },
          { to: '/hr/performance-kpi/category', label: 'KPI Categories', icon: 'bi bi-tags' },
          { to: '/hr/performance-kpi/item', label: 'KPI Items', icon: 'bi bi-card-checklist' },
          { to: '/hr/performance-kpi/form', label: 'KPI Forms', icon: 'bi bi-ui-checks-grid' },
        ];

      case 'MANAGER_DASHBOARD':
        return [
          { to: '/manager/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
        ];

      case 'DEPARTMENT_HEAD_DASHBOARD':
        return [
          { to: '/department-head/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
        ];

      case 'EXECUTIVE_DASHBOARD':
        return [
          { to: '/executive/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
        ];

      default:
        return [
          { to: '/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
        ];
    }
  })();

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

        <button
          type="button"
          className="hr-collapse-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
        </button>
      </div>

      {!collapsed && (
        <div className="hr-role-chip">
          <small>CURRENT ROLE</small>
          <strong>{roleLabel}</strong>
        </div>
      )}

      <nav className="hr-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `hr-nav-link ${isActive ? 'active' : ''}`}
          >
            <i className={item.icon} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
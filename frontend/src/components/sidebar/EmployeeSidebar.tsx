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

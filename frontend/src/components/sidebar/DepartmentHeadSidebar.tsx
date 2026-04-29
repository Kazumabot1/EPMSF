import { NavLink } from 'react-router-dom';

interface DepartmentHeadSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const DepartmentHeadSidebar = ({
  collapsed,
  onToggleCollapse,
}: DepartmentHeadSidebarProps) => {
  return (
    <aside className={`employee-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="employee-sidebar-top">
        <div className="employee-brand">
          <div className="employee-brand-mark">
            <i className="bi bi-building-check" />
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
          <strong>Department Head</strong>
        </div>
      )}

      <nav className="employee-nav">
        <NavLink
          to="/department-head/dashboard"
          end
          title={collapsed ? 'Department Dashboard' : undefined}
          className={({ isActive }) =>
            `employee-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
          }
        >
          <i className="bi bi-building-check" />
          {!collapsed && <span>Department Dashboard</span>}
        </NavLink>
      </nav>

      <div className="employee-sidebar-footer">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="employee-sidebar-collapse"
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default DepartmentHeadSidebar;
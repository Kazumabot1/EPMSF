import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
  children?: Array<{ to: string; label: string; icon: string }>;
};

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2' },
  {
    to: '/hr/team',
    label: 'Employee Management',
    icon: 'bi-people',
    children: [
      { to: '/hr/team', label: 'Teams', icon: 'bi-diagram-3' },
      { to: '/hr/employee', label: 'Employees', icon: 'bi-person' },
      { to: '/hr/department', label: 'Department', icon: 'bi-building' },
      
    ],
  },
  {
    to: '/permissions',
    label: 'Performance',
    icon: 'bi-bullseye',
    children: [
      { to: '/permissions', label: 'KPIs', icon: 'bi-graph-up' },
      { to: '/pip-updates', label: 'PIP Updates', icon: 'bi-exclamation-triangle' },
    ],
  },
  {
    to: '/hr/position',
    label: 'Position',
    icon: 'bi-briefcase',
    children: [
      { to: '/hr/position/create', label: 'Position Create', icon: 'bi-plus-circle' },
      { to: '/hr/position-level/create', label: 'Position Level Create', icon: 'bi-layers' },
      { to: '/hr/position/table', label: 'Position Table', icon: 'bi-table' },
    ],
  },
  {
    to: '/hr/performance-kpi',
    label: 'Performance KPI',
    icon: 'bi-clipboard-data',
    children: [
      { to: '/hr/performance-kpi/unit', label: 'KPI Unit', icon: 'bi-rulers' },
      { to: '/hr/performance-kpi/category', label: 'KPI Category', icon: 'bi-tags' },
      { to: '/hr/performance-kpi/item', label: 'KPI Item', icon: 'bi-list-check' },
      { to: '/hr/performance-kpi/form', label: 'KPI Form', icon: 'bi-table' },
    ],
  },
  {
    to: '/one-on-one-meetings',
    label: 'Appraisals',
    icon: 'bi-clipboard-check',
    children: [
      { to: '/one-on-one-meetings', label: 'Meetings', icon: 'bi-calendar-check' },
      { to: '/one-on-one-action-items', label: 'Action Items', icon: 'bi-list-check' },
    ],
  },
  { to: '/notifications', label: '360 Feedback', icon: 'bi-chat-dots' },
  { to: '/pip-updates', label: 'PIP Management', icon: 'bi-exclamation-triangle' },
  { to: '/one-on-one-meetings', label: 'Reports', icon: 'bi-file-earmark-bar-graph' },
  { to: '/notifications', label: 'Notifications', icon: 'bi-bell' },
];

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    '/hr/team': false,
    '/permissions': false,
    '/hr/position': false,
    '/hr/performance-kpi': false,
    '/one-on-one-meetings': false,
  });

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const activeParent = navItems.find((item) =>
      item.children?.some((child) => location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)),
    );

    if (activeParent) {
      setOpenMenus((prev) => ({ ...prev, [activeParent.to]: true }));
    }
  }, [location.pathname]);

  return (
    <aside className={`hr-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="hr-sidebar-brand">
        <div className="hr-sidebar-logo">HR</div>
        {!collapsed && (
          <div>
            <h1>EPMS</h1>
            <p>PERFORMANCE</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="hr-role-chip">
          <small>CURRENT ROLE</small>
          <strong>Hr</strong>
        </div>
      )}

      <nav className="hr-sidebar-nav">
        {navItems.map((item) => {
          const hasChildren = !!item.children?.length;
          const childActive = item.children?.some(
            (child) => location.pathname === child.to || location.pathname.startsWith(`${child.to}/`),
          );

          if (hasChildren && !collapsed) {
            return (
              <div key={item.label}>
                <button
                  type="button"
                  className={`hr-nav-item hr-nav-button ${childActive ? 'active' : ''}`}
                  onClick={() => {
                    toggleMenu(item.to);
                    if (item.to === '/hr/team') {
                      navigate('/hr/team');
                    }
                  }}
                >
                  <i className={`bi ${item.icon}`} />
                  <span className="hr-nav-label">{item.label}</span>
                  <i className={`bi ${openMenus[item.to] ? 'bi-chevron-down' : 'bi-chevron-right'} hr-submenu-caret`} />
                </button>

                {openMenus[item.to] && (
                  <div className="hr-submenu">
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) => `hr-submenu-item ${isActive ? 'active' : ''}`}
                      >
                        <i className={`bi ${child.icon}`} />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => `hr-nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <i className={`bi ${item.icon}`} />
              {!collapsed && <span className="hr-nav-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        className={`hr-sidebar-collapse hr-icon-button ${collapsed ? 'collapsed' : ''}`}
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
};

export default Sidebar;

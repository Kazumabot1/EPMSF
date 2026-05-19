import { useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resolveUserRole } from '../config/roleNavigation';
import RoleBasedHeader from './RoleBasedHeader';
import RoleBasedSidebar from './RoleBasedSidebar';
import './app-layout.css';
import '../components/layout/hr-layout.css';

const AppLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const role = useMemo(() => resolveUserRole(user), [user]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const usesHrShell = role === 'HR';
  const contentOffsetClass = usesHrShell ? '' : collapsed ? 'employee-collapsed' : '';
  const shellClassName = usesHrShell ? 'hr-shell' : `app-shell ${contentOffsetClass}`;

  return (
    <div className={shellClassName}>
      <RoleBasedSidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      <RoleBasedHeader
        role={role}
        collapsed={collapsed}
        user={user}
      />

      {usesHrShell ? (
        <main className={`hr-content ${collapsed ? 'collapsed' : ''}`}>
          <div className="hr-content-inner">
            <Outlet key={location.pathname} />
          </div>
        </main>
      ) : (
        <main className="app-main app-main-employee">
          <div className="app-content-employee">
            <Outlet key={location.pathname} />
          </div>
        </main>
      )}
    </div>
  );
};

export default AppLayout;
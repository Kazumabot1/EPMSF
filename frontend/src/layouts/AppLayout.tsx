import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resolveUserRole } from '../config/roleNavigation';
import toast from 'react-hot-toast';
import RoleBasedHeader from './RoleBasedHeader';
import RoleBasedSidebar from './RoleBasedSidebar';
import './app-layout.css';
import '../components/layout/hr-layout.css';

const AppLayout = () => {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const role = useMemo(() => resolveUserRole(user), [user]);
    const permissionDeniedMessage = (location.state as { permissionDeniedMessage?: string } | null)?.permissionDeniedMessage;

    useEffect(() => {
        if (!permissionDeniedMessage) return;

        toast.error(permissionDeniedMessage, {
            duration: 5500,
            icon: '🔒',
            style: {
                borderRadius: '16px',
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1e3a8a',
                fontWeight: 600,
                maxWidth: '420px',
            },
        });

        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, navigate, permissionDeniedMessage]);

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    const usesHrShell = role === 'HR' || role === 'Admin';
    const roleClassName = role === 'DepartmentHead' ? 'app-shell--department-head' : `app-shell--${role.toLowerCase()}`;
    const contentOffsetClass = usesHrShell ? '' : collapsed ? 'employee-collapsed' : '';
    const shellClassName = usesHrShell
        ? `hr-shell hr-shell--${role.toLowerCase()}`
        : `app-shell ${roleClassName} ${contentOffsetClass}`;

    return (
        <div className={shellClassName}>
            <RoleBasedSidebar
                role={role}
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed((prev) => !prev)}
            />

            <RoleBasedHeader role={role} collapsed={collapsed} user={user} />

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
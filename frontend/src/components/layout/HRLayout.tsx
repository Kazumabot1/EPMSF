import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';
import Header from './Header';
import Sidebar from './Sidebar';
import './hr-layout.css';

const HRLayout = () => {
  const user = authStorage.getUser();
  const [collapsed, setCollapsed] = useState(false);

  if (!user || !authStorage.getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="hr-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <Header collapsed={collapsed} />
      <main className={`hr-content ${collapsed ? 'collapsed' : ''}`}>
        <div className="hr-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default HRLayout;
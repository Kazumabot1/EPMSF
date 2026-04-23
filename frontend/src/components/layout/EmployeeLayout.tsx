import { Navigate, Outlet } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';
import './employee-layout.css';

const EmployeeLayout = () => {
  const user = authStorage.getUser();
  const token = authStorage.getAccessToken();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (user.dashboard !== 'EMPLOYEE_DASHBOARD') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="employee-layout">
      <header className="employee-layout-header">
        <div>
          <div className="employee-layout-badge">EPMS</div>
          <h1>Employee Dashboard</h1>
          <p>Welcome back, {user.fullName || 'Employee'}.</p>
        </div>

        <button
          className="employee-layout-logout"
          onClick={() => {
            authStorage.clearSession();
            window.location.href = '/login';
          }}
        >
          Logout
        </button>
      </header>

      <main className="employee-layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default EmployeeLayout;
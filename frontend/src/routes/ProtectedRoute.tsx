import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { resolveUserRole } from '../../config/roleNavigation';
import type { ApiEnvelope, AuthResponse } from '../../types/auth';
import './force-change-password.css';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message || response?.data?.error || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

const resolveRoute = (dashboard?: string) => {
  switch (dashboard) {
    case 'EMPLOYEE_DASHBOARD':
      return '/employee/dashboard';
    case 'MANAGER_DASHBOARD':
      return '/manager/dashboard';
    case 'DEPARTMENT_HEAD_DASHBOARD':
      return '/department-head/dashboard';
    case 'EXECUTIVE_DASHBOARD':
      return '/executive/dashboard';
    case 'ADMIN_DASHBOARD':
    case 'HR_DASHBOARD':
    default:
      return '/dashboard';
  }
};

const ForceChangePasswordPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const currentRole = resolveUserRole(user);
  const currentRoleLabel = currentRole === 'DepartmentHead' ? 'Department Head Dashboard' : `${currentRole} Dashboard`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user?.email) {
      setError('Login session is missing. Please sign in again.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/change-password', { currentPassword, newPassword });

      const loginResponse = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', {
        email: user.email,
        password: newPassword,
      });
      const payload = loginResponse.data.data;
      if (!payload?.accessToken || !payload?.refreshToken) {
        throw new Error('Password changed, but login refresh failed. Please sign in again.');
      }

      login(payload);
      navigate(resolveRoute(payload.dashboard), { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to change password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="force-password-screen">
      <div className="force-password-overlay" />
      <div className="force-password-modal" role="dialog" aria-modal="true" aria-labelledby="force-password-title">
        <div className="force-password-icon">
          <i className="bi bi-shield-lock" />
        </div>
        <h1 id="force-password-title">Change Temporary Password</h1>
        <p>
          For security, please update your temporary password before continuing to your {currentRoleLabel}.
        </p>

        <form onSubmit={handleSubmit} className="force-password-form">
          <input
            type="password"
            className="force-password-input"
            placeholder="Current temporary password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="force-password-input"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="force-password-input"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className="force-password-error">{error}</p>}
          <button type="submit" className="force-password-submit" disabled={loading}>
            {loading ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForceChangePasswordPage;

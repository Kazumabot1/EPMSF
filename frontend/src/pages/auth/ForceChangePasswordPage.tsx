import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ForceChangePasswordPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    try {
      setLoading(true);
      await api.post('/auth/change-password', { currentPassword, newPassword });
      if (user) {
        login({
          accessToken: localStorage.getItem('epmsAccessToken') || '',
          refreshToken: localStorage.getItem('epmsRefreshToken') || '',
          tokenType: 'Bearer',
          expiresIn: 3600,
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          employeeCode: user.employeeCode,
          position: user.position,
          roles: user.roles,
          permissions: user.permissions,
          dashboard: user.dashboard,
          mustChangePassword: false,
        });
      }
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6 border border-slate-100">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Change your temporary password</h1>
        <p className="text-sm text-slate-600 mb-4">
          You must change your password before using the dashboard.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            className="w-full border rounded-lg p-2"
            placeholder="Current temporary password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full border rounded-lg p-2"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full border rounded-lg p-2"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForceChangePasswordPage;

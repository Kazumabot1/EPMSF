import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { ApiEnvelope, AuthResponse } from '../types/auth';
import './login.css';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

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

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', {
        email: email.trim(),
        password,
      });

      const payload = res.data.data;

      if (!payload?.accessToken || !payload?.refreshToken) {
        throw new Error('Login response did not include tokens.');
      }

      login(payload);
      navigate(payload.mustChangePassword ? '/change-password' : resolveRoute(payload.dashboard), { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Login failed. Please check your email/password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-header">
          <div className="login-badge">EPMS</div>
          <h2>Welcome Back</h2>
          <p>Sign in to continue to your dashboard.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <label className="login-label" htmlFor="email">
            Email
          </label>

          <input
            id="email"
            className="login-input"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="login-label" htmlFor="password">
            Password
          </label>

          <input
            id="password"
            className="login-input"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">
          No account yet? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
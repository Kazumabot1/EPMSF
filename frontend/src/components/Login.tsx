import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authStorage } from '../services/authStorage';
import type { ApiEnvelope, AuthResponse } from '../types/auth';
import './login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const resolveRoute = (dashboard?: string) => {
    switch (dashboard) {
      case 'HR_DASHBOARD':
        return '/';
      case 'ADMIN_DASHBOARD':
        return '/';
      case 'MANAGER_DASHBOARD':
        return '/';
      case 'DEPARTMENT_HEAD_DASHBOARD':
        return '/';
      case 'EXECUTIVE_DASHBOARD':
        return '/';
      case 'EMPLOYEE_DASHBOARD':
        return '/';
      default:
        return '/';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await axios.post<ApiEnvelope<AuthResponse>>(
        'http://localhost:8081/api/auth/login',
        {
          email,
          password,
        }
      );

      const payload = res.data.data;
      authStorage.setSession(payload);
      navigate(resolveRoute(payload.dashboard), { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Login failed'
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
          <label className="login-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="login-input"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="login-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="login-input"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
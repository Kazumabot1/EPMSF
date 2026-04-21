import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.post('/api/auth/login', {
        email,
        password,
      });

      localStorage.setItem('epmsUserEmail', res.data.email);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
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
          <p>Sign in to continue to your HR dashboard.</p>
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
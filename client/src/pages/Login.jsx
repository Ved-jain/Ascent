import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import './Auth.css';

/**
 * Login Component.
 * Provides a clean form for user authentication. Displays error feedback and loading states.
 */
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); // clear error when user starts typing again
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Submit credentials to the server
      const data = await api.login(form);
      // Update the central AuthContext state
      login(data.token, data.user);
      // Redirect to home dashboard
      navigate('/');
    } catch (err) {
      console.error('Login request failed:', err);
      setError(err.response?.data?.error || 'Login failed. Please verify credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-brand">
          <h1 className="auth-title" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent)' }}>
            Ascent
          </h1>
        </div>

        <p className="auth-subtitle">
          Sign in to access your Codeforces dashboard and track your growth.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-msg" style={{ marginBottom: '8px' }}>{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input"
              placeholder="Enter your username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
            style={{ marginTop: '12px' }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <hr className="divider" style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

        <p className="auth-switch">
          New to Ascent?{' '}
          <Link to="/register" className="auth-link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

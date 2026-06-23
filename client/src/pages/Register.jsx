import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import './Auth.css';

/**
 * Register Component.
 * Standard user registration page with option to input Codeforces handle at start.
 */
export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: '',
    password: '',
    codeforcesHandle: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Username and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Register user on the backend
      const data = await api.register({
        username: form.username.trim(),
        password: form.password,
        codeforcesHandle: form.codeforcesHandle.trim()
      });
      // Authenticate user right away on successful signup
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || 'Registration failed. Username might be taken.');
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
          Track your learning and Codeforces journey relative to your friends.
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
              placeholder="Choose a username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
              minLength={3}
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="codeforcesHandle">
              Codeforces Handle <span className="label-optional">(optional)</span>
            </label>
            <input
              id="codeforcesHandle"
              name="codeforcesHandle"
              type="text"
              className="form-input"
              placeholder="e.g. tourist"
              value={form.codeforcesHandle}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
            style={{ marginTop: '12px' }}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <hr className="divider" style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

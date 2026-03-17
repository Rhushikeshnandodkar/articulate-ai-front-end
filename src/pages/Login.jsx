import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, clearError, fetchUser } from '../store/slices/authSlice';
import { getProfile } from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(loginUser({ username, password }));
    if (loginUser.fulfilled.match(result)) {
      await dispatch(fetchUser());
      try {
        const profile = await getProfile();
        if (!profile.has_completed_profile) {
          navigate('/profile-setup', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (_) {
        navigate('/profile-setup', { replace: true });
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <div>
            <div className="auth-brand">
              <div className="auth-logo-circle">ai</div>
              <div className="auth-brand-text">
                <span className="auth-brand-name">articulate.ai</span>
                <span className="auth-brand-sub">Voice communication coach</span>
              </div>
            </div>
            <h1 className="auth-card-title">Welcome back</h1>
            <p className="auth-card-subtitle">Sign in to continue your practice.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="auth-error">
            {Array.isArray(error) ? error.join(' ') : typeof error === 'object' ? JSON.stringify(error) : String(error)}
          </div>
        )}
        <div className="auth-field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="login-password">Password</label>
          <div className="auth-field-input-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        <div className="auth-actions">
          <button type="submit" className="auth-primary-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
      <p>
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
      </div>
    </div>
  );
}

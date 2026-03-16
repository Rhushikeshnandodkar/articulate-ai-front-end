import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, clearError } from '../store/slices/authSlice';

export default function Signup() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, {
        replace: true,
        state: {
          email: form.email,
          username: form.username,
          password: form.password,
        },
      });
    }
  };

  const formatError = (err) => {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (Array.isArray(err)) return err.join(' ');
    if (typeof err === 'object') {
      return Object.entries(err)
        .map(([k, v]) => (Array.isArray(v) ? v.join(', ') : v))
        .join(' ');
    }
    return String(err);
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
            <h1 className="auth-card-title">Create your account</h1>
            <p className="auth-card-subtitle">Join articulate.ai and start practicing.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{formatError(error)}</div>}
          <div className="auth-field">
            <label htmlFor="signup-username">Username</label>
            <input
              id="signup-username"
              type="text"
              name="username"
              placeholder="Choose a username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              name="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <div className="auth-field-input-wrap">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
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
          <div className="auth-field">
            <label htmlFor="signup-password2">Confirm password</label>
            <div className="auth-field-input-wrap">
              <input
                id="signup-password2"
                type={showPassword2 ? 'text' : 'password'}
                name="password2"
                placeholder="Confirm your password"
                value={form.password2}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword2((v) => !v)}
                aria-label={showPassword2 ? 'Hide password' : 'Show password'}
              >
                {showPassword2 ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <div className="auth-actions">
            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

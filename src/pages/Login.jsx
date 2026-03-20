import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, clearError, fetchUser } from '../store/slices/authSlice';
import { getProfile } from '../services/api';
import AuthLogo from '../components/AuthLogo';

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
    } else {
      const err = result.payload;
      if (err?.error === 'email_not_verified' && err?.email) {
        sessionStorage.setItem('signup_username', username);
        sessionStorage.setItem('signup_password', password);
        navigate(`/verify-email?email=${encodeURIComponent(err.email)}`, { replace: true });
      }
    }
  };

  return (
    <div className="auth-page min-h-screen flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="auth-card w-full max-w-md md:max-w-xl rounded-2xl overflow-hidden border border-white/20 backdrop-blur-2xl bg-gray-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="auth-card-header">
          <div className="space-y-1">
            <div className="auth-brand flex items-center gap-3">
              <div className="auth-logo-wrap flex-shrink-0 ring-2 ring-[#A7ED02]/30 rounded-lg">
                <AuthLogo className="auth-logo-icon" />
              </div>
              <div className="auth-brand-text">
            <span className="auth-brand-name text-base md:text-lg font-bold tracking-tight">articulate.ai</span>
            <span className="auth-brand-sub text-[0.625rem] md:text-xs block mt-0.5">Voice communication coach</span>
              </div>
            </div>
            <h1 className="auth-card-title text-xl md:text-2xl font-bold tracking-tight mt-4">Welcome back</h1>
            <p className="auth-card-subtitle text-xs md:text-sm">Sign in to continue your practice.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="auth-error rounded-lg text-sm">
            {Array.isArray(error) ? error.join(' ') : typeof error === 'object' ? JSON.stringify(error) : String(error)}
          </div>
        )}
        <div className="auth-field">
          <label htmlFor="login-username" className="text-xs md:text-sm font-medium">Username</label>
          <input
            id="login-username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="rounded-lg transition-shadow focus:ring-2 focus:ring-[#A7ED02]/40"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="login-password" className="text-xs md:text-sm font-medium">Password</label>
          <div className="auth-field-input-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-lg transition-shadow focus:ring-2 focus:ring-[#A7ED02]/40"
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
          <button type="submit" className="auth-primary-btn rounded-lg font-semibold transition-all hover:opacity-95 active:scale-[0.99]" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
      <p className="text-center text-xs md:text-sm mt-5">
        Don't have an account? <Link to="/signup" className="text-[#A7ED02] font-medium hover:underline">Sign up</Link>
      </p>
      </div>
    </div>
  );
}

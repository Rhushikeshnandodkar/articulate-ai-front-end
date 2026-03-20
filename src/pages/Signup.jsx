import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';
import AuthLogo from '../components/AuthLogo';
import { Mic, BarChart3, Sparkles } from 'lucide-react';

export default function Signup() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const goToVerify = () => {
    sessionStorage.setItem('signup_username', form.username);
    sessionStorage.setItem('signup_password', form.password);
    navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      goToVerify();
    } catch (err) {
      setError(err);
      setLoading(false);
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
    <div className="auth-page min-h-screen flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="auth-card w-full max-w-md md:max-w-xl rounded-2xl overflow-hidden border border-white/20 backdrop-blur-2xl bg-gray-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="auth-card-header">
          <div className="space-y-1">
            <div className="auth-brand flex items-center gap-3">
              <div className="auth-logo-wrap flex-shrink-0 ring-2 ring-[#A7ED02]/30 rounded-lg">
                <AuthLogo className="auth-logo-icon" />
              </div>
              <div className="auth-brand-text">
                <span className="auth-brand-name text-base md:text-lg font-bold tracking-tight">articulate<span className="text-[#A7ED02]">.ai</span></span>
                <span className="auth-brand-sub text-[0.625rem] md:text-xs block mt-0.5">Voice communication coach</span>
              </div>
            </div>
            <h1 className="auth-card-title text-xl md:text-2xl font-bold tracking-tight mt-4">Create your account</h1>
            <p className="auth-card-subtitle text-xs md:text-sm">You're one step away from improving your communication skills with AI-powered practice.</p>
            <div className="flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-700/50">
              <span className="inline-flex items-center gap-1 text-[0.65rem] md:text-xs text-gray-500">
                <Mic size={12} className="text-[#A7ED02] flex-shrink-0" /> AI voice practice
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] md:text-xs text-gray-500">
                <BarChart3 size={12} className="text-[#A7ED02] flex-shrink-0" /> Real-time feedback
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] md:text-xs text-gray-500">
                <Sparkles size={12} className="text-[#A7ED02] flex-shrink-0" /> Free to start
              </span>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error rounded-lg text-sm">{formatError(error)}</div>}
          <div className="auth-field">
            <label htmlFor="signup-username" className="text-xs md:text-sm font-medium">Username</label>
            <input
              id="signup-username"
              type="text"
              name="username"
              placeholder="Choose a username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
              className="rounded-lg transition-shadow focus:ring-2 focus:ring-[#A7ED02]/40"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-email" className="text-xs md:text-sm font-medium">Email</label>
            <input
              id="signup-email"
              type="email"
              name="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="rounded-lg transition-shadow focus:ring-2 focus:ring-[#A7ED02]/40"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-password" className="text-xs md:text-sm font-medium">Password</label>
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
          <div className="auth-field">
            <label htmlFor="signup-password2" className="text-xs md:text-sm font-medium">Confirm password</label>
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
                className="rounded-lg transition-shadow focus:ring-2 focus:ring-[#A7ED02]/40"
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
            <button type="submit" className="auth-primary-btn rounded-lg font-semibold transition-all hover:opacity-95 active:scale-[0.99]" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
        <p className="text-center text-xs md:text-sm mt-5">
          Already have an account? <Link to="/login" className="text-[#A7ED02] font-medium hover:underline">Log in</Link>
        </p>
        <p className="text-center text-[0.65rem] md:text-xs text-gray-500 mt-2 md:mt-3 leading-snug">
          By signing up, you agree to our terms of service. Your first practice session is free — no credit card required.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, clearError, fetchUser } from '../store/slices/authSlice';
import { getProfile } from '../services/api';
import AuthLogo from '../components/AuthLogo';
import AuthPasswordInput from '../components/AuthPasswordInput';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-[rgb(10,10,10)] text-white flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-md bg-[rgb(26,26,26)] border border-white/10 rounded-lg md:rounded-2xl p-8 shadow-xl backdrop-blur-sm">
        {/* LOGO */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <AuthLogo className="w-8 h-8 text-primary" />
          <span className="text-xl font-semibold">
            articulate<span className="text-primary">.ai</span>
          </span>
        </div>

        {/* HEADING */}
        <h2 className="text-2xl font-bold text-center">
          Welcome back
        </h2>

        <p className="text-gray-400 text-sm text-center mt-2">
          Sign in to continue your practice
        </p>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="p-3 rounded md:rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formatError(error)}
            </div>
          )}

          {/* USERNAME */}
          <div>
            <label className="text-sm text-gray-300">Username</label>
            <input
              type="text"
              name="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full mt-1 px-4 py-3 bg-[rgb(26,26,26)] border border-white/10 rounded md:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 text-sm text-white placeholder-gray-500"
            />
          </div>

          <AuthPasswordInput
            label="Password"
            id="login-password"
            name="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-slate font-medium py-3 rounded md:rounded-md transition"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* SIGNUP LINK */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:text-secondary transition-colors font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

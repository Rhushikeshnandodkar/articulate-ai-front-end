import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';
import AuthLogo from '../components/AuthLogo';
import AuthPasswordInput from '../components/AuthPasswordInput';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Signup() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
      await register({ ...form, password2: form.password });
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
          Create your account
        </h2>

        <p className="text-gray-400 text-sm text-center mt-2">
          Start your journey to confident communication
        </p>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <>
            <div className="mt-6">
              <GoogleSignInButton />
            </div>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[rgb(26,26,26)] px-3 text-gray-500">or sign up with email</span>
              </div>
            </div>
          </>
        )}

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
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
              className="w-full mt-1 px-4 py-3 bg-[rgb(26,26,26)] border border-white/10 rounded md:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 text-sm text-white placeholder-gray-500"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm text-gray-300">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="w-full mt-1 px-4 py-3 bg-[rgb(26,26,26)] border border-white/10 rounded md:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 text-sm text-white placeholder-gray-500"
            />
          </div>

          <AuthPasswordInput
            label="Password"
            id="signup-password"
            name="password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-slate font-medium py-3 rounded md:rounded-md transition"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* LOGIN LINK */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:text-secondary transition-colors font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

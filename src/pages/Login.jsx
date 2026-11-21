import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, clearError, fetchUser } from '../store/slices/authSlice';
import { getProfile } from '../services/api';
import AuthLayout from '../components/AuthLayout';
import AuthPasswordInput from '../components/AuthPasswordInput';
import GoogleSignInButton from '../components/GoogleSignInButton';
import FormError, { formatApiError } from '../components/FormError';

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
        navigate(profile.has_completed_profile ? '/dashboard' : '/profile-setup', { replace: true });
      } catch {
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

  const hasGoogle = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your practice."
      footer={<>New to articulate.ai? <Link to="/signup">Create an account</Link></>}
    >
      {hasGoogle && (
        <div className="auth-google">
          <GoogleSignInButton />
          <div className="ui-divider-text">or log in with email</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ui-form" style={hasGoogle ? { marginTop: 16 } : undefined}>
        <div className="ui-field">
          <label className="ui-label" htmlFor="login-username">Email or username</label>
          <input
            id="login-username"
            type="text"
            name="username"
            className="ui-input ui-input-lg"
            placeholder="you@example.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <AuthPasswordInput
          label="Password"
          id="login-password"
          name="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <FormError message={error ? formatApiError(error) : ''} />

        <button type="submit" disabled={loading} className="ui-btn ui-btn-primary ui-btn-block">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}

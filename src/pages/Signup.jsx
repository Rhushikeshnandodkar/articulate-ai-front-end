import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';
import AuthLayout from '../components/AuthLayout';
import AuthPasswordInput from '../components/AuthPasswordInput';
import GoogleSignInButton from '../components/GoogleSignInButton';
import FormError, { formatApiError } from '../components/FormError';

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ ...form, password2: form.password });
      sessionStorage.setItem('signup_username', form.username);
      sessionStorage.setItem('signup_password', form.password);
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, { replace: true });
    } catch (err) {
      setError(formatApiError(err, 'Could not create your account. Please try again.'));
      setLoading(false);
    }
  };

  const hasGoogle = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free to start. Your first sessions are on us."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      {hasGoogle && (
        <div className="auth-google">
          <GoogleSignInButton />
          <div className="ui-divider-text">or sign up with email</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ui-form" style={hasGoogle ? { marginTop: 16 } : undefined}>
        <div className="ui-field">
          <label className="ui-label" htmlFor="signup-username">Username</label>
          <input id="signup-username" type="text" name="username" className="ui-input ui-input-lg" placeholder="Pick a username" value={form.username} onChange={handleChange} required autoComplete="username" />
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="signup-email">Email</label>
          <input id="signup-email" type="email" name="email" className="ui-input ui-input-lg" placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
        </div>
        <AuthPasswordInput
          label="Password"
          id="signup-password"
          name="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={handleChange}
          required
          autoComplete="new-password"
        />

        <FormError message={error} />

        <button type="submit" disabled={loading} className="ui-btn ui-btn-primary ui-btn-block">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p className="ui-hint" style={{ textAlign: 'center' }}>
          By creating an account you agree to our <Link to="/terms">Terms</Link>, <Link to="/privacy">Privacy Policy</Link> and{' '}
          <Link to="/refund-policy">Refund Policy</Link>. We&apos;ll email you a 6-digit code to confirm your address.
        </p>
      </form>
    </AuthLayout>
  );
}

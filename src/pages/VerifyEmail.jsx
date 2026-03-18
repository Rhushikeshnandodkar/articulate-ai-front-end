import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { verifyEmailOtp, resendEmailOtp } from '../services/api';
import { loginUser } from '../store/slices/authSlice';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialEmail = searchParams.get('email') || '';
  const savedUsername = sessionStorage.getItem('signup_username') || location.state?.username || '';
  const savedPassword = sessionStorage.getItem('signup_password') || location.state?.password || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { loading: authLoading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!email || !otp) {
      setError('Enter your email and the code we sent you.');
      return;
    }
    setLoading(true);
    try {
      await verifyEmailOtp({ email, otp });
      setSuccess(true);
      if (savedUsername && savedPassword) {
        const result = await dispatch(loginUser({ username: savedUsername, password: savedPassword }));
        sessionStorage.removeItem('signup_username');
        sessionStorage.removeItem('signup_password');
        if (loginUser.fulfilled.match(result)) {
          navigate('/profile-setup', { replace: true });
          return;
        }
      }
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.error || err?.detail || 'Could not verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendMessage('');
    if (!email) {
      setError('Enter your email first so we know where to send the code.');
      return;
    }
    setLoading(true);
    try {
      const res = await resendEmailOtp({ email });
      setResendMessage(res?.message || 'A new code has been sent to your email.');
    } catch (err) {
      setError(err?.error || err?.detail || 'Could not resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-otp">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-circle">ai</div>
          <div className="auth-brand-text">
            <span className="auth-brand-name">articulate.ai</span>
            <span className="auth-brand-sub">Voice communication coach</span>
          </div>
        </div>
        <h1 className="auth-title">Verify your email</h1>
        <p className="auth-subtitle">
          We&apos;ve sent a 6‑digit code to your email. Enter it below to activate your account.
        </p>
        <form onSubmit={handleSubmit} className="auth-form auth-form-otp">
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">Email verified. Redirecting to login…</div>}
          {resendMessage && !success && <div className="auth-success">{resendMessage}</div>}
          <label className="auth-label">
            Email
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="auth-label">
            Verification code
            <input
              type="text"
              name="otp"
              placeholder="6‑digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              inputMode="numeric"
              required
            />
          </label>
          <div className="auth-actions">
            <button type="submit" className="auth-primary-btn" disabled={loading || authLoading}>
              {loading ? 'Verifying…' : 'Verify email'}
            </button>
          </div>
        </form>
        <p className="auth-footer-note">
          Didn&apos;t receive the email?{' '}
          <button
            type="button"
            className="auth-link-button"
            onClick={handleResend}
            disabled={loading || authLoading}
          >
            Resend code
          </button>
          . Also check your spam folder.
        </p>
        <p className="auth-footer-note">
          Already verified? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}


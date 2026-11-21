import { useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { verifyEmailOtp, resendEmailOtp } from '../services/api';
import { loginUser } from '../store/slices/authSlice';
import AuthLayout from '../components/AuthLayout';
import FormError from '../components/FormError';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialEmail = searchParams.get('email') || '';
  const savedUsername = sessionStorage.getItem('signup_username') || location.state?.username || '';
  const savedPassword = sessionStorage.getItem('signup_password') || location.state?.password || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { loading: authLoading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const inputRefs = useRef([]);

  const handleChange = (value, i) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length > 1) {
      /* Pasted or autofilled code: spread it across the boxes. */
      const next = [...otp];
      digits.slice(0, 6 - i).split('').forEach((d, k) => { next[i + k] = d; });
      setOtp(next);
      inputRefs.current[Math.min(5, i + digits.length)]?.focus();
      return;
    }
    const next = [...otp];
    next[i] = digits;
    setOtp(next);
    if (error) setError('');
    if (digits && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const otpString = otp.join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!email || otpString.length !== 6) {
      setError('Enter your email and the 6-digit code we sent you.');
      return;
    }
    setLoading(true);
    try {
      await verifyEmailOtp({ email, otp: otpString });
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
      setError(err?.error || err?.detail || 'Could not verify the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
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
      setError(err?.error || err?.detail || 'Could not resend the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Check your email"
      subtitle={initialEmail
        ? <>We sent a 6-digit code to <span className="auth-email">{initialEmail}</span>.</>
        : 'Enter your email and the 6-digit code we sent you.'}
      footer={<>Already verified? <Link to="/login">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} className="ui-form">
        {!initialEmail && (
          <div className="ui-field">
            <label className="ui-label" htmlFor="verify-email">Email</label>
            <input id="verify-email" type="email" className="ui-input ui-input-lg" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
        )}

        <div className="ui-field">
          <span className="ui-label">Verification code</span>
          <div className="auth-otp">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {success && <div className="ui-alert ui-alert-success" role="status">Email verified. Taking you in…</div>}
        {resendMessage && !success && <div className="ui-alert ui-alert-success" role="status">{resendMessage}</div>}
        <FormError message={error} />

        <button type="submit" disabled={loading || authLoading} className="ui-btn ui-btn-primary ui-btn-block">
          {loading || authLoading ? 'Verifying…' : 'Verify email'}
        </button>
        <p className="ui-hint" style={{ textAlign: 'center' }}>
          Didn&apos;t get it? Check spam, or{' '}
          <button type="button" className="auth-link-btn" onClick={handleResend} disabled={loading}>send a new code</button>
        </p>
      </form>
    </AuthLayout>
  );
}

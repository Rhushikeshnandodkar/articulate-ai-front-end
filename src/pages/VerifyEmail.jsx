import { useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { verifyEmailOtp, resendEmailOtp } from '../services/api';
import { loginUser } from '../store/slices/authSlice';
import AuthLogo from '../components/AuthLogo';

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
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { loading: authLoading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const inputRefs = useRef([]);

  const handleChange = (value, i) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const otpString = otp.join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
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
    <div className="min-h-screen flex items-center justify-center bg-[rgb(20,20,20)] text-white px-4">
      <div className="w-full max-w-md bg-[rgb(26,26,26)] border border-gray-800 rounded-2xl p-8 shadow-xl">
        {/* LOGO */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <AuthLogo className="w-8 h-8 text-primary" />
          <span className="text-xl font-semibold">
            articulate<span className="text-primary">.ai</span>
          </span>
        </div>

        {/* HEADING */}
        <h2 className="text-2xl font-semibold text-center">
          Verify Your Account
        </h2>

        <p className="text-gray-400 text-sm text-center mt-2">
          Enter the 6-digit code sent to your email
        </p>

        {email && (
          <p className="text-primary text-sm text-center mt-2 font-medium">
            {email}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* EMAIL - hidden if we have it from URL */}
          {!initialEmail && (
            <div className="mt-6">
              <label className="text-sm text-gray-300">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full mt-1 px-4 py-3 bg-[rgb(26,26,26)] border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 text-sm text-white placeholder-gray-500"
              />
            </div>
          )}

          {error && (
          <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            Email verified. Redirecting…
          </div>
        )}
        {resendMessage && !success && (
          <div className="mt-4 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            {resendMessage}
          </div>
        )}

          {/* OTP INPUTS */}
          <div className="flex justify-between gap-2 mt-8">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                id={`otp-${i}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                inputMode="numeric"
                className="w-12 h-14 text-center text-lg font-semibold rounded-lg bg-[rgb(40,40,40)] border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              />
            ))}
          </div>

          {/* VERIFY BUTTON */}
          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full mt-8 bg-primary hover:bg-primary/90 text-slate font-medium py-3 rounded-md transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading || authLoading ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>

        {/* RESEND */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Didn&apos;t receive the code?{" "}
          <span
            className="text-primary cursor-pointer hover:underline"
            onClick={handleResend}
            onKeyDown={(e) => e.key === 'Enter' && handleResend()}
            role="button"
            tabIndex={0}
          >
            Resend
          </span>
        </p>

        <p className="text-center text-sm text-gray-400 mt-4">
          Already verified? <Link to="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}

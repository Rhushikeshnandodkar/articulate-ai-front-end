import { GoogleLogin } from '@react-oauth/google';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle, clearError, fetchUser } from '../store/slices/authSlice';
import { getProfile } from '../services/api';

/**
 * Renders only when VITE_GOOGLE_CLIENT_ID is set and GoogleOAuthProvider wraps the app.
 */
export default function GoogleSignInButton() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authLoading = useSelector((state) => state.auth.loading);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return null;
  }

  const handleSuccess = async (credentialResponse) => {
    const token = credentialResponse?.credential;
    if (!token) return;
    dispatch(clearError());
    const result = await dispatch(loginWithGoogle(token));
    if (loginWithGoogle.fulfilled.match(result)) {
      await dispatch(fetchUser());
      try {
        const profile = await getProfile();
        navigate(
          profile.has_completed_profile ? '/dashboard' : '/profile-setup',
          { replace: true }
        );
      } catch {
        navigate('/profile-setup', { replace: true });
      }
    }
  };

  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      <div className="flex w-full justify-center [&>div]:w-full [&_iframe]:!w-full">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => {
            dispatch(clearError());
          }}
          useOneTap={false}
          theme="filled_black"
          size="large"
          text="continue_with"
          shape="rectangular"
        />
      </div>
      {authLoading && (
        <p className="text-center text-xs text-gray-500">Signing in…</p>
      )}
    </div>
  );
}

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import { useTheme } from '../contexts/ThemeContext';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import '../styles/navbar.css';

function getDefaultTitle(pathname) {
  if (pathname === '/dashboard' || pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/topics')) return 'Practice Topics';
  if (pathname.startsWith('/profile')) return 'Settings';
  if (pathname.startsWith('/voice')) return 'Voice Practice';
  if (pathname === '/conversations') return 'Conversations';
  if (pathname.startsWith('/conversations/')) return 'Conversation';
  return 'Dashboard';
}

function SunIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export default function PageNavbar({ planLabel = 'Free', onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { title, rightActions } = usePageNavbar();
  const { user } = useSelector((state) => state.auth);

  const displayTitle = title || getDefaultTitle(location.pathname);

  const handleLogout = () => {
    try {
      localStorage.removeItem('articulate_recommended_topics');
    } catch (_) {}
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <header className="tw-page-navbar">
      <div className="tw-page-navbar-inner">
        <div className="tw-page-navbar-left">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="tw-page-navbar-menu-btn"
              aria-label="Open menu"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h1 className="tw-page-navbar-title">{displayTitle}</h1>
        </div>
        <div className="tw-page-navbar-right">
          {rightActions}
          <span className="tw-page-navbar-badge">{planLabel} Plan</span>
          <button
            type="button"
            onClick={toggleTheme}
            className="tw-page-navbar-theme-btn"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="tw-page-navbar-logout-btn"
            aria-label="Log out"
          >
            <LogoutIcon />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

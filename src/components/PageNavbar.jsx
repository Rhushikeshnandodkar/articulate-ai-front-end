import { useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { MenuIcon, MoonIcon, SunIcon } from './icons';

function getDefaultTitle(pathname) {
  if (pathname.startsWith('/dashboard')) return 'Home';
  if (pathname.startsWith('/topics')) return 'Topics';
  if (pathname.startsWith('/talking-agent')) return 'Free talk';
  if (pathname.startsWith('/profile')) return 'Settings';
  if (pathname.startsWith('/voice')) return 'Practice session';
  if (pathname === '/conversations') return 'Sessions';
  if (pathname.startsWith('/conversations/')) return 'Session report';
  return 'Home';
}

export default function PageNavbar({ onMenuClick }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { title, rightActions } = usePageNavbar();

  return (
    <header className="app-header">
      <button type="button" onClick={onMenuClick} className="ui-icon-btn is-plain app-menu-btn" aria-label="Open menu">
        <MenuIcon />
      </button>
      <h1 className="app-header-title">{title || getDefaultTitle(location.pathname)}</h1>
      <div className="app-header-spacer" />
      {rightActions}
      <button
        type="button"
        onClick={toggleTheme}
        className="ui-icon-btn"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}

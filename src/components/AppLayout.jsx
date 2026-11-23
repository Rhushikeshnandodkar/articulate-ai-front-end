import { useEffect, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { PageNavbarProvider } from '../contexts/PageNavbarContext';
import PageNavbar from './PageNavbar';
import { getProfile, getPlans } from '../services/api';
import {
  HomeIcon, MicIcon, BookIcon, ChartIcon, SettingsIcon, HelpIcon, LogoutIcon, CloseIcon,
} from './icons';
import { Logo } from './Logo';
import '../styles/ui.css';

const navGroups = [
  {
    label: 'Practice',
    items: [
      { to: '/dashboard', label: 'Home', short: 'Home', Icon: HomeIcon, match: (p) => p.startsWith('/dashboard') },
      { to: '/talking-agent', label: 'Free talk', short: 'Free talk', Icon: MicIcon, match: (p) => p.startsWith('/talking-agent') },
      { to: '/topics', label: 'Topics', short: 'Topics', Icon: BookIcon, match: (p) => p === '/topics' || p === '/voice' },
    ],
  },
  {
    label: 'Progress',
    items: [
      { to: '/conversations', label: 'Sessions', short: 'Sessions', Icon: ChartIcon, match: (p) => p.startsWith('/conversations') },
      { to: '/profile', label: 'Settings', short: 'Settings', Icon: SettingsIcon, match: (p) => p.startsWith('/profile') },
    ],
  },
];
const allNavItems = navGroups.flatMap((g) => g.items);

export default function AppLayout() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [plan, setPlan] = useState({ label: 'Free', isFree: true, used: 0, limit: 10 });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const profile = await getProfile();
        const used = profile?.monthly_minutes_used ?? 0;
        const limit = profile?.minutes_limit ?? 10;
        if (!profile?.subscription_plan) {
          if (isMounted) setPlan({ label: 'Free', isFree: true, used, limit });
          return;
        }
        const plansData = await getPlans().catch(() => null);
        const plans = Array.isArray(plansData?.plans) ? plansData.plans : [];
        const currentPlanId = typeof profile.subscription_plan === 'object'
          ? profile.subscription_plan.id
          : profile.subscription_plan;
        const current = plans.find((p) => p.id === currentPlanId);
        const isFree = !current || current.price === 0;
        if (isMounted) setPlan({ label: current?.name || 'Active', isFree, used, limit });
      } catch {
        /* keep defaults */
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleLogout = () => {
    try { localStorage.removeItem('articulate_recommended_topics'); } catch (_) {}
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const displayName = user?.first_name || user?.username || 'You';
  const initials = displayName.slice(0, 2).toUpperCase();
  const usagePct = plan.limit > 0 ? Math.min(100, Math.round((plan.used / plan.limit) * 100)) : 0;

  return (
    <PageNavbarProvider>
      <div className="app-shell">
        {sidebarOpen && <div className="app-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden />}

        <aside className={`app-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Sidebar">
          <div className="app-sidebar-top">
            <Link to="/dashboard" className="app-brand">
              <Logo size={26} />
            </Link>
            <button type="button" className="ui-icon-btn is-plain app-menu-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
              <CloseIcon />
            </button>
          </div>

          <nav className="app-nav" onClick={(e) => { if (e.target.closest('a')) setSidebarOpen(false); }}>
            {navGroups.map((group) => (
              <div key={group.label}>
                <span className="app-nav-label">{group.label}</span>
                {group.items.map(({ to, label, Icon, match }) => (
                  <Link key={to} to={to} className={`app-nav-link ${match(pathname) ? 'is-active' : ''}`} aria-current={match(pathname) ? 'page' : undefined}>
                    <Icon />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            ))}
            <span className="app-nav-label">Support</span>
            <Link to="/profile#help-customer-care" className="app-nav-link">
              <HelpIcon />
              <span>Help</span>
            </Link>
          </nav>

          <div className="app-plan">
            <div className="app-plan-row">
              <span className="app-plan-name">{plan.label} plan</span>
              {plan.isFree && <span className="app-plan-meta">{plan.used}/{plan.limit} min</span>}
            </div>
            {plan.isFree ? (
              <>
                <div className={`ui-progress ${usagePct >= 100 ? 'is-danger' : usagePct >= 80 ? 'is-warn' : ''}`}>
                  <span style={{ width: `${usagePct}%` }} />
                </div>
                <Link to="/profile" className="ui-btn ui-btn-primary ui-btn-sm">Upgrade</Link>
              </>
            ) : (
              <p className="app-plan-meta" style={{ margin: '6px 0 0' }}>Unlimited practice is active.</p>
            )}
          </div>

          <div className="app-user">
            <span className="app-avatar">{initials}</span>
            <div className="app-user-text">
              <div className="app-user-name">{displayName}</div>
              {user?.email && <div className="app-user-email">{user.email}</div>}
            </div>
            <button type="button" onClick={handleLogout} className="ui-icon-btn is-plain" aria-label="Log out" title="Log out">
              <LogoutIcon />
            </button>
          </div>
        </aside>

        <div className="app-main">
          <PageNavbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="app-content">
            <Outlet />
          </main>
        </div>

        <nav className="app-bottomnav" aria-label="Main navigation">
          {allNavItems.map(({ to, short, Icon, match }) => (
            <Link key={to} to={to} className={match(pathname) ? 'is-active' : ''} aria-current={match(pathname) ? 'page' : undefined}>
              <Icon />
              <span>{short}</span>
            </Link>
          ))}
        </nav>
      </div>
    </PageNavbarProvider>
  );
}

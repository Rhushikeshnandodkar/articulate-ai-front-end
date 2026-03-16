import '../styles/dashboard.css';
import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { fetchUser, logout } from '../store/slices/authSlice';
import { useTheme } from '../contexts/ThemeContext';
import { getConversations, createConversation, getProfile, getSuggestedTopics } from '../services/api';

const FALLBACK_TOPICS = [
  { title: 'Job interview', category: 'Career', description: 'Practice answering common interview questions.' },
  { title: 'Presentation pitch', category: 'Business', description: 'Pitch an idea in under two minutes.' },
  { title: 'Small talk', category: 'Social', description: 'Start and keep casual conversations going.' },
  { title: 'Networking', category: 'Career', description: 'Introduce yourself and make connections.' },
  { title: 'Giving feedback', category: 'Leadership', description: 'Deliver constructive feedback clearly.' },
];

const TOPICS_STORAGE_KEY = 'articulate_recommended_topics';

const CATEGORY_TAG_CLASS = {
  Tech: 'tw-topic-tag-blue',
  Career: 'tw-topic-tag-purple',
  Business: 'tw-topic-tag-purple',
  Social: 'tw-topic-tag-blue',
  Leadership: 'tw-topic-tag-purple',
  Interview: 'tw-topic-tag-purple',
  Sales: 'tw-topic-tag-blue',
  Networking: 'tw-topic-tag-purple',
  General: 'tw-topic-tag-blue',
};
function getTagClass(category) {
  return CATEGORY_TAG_CLASS[category] || 'tw-topic-tag-blue';
}

function SearchIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0h.5a2.5 2.5 0 002.5-2.5V3.935M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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

function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5m0 0h5M4 9l2.5-2.5A7 7 0 1120 12"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 20v-5m0 0h-5M20 15l-2.5 2.5A7 7 0 014 12"
      />
    </svg>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [conversations, setConversations] = useState([]);
  const [recommendedTopics, setRecommendedTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const topicsScrollRef = useRef(null);
  const [topicsRefreshing, setTopicsRefreshing] = useState(false);

  const scrollTopics = (direction) => {
    const el = topicsScrollRef.current;
    if (!el) return;
    const step = 320;
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    dispatch(fetchUser());
  }, [dispatch, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getProfile()
      .then((data) => {
        if (data.has_completed_profile === false) {
          navigate('/profile', { replace: true });
          return;
        }
        setProfile(data);
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [isAuthenticated, navigate]);

  const loadTopics = () => {
    if (!isAuthenticated) return;
    setTopicsLoading(true);
    setTopicsRefreshing(true);
    getSuggestedTopics()
      .then((data) => {
        if (data.topics && data.topics.length > 0) {
          const normalized = data.topics.map((t) => {
            if (typeof t === 'string')
              return { title: t, category: 'General', description: 'Practice your communication skills.' };
            return {
              title: t.title || t.name || String(t),
              category: t.category || t.tag || 'General',
              description: t.description || t.desc || 'Practice your communication skills.',
            };
          });
          setRecommendedTopics(normalized);
          try {
            localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(normalized));
          } catch (_) {}
        } else {
          setRecommendedTopics(FALLBACK_TOPICS);
          try {
            localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(FALLBACK_TOPICS));
          } catch (_) {}
        }
      })
      .catch(() => {
        setRecommendedTopics(FALLBACK_TOPICS);
        try {
          localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(FALLBACK_TOPICS));
        } catch (_) {}
      })
      .finally(() => {
        setTopicsLoading(false);
        setTopicsRefreshing(false);
      });
  };

  // On first dashboard load after login, hydrate topics from localStorage if present.
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const raw = localStorage.getItem(TOPICS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecommendedTopics(parsed);
          return;
        }
      }
    } catch (_) {}
    // If nothing stored, load once.
    loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const startPractice = async (topicName) => {
    const t = typeof topicName === 'string' ? topicName : (topicName?.title || topic || '').trim();
    const topicDescription =
      typeof topicName === 'object'
        ? (topicName.description || topicName.desc || '')
        : '';
    if (!t) {
      setError('Enter or select a topic.');
      return;
    }
    setError(null);
    setStarting(true);
    try {
      const data = await createConversation(t);
      navigate(`/voice?conversation=${data.id}`, {
        state: {
          conversationId: data.id,
          topic: data.topic,
          topicDescription,
        },
      });
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to start conversation.');
    } finally {
      setStarting(false);
    }
  };

  const handleStartConversation = (e) => {
    e.preventDefault();
    startPractice(topic);
  };

  const displayName = user?.username || 'Alex';
  const suggestedTopicObj = Array.isArray(recommendedTopics) && recommendedTopics.length > 0
    ? (typeof recommendedTopics[0] === 'string'
        ? { title: recommendedTopics[0], description: 'Practice your communication skills.' }
        : {
            title: recommendedTopics[0].title || recommendedTopics[0].name || String(recommendedTopics[0]),
            description: recommendedTopics[0].description || recommendedTopics[0].desc || 'Practice your communication skills.',
          })
    : { title: 'Technology', description: 'Share your thoughts on how technology is changing daily life.' };
  const suggestedTopic = suggestedTopicObj.title;
  const weeklySessions = profile?.total_sessions ?? 3;
  const weeklyGoal = 5;
  const weeklyPct = Math.min(100, Math.round((weeklySessions / weeklyGoal) * 100));
  const latestConv = conversations.length > 0 ? conversations[0] : null;
  const minutesUsed = profile?.monthly_minutes_used ?? 0;
  const minutesLimit = profile?.minutes_limit ?? 10;
  const minutesRemaining = profile?.minutes_remaining ?? Math.max(0, minutesLimit - minutesUsed);
  const streak = profile?.streak || {};
  const currentStreak = streak.current_streak ?? profile?.current_streak ?? 0;
  const longestStreak = streak.longest_streak ?? profile?.longest_streak ?? 0;
  const totalPracticeDays = streak.total_practice_days ?? profile?.total_practice_days ?? 0;
  const streakBroken = streak.streak_broken ?? false;
  const lastActiveDate = streak.last_active_date ? new Date(streak.last_active_date) : null;
  const lastActiveLabel = lastActiveDate ? lastActiveDate.toLocaleDateString() : 'No sessions yet';

  // Build a set of dates (YYYY-MM-DD) where the user practiced, based on streak segments.
  const practicedDates = new Set();
  if (streak.segments && Array.isArray(streak.segments)) {
    streak.segments.forEach((seg) => {
      if (!seg.start_date || !seg.end_date) return;
      const start = new Date(seg.start_date);
      const end = new Date(seg.end_date);
      // Normalize to midnight to avoid timezone drift.
      let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (d <= endDay) {
        practicedDates.add(d.toISOString().slice(0, 10));
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
    });
  }

  // Last 10 calendar days (oldest on the left, today on the right).
  const today = new Date();
  const lastTenDays = Array.from({ length: 10 }).map((_, idx) => {
    const offset = 9 - idx;
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const iso = d.toISOString().slice(0, 10);
    const completed = practicedDates.has(iso);
    return { date: d, iso, completed };
  });
  const topicCards = recommendedTopics.map((t) => {
    if (typeof t === 'string') return { title: t, category: 'General', description: 'Practice your communication skills.', tagClass: 'tw-topic-tag-blue' };
    return {
      title: t.title || t.name || String(t),
      category: t.category || t.tag || 'General',
      description: t.description || t.desc || 'Practice your communication skills.',
      tagClass: getTagClass(t.category || t.tag),
    };
  });

  if (!user) {
    return (
      <div className="tw-dashboard-loading">
        <p>Loading…</p>
      </div>
    );
  }
  if (!profileLoaded) {
    return (
      <div className="tw-dashboard-loading">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="tw-dashboard">
      <div className="tw-dashboard-header-wrap">
        <header className="tw-dashboard-header">
          <h1 className="tw-dashboard-welcome">Welcome, {displayName}</h1>
          <div className="tw-dashboard-header-right">
            <span className="tw-dashboard-plan-badge">Free Plan</span>
            <button type="button" onClick={toggleTheme} className="tw-dashboard-theme-btn" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button type="button" onClick={() => { dispatch(logout()); navigate('/login', { replace: true }); }} className="tw-dashboard-logout-btn" aria-label="Log out">
              <LogoutIcon />
              <span>Log out</span>
            </button>
          </div>
        </header>
      </div>

      <div className="tw-dashboard-grid">
        <section className="tw-dashboard-card">
          <h2 className="tw-dashboard-ready-title">Ready to practice?</h2>
          <p className="tw-dashboard-ready-desc">
            Your AI partner is ready. Today&apos;s suggested topic is based on your interest in {suggestedTopic}.
          </p>
          <div className="tw-dashboard-ready-actions">
            <button type="button" onClick={() => startPractice(suggestedTopicObj)} disabled={starting} className="tw-btn-primary">
              {starting ? 'Starting…' : 'Start AI Session'}
            </button>
            <button type="button" onClick={() => {}} className="tw-btn-secondary">Choose Topic</button>
          </div>
        </section>

        <section className="tw-dashboard-card">
          <h3 className="tw-dashboard-goal-title">Weekly Goal</h3>
          <p className="tw-dashboard-goal-value">{weeklySessions}/<span>{weeklyGoal} sessions</span></p>
          <div className="tw-dashboard-goal-bar-wrap">
            <div className="tw-dashboard-goal-bar">
              <div className="tw-dashboard-goal-bar-fill" style={{ width: `${weeklyPct}%` }} />
            </div>
            <span className="tw-dashboard-goal-pct">{weeklyPct}%</span>
          </div>
        </section>
      </div>

      <section className="tw-dashboard-topics-full">
        <div className="tw-dashboard-section-head">
          <h3 className="tw-dashboard-section-title">Recommended Topics</h3>
          <button
            type="button"
            className="tw-dashboard-view-all"
            onClick={loadTopics}
            disabled={topicsRefreshing}
          >
            <RefreshIcon />
          </button>
        </div>
        {topicsLoading ? (
          <p className="tw-muted">Loading topics…</p>
        ) : (
          <div className="tw-dashboard-topics-scroll-wrap">
            <button type="button" onClick={() => scrollTopics('left')} className="tw-dashboard-topics-arrow tw-dashboard-topics-arrow-left" aria-label="Scroll left">
              <ChevronLeftIcon />
            </button>
            <div className="tw-dashboard-topics-scroll" ref={topicsScrollRef}>
            {topicCards.slice(0, 6).map((t, i) => (
              <div key={t.title + (t.category || '')} className="tw-topic-card">
                <div className="tw-topic-card-head">
                  <div className="tw-topic-card-icon">{i % 2 === 0 ? <GlobeIcon /> : <BriefcaseIcon />}</div>
                  <span className={`tw-topic-tag ${t.tagClass || getTagClass(t.category)}`}>{t.category}</span>
                </div>
                <h4 className="tw-topic-card-title">{t.title}</h4>
                <p className="tw-topic-card-desc">{t.description}</p>
                <button type="button" onClick={() => startPractice(t)} disabled={starting} className="tw-btn-primary tw-topic-card-btn">
                  {starting ? 'Starting…' : 'Practice'}
                </button>
              </div>
            ))}
            </div>
            <button type="button" onClick={() => scrollTopics('right')} className="tw-dashboard-topics-arrow tw-dashboard-topics-arrow-right" aria-label="Scroll right">
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </section>

      <section className="tw-dashboard-stats-bar">
        <div className="tw-dashboard-stat-box">
          <span className="tw-dashboard-stat-value">{profile?.total_sessions ?? 0}</span>
          <span className="tw-dashboard-stat-label">Sessions</span>
        </div>
        <div className="tw-dashboard-stat-box">
          <span className="tw-dashboard-stat-value">{profile?.total_minutes_spoken ?? 0}</span>
          <span className="tw-dashboard-stat-label">Minutes</span>
        </div>
        <div className="tw-dashboard-stat-box">
          <span className="tw-dashboard-stat-value">
            {minutesUsed}/{minutesLimit}
          </span>
          <span className="tw-dashboard-stat-label">This month (min)</span>
        </div>
        <div className="tw-dashboard-stat-box">
          <span className="tw-dashboard-stat-value">{profile?.average_filler_words ?? 0}</span>
          <span className="tw-dashboard-stat-label">Filler words</span>
        </div>
        <div className="tw-dashboard-stat-box">
          <span className="tw-dashboard-stat-value">{profile?.average_pace_wpm ?? 0}</span>
          <span className="tw-dashboard-stat-label">Pace (wpm)</span>
        </div>
        <div className="tw-dashboard-stat-box">
          <span className="tw-dashboard-stat-value">{profile?.confidence_score ?? 0}</span>
          <span className="tw-dashboard-stat-label">Confidence</span>
        </div>
        <div className="tw-dashboard-stat-box">
          <span className="tw-dashboard-stat-value">{profile?.clarity_score ?? 0}</span>
          <span className="tw-dashboard-stat-label">Clarity</span>
        </div>
      </section>

      <section className="tw-dashboard-streak">
        <div className="tw-dashboard-streak-main">
          <div className="tw-dashboard-streak-icon">
            <FlameIcon />
          </div>
          <div>
            <div className="tw-dashboard-streak-label-row">
              <span className="tw-dashboard-streak-label">Daily streak</span>
              {streakBroken && currentStreak === 0 && lastActiveDate && (
                <span className="tw-dashboard-streak-broken">Streak broken on {lastActiveLabel}</span>
              )}
            </div>
            <div className="tw-dashboard-streak-count-row">
              <span className="tw-dashboard-streak-count">{currentStreak}</span>
              <span className="tw-dashboard-streak-unit">days</span>
            </div>
            <p className="tw-dashboard-streak-sub">
              Last active: {lastActiveLabel}
            </p>
          </div>
        </div>
        <div className="tw-dashboard-streak-days-wrap">
          <div className="tw-dashboard-streak-days">
            {lastTenDays.map((d) => (
              <div
                key={d.iso}
                className={`tw-dashboard-streak-day ${d.completed ? 'tw-dashboard-streak-day--done' : ''}`}
                title={`${d.date.toLocaleDateString()} · ${d.completed ? 'Completed' : 'Not completed'}`}
              >
                {d.completed && <span className="tw-dashboard-streak-day-icon">🔥</span>}
              </div>
            ))}
          </div>
          <div className="tw-dashboard-streak-legend">
            <span className="tw-dashboard-streak-legend-item">
              <span className="tw-dashboard-streak-legend-dot tw-dashboard-streak-legend-dot-done" /> Completed day
            </span>
            <span className="tw-dashboard-streak-legend-item">
              <span className="tw-dashboard-streak-legend-dot" /> Missed day
            </span>
            <span className="tw-dashboard-streak-meta">
              Longest streak {longestStreak} days · {totalPracticeDays} practice days
            </span>
          </div>
        </div>
      </section>

      <section className="tw-dashboard-form-section">
        <h4 className="tw-dashboard-form-title">Or start with any topic</h4>
        <form onSubmit={handleStartConversation} className="tw-dashboard-form">
          <input
            type="text"
            placeholder="e.g. Job interview, presentation, small talk"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="tw-input"
          />
          <button type="submit" disabled={starting} className="tw-btn-primary">
            {starting ? 'Starting…' : 'Start conversation'}
          </button>
        </form>
        {error && <p className="tw-error">{error}</p>}
      </section>

      <section className="tw-dashboard-past">
        <h3 className="tw-dashboard-past-title">Past conversations</h3>
        {loading ? (
          <p className="tw-muted">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="tw-muted">No conversations yet. Start one above.</p>
        ) : (
          <ul className="tw-conv-list">
            {conversations.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link to={`/conversations/${c.id}`} className="tw-conv-link">
                  <span className="tw-conv-topic">{c.topic}</span>
                  <span className="tw-conv-meta">
                    {c.started_at ? ` - ${new Date(c.started_at).toLocaleDateString()}` : ''}
                    {c.status === 'ended' && c.rating ? ` - ${c.rating.replace('_', ' ')}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

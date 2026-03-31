import '../styles/dashboard.css';
import '../styles/voice.css';
import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { fetchUser } from '../store/slices/authSlice';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { getConversations, createConversation, getProfile, getSuggestedTopics, getDailyTopic, getPlans, getMe, subscribeToPlanWithPayment } from '../services/api';

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

function QuotaRing({ used, limit }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  let color = '#22c55e';
  if (pct >= 80) color = '#ef4444';
  else if (pct >= 50) color = '#f59e0b';
  return (
    <div className="tw-quota-ring-wrap">
      <svg className="tw-quota-ring-svg" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--ring-track)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="tw-quota-ring-text">
        <span className="tw-quota-ring-value" style={{ color }}>{used}</span>
        <span className="tw-quota-ring-of">of {limit} min</span>
        <span className="tw-quota-ring-unit">used</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [conversations, setConversations] = useState([]);
  const [recommendedTopics, setRecommendedTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const topicsScrollRef = useRef(null);
  const [topicsRefreshing, setTopicsRefreshing] = useState(false);
  const [dailyTopic, setDailyTopic] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showQuotaExceededModal, setShowQuotaExceededModal] = useState(false);
  const [upgradeUser, setUpgradeUser] = useState(null);
  const [upgradeSubmittingId, setUpgradeSubmittingId] = useState(null);

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

  // Load today's daily practice topic (one per user per day).
  useEffect(() => {
    if (!isAuthenticated) return;
    getDailyTopic()
      .then((data) => {
        if (data && data.title) {
          setDailyTopic(data);
        }
      })
      .catch(() => {
        // Ignore errors; dashboard still works without daily topic.
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getPlans()
      .then((data) => setPlans(Array.isArray(data.plans) ? data.plans : []))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getMe().then(setUpgradeUser).catch(() => {});
  }, [isAuthenticated]);

  const minutesUsed = profile?.monthly_minutes_used ?? 0;
  const minutesLimit = profile?.minutes_limit ?? 10;
  const minutesRemaining = profile?.minutes_remaining ?? Math.max(0, minutesLimit - minutesUsed);
  const currentPlanId =
    profile?.subscription_plan && typeof profile.subscription_plan === 'object'
      ? profile.subscription_plan.id
      : profile?.subscription_plan || null;
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const isFreePlan = !currentPlan || currentPlan.price === 0;

  const loadTopics = () => {
    if (!isAuthenticated) return;
    setTopicsLoading(true);
    setTopicsRefreshing(true);
    const previousTitles = recommendedTopics.map((t) => (typeof t === 'string' ? t : t.title || t.name || '')).filter(Boolean);
    getSuggestedTopics(previousTitles)
      .then((data) => {
        if (data.topics && data.topics.length > 0) {
          const normalized = data.topics.map((t) => {
            if (typeof t === 'string')
              return { title: t, category: 'General', description: 'Practice your communication skills.' };
            return {
              title: t.title || t.name || String(t),
              category: t.category || t.tag || 'General',
              description: t.description || t.desc || 'Practice your communication skills.',
                opening_question: t.opening_question || t.openingQuestion || t.question,
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

  // Load recommended topics only when profile is loaded and user has quota (not exceeded for free plan).
  useEffect(() => {
    if (!isAuthenticated || !profileLoaded) return;
    if (isFreePlan && minutesRemaining <= 0) {
      setRecommendedTopics([]);
      try {
        localStorage.removeItem(TOPICS_STORAGE_KEY);
      } catch (_) {}
      return;
    }
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
    loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, profileLoaded, isFreePlan, minutesRemaining]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const startPractice = async (topicName) => {
    const t = typeof topicName === 'string' ? topicName : (topicName?.title || '').trim();
    const topicDescription =
      typeof topicName === 'object'
        ? (topicName.description || topicName.desc || '')
        : '';
    const topicOpeningQuestion =
      typeof topicName === 'object'
        ? (topicName.openingQuestion || topicName.opening_question || topicName.question || '')
        : '';
    const topicIdForApi =
      typeof topicName === 'object' && topicName.id != null ? topicName.id : null;
    const descParts = [];
    if (topicDescription) descParts.push(String(topicDescription).trim());
    if (topicOpeningQuestion) {
      descParts.push(`Practice angle: ${String(topicOpeningQuestion).trim()}`);
    }
    const topicDescriptionForApi = descParts.filter(Boolean).join('\n\n') || undefined;
    if (!t) {
      setError('Enter or select a topic.');
      return;
    }
    if (isFreePlan && minutesRemaining <= 0) {
      setShowQuotaExceededModal(true);
      return;
    }
    setError(null);
    setStarting(true);
    try {
      const data = await createConversation(t, topicIdForApi, topicDescriptionForApi);
      navigate(`/voice?conversation=${data.id}`, {
        state: {
          conversationId: data.id,
          topic: data.topic,
          topicDescription,
          topicOpeningQuestion,
        },
      });
    } catch (err) {
      const errMsg = err?.error || err?.message || 'Failed to start conversation.';
      setError(errMsg);
      if (typeof errMsg === 'string' && (errMsg.includes('practice minutes') || errMsg.includes('monthly limit'))) {
        setShowQuotaExceededModal(true);
      }
    } finally {
      setStarting(false);
    }
  };

  const { setPageNavbar } = usePageNavbar();

  useEffect(() => {
    setPageNavbar({ title: 'Dashboard' });
    return () => setPageNavbar({});
  }, [setPageNavbar]);

  const pickOpeningQuestionFallback = (titleText) => {
    const t = String(titleText || '').trim();
    const safe = t || 'this topic';
    const options = [
      `Describe a real moment connected to “${safe}” — what happened and why does it matter to you?`,
      `What is your honest opinion about “${safe}”, and what is one example from your life?`,
      `If “${safe}” became urgent this week, what would you do first and why?`,
    ];
    const firstChar = safe.length > 0 ? safe.charCodeAt(0) : 0;
    const idx = (safe.length + firstChar) % options.length;
    return options[idx];
  };

  const suggestedTopicObj = Array.isArray(recommendedTopics) && recommendedTopics.length > 0
    ? (typeof recommendedTopics[0] === 'string'
        ? {
            title: recommendedTopics[0],
            description: 'Practice your communication skills.',
            openingQuestion: pickOpeningQuestionFallback(recommendedTopics[0]),
          }
        : {
            title: recommendedTopics[0].title || recommendedTopics[0].name || String(recommendedTopics[0]),
            description: recommendedTopics[0].description || recommendedTopics[0].desc || 'Practice your communication skills.',
            openingQuestion:
              recommendedTopics[0].opening_question ||
              recommendedTopics[0].openingQuestion ||
              recommendedTopics[0].question ||
              pickOpeningQuestionFallback(
                recommendedTopics[0].title || recommendedTopics[0].name || String(recommendedTopics[0]),
              ),
          })
    : {
        title: 'Technology',
        description: 'Share your thoughts on how technology is changing daily life.',
        openingQuestion: 'What is one way technology has changed your daily life in the last few years, and how do you feel about that change?',
      };
  const suggestedTopic = suggestedTopicObj.title;
  const weeklySessions = profile?.total_sessions ?? 3;
  const currentBadge = profile?.badge_level || 'none';
  const gameScore = profile?.game_score ?? 0;
  const latestConv = conversations.length > 0 ? conversations[0] : null;
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
    if (typeof t === 'string') {
      return {
        title: t,
        category: 'General',
        description: 'Practice your communication skills.',
        openingQuestion: pickOpeningQuestionFallback(t),
        tagClass: 'tw-topic-tag-blue',
      };
    }
    const category = t.category || t.tag || 'General';
    const description = t.description || t.desc || 'Practice your communication skills.';
    const openingQuestion =
      t.opening_question ||
      t.openingQuestion ||
      t.question ||
      pickOpeningQuestionFallback(t.title || t.name || String(t));
    return {
      title: t.title || t.name || String(t),
      category,
      description,
      openingQuestion,
      tagClass: getTagClass(category),
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

  const quotaExceeded = isFreePlan && minutesRemaining <= 0;

  return (
    <div className="tw-dashboard">
      <div className="tw-dashboard-grid">
        <section className="tw-dashboard-card">
          <h2 className="tw-dashboard-ready-title">Daily practice topic</h2>
          {quotaExceeded ? (
            <>
              <p className="tw-dashboard-ready-desc">
                You&apos;ve used all your free minutes this month. Upgrade to continue practicing with daily topics and AI feedback.
              </p>
              <Link to="/profile" className="tw-btn-primary" style={{ textDecoration: 'none' }}>
                Upgrade to continue
              </Link>
            </>
          ) : dailyTopic ? (
            <>
              <p className="tw-dashboard-daily-topic-title">
                {dailyTopic.title}
              </p>
              <p className="tw-dashboard-ready-desc tw-dashboard-ready-desc-sub">
                {dailyTopic.description}
              </p>
              <div className="tw-dashboard-ready-actions">
                <button
                  type="button"
                  onClick={() => startPractice({ title: dailyTopic.title, description: dailyTopic.description })}
                  disabled={starting}
                  className="tw-btn-primary"
                >
                  {starting ? 'Starting…' : 'Start today\'s topic'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/talking-agent')}
                  disabled={starting}
                  className="tw-btn-secondary"
                >
                  Talk with partner
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="tw-dashboard-ready-desc">
                Your AI partner is ready. Today&apos;s suggested topic is based on your interest in {suggestedTopic}.
              </p>
              <div className="tw-dashboard-ready-actions">
                <button type="button" onClick={() => navigate('/talking-agent')} className="tw-btn-secondary" disabled={starting}>
                  Talk with partner
                </button>
                <button type="button" onClick={() => navigate('/topics')} className="tw-btn-secondary">Choose Topic</button>
              </div>
            </>
          )}
        </section>
        {error && <p className="tw-error tw-dashboard-error">{error}</p>}

        <section className="tw-dashboard-card tw-dashboard-badge-card">
          <h3 className="tw-dashboard-goal-title">Table Topic Badge</h3>
          <div className="tw-dashboard-badge-main">
            <div className="tw-dashboard-badge-ring-wrap">
              {(() => {
                const threshold = profile?.badge_progress?.next_threshold || 1;
                const pct = Math.min(100, Math.round((gameScore / threshold) * 100));
                const r = 34;
                const circumference = 2 * Math.PI * r;
                const offset = circumference - (pct / 100) * circumference;
                return (
                  <svg className="tw-dashboard-badge-ring-svg" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="5" />
                    <circle
                      cx="40" cy="40" r={r}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      transform="rotate(-90 40 40)"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                );
              })()}
              <div className="tw-dashboard-badge-ring-inner">
                {profile?.current_badge_icon ? (
                  <div className={`tw-dashboard-badge-icon tw-dashboard-badge-${currentBadge}`}>
                    <img
                      src={profile.current_badge_icon}
                      alt={`${currentBadge} badge`}
                      className="tw-dashboard-badge-img"
                    />
                  </div>
                ) : (
                  <div className={`tw-dashboard-badge-icon tw-dashboard-badge-${currentBadge}`}>
                    <span className="tw-dashboard-badge-symbol">
                      {currentBadge === 'diamond' && '◆'}
                      {currentBadge === 'gold' && '★'}
                      {currentBadge === 'silver' && '☆'}
                      {currentBadge === 'bronze' && '⬤'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="tw-dashboard-badge-text">
              <p className="tw-dashboard-badge-name">
                {currentBadge.charAt(0).toUpperCase() + currentBadge.slice(1)}
              </p>
              <div className="tw-dashboard-badge-progress-wrap">
                <div className="tw-dashboard-badge-scores">
                  <span className="tw-dashboard-badge-score-current">{gameScore}</span>
                  {profile?.badge_progress?.next_badge_name ? (
                    <>
                      <span className="tw-dashboard-badge-score-sep">/</span>
                      <span className="tw-dashboard-badge-score-next">
                        {profile.badge_progress.next_threshold} ({profile.badge_progress.next_badge_name})
                      </span>
                    </>
                  ) : (
                    <span className="tw-dashboard-badge-score-label"> score</span>
                  )}
                </div>
                <p className="tw-dashboard-badge-sub">
                  {profile?.badge_progress?.next_badge_name
                    ? `${profile.badge_progress.remaining} to ${profile.badge_progress.next_badge_name}`
                    : 'Complete table topics to increase your score.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {isFreePlan && profileLoaded && (
        <section className="tw-dashboard-quota">
          <QuotaRing used={minutesUsed} limit={minutesLimit} />
          <div className="tw-dashboard-quota-info">
            <h3 className="tw-dashboard-quota-title">
              {minutesUsed >= minutesLimit
                ? 'Monthly quota reached!'
                : minutesUsed >= minutesLimit * 0.8
                  ? 'Running low on practice time!'
                  : 'Free Plan — Monthly Usage'}
            </h3>
            <p className={`tw-dashboard-quota-desc ${
              minutesUsed >= minutesLimit
                ? 'tw-dashboard-quota-danger'
                : minutesUsed >= minutesLimit * 0.5
                  ? 'tw-dashboard-quota-warn'
                  : ''
            }`}>
              {minutesUsed >= minutesLimit
                ? "You've used all your free minutes this month. Upgrade to keep practicing and improving your communication skills."
                : minutesUsed >= minutesLimit * 0.8
                  ? `Only ${minutesRemaining} minutes remaining this month. Upgrade now for more practice time and premium features.`
                  : `You've used ${minutesUsed} of ${minutesLimit} free minutes this month. Upgrade to unlock more practice time.`}
            </p>
            <Link to="/profile" className="tw-btn-primary tw-dashboard-quota-btn">
              Upgrade Now
            </Link>
          </div>
        </section>
      )}

      <section className="tw-dashboard-topics-full">
        <div className="tw-dashboard-section-head">
          <h3 className="tw-dashboard-section-title">Recommended Topics</h3>
          <div className="tw-dashboard-section-head-actions">
            <Link to="/topics" className="tw-dashboard-view-more-link">
              View more
            </Link>
            {!quotaExceeded && (
              <button
                type="button"
                className="tw-dashboard-view-all"
                onClick={loadTopics}
                disabled={topicsRefreshing}
                aria-label="Refresh recommended topics"
              >
                <RefreshIcon />
              </button>
            )}
          </div>
        </div>
        {quotaExceeded ? (
          <p className="tw-muted">
            Upgrade your plan to see personalized recommended topics and continue practicing.
          </p>
        ) : topicsLoading ? (
          <p className="tw-muted">Loading topics…</p>
        ) : (
          <div className="tw-dashboard-topics-scroll-wrap">
            <button type="button" onClick={() => scrollTopics('left')} className="tw-dashboard-topics-arrow tw-dashboard-topics-arrow-left" aria-label="Scroll left">
              <ChevronLeftIcon />
            </button>
            <div className="tw-dashboard-topics-scroll" ref={topicsScrollRef}>
            {topicCards.slice(0, 7).map((t) => (
              <div key={t.title + (t.category || '')} className="tw-topic-card">
                <div className="tw-topic-card-head">
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

      {showQuotaExceededModal && (
        <div
          className="tw-voice-leave-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowQuotaExceededModal(false)}
        >
          <div className="tw-voice-upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-voice-upgrade-header">
              <h2 className="tw-voice-upgrade-title">Monthly practice limit reached</h2>
              <button
                type="button"
                className="tw-voice-upgrade-close"
                onClick={() => setShowQuotaExceededModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="tw-voice-upgrade-desc">
              You&apos;ve used all your free minutes this month. Upgrade to get more practice time and premium features.
            </p>
            <div className="tw-voice-upgrade-plans">
              {plans.filter((p) => p.price > 0).map((plan) => (
                <div key={plan.id} className="tw-voice-upgrade-plan-card">
                  <h3 className="tw-voice-upgrade-plan-name">{plan.name}</h3>
                  <p className="tw-voice-upgrade-plan-price">
                    ₹{plan.price.toFixed(2)} <span>/ {plan.duration} days</span>
                  </p>
                  {plan.description && (
                    <div
                      className="tw-voice-upgrade-plan-desc"
                      dangerouslySetInnerHTML={{ __html: plan.description }}
                    />
                  )}
                  <button
                    type="button"
                    className="tw-btn-primary tw-voice-upgrade-plan-btn"
                    disabled={upgradeSubmittingId === plan.id}
                    onClick={() => {
                      setUpgradeSubmittingId(plan.id);
                      subscribeToPlanWithPayment(
                        plan.id,
                        plan,
                        upgradeUser,
                        () => {
                          setUpgradeSubmittingId(null);
                          setShowQuotaExceededModal(false);
                          getProfile().then(setProfile).catch(() => {});
                        },
                        (err) => {
                          setUpgradeSubmittingId(null);
                          if (err?.error === 'Payment cancelled') return;
                        },
                      );
                    }}
                  >
                    {upgradeSubmittingId === plan.id ? 'Processing…' : `Get ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="tw-voice-upgrade-skip"
              onClick={() => setShowQuotaExceededModal(false)}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

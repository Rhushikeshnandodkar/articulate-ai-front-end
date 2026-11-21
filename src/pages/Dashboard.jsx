import '../styles/voice.css';
import '../styles/pages.css';
import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { fetchUser } from '../store/slices/authSlice';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { getConversations, createConversation, getProfile, getSuggestedTopics, getDailyTopic, getPlans, getMe, subscribeToPlanWithPayment } from '../services/api';
import {
  ArrowRightIcon, ClockIcon, FlameIcon, MicIcon, RefreshIcon, SparkIcon, TrophyIcon, LockIcon, CheckIcon,
} from '../components/icons';
import { categoryColor } from '../utils/topicColors';

const FALLBACK_TOPICS = [
  { title: 'Job interview', category: 'Career', description: 'Practice answering common interview questions.' },
  { title: 'Presentation pitch', category: 'Business', description: 'Pitch an idea in under two minutes.' },
  { title: 'Small talk', category: 'Social', description: 'Start and keep casual conversations going.' },
  { title: 'Networking', category: 'Career', description: 'Introduce yourself and make connections.' },
  { title: 'Giving feedback', category: 'Leadership', description: 'Deliver constructive feedback clearly.' },
];

const TOPICS_STORAGE_KEY = 'articulate_recommended_topics';

function getTagClass() {
  return '';
}

const BADGE_COLORS = {
  bronze: '#C2793B',
  silver: '#94A3B8',
  gold: '#EAB308',
  diamond: '#38BDF8',
  none: '#A1A1AA',
};

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
  const daypassPlan = plans.find((p) => p.plan_type === 'day_pass');

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
    setPageNavbar({ title: 'Home' });
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

  // Last 14 calendar days (oldest on the left, today on the right).
  const today = new Date();
  const lastTenDays = Array.from({ length: 14 }).map((_, idx) => {
    const offset = 13 - idx;
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

  if (!user || !profileLoaded) {
    return (
      <div className="dash">
        <div className="ui-skeleton" style={{ height: 28, width: 260, marginBottom: 10 }} />
        <div className="ui-skeleton" style={{ height: 16, width: 180, marginBottom: 28 }} />
        <div className="dash-grid">
          <div className="dash-col">
            <div className="ui-skeleton" style={{ height: 220, borderRadius: 8 }} />
            <div className="ui-skeleton" style={{ height: 140, borderRadius: 8 }} />
          </div>
          <div className="dash-col">
            <div className="ui-skeleton" style={{ height: 200, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  const quotaExceeded = isFreePlan && minutesRemaining <= 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user.first_name || user.username || '';
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const usagePct = minutesLimit > 0 ? Math.min(100, Math.round((minutesUsed / minutesLimit) * 100)) : 0;
  const badgeThreshold = profile?.badge_progress?.next_threshold || 0;
  const badgePct = badgeThreshold > 0 ? Math.min(100, Math.round((gameScore / badgeThreshold) * 100)) : 100;
  const badgeName = currentBadge === 'none' ? 'No badge yet' : currentBadge.charAt(0).toUpperCase() + currentBadge.slice(1);
  const practicedToday = lastTenDays[lastTenDays.length - 1]?.completed;

  const heroTopic = dailyTopic
    ? { title: dailyTopic.title, description: dailyTopic.description }
    : suggestedTopicObj;

  return (
    <div className="dash">
      <header className="ui-page-head">
        <div>
          <div className="ui-eyebrow">{todayLabel}</div>
          <h1 className="ui-h1">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="ui-sub">
            {practicedToday
              ? 'Nice work today. Keep the momentum going with another short session.'
              : 'A few focused minutes a day is all it takes. Your topic for today is ready.'}
          </p>
        </div>
        <div className={`dash-streak-pill ${currentStreak > 0 ? 'is-on' : ''}`}>
          <FlameIcon />
          <span><strong>{currentStreak}</strong> day streak</span>
        </div>
      </header>

      {error && <div className="ui-alert ui-alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="dash-grid">
        <div className="dash-col">
          {/* Today's practice: the one thing to do next */}
          <section className="ui-card dash-hero">
            {quotaExceeded ? (
              <>
                <div className="dash-hero-top">
                  <span className="ui-icon-tile"><LockIcon /></span>
                  <span className="ui-eyebrow">Monthly limit reached</span>
                </div>
                <h2 className="dash-hero-title">You&apos;ve used all {minutesLimit} free minutes this month</h2>
                <p className="dash-hero-desc">Upgrade to keep practicing daily topics and get AI feedback on every session.</p>
                <div className="dash-hero-actions">
                  <button type="button" className="ui-btn ui-btn-primary ui-btn-lg" onClick={() => setShowQuotaExceededModal(true)}>
                    See upgrade options
                  </button>
                  <Link to="/profile" className="ui-btn ui-btn-secondary ui-btn-lg">Compare plans</Link>
                </div>
              </>
            ) : (
              <>
                <div className="dash-hero-top">
                  <span className="ui-icon-tile"><SparkIcon /></span>
                  <span className="ui-eyebrow">{dailyTopic ? "Today's topic" : 'Suggested for you'}</span>
                  <span className="ui-chip" style={{ marginLeft: 'auto' }}><ClockIcon /> 2–3 min</span>
                </div>
                <h2 className="dash-hero-title">{heroTopic.title}</h2>
                {heroTopic.description && <p className="dash-hero-desc">{heroTopic.description}</p>}
                <div className="dash-hero-actions">
                  <button
                    type="button"
                    onClick={() => startPractice(dailyTopic ? { title: dailyTopic.title, description: dailyTopic.description } : suggestedTopicObj)}
                    disabled={starting}
                    className="ui-btn ui-btn-primary ui-btn-lg"
                  >
                    <MicIcon /> {starting ? 'Starting…' : 'Start speaking'}
                  </button>
                  <button type="button" onClick={() => navigate('/talking-agent')} disabled={starting} className="ui-btn ui-btn-secondary ui-btn-lg">
                    Free talk instead
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Recommended topics */}
          <section className="ui-card">
            <div className="ui-card-head">
              <div>
                <h3 className="ui-card-title">Recommended for you</h3>
                <p className="ui-card-sub">Picked from your interests</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {!quotaExceeded && (
                  <button
                    type="button"
                    className="ui-icon-btn is-plain"
                    onClick={loadTopics}
                    disabled={topicsRefreshing}
                    aria-label="Refresh recommendations"
                    title="Refresh"
                  >
                    <RefreshIcon className={topicsRefreshing ? 'dash-spin' : ''} />
                  </button>
                )}
                <Link to="/topics" className="ui-link">Browse all</Link>
              </div>
            </div>
            {quotaExceeded ? (
              <p className="ui-card-sub">Upgrade your plan to get personalized recommendations.</p>
            ) : topicsLoading ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {[0, 1, 2].map((i) => <div key={i} className="ui-skeleton" style={{ height: 58 }} />)}
              </div>
            ) : (
              <ul className="dash-topic-list">
                {topicCards.slice(0, 5).map((t) => (
                  <li key={t.title + (t.category || '')} className="dash-topic-row">
                    <span className="ui-dot" style={{ background: categoryColor(t.category), marginTop: 7 }} />
                    <div className="dash-topic-text">
                      <div className="dash-topic-title">{t.title}</div>
                      <div className="dash-topic-desc">{t.description}</div>
                    </div>
                    <span className="ui-chip dash-topic-cat">{t.category}</span>
                    <button type="button" onClick={() => startPractice(t)} disabled={starting} className="ui-btn ui-btn-secondary ui-btn-sm">
                      Practice <ArrowRightIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="dash-col">
          {/* Consistency */}
          <section className="ui-card">
            <div className="ui-card-head">
              <h3 className="ui-card-title">Consistency</h3>
              <span className="ui-card-sub">Last 14 days</span>
            </div>
            <div className="dash-streak-big">
              <span className="dash-streak-num">{currentStreak}</span>
              <span className="dash-streak-label">day streak</span>
            </div>
            {streakBroken && currentStreak === 0 && lastActiveDate && (
              <p className="ui-card-sub" style={{ marginTop: 4 }}>Last practiced {lastActiveLabel}. Start a new streak today.</p>
            )}
            <div className="dash-days" role="list">
              {lastTenDays.map((d, i) => (
                <div
                  key={d.iso}
                  role="listitem"
                  className={`dash-day ${d.completed ? 'is-done' : ''} ${i === lastTenDays.length - 1 ? 'is-today' : ''}`}
                  title={`${d.date.toLocaleDateString()} · ${d.completed ? 'Practiced' : 'No practice'}`}
                >
                  {d.completed && <CheckIcon />}
                </div>
              ))}
            </div>
            <div className="dash-mini-stats">
              <div><span>{longestStreak}</span>Longest streak</div>
              <div><span>{totalPracticeDays}</span>Practice days</div>
            </div>
          </section>

          {/* Badge */}
          <section className="ui-card">
            <div className="ui-card-head">
              <h3 className="ui-card-title">Table topic badge</h3>
              <TrophyIcon style={{ width: 18, height: 18, color: 'var(--text-dim)' }} />
            </div>
            <div className="dash-badge">
              <span className="dash-badge-medal" style={{ '--medal': BADGE_COLORS[currentBadge] || BADGE_COLORS.none }}>
                {profile?.current_badge_icon
                  ? <img src={profile.current_badge_icon} alt="" />
                  : <TrophyIcon />}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="dash-badge-name">{badgeName}</div>
                <div className="ui-card-sub">
                  {gameScore.toLocaleString()} points
                  {profile?.badge_progress?.next_badge_name ? ` · ${profile.badge_progress.remaining.toLocaleString()} to ${profile.badge_progress.next_badge_name}` : ''}
                </div>
              </div>
            </div>
            <div className="ui-progress" style={{ marginTop: 14 }}>
              <span style={{ width: `${badgePct}%` }} />
            </div>
          </section>

          {/* Plan usage (free plan only) */}
          {isFreePlan && (
            <section className="ui-card">
              <div className="ui-card-head">
                <h3 className="ui-card-title">Free plan</h3>
                <span className="ui-card-sub">{minutesRemaining} min left</span>
              </div>
              <div className="dash-usage-num">
                {minutesUsed}<span> / {minutesLimit} min used this month</span>
              </div>
              <div className={`ui-progress ${usagePct >= 100 ? 'is-danger' : usagePct >= 80 ? 'is-warn' : ''}`} style={{ margin: '10px 0 16px' }}>
                <span style={{ width: `${usagePct}%` }} />
              </div>
              {daypassPlan && (
                <div className="dash-daypass">
                  <div>
                    <div className="dash-daypass-title">{daypassPlan.name}</div>
                    <div className="ui-card-sub">Unlimited practice for a day · ₹{daypassPlan.price.toFixed(0)}</div>
                  </div>
                  <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setShowQuotaExceededModal(true)}>
                    Get it
                  </button>
                </div>
              )}
              <Link to="/profile" className="ui-link" style={{ display: 'inline-block', marginTop: 12 }}>See all plans</Link>
            </section>
          )}
        </aside>
      </div>

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
              {plans
                .filter((p) => p.price > 0)
                .slice()
                .sort((a, b) => (b.plan_type === 'day_pass' ? 1 : 0) - (a.plan_type === 'day_pass' ? 1 : 0))
                .map((plan) => (
                <div
                  key={plan.id}
                  className={`tw-voice-upgrade-plan-card ${plan.plan_type === 'day_pass' ? 'tw-voice-upgrade-plan-card--featured' : ''}`}
                >
                  {plan.plan_type === 'day_pass' && (
                    <span className="tw-voice-upgrade-plan-flag">Best value</span>
                  )}
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

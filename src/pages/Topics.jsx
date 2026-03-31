import '../styles/voice.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getTopics, createConversation, getProfile, getPlans, getMe, subscribeToPlanWithPayment } from '../services/api';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { useTheme } from '../contexts/ThemeContext';

function SearchIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function BookIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function LightningIcon({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function MicIcon({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 23h8" />
    </svg>
  );
}

export default function Topics() {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { setPageNavbar } = usePageNavbar();
  const { theme } = useTheme();

  useEffect(() => {
    setPageNavbar({ title: 'Practice Topics' });
    return () => setPageNavbar({});
  }, [setPageNavbar]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');
  const [startingId, setStartingId] = useState(null);
  const [attemptFilter, setAttemptFilter] = useState('all');
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showQuotaExceededModal, setShowQuotaExceededModal] = useState(false);
  const [upgradeUser, setUpgradeUser] = useState(null);
  const [upgradeSubmittingId, setUpgradeSubmittingId] = useState(null);
  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    let isActive = true;
    setLoading(true);
    getTopics()
      .then((data) => {
        if (!isActive) return;
        setTopics(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err?.error || err?.message || 'Failed to load topics.');
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getProfile().then(setProfile).catch(() => {});
    getPlans().then((data) => setPlans(Array.isArray(data?.plans) ? data.plans : [])).catch(() => {});
    getMe().then(setUpgradeUser).catch(() => {});
  }, [isAuthenticated]);

  const minutesRemaining = profile?.minutes_remaining ?? Math.max(0, (profile?.minutes_limit ?? 10) - (profile?.monthly_minutes_used ?? 0));
  const currentPlanId = profile?.subscription_plan && typeof profile.subscription_plan === 'object'
    ? profile.subscription_plan.id
    : profile?.subscription_plan || null;
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const isFreePlan = !currentPlan || currentPlan.price === 0;

  const categories = useMemo(() => {
    const set = new Set();
    topics.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [topics]);

  const filtered = useMemo(() => {
    const limited = isFreePlan ? topics.slice(0, 5) : topics;
    const query = search.trim().toLowerCase();
    const list = limited.filter((t) => {
      if (level !== 'all' && t.level !== level) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (attemptFilter === 'attempted' && !t.completed) return false;
      if (attemptFilter === 'not_attempted' && t.completed) return false;
      if (!query) return true;
      const haystack = `${t.title} ${t.category ?? ''} ${t.description ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
    return [...list].sort((a, b) => {
      const aDone = !!a.completed;
      const bDone = !!b.completed;
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }, [topics, search, level, category, attemptFilter, isFreePlan]);

  const handleStart = async (topicObj) => {
    if (!topicObj?.title) return;
    if (isFreePlan && minutesRemaining <= 0) {
      setShowQuotaExceededModal(true);
      return;
    }
    setError(null);
    setStartingId(topicObj.id);
    try {
      const conv = await createConversation(
        topicObj.title,
        topicObj.id,
        topicObj.description || undefined,
      );
      const timeLimitSeconds = topicObj.time_limit_seconds || 180;
      navigate(`/voice?conversation=${conv.id}&solo=1`, {
        state: {
          conversationId: conv.id,
          topic: topicObj.title,
          topicDescription: topicObj.description || '',
          solo: true,
          timeLimitSeconds,
        },
      });
    } catch (err) {
      const errMsg = err?.error || err?.message || 'Failed to start session.';
      setError(errMsg);
      if (typeof errMsg === 'string' && (errMsg.includes('practice minutes') || errMsg.includes('monthly limit'))) {
        setShowQuotaExceededModal(true);
      }
    } finally {
      setStartingId(null);
    }
  };

  const getTagStyle = (cat) => {
    const c = (cat || 'General').toLowerCase();
    // Use slightly softer colors so dark mode doesn't look neon.
    if (['tech', 'social', 'sales'].some((x) => c.includes(x))) return 'bg-sky-500/10 text-sky-500 ring-sky-600/20';
    if (['career', 'business', 'leadership', 'interview', 'networking'].some((x) => c.includes(x))) return 'bg-violet-500/10 text-violet-500 ring-violet-600/20';
    return 'bg-emerald-500/10 text-emerald-500 ring-emerald-600/20';
  };

  const hasActiveFilters = search.trim() !== '' || level !== 'all' || category !== 'all' || attemptFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setLevel('all');
    setCategory('all');
    setAttemptFilter('all');
  };

  const ui = {
    primary: theme === 'light' ? '#059669' : '#A7ED02',
    primaryText: theme === 'light' ? '#FFFFFF' : '#000000',
    page: 'mx-auto w-full max-w-none px-3 pb-10 pt-3 sm:px-4',
    card: 'rounded-md border bg-[var(--bg-card)] shadow-sm',
    border: 'border-[color:var(--border)]',
    text: 'text-[color:var(--text)]',
    textDim: 'text-[color:var(--text-dim)]',
    input: 'border-[color:var(--border)] bg-[var(--input-bg)] text-[color:var(--text)]',
  };

  return (
    <div className={ui.page}>
      {/* Hero */}
      <section className={`relative overflow-hidden p-5 sm:p-7 ${ui.card} ${ui.border}`}>
        <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(900px_circle_at_20%_-20%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(900px_circle_at_100%_0%,rgba(16,185,129,0.14),transparent_50%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-slate-900"
              style={{ backgroundColor: ui.primary, color: ui.primaryText }}
            >
              <LightningIcon className="opacity-90" />
              Pick a topic and start speaking
            </div>
            <h1 className={`mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl ${ui.text}`}>
              Practice Topics
            </h1>
            <p className={`mt-2 text-sm ${ui.textDim}`}>
              Short, focused prompts designed to get you talking fast. Choose one and hit <span className={`font-semibold ${ui.text}`}>Start talking</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${ui.border} border bg-[color:var(--input-bg)] ${ui.textDim}`}>
              {isFreePlan
                ? `${filtered.length} of 5 topics (upgrade for all ${topics.length})`
                : `${filtered.length} of ${topics.length} topics`}
            </span>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold shadow-sm transition md:hidden ${
                showFiltersOnMobile
                  ? 'border-[color:var(--text)] bg-[color:var(--text)] text-[color:var(--bg-card)]'
                  : `${ui.border} bg-[color:var(--bg-card)] ${ui.text} hover:opacity-95`
              } md:hidden`}
              onClick={() => setShowFiltersOnMobile(!showFiltersOnMobile)}
              aria-label={showFiltersOnMobile ? 'Hide filters' : 'Show filters'}
            >
              <FilterIcon />
              Filters
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold shadow-sm hover:opacity-95 ${ui.border} bg-[color:var(--bg-card)] ${ui.textDim}`}
                onClick={clearFilters}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={`relative mt-5 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end ${showFiltersOnMobile ? '' : 'hidden md:grid'}`}>
          <div className="md:col-span-5">
            <label className={`mb-1 block text-xs font-semibold ${ui.textDim}`}>Search</label>
            <div className="relative">
              <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ui.textDim} opacity-70`}>
                <SearchIcon />
              </span>
              <input
                type="text"
                className={`w-full rounded-md border py-3 pl-10 pr-3 text-sm shadow-sm outline-none transition focus:ring-4 ${ui.input}`}
                style={{ boxShadow: 'none', outline: 'none' }}
                placeholder="Search topics, categories…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={`mb-1 block text-xs font-semibold ${ui.textDim}`}>Level</label>
            <select
              id="topics-level"
              className={`h-[46px] w-full rounded-md border px-3 text-sm font-semibold shadow-sm outline-none focus:ring-4 ${ui.input}`}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="all">All</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className={`mb-1 block text-xs font-semibold ${ui.textDim}`}>Category</label>
            <select
              id="topics-category"
              className={`h-[46px] w-full rounded-md border px-3 text-sm font-semibold shadow-sm outline-none focus:ring-4 ${ui.input}`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={`mb-1 block text-xs font-semibold ${ui.textDim}`}>Status</label>
            <select
              id="topics-attempt"
              className={`h-[46px] w-full rounded-md border px-3 text-sm font-semibold shadow-sm outline-none focus:ring-4 ${ui.input}`}
              value={attemptFilter}
              onChange={(e) => setAttemptFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="attempted">Attempted</option>
              <option value="not_attempted">Not attempted</option>
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className={`mt-6 p-10 text-center ${ui.card} ${ui.border}`}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
            <BookIcon />
          </div>
          <p className={`text-base font-semibold ${ui.text}`}>Loading topics…</p>
          <p className={`mt-1 text-sm ${ui.textDim}`}>Finding the best practice sessions for you</p>
        </div>
      ) : error ? (
        <div className={`mt-6 p-10 text-center ${ui.card} ${ui.border}`}>
          <p className="text-base font-semibold text-red-600">{error}</p>
          <p className={`mt-1 text-sm ${ui.textDim}`}>Please try again later</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`mt-6 p-10 text-center ${ui.card} ${ui.border}`}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-md bg-[color:var(--input-bg)] text-[color:var(--text)] opacity-80">
            <SearchIcon />
          </div>
          <p className={`text-base font-semibold ${ui.text}`}>No topics match your filters</p>
          <p className={`mt-1 text-sm ${ui.textDim}`}>Try adjusting your search or filters to find more topics</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const categoryLabel = t.category || 'General';
            const limitMinutes = Math.round((t.time_limit_seconds || 180) / 60);
            const attempted = t.completed;
            const levelLabel = LEVEL_LABEL[t.level] || 'All levels';
            return (
              <article
                key={t.id}
                className={`group relative flex h-full flex-col overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-md ${ui.card} ${ui.border}`}
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
                  <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
                </div>

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className={`text-base font-extrabold tracking-tight ${ui.text}`}>
                        {t.title}
                      </h3>
                      <p className={`mt-2 line-clamp-3 text-sm ${ui.textDim}`}>
                        {t.description || 'Practice your communication skills.'}
                      </p>
                    </div>
                    <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--text)] text-[color:var(--bg-card)] shadow-sm">
                      <MicIcon className="opacity-90" />
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getTagStyle(categoryLabel)}`}>
                      {categoryLabel}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${ui.border} border bg-[color:var(--input-bg)] ${ui.textDim}`}>
                      {levelLabel}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${ui.border} border bg-[color:var(--input-bg)] ${ui.textDim}`}>
                      ⏱ {limitMinutes} min
                    </span>
                    {!attempted && (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ring-1"
                        style={{
                          backgroundColor: theme === 'light' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(167, 237, 2, 0.12)',
                          color: ui.primary,
                          borderColor: theme === 'light' ? 'rgba(5, 150, 105, 0.25)' : 'rgba(167, 237, 2, 0.25)',
                        }}
                      >
                        New
                      </span>
                    )}
                  </div>

                  {(attempted && (typeof t.best_score === 'number' || (typeof t.last_score === 'number' && t.last_score > 0))) && (
                    <div className={`mt-3 flex flex-wrap gap-2 text-xs font-semibold ${ui.textDim}`}>
                      {typeof t.best_score === 'number' && (
                        <span className={`rounded-lg px-2 py-1 ring-1 ${ui.border} border bg-[color:var(--input-bg)]`}>Best: {t.best_score}</span>
                      )}
                      {typeof t.last_score === 'number' && t.last_score > 0 && (
                        <span className={`rounded-lg px-2 py-1 ring-1 ${ui.border} border bg-[color:var(--input-bg)]`}>Last: {t.last_score}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`min-w-0 truncate whitespace-nowrap text-xs font-semibold ${attempted ? 'text-emerald-500' : `${ui.textDim} opacity-90`}`}>
                      {attempted
                        ? `✓ Attempted · ${t.attempts || 1} session${(t.attempts || 1) > 1 ? 's' : ''}`
                        : 'Not attempted yet'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStart(t)}
                        disabled={startingId === t.id}
                        className={`inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-extrabold shadow-sm transition focus:outline-none focus:ring-4 ${
                          startingId === t.id
                            ? `cursor-not-allowed ${ui.border} border bg-[color:var(--input-bg)] ${ui.textDim}`
                            : 'hover:opacity-95'
                        }`}
                        style={startingId === t.id ? undefined : { backgroundColor: ui.primary, color: ui.primaryText, boxShadow: '0 8px 18px rgba(167, 237, 2, 0.18)' }}
                      >
                        {startingId === t.id ? 'Starting…' : 'Start talking'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

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

